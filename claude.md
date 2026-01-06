# VIBE - AI Coding Agent Ecosystem
Load up context prompt:
take a look at the app and architecture. Understand deeply how it works inside and out. Ask me any questions if there are things you don't understand. This will be the basis for the rest of our conversation.

Tool use summaries:
After completing a task that involves tool use, provide a quick summary of the work you've done

Adjust eagerness down:
Do not jump into implementation or change files unless clearly instructed to make changed. When the user's intent is ambiguous, default to providing information, doing research, and providing recommendations rather than taking action. Only proceed with edits, modifications, or implementations when the user explicitly requests them.

Adjust eagerness up:
By default, implement changes rather than only suggesting them. If the user's intent is unclear, infer the most useful likely action and proceed, using tools to discover any missing details instead of guessing. Try to infer the user's intent about whether a tool call (e.g. file edit or read) is intended or not, and act accordingly.

Use parallel tool calls:
If you intend to call multiple tools and there are no dependencies
between the tool calls, make all of the independent tool calls in
parallel. Prioritize calling tools simultaneously whenever the
actions can be done in parallel rather than sequentially. For
example, when reading 3 files, run 3 tool calls in parallel to read
all 3 files into context at the same time. Maximize use of parallel
tool calls where possible to increase speed and efficiency.
However, if some tool calls depend on previous calls to inform
dependent values like the parameters, do not call these tools in
parallel and instead call them sequentially. Never use placeholders
or guess missing parameters in tool calls.

Reduce hallucinations:
Never speculate about code you have not opened. If the user
references a specific file, you MUST read the file before
answering. Make sure to investigate and read relevant files BEFORE
answering questions about the codebase. Never make any claims about
code before investigating unless you are certain of the correct
answer - give grounded and hallucination-free answers.

## Overview

VIBE is an open-source AI coding agent ecosystem that provides intelligent code assistance through a terminal CLI, VS Code extension, and web dashboard. The system is built with an **intent-driven natural language interface** - users type naturally and VIBE infers what they want.

**Version:** 12.0.0
**Architecture:** MCP-first, 8 primitives, intent-driven UX
**Repository:** https://github.com/mk-knight23/vibe

---


## Project Structure

```
vibe/
├── vibe-cli/          # Terminal AI assistant (main package)
├── vibe-code/         # VS Code extension
├── vibe-web/          # Web dashboard
├── docs/              # Documentation
├── scripts/           # Build and release scripts
├── ecosystem-compatibility.json
└── package.json       # Workspace root
```

---

## Core Architecture (vibe-cli)

### Entry Points

| File | Purpose |
|------|---------|
| `src/index.ts` | Main entry point, exports public API |
| `src/core/cli.ts` | VibeCLI class - unified command interface |
| `src/core/engine.ts` | VibeCoreEngine - main orchestrator |
| `bin/vibe.js` | CLI executable script |

### The 8 Primitives

Instead of 60+ scattered tools, VIBE uses 8 unified primitives:

1. **Ask** - Answer questions, explain code
2. **Code** - Generate, refactor, complete code
3. **Debug** - Fix bugs, trace execution
4. **Test** - Write and run tests
5. **Deploy** - Build, ship, release
6. **Agent** - Run autonomous multi-step tasks
7. **Memory** - Remember project context
8. **Plan** - Design architecture, roadmaps

### Key Directories

```
src/
├── agents/           # Multi-agent system (planner, executor, reviewer, etc.)
├── approvals/        # Risk-based approval system
├── cli/              # CLI argument parsing, help
├── config/           # Configuration management
├── context/          # Project context aggregation
├── core/             # Engine, CLI, module loader
├── intent/           # Intent classification router
├── mcp/              # Model Context Protocol backbone
├── memory/           # Persistent memory manager
├── modules/          # Functional modules
│   ├── code-assistant/
│   ├── debugging/
│   ├── deployment/
│   ├── security/
│   └── testing/
├── orchestration/    # Workflow engine
├── providers/        # LLM provider registry (20+ providers)
├── security/         # Scanner, utilities
├── tools/            # Tool executor
├── tui/              # Terminal UI engine
└── types.ts          # Core type definitions
```

---

## Intent System

### How It Works

The `IntentRouter` (`src/intent/router.ts`) classifies natural language input into structured intents:

1. **Pattern Matching** - Keyword and regex patterns for 16 categories
2. **Confidence Scoring** - 0.4-1.0 confidence threshold
3. **Context Extraction** - Files, languages, frameworks from input
4. **Risk Assessment** - Low/Medium/High/Critical
5. **Clarification** - LLM fallback when confidence < 0.6

