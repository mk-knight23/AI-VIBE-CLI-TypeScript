# VIBE CLI v10.2.0

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
```

## AI Configuration

VIBE uses a **universal AI runtime** - one config file controls all AI behavior.

### Configuration File

Create `vibe.config.ai.json` in your project root:

```json
{
  "runtime": {
    "mode": "free-first",
    "timeout_ms": 45000,
    "retry": 2,
    "fallback": true
  },
  "providers": [
    {
      "id": "openrouter",
      "base_url": "https://openrouter.ai/api/v1",
      "auth": { "type": "bearer", "env": "OPENROUTER_API_KEY" },
      "priority": 1,
      "models": [
        { "id": "z-ai/glm-4.5-air:free", "task": "chat", "free": true },
        { "id": "qwen/qwen3-coder:free", "task": "code", "free": true },
        { "id": "deepseek/deepseek-r1-0528:free", "task": "agent", "free": true }
      ]
    }
  ]
}
```

### Configuration Options

| Field | Description |
|-------|-------------|
| `runtime.mode` | `free-first` (default), `paid-first`, or `any` |
| `runtime.timeout_ms` | Request timeout in milliseconds |
| `runtime.retry` | Number of retries on failure |
| `runtime.fallback` | Try next provider on failure |
| `providers[].priority` | Lower = higher priority |
| `models[].task` | `chat`, `code`, `debug`, `agent`, or `vision` |
| `models[].free` | Whether model is free tier |

### Environment Variables

Set your API key:

```bash
export OPENROUTER_API_KEY="sk-or-..."
```

### Adding Providers

Edit `vibe.config.ai.json` to add providers. Example with Ollama:

```json
{
  "id": "ollama",
  "base_url": "http://localhost:11434/v1",
  "auth": { "type": "none" },
  "priority": 2,
  "models": [
    { "id": "llama3.2", "task": "chat", "free": true }
  ]
}
```

## Features

| Feature | Description |
|---------|-------------|
| **Universal AI** | Single config for all providers |
| **Free-First** | Automatically uses free models |
| **37 Tools** | File ops, shell, git, web, analysis |
| **10 Agents** | Researcher, Analyst, Planner, Builder |
| **Batch Mode** | Process multiple prompts |
| **Project Rules** | AI behavior rules in .vibe/rules/ |
| **MCP Support** | stdio + SSE transports |

## Commands

```
vibe                    Interactive mode
vibe ask "..."          One-shot prompt
vibe batch <file>       Batch processing
vibe models             List available models
vibe status             Show AI configuration status
```

## Interactive Commands

```
/help                   Show help
/model                  Switch model
/mode                   Switch mode (ask/debug/architect)
/tools                  List available tools
/clear                  Clear conversation
/quit                   Exit
```

## License

MIT © VIBE Team
