# VIBE - The Open Source AI Coding Agent

[![npm version](https://badge.fury.io/js/vibe-ai-cli.svg)](https://www.npmjs.com/package/vibe-ai-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Free models included. Connect any model from any provider.

## Quick Install

```bash
# npm
npm install -g vibe-ai-cli

# curl
curl -fsSL https://vibe-ai.dev/install | bash
```

## What is VIBE?

VIBE is an open source agent that helps you write code in your terminal, IDE, or desktop.

- **LSP Enabled** - Automatically loads the right LSPs for the LLM
- **Multi-Session** - Start multiple agents in parallel on the same project
- **Share Links** - Share a link to any session for reference or debugging
- **Any Model** - 75+ LLM providers, including local models
- **Privacy First** - Your code stays local by default

## Features

| Feature | Description |
|---------|-------------|
| 🔧 LSP Auto-Detection | TypeScript, Python, Rust, Go, Java, Ruby, C++ |
| 📦 75+ Providers | OpenAI, Anthropic, DeepSeek, Groq, Ollama, and more |
| 🆓 Free Models | Start coding without an API key |
| 🔒 Privacy First | No data stored by default |
| 🔗 Share Links | Share sessions for collaboration |
| 📋 Multi-Session | Run parallel agents |

## Usage

```bash
# Start interactive mode
vibe

# Connect a provider
vibe connect openai
vibe connect ollama

# List models
vibe models
vibe models --local
vibe models --cheap

# Manage sessions
vibe sessions new
vibe sessions list
vibe sessions share

# Privacy settings
vibe privacy
vibe privacy --local-only
```

## Ecosystem

| Package | Description |
|---------|-------------|
| [vibe-cli](./vibe-cli) | Terminal AI assistant |
| [vibe-code](./vibe-code) | VS Code extension |
| [vibe-web](./vibe-web) | Web dashboard |

## Privacy

VIBE does not store any of your code or context data by default. Enable storage explicitly:

```bash
vibe privacy --allow-storage
```

For fully local operation:

```bash
vibe privacy --local-only
vibe connect ollama
```

## License

MIT © VIBE Team

---

**GitHub**: https://github.com/mk-knight23/vibe
**NPM**: https://www.npmjs.com/package/vibe-ai-cli