### Intent Categories

| Category | Keywords | Risk Level |
|----------|----------|------------|
| `question` | why, how, what, explain | Low |
| `code_generation` | create, add, build, implement | Medium |
| `refactor` | refactor, improve, optimize | Medium |
| `debug` | fix, bug, error, not working | Medium |
| `testing` | test, verify, validate | Low |
| `api` | api, endpoint, route, controller | Medium |
| `ui` | ui, component, button, form | Medium |
| `deploy` | deploy, push, release, ship | High |
| `infra` | terraform, kubernetes, docker, aws | High |
| `memory` | remember, forget, recall | Low |
| `planning` | plan, design, architecture | Low |
| `agent` | agent, autonomous, do it | High |
| `git` | commit, push, branch, merge | High |
| `analysis` | analyze, review, audit | Low |
| `security` | security, vulnerability, scan | Medium |

### Intent Routing to Modules

```typescript
// Intent → Module mapping
'code_generation' → 'code-assistant' (generate)
'refactor'        → 'code-assistant' (refactor)
'testing'         → 'testing' (run)
'debug'           → 'debugging' (analyze)
'security'        → 'security' (scan)
'deploy'          → 'deployment' (deploy)
```

---

## MCP (Model Context Protocol)

### Architecture

The MCP backbone (`src/mcp/index.ts`) provides structured context from multiple sources:

```typescript
interface MCPContext {
  filesystem: FileSystemContext | null;
  git: GitContext | null;
  openapi: OpenAPIContext | null;
  tests: TestsContext | null;
  memory: MemoryContext | null;
  infra: InfraContext | null;
}
```

### Context Providers

| Provider | File | Purpose |
|----------|------|---------|
| Filesystem | `mcp/context-provider.ts` | File tree, structure |
| Git | `mcp/context-provider.ts` | Branch, commits, status |
| OpenAPI | `mcp/context-provider.ts` | API endpoints |
| Tests | `mcp/context-provider.ts` | Test files, frameworks |
| Memory | `mcp/context-provider.ts` | Stored decisions, rules |
| Infra | `mcp/context-provider.ts` | Cloud providers |

### MCP Manager

```typescript
class VibeMCPManager {
  connect(config: MCPServerConfig): Promise<void>
  disconnect(name: string): void
  callTool(serverName, toolName, args): Promise<unknown>
  getAllTools(): { server, tool }[]
  listServers(): string[]
}
```

---

## Multi-Agent System

### Built-in Agents (`src/agents/index.ts`)

| Agent | Role | Description |
|-------|------|-------------|
| `PlannerAgent` | planning | Creates execution plans |
| `ExecutorAgent` | execution | Runs code and commands |
| `ReviewerAgent` | validation | Validates outputs |
| `TestAgent` | testing | Generates and runs tests |
| `SecurityAgent` | security | Vulnerability scanning |
| `RollbackAgent` | recovery | Reverts changes |
| `MemoryAgent` | memory | Manages project context |

### Agent Pipeline

```
Planner → Executor → Reviewer
   ↓          ↓         ↓
  Plan   Execution   Validation
```

---

## Provider System

### Supported Providers (`src/providers/registry.ts`)

20+ LLM providers with unified interface:

| Provider | Type | Free Tier | Default Model |
|----------|------|-----------|---------------|
| OpenAI | Cloud | No | gpt-4o |
| Anthropic | Cloud | No | claude-sonnet-4 |
| Google Gemini | Cloud | Yes | gemini-1.5-flash |
| DeepSeek | Cloud | No | deepseek-chat |
| Ollama | Local | Yes | llama3.1 |
| OpenRouter | Cloud | Some | claude-sonnet-4 |
| Groq | Cloud | No | llama-3.3-70b |
| Together | Cloud | No | llama-3.3-70b |
| HuggingFace | Cloud | Yes | llama-3.1-70B |
| AWS Bedrock | Cloud | No | claude-sonnet-4 |
| Azure | Cloud | No | gpt-4o |

### Provider Selection

```typescript
// Auto-select based on task type
'simple' → fast/cheap model
'reasoning' → claude-opus-4, o1
'balanced' → claude-sonnet-4, gpt-4o
'vision' → gpt-4o, claude-3-opus
```

---

## Modules System

### Module Base (`src/modules/base.module.ts`)

All modules implement:

```typescript
interface BaseModule {
  info: ModuleInfo;
  execute(params: Record<string, any>): Promise<ModuleResult>;
}

interface ModuleInfo {
  name: string;
  description: string;
  version: string;
}
```

### Available Modules

