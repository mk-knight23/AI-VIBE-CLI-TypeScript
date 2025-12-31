# VIBE CLI v10.1 - Architecture Map

**Scan Date:** 2025-12-30  
**Current Version:** 10.1.0  
**Status:** Production (v10.0.0 released, v10.1.0 features in progress)

---

## Entry Points

### CLI Entry
- **File:** `vibe-cli/bin/vibe.js` (shebang wrapper)
- **Main:** `vibe-cli/src/cli/index.ts` (v10.1.0)
- **Version:** Exported as `VERSION = '10.1.0'`
- **Modes:** Interactive (default), Ask (`vibe ask`), Batch (`vibe batch`), Cmd (`vibe cmd`)

### Package Configuration
- **Name:** `@mk-knight23/vibe-ai-cli`
- **Main Entry:** `dist/cli/index.js`
- **Bin:** `vibe` → `bin/vibe.js`
- **Node Requirement:** `>=18.0.0`

---

## Command Tree (Complete Inventory)

### Core Commands
```
vibe                          → Interactive mode (default)
vibe --version, -v            → Show version (10.1.0)
vibe --help, -h               → Show help banner
```

### Headless Modes
```
vibe ask "prompt"             → Non-interactive one-shot
  --allow-tools               → Enable tool execution (default: OFF)
  --dangerously-skip-permissions → YOLO mode
  --json                      → JSON output
  --quiet, -q                 → Suppress spinners

vibe cmd <name>               → Execute custom command
vibe batch <file>             → Process multiple prompts
  --parallel                  → Concurrent execution
  --output dir                → Write results
  --format fmt                → json|markdown|text
```

### Provider Commands
```
vibe connect <provider>       → Add credentials
vibe providers                → List available providers
vibe models [--local|--cheap|--fast|--free]
```

### Agent Commands
```
vibe agents [list|new|delete|edit]
vibe plan <goal>              → Planner agent
vibe research <topic>         → Researcher agent
vibe analyze <topic>          → Analyst agent
vibe build <task>             → Builder agent
vibe review <topic>           → Reviewer agent
vibe audit [stats|recent|export]
```

### Session Commands
```
vibe sessions [new|list|share|delete]
```

### Configuration Commands
```
vibe config get <key>
vibe config set <key> <value>
vibe doctor                   → Diagnose configuration
vibe privacy [--local-only|--allow-storage]
vibe lsp [status|detect]
```

### Workflow Commands
```
vibe workflow [list|run|edit]
vibe memory [show|compact|export|import]
vibe output [format|export]
vibe rules [list|add|remove]
vibe pipeline [research|analyze|report|automate]
vibe steering [show|create|edit]
vibe hooks [list|add|remove]
```

### Interactive Slash Commands (In Chat)
```
/help                         → Show all commands
/exit, /quit                  → Exit (also Ctrl+D)
/clear                        → Clear screen
/session [new|list|switch|delete|rename]
/model [list|set <provider/model>]
/agent [list|set|create|edit]
/tools [list|describe]
/mcp [list|add|remove|toggle|refresh]
/memory [show|compact|export|import]
/diff [show|apply|revert|checkpoint]
/mode [ask|debug|architect|orchestrator|auto]
/context [show|clear|steering]
/cmd [list|new|delete|show]
/approve [list|all|<n>|deny]
/audit [stats|recent|export]
/privacy                      → Privacy tips
/bug                          → Generate bug report
```

### Keyboard Shortcuts (Interactive)
```
Ctrl+C                        → Cancel current operation
Ctrl+D                        → Exit
Ctrl+L                        → Clear screen
Ctrl+K                        → Command palette (fuzzy search)
Ctrl+T                        → Start tangent conversation
Ctrl+J                        → Multi-line input
!cmd                          → Execute shell command
@workspace                    → Include project context
@file:path                    → Include specific file
@folder:path                  → Include folder structure
```

---

## Configuration Schema

### Config File Locations (Priority Order)
1. `vibe.json` (project root)
2. `.vibe.json` (project root)
3. `vibe.config.json` (project root)
4. `~/.vibe/config.json` (user home)

### Config Keys (Must Preserve Forever)
```typescript
{
  "$schema": "https://vibe.ai/schema.json",
  
  // Provider Configuration
  "provider": {
    "openai": {
      "apiKey": string,
      "model": string,
      "baseURL": string (optional),
      "models": { [modelId]: ModelConfig }
    },
    "anthropic": { ... },
    "google": { ... },
    "[custom]": { baseURL, apiKey, models }
  },
  
  // Default Model
  "model": string,
  
  // Routing Rules
  "routing": {
    "code": string[],
    "chat": string[],
    "cheap": string[],
    "reasoning": string[]
  },
  
  // Legacy Keys (Preserved)
  "apiKey": string,
  "temperature": number,
  "maxTokens": number,
  "outputFormat": string,
  "sessionDir": string,
  "verbose": boolean
}
```

