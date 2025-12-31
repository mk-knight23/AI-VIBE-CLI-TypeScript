# VIBE CLI v11 - AI Operating System Architecture

## Implementation Summary

This document describes the architectural expansion of VIBE CLI from a coding assistant to a general-purpose AI operating system.

## Implemented Components

### Phase 2: Agent System (Complete)

**Files Created:**
- `src/agents/types.ts` - Core type definitions
- `src/agents/builtin.ts` - 10 built-in role-based agents
- `src/agents/registry.ts` - Agent registry with custom agent support
- `src/agents/executor.ts` - Agent execution with tool access and delegation
- `src/agents/index.ts` - Module exports

**Built-in Agents:**
| Agent | Description | Key Tools |
|-------|-------------|-----------|
| researcher | Multi-source research and synthesis | web_search, web_fetch, read_file |
| analyst | Data analysis and pattern discovery | read_file, analyze_code_quality |
| planner | Planning and decision support | read_file, get_project_info |
| writer | Content creation and documentation | read_file, write_file |
| builder | Code and artifact creation | write_file, run_shell_command |
| reviewer | Code review and quality assurance | analyze_code_quality, run_lint |
| summarizer | Content compression and extraction | read_file |
| verifier | Fact-checking and validation | web_search, web_fetch |
| auditor | Security and compliance auditing | security_scan |
| strategist | Strategic analysis and recommendations | web_search, analyst delegation |

**Features:**
- Composable agents that can delegate to sub-agents
- Custom agent definitions via YAML/JSON in `.vibe/agents/`
- Tool filtering per agent
- Permission-aware execution
- Structured output support

### Phase 3: Workflow System (Complete)

**Files Created:**
- `src/workflows/types.ts` - Workflow type definitions
- `src/workflows/parser.ts` - YAML/JSON workflow parser
- `src/workflows/runner.ts` - Multi-step workflow execution
- `src/workflows/index.ts` - Module exports

**Features:**
- Multi-step workflows with agent orchestration
- Variable interpolation (`${var}`, `$prev.output`)
- Conditional step execution
- Error handling (stop/continue/retry)
- Input/output definitions

**Example Workflow:**
```yaml
name: code-review
steps:
  - agent: analyst
    input: "Analyze ${target}"
    output: analysis
  - agent: reviewer
    input: "Review: $prev.output"
    output: review
```

### Phase 5: Memory System (Complete)

**Files Created:**
- `src/commands/memory.ts` - Memory management command

**Features:**
- Project-scoped memory (`.vibe/memory/`)
- Global memory (`~/.vibe/memory/`)
- Add files or content to memory
- Query memory with keyword search
- Token estimation

### Phase 6: Output System (Complete)

**Files Created:**
- `src/output/formatters.ts` - Multi-format output
- `src/output/index.ts` - Module exports
- `src/commands/output.ts` - Output command

**Supported Formats:**
- Markdown
- JSON
- Table (terminal)
- CSV
- YAML
- HTML

### CLI Commands (Complete)

**Quick Agent Commands:**
```bash
vibe plan <goal>        # Run planner agent
vibe research <topic>   # Run researcher agent
vibe analyze <target>   # Run analyst agent
vibe build <task>       # Run builder agent
vibe review <target>    # Run reviewer agent
vibe audit              # Run security auditor
```

**Workflow Commands:**
```bash
vibe workflow           # List workflows
vibe workflow run <n>   # Execute workflow
vibe workflow show <n>  # Show workflow details
vibe workflow create    # Show creation help
```

**Memory Commands:**
```bash
vibe memory             # List memory entries
vibe memory add <file>  # Add to memory
vibe memory show <key>  # Show entry
vibe memory query <q>   # Search memory
```

**Output Commands:**
```bash
vibe output table <d>   # Format as table
vibe output json <d>    # Format as JSON
vibe output csv <d>     # Format as CSV
vibe output convert <f> # Convert formats
```

## Example Workflows

Two example workflows are included:

1. **code-review.yaml** - Automated code review
2. **security-audit.yaml** - Security vulnerability scanning

## Architecture Principles

1. **Agents over features** - Capabilities are exposed through composable agents
2. **Tools over magic** - All actions go through the tool system
3. **Permission-aware** - Risky operations require approval
4. **Structured outputs** - Agents emit typed, exportable data
5. **Memory-enabled** - Context persists across sessions

## Remaining Phases

### Phase 4: Tool & MCP Expansion
- Browser MCP integration
- Calendar/email connectors
- Spreadsheet readers
- PDF/document parsers

### Phase 7: Enhanced Permissions
- Path-based permission rules
- Risk classification system
- Audit logging

### Phase 8: Performance
- Token budgeting
- Auto-compaction
- Lazy loading

## Usage

```bash
# Quick agent tasks
vibe plan "migrate to TypeScript"
vibe research "React state management best practices"
vibe audit

# Run workflows
vibe workflow run code-review --input target=src/

# Manage memory
vibe memory add README.md
vibe memory query "coding conventions"

# Format output
vibe output table data.json
vibe output csv data.json --output data.csv
```

## Custom Agents

Create `.vibe/agents/my-agent.yaml`:

```yaml
name: my-agent
description: Custom agent for my workflow
systemPrompt: |
  You are a specialized assistant...
tools:
  - read_file
  - write_file
outputs:
  - markdown
  - json
canDelegate:
  - reviewer
memoryScope: project
timeout: 180000
```

## Custom Workflows

Create `.vibe/workflows/my-workflow.yaml`:

```yaml
name: my-workflow
description: My custom workflow
inputs:
  target:
    type: string
    required: true
steps:
  - agent: analyst
    input: "Analyze ${target}"
    output: analysis
  - agent: writer
    input: "Generate report from ${analysis}"
    output: report
outputs:
  - report
```
