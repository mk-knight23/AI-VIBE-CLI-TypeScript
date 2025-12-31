# VIBE CLI v10.1.0

The open source AI coding agent. Prompt to code to deployment in your terminal.

[![npm version](https://badge.fury.io/js/vibe-ai-cli.svg)](https://www.npmjs.com/package/vibe-ai-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Install

```bash
npm install -g vibe-ai-cli
```

## Quick Start

```bash
# Interactive mode
vibe

# One-shot prompt
vibe ask "create a React component for a todo list"

# Batch processing
vibe batch prompts.txt --parallel --output results

# Pipelines
vibe pipeline research "React vs Vue 2025" --depth deep
```

## Features

| Feature | Description |
|---------|-------------|
| **75+ Providers** | OpenAI, Anthropic, Google, DeepSeek, Groq, Ollama, and more |
| **Free Models** | Start coding without an API key |
| **37 Tools** | File ops, shell, git, web, analysis, refactoring |
| **10 Agents** | Researcher, Analyst, Planner, Builder, Reviewer, and more |
| **4 Pipelines** | Research, Analysis, Report, Automation |
| **Batch Mode** | Process multiple prompts from file |
| **Project Rules** | AI behavior rules in .vibe/rules/ |
| **Project Memory** | Long-term knowledge persistence |
| **Workflows** | Multi-step pipelines with checkpoints |
| **4-Level Permissions** | ask / allow_once / allow_session / deny |
| **MCP Support** | stdio + SSE transports |
| **Safe Agent** | Plan → Approve → Execute → Verify → Rollback |

## CLI Modes

### Interactive (default)
```bash
vibe
```

### Non-Interactive
```bash
vibe ask "your question" --json --auto-approve
```

### Batch Processing
```bash
vibe batch prompts.txt --parallel --output results --format json
```

### Pipelines
```bash
vibe pipeline research "topic" --depth deep
vibe pipeline analyze --file data.json --type compare
vibe pipeline report "Q4 Review" --type executive
vibe pipeline automate "setup CI" --type ci --dry
```

## Commands

```
vibe                    Interactive mode
vibe ask "..."          One-shot prompt
vibe batch <file>       Batch processing
vibe cmd <name>         Custom command
vibe pipeline <type>    Run pipeline
vibe connect <provider> Add credentials
vibe providers          List providers
vibe models             List models
vibe agents             List agents
vibe rules              Manage rules
vibe workflow           Manage workflows
vibe sessions           Manage sessions
vibe memory             Project memory
vibe privacy            Privacy settings
```

## Configuration

### Project Rules (.vibe/rules/*.md)
```markdown
---
name: code-style
scope: code
priority: 10
---
Always use TypeScript strict mode.
Prefer const over let.
```

### Custom Commands (.vibe/commands/*.md)
```markdown
---
name: review
args:
  - file
---
Review $file for bugs and improvements.
```

### Workflows (.vibe/workflows/*.yaml)
```yaml
name: deploy
steps:
  - agent: builder
    input: "Build the project"
  - agent: reviewer
    requiresApproval: true
  - agent: builder
    input: "Deploy to production"
```

## What's New in v10.1.0

- **Batch Mode** - `vibe batch` for multi-prompt processing
- **Pipelines** - Research, Analysis, Report, Automation
- **Project Rules** - AI behavior rules in .vibe/rules/
- **Project Memory** - Long-term knowledge persistence
- **Workflow Checkpoints** - Approval gates in workflows
- **Parallel Steps** - Concurrent agent execution
- **Path Permissions** - Sensitive path protection
- **SSE MCP** - HTTP/SSE transport for MCP servers
- **Export System** - JSON, Markdown, HTML, CSV

## Privacy

```bash
vibe privacy --local-only  # Use only local models
vibe connect ollama        # Connect to Ollama
```

## License

MIT © VIBE Team

---

**GitHub**: https://github.com/mk-knight23/vibe
**NPM**: https://www.npmjs.com/package/vibe-ai-cli