### Environment Variables
```
OPENAI_API_KEY              → OpenAI credentials
ANTHROPIC_API_KEY          → Anthropic credentials
GOOGLE_API_KEY              → Google credentials
VIBE_CONFIG                 → Config file path
VIBE_SESSION_DIR            → Session storage directory
VIBE_PRIVACY_LOCAL_ONLY     → Enable local-only mode
```

### Feature Flags (v10.1.0)
```
vibe config set featureFlags.batchMode true
vibe config set featureFlags.pipelineMode true
vibe config set featureFlags.checkpoints true
vibe config set featureFlags.projectRules true
vibe config set featureFlags.projectMemory true
```

---

## Provider Layer

### Supported Providers (20+)

**Cloud Providers:**
- OpenAI (GPT-4, GPT-3.5 Turbo, o1, o3)
- Anthropic (Claude 3.5, Claude 4, Claude Opus)
- Google Gemini (1.5 Pro, 1.5 Flash)
- OpenRouter (unified API)
- Groq (fast inference)
- DeepSeek (reasoning models)
- Together AI
- Fireworks
- Mistral
- xAI (Grok)
- Perplexity

**Enterprise:**
- Azure OpenAI
- AWS Bedrock (stub)
- Google Vertex AI (stub)

**Local:**
- Ollama
- LM Studio
- vLLM

**Custom Aggregators:**
- AgentRouter
- MegaLLM
- Routeway

### Provider Registry Location
- **File:** `vibe-cli/src/providers/registry.ts`
- **Pattern:** Provider abstraction with `complete()`, `stream()`, `countTokens()`, `maxContextLength()`
- **Fallback:** Automatic retry with exponential backoff
- **Rate Limiting:** Per-provider 429 tracking

### Provider Capabilities
```typescript
interface ProviderCapabilities {
  supportsStreaming: boolean,
  supportsVision: boolean,
  supportsTools: boolean,
  supportsReasoning: boolean,
  maxOutputTokens: number,
  contextWindowSizes: number[]
}
```

---

## Tool Registry

### Tool Categories & Count

**Filesystem (10 tools)**
- `list_directory`, `read_file`, `write_file`, `glob`, `search_file_content`
- `replace`, `create_directory`, `delete_file`, `move_file`, `copy_file`
- `append_to_file`, `get_file_info`, `list_files_rg`

**Shell (1 tool)**
- `run_shell_command` (with timeout, capture, working directory)

**Git (4 tools)**
- `git_status`, `git_diff`, `git_log`, `git_blame`

**Web (2 tools)**
- `web_fetch`, `google_web_search`

**Memory (2 tools)**
- `save_memory`, `write_todos`

**Project (5 tools)**
- `check_dependency`, `get_project_info`, `run_tests`, `run_lint`, `run_typecheck`

**Analysis (6 tools)**
- `analyze_code_quality`, `smart_refactor`, `generate_tests`, `optimize_bundle`
- `security_scan`, `performance_benchmark`, `generate_documentation`, `migrate_code`

**LSP (1 tool)**
- `get_diagnostics`

**Total: 31 tools**

### Tool Definition Structure
```typescript
interface ToolDefinition {
  name: string,
  displayName: string,
  description: string,
  parameters: Record<string, ParamSchema>,
  handler: (...args) => Promise<any>,
  requiresConfirmation?: boolean,
  category?: string
}
```

### Tool Execution
- **File:** `vibe-cli/src/tools/index.ts`
- **Pattern:** `executeTool(toolName, params)` with timeout enforcement
- **Timeouts:** SHELL_CMD=30s, TOOL_EXEC=10s (configurable)
- **Error Handling:** Wrapped with timeout + error context

---

## Storage & Persistence

### Database (SQLite)
- **Location:** `.vibe/store.db` (project root)
- **Engine:** `better-sqlite3` with WAL mode
- **Migrations:** Auto-run on startup

### Database Schema
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  created_at INTEGER,
  updated_at INTEGER,
  parent_id TEXT,
  model TEXT,
  provider TEXT,
  token_count INTEGER
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  role TEXT,
  content TEXT,
  tokens INTEGER,
  tool_calls TEXT,
  created_at INTEGER
);

CREATE TABLE summaries (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  content TEXT,
  from_message_id TEXT,
  to_message_id TEXT,
  created_at INTEGER
);

