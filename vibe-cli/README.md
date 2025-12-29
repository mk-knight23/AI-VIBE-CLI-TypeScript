# VIBE CLI - The Open Source AI Coding Agent

**Version 10.0.0** | **20+ Providers** | **Safe Agents** | **MCP Support** | **Privacy First**

[![npm version](https://badge.fury.io/js/vibe-ai-cli.svg)](https://www.npmjs.com/package/vibe-ai-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Prompt to code to deployment in your terminal.

## Quick Start

```bash
npm install -g vibe-ai-cli
vibe
```

Free models included - no API key required!

---

## What's New in v10

| Feature | Description |
|---------|-------------|
| 🛡️ **Safe Agent System** | Plan→Propose→Wait→Execute→Verify with rollback |
| 🔌 **Provider Registry** | 20+ built-in providers, config-driven |
| 🔗 **MCP Integration** | Model Context Protocol server support |
| 📊 **Observability** | `/status` command with metrics & tracing |
| ✅ **543 Tests** | Production-hardened reliability |

---

## Features

| Feature | Description |
|---------|-------------|
| 🛡️ **Safe Agents** | Approval required for writes, automatic rollback |
| 🔌 **20+ Providers** | OpenAI, Anthropic, Google, DeepSeek, Groq, Ollama |
| 🔗 **MCP Support** | Connect external tool servers |
| 🤖 **Custom Agents** | Task-specific agents for your workflows |
| 📋 **Steering Files** | Project-specific AI guidance |
| ⚡ **Hooks** | Automated actions on save, commit, error |
| 🔧 **LSP Enabled** | Auto-loads language servers |
| 🆓 **Free Models** | Start without API keys |
| 🔒 **Privacy First** | No data stored by default |

---

## Installation

```bash
# npm (recommended)
npm install -g vibe-ai-cli

# curl
curl -fsSL https://vibe-ai.dev/install | bash

# upgrade
npm update -g vibe-ai-cli
```

---

## Commands

### Core

```bash
vibe                    # Start interactive mode
vibe --help             # Show help
vibe --version          # Show version
```

### Providers & Models

```bash
vibe connect            # Add provider credentials
vibe connect openai     # Configure OpenAI
vibe connect ollama     # Configure local Ollama
vibe providers          # List all providers
vibe models             # List all models
vibe models --local     # Local models only
vibe doctor             # Diagnose issues
vibe status             # System health & metrics
```

### MCP (Model Context Protocol)

```bash
vibe mcp init           # Create MCP config
vibe mcp connect        # Connect to servers
vibe mcp tools          # List available tools
vibe mcp status         # Connection status
```

### Custom Agents

```bash
vibe agents             # List all agents
vibe agents info coder  # Show agent details
```

Built-in agents: Auto, Coder, Reviewer, Debugger, Architect, Docs, Test

### Sessions & Privacy

```bash
vibe sessions           # List sessions
vibe sessions new       # Create new session
vibe privacy            # Show settings
vibe privacy --local-only
```

---

## Interactive Commands

```bash
/help              # Show commands
/model             # Switch model
/agent <name>      # Switch agent
/auto              # Autonomous mode
/tangent           # Start tangent conversation
/mcp               # Manage MCP servers
/status            # System status
/save              # Export conversation
/load              # Import conversation
/clear             # Clear conversation
/quit              # Exit
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `ctrl+t` | Start tangent conversation |
| `ctrl+j` | Multi-line input |
| `!cmd` | Execute shell command |

---

## Safe Agent System

v10 introduces a safety-first agent execution model:

```
Plan → Propose → WAIT → Execute → Verify → Report
```

- **Read operations**: Auto-approved (configurable)
- **Write operations**: Require explicit approval
- **Blocked operations**: Rejected before execution
- **Rollback**: Automatic on failure or cancellation

```bash
# Dry-run mode (no writes)
VIBE_DRY_RUN=true vibe
```

---

## Provider Registry

### Cloud Providers

| Provider | Env Variable |
|----------|--------------|
| OpenAI | `OPENAI_API_KEY` |
| Anthropic | `ANTHROPIC_API_KEY` |
| Google AI | `GOOGLE_API_KEY` |
| DeepSeek | `DEEPSEEK_API_KEY` |
| Groq | `GROQ_API_KEY` |
| Together | `TOGETHER_API_KEY` |
| Fireworks | `FIREWORKS_API_KEY` |
| Mistral | `MISTRAL_API_KEY` |
| xAI | `XAI_API_KEY` |
| Perplexity | `PERPLEXITY_API_KEY` |

### Gateways

| Provider | Env Variable |
|----------|--------------|
| OpenRouter | `OPENROUTER_API_KEY` |
| MegaLLM | `MEGALLM_API_KEY` |

### Local

| Provider | Default URL |
|----------|-------------|
| Ollama | `http://localhost:11434` |
| LM Studio | `http://localhost:1234` |

### Custom Provider

```typescript
import { registerProvider } from 'vibe-ai-cli';

registerProvider('my-provider', {
  name: 'My Provider',
  type: 'openai-compatible',
  baseUrl: 'https://api.example.com/v1',
  apiKeyEnv: 'MY_API_KEY',
});
```

---

## MCP Integration

Connect to Model Context Protocol servers for extended capabilities:

**.vibe/mcp.json**
```json
{
  "servers": [
    {
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."]
    }
  ]
}
```

```bash
vibe mcp init      # Create default config
vibe mcp connect   # Connect to servers
vibe mcp tools     # List available tools
```

---

## Configuration

### vibe.json

```json
{
  "$schema": "https://vibe.ai/schema.json",
  "model": "openrouter/google/gemini-2.0-flash-001",
  "routing": {
    "code": ["qwen/qwen-2.5-coder-32b"],
    "cheap": ["groq/llama-3.1-8b"]
  }
}
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VIBE_PROVIDER` | Default provider |
| `VIBE_MODEL` | Default model |
| `VIBE_DRY_RUN` | Enable dry-run mode |
| `VIBE_LOG_LEVEL` | Log level (debug/info/warn/error) |
| `VIBE_AUDIT` | Enable/disable audit logging |

---

## Observability

```bash
/status              # Full status
/status health       # Health checks
/status metrics      # Request metrics
/status traces       # Agent traces
```

Structured logs with execution IDs for debugging.

---

## Privacy

VIBE is built privacy-first:

- **No data stored** by default
- **No telemetry** by default
- **Local-only mode** available
- **Audit logging** optional

```bash
vibe privacy --local-only
```

---

## Migration from v9

| v9 | v10 | Notes |
|----|-----|-------|
| `/t` (tools) | `/tl` or `/tools` | Alias changed |
| `/scan` (analyze) | `/az` or `/analyze` | Alias changed |
| - | `/mcp` | New command |
| - | `/status` | New command |
| - | `/auto` | New command |

---

## FAQ

**Do I need an API key?**
No, VIBE includes free models via MegaLLM.

**Is my code sent to the cloud?**
Only with cloud models. Use `vibe privacy --local-only` for local-only.

**What is the Safe Agent System?**
A safety layer that requires approval for write operations and supports automatic rollback.

**What is MCP?**
Model Context Protocol - a standard for connecting AI tools to external servers.

---

## Links

- **GitHub**: https://github.com/mk-knight23/vibe
- **NPM**: https://www.npmjs.com/package/vibe-ai-cli
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md)

---

**Version:** 10.0.0 | **License:** MIT | **Author:** KAZI