| Module | Directory | Capabilities |
|--------|-----------|--------------|
| Code Assistant | `modules/code-assistant/` | Generate, refactor, explain code |
| Testing | `modules/testing/` | Write tests, coverage analysis |
| Debugging | `modules/debugging/` | Trace, profile, fix bugs |
| Security | `modules/security/` | Vulnerability scanning |
| Deployment | `modules/deployment/` | Build, ship, CI/CD |

---

## Workflow Engine

### Built-in Workflows (`src/orchestration/workflow.ts`)

| Workflow | Steps |
|----------|-------|
| `cicd` | install → lint → test → build → deploy |
| `code-review` | analyze → security → test → report |

### Workflow Structure

```typescript
interface Workflow {
  id: string;
  steps: WorkflowStep[];
  parallelGroups?: string[][];
  metadata: {
    author, createdAt, tags, parameters
  };
}

interface WorkflowStep {
  id: string;
  tool: string;
  args: Record<string, any>;
  condition?: string;
  retry?: number;
  onSuccess?: string;
  onFailure?: 'abort' | 'rollback';
}
```

---

## Approval System

### Risk Levels

| Level | Operations Requiring Approval |
|-------|-------------------------------|
| `low` | Read-only queries |
| `medium` | File writes, code changes |
| `high` | Deploys, git operations |
| `critical` | Rollbacks, destructive ops |

### Approval Types

```typescript
'confirm' | 'deny' | 'modify' | 'delete'
'deploy' | 'shell' | 'shell-exec'
'file-write' | 'git-mutation' | 'network'
```

---

## Memory System

### Memory Types

| Type | Purpose |
|------|---------|
| `decision` | Architectural choices |
| `rule` | Project conventions |
| `pattern` | Reusable solutions |
| `context` | Current state |
| `action` | User preferences |

### Storage

- **Backend:** SQLite (`better-sqlite3`)
- **Location:** `~/.vibe/memory.db` or project-scoped

---

## Configuration

### Config Location

- **Project:** `.vibe/config.json`
- **User:** `~/.vibe/config.json`
- **Env:** `VIBE_*` variables

### Key Settings

```json
{
  "provider": "openrouter",
  "model": "anthropic/claude-sonnet-4",
  "autoApprove": false,
  "privacy": {
    "localOnly": false,
    "allowStorage": false
  }
}
```

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `VIBE_PROVIDER` | LLM provider ID |
| `VIBE_MODEL` | Model ID |
| `VIBE_AUTO_APPROVE` | Skip approvals |
| `OPENAI_API_KEY` | Provider API keys |

---

## Security

### Scanner (`src/security/scanner.ts`)

- Vulnerability detection
- Secret scanning
- Dependency auditing
- CVE checking

### Safety Features

- Sandboxed execution
- Risk-based approvals
- Dry-run mode
- Checkpoint before changes

---

## VS Code Extension (vibe-code)

### Capabilities

- Inline chat with VIBE
- Code actions
- Task runner
- Status bar integration

### Key Files

| File | Purpose |
|------|---------|
| `src/extension.ts` | Extension activation |
| `src/providers.ts` | Chat provider |
| `src/state-machine.ts` | UI state |
| `src/settings.ts` | Configuration |

---

## Development

### Commands

```bash
# Build all
npm run build

# Build specific
npm run build:cli
npm run build:extension
npm run build:web

# Test
npm run test
npm run test:cli
npm run test:extension

# Type check
npm run typecheck

# Clean
npm run clean
```

### Requirements

- Node.js >= 18.0.0
- TypeScript 5.x
- npm workspaces

---

## Key Files to Understand

1. **`src/core/engine.ts`** - Main orchestrator
2. **`src/intent/router.ts`** - Natural language classification
3. **`src/providers/registry.ts`** - 20+ LLM providers
4. **`src/mcp/index.ts`** - MCP backbone
5. **`src/orchestration/workflow.ts`** - Workflow engine
6. **`src/types.ts`** - All core types
7. **`src/agents/index.ts`** - Multi-agent system

---

## Questions to Ask

1. **Provider preference:** Which LLM provider(s) should be prioritized?
2. **Privacy settings:** Local-only mode vs cloud?
3. **Approval defaults:** Auto-approve low-risk operations?
4. **Memory persistence:** Store project memory?
5. **Default model:** Which model for different task types?

---

## Code Style

- **TypeScript** with strict mode
- **ES modules** (`type: "module"` in vibe-cli)
- **Async/await** for all async operations
- **Descriptive variable names** (no single letters)
- **Error handling** with custom error types
- **Comments** for complex logic
- **Tests** for core functionality