CREATE TABLE permissions (
  id TEXT PRIMARY KEY,
  tool TEXT,
  path_pattern TEXT,
  level TEXT,
  session_id TEXT,
  created_at INTEGER
);
```

### Session Storage
- **File:** `vibe-cli/src/storage/sessions.ts`
- **Functions:** `createSession()`, `getSession()`, `listSessions()`, `deleteSession()`
- **Metadata:** name, created_at, last_active, model, provider, token_count

### Memory System
- **File:** `vibe-cli/src/memory/` (multiple modules)
- **Types:** Working memory (current), Persistent memory (long-term)
- **Auto-Compact:** Trigger at 75% context window, summarize old messages
- **Search:** Semantic search with embeddings (optional)

### Checkpoints
- **File:** `vibe-cli/src/core/checkpoints.ts`
- **Functions:** `trackChange()`, `createCheckpoint()`, `revertCheckpoint()`, `getUnifiedDiff()`
- **Storage:** In-memory + database persistence
- **Format:** Git-like checkpoint system with diffs

### Audit Log
- **Location:** `.vibe/audit.log` (JSONL format)
- **Fields:** action, command, approved, result, timestamp, riskLevel, dryRun
- **Singleton:** `AuditLogger` class with filtering
- **Stats:** Per-tool, per-risk-level tracking

---

## Permissions System

### Permission Levels (4-tier)
```
'ask'           → Prompt user each time
'allow_once'    → Allow this operation only
'allow_session' → Allow for entire session
'deny'          → Block operation
```

### Default Rules
```
Read-only tools (list_directory, read_file, glob, git_*): 'allow_session'
Write tools (write_file, replace, delete_file): 'ask'
Shell commands: 'ask'
Sensitive paths (.env, .ssh, credentials): always 'ask'
```

### Permission Storage
- **In-Memory Cache:** Session-level permissions
- **Database:** Persistent rules
- **Path-Based:** Sensitive path detection with regex patterns

### Batch Approval System (v10.1.0)
- **Queue:** In-memory approval queue per session
- **Functions:** `queueForApproval()`, `getPendingApprovals()`, `approveAll()`, `denyAll()`
- **Risk Levels:** safe, low, medium, high
- **Display:** Formatted with emoji indicators (🟡🟠🔴)

### YOLO Mode (v10.1.0)
```
--dangerously-skip-permissions  → Skip all prompts
--dangerously-allow-write       → Auto-approve writes
--dangerously-allow-shell       → Auto-approve shell
```
- **Warnings:** Loud ⚠️ warnings on enable
- **Audit:** Logged as `approvedBy: 'yolo'`
- **Default:** OFF (safe by default)

---

## Modes System (v10.1.0)

### Predefined Modes
```
ask         → Read-only, no tools unless requested
debug       → Heavy diagnostics, full tool access
architect   → Planning-first, read-only tools
orchestrator → Multi-step with approval gates
auto        → Automatic detection based on input
```

### Mode Configuration
- **File:** `vibe-cli/src/core/modes.ts`
- **Structure:** `MODE_CONFIGS` with system_prompt, allowed_tools, tool_restrictions
- **Switching:** `/mode set <name>` or auto-detect
- **Persistence:** Stored in session metadata

---

## Steering System (v10.1.0)

### Steering File Locations (Priority)
1. `.vibe/steering/` (workspace, highest priority)
2. `.kiro/steering/` (Kiro compatibility)
3. `~/.vibe/steering/` (user global)
4. `~/.kiro/steering/` (legacy Kiro)

### Steering File Format
```markdown
## About This Project
Project context and description

## Rules
- Rule 1
- Rule 2

## Tools
- Allow file operations
- Allow shell with approval

## Hooks
- onFileWrite: prompt: Verify changes
- onSessionStart: prompt: Review context
```

### Steering Functions
- **File:** `vibe-cli/src/core/steering.ts`
- **Functions:** `loadAllSteering()`, `getSteeringForPrompt()`, `getHooksForEvent()`
- **Merge:** Global + workspace steering merged with workspace priority
- **Hooks:** Event-driven automation (onPromptSubmitted, onToolCallProposed, onFileWrite, onSessionStart)

---

## MCP Integration (v10.1.0)

### MCP Manager
- **File:** `vibe-cli/src/mcp/manager.ts`
- **Transport Support:** stdio, SSE, HTTP
- **Functions:** `connect()`, `connectAll()`, `streamToolCall()`, `listTools()`
- **Config:** `mcpServers` in vibe.json

### MCP Configuration Example
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"],
      "transport": "stdio"
    },
    "custom": {
      "url": "http://localhost:3000/mcp",
      "transport": "sse"
    }
  }
}
```

### MCP Commands
```
/mcp list                   → List all servers + tool counts
/mcp add <name> <config>    → Add MCP server
/mcp remove <name>          → Remove server
/mcp toggle <name>          → Enable/disable
/mcp refresh                → Refresh tool discovery
```

---

## Custom Commands (v10.1.0)

### Storage Locations
- `~/.vibe/commands/` (user global)
- `.vibe/commands/` (workspace)

### Command File Format
```markdown
---
name: review-pr
description: Review a GitHub pull request
aliases: [pr-review, review]
---

# Review Pull Request

Please review PR #$PR_NUMBER

## Checklist
- [ ] Code quality
- [ ] Security
```

### Custom Command Functions
- **File:** `vibe-cli/src/commands/custom/parser.ts`
- **Functions:** `loadCustomCommands()`, `getCommand()`, `expandPrompt()`, `createCommand()`, `deleteCommand()`
- **Caching:** 5s TTL for performance
- **Syntax:** Both `$ARG` and `${ARG}` supported

### Commands
```
/cmd list                   → List all commands
/cmd new <name>             → Create command
/cmd delete <name>          → Delete command
/cmd show <name>            → Show details
/cmd <name> [args...]       → Execute command
```

---

## Test Coverage

### Test Locations
```
tests/
├── unit/                    → Component-level tests
├── integration/             → Workflow-level tests
├── e2e/                     → End-to-end scenarios
├── security/                → Security-specific tests
├── providers/               → Provider tests
├── mcp/                     → MCP integration tests
├── commands/                → Command tests
├── agents/                  → Agent role tests
├── automation/              → Automation tests
├── observability/           → Metrics/logging tests
└── performance/             → Performance benchmarks
```

### Test Files (782 tests total)
- `compatibility-contract.test.ts` (15 tests)
- `permissions.test.ts`
- `checkpoints.test.ts`
- `modes.test.ts`
- `steering.test.ts`
- `mcp-manager.test.ts`
- `custom-commands.test.ts`
- `audit-approval.test.ts`
- `provider-fallback.test.ts`
- And 40+ more test files

### Test Execution
```bash
npm test                    → Run all tests
npm run test:unit           → Unit tests only
npm run test:integration    → Integration tests
npm run test:e2e            → End-to-end tests
npm run test:security       → Security tests
npm run test:coverage       → With coverage report
```

---

## Known Issues & Technical Debt

### Current Issues
1. **Circular Import in Providers** - Some provider tests skipped due to circular dependencies
2. **Audit Log Truncation** - audit.log file grows unbounded (needs rotation)
3. **Memory Compaction** - Auto-compact not fully tested with large sessions
4. **MCP SSE Transport** - Streaming tool calls need more error handling

### Technical Debt
1. **Tool Timeout Handling** - Could be more granular per-tool
2. **Permission Cache Invalidation** - No TTL on session cache
3. **Steering Merge Logic** - Could be optimized for large steering files
4. **Custom Command Caching** - 5s TTL is hardcoded, should be configurable

### Performance Targets (v10.1.0)
- CLI cold start: ~113ms ✅
- Build size: 3.4MB ✅
- Test coverage: 782 tests ✅

---

## Breaking Changes (v10.0.0 → v10.1.0)

**NONE** - Full backward compatibility maintained

### Deprecated (But Still Supported)
- `--auto-approve` flag → Use `--allow-tools` instead
- `/t` alias for tools → Use `/tl` or `/tools`
- `/scan` alias for analyze → Use `/az` or `/analyze`

---

## Version History

| Version | Release Date | Status | Key Features |
|---------|-------------|--------|--------------|
| 10.1.0 | 2025-12-30 | In Progress | Safe defaults, YOLO mode, batch, pipelines, checkpoints |
| 10.0.0 | 2025-12-30 | Released | Safe agent system, provider registry, MCP, observability |
| 9.0.0 | 2025-12-15 | Released | Multi-agent, extended thinking, web search, plan mode |

---

## Next Steps (Phase-by-Phase)

1. ✅ **Step 1: Repository Scan** (COMPLETE)
2. ⏳ **Step 2: Compatibility Tests** - Add regression tests for all existing commands
3. ⏳ **Step 3: Phase A Implementation** - Interactive TUI + Headless mode refinements
4. ⏳ **Step 4: Phase B-L** - Remaining features (already mostly implemented in v10.1.0)
5. ⏳ **Step 5: Final Release** - Version bump, tag, publish to NPM
