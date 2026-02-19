# ⚡ VIBE CLI

<p align="center">
  <img src="https://img.shields.io/badge/AI--VIBE-CLI--TypeScript-blue?style=for-the-badge&logo=typescript&logoColor=white" alt="AI Vibe Project">
  <br>
  <b>AI Developer Teammate - One command, infinite capability.</b>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/vibe-ai-teammate"><img src="https://img.shields.io/npm/v/vibe-ai-teammate.svg" alt="NPM version"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg" alt="Node.js"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-Supported-orange.svg" alt="MCP Supported"></a>
</p>

---

## 🗺️ Quick Navigation

- [✨ Features](#-features)
- [🚀 Quick Start](#-quick-start)
- [📦 Installation](#-installation)
- [⚙️ Configuration](#%EF%B8%8F-configuration)
- [💻 Usage](#-usage)
- [📚 Commands](#-commands)
- [🏗️ Architecture](#%EF%B8%8F-architecture)
- [🛠️ Development](#%EF%B8%8F-development)
- [🤝 Contributing](#-contributing)

---

## 🛠️ Engineered With

<p align="left">
  <a href="https://typescriptlang.org"><img src="https://skillicons.dev/icons?i=ts" alt="TypeScript"></a>
  <a href="https://nodejs.org"><img src="https://skillicons.dev/icons?i=nodejs" alt="Node.js"></a>
  <a href="https://sqlite.org"><img src="https://skillicons.dev/icons?i=sqlite" alt="SQLite"></a>
  <a href="https://expressjs.com"><img src="https://skillicons.dev/icons?i=express" alt="Express"></a>
  <a href="https://react.dev"><img src="https://skillicons.dev/icons?i=react" alt="React"></a>
</p>

---

VIBE CLI is an opinionated AI development tool that uses an 8-primitives architecture and Model Context Protocol (MCP) to provide intelligent, context-aware assistance for software development tasks.

## ✨ Features

- **🎯 Single Command Interface** - Just run `vibe` and describe what you need
- **🧠 8-Primitives Architecture** - Planning, Completion, Execution, MultiEdit, Approval, Memory, Determinism, Search, Orchestration
- **🔌 MCP-First** - Built on Model Context Protocol for extensible context integration
- **🤖 Multi-Provider Support** - Anthropic Claude, OpenAI GPT, MiniMax, and more
- **🔒 Secure by Default** - API key authentication, sandboxed plugin system, permission controls
- **⚡ Lightning Fast** - Async file operations, LRU caching, smart context management
- **🔧 Extensible Plugin System** - Build and share custom plugins with the community

---

## 🚀 Quick Start

```bash
# Install VIBE CLI
npm install -g vibe-ai-teammate

# Run VIBE (interactive mode)
vibe

# Give it a task
vibe "Add user authentication to the API"
```

**That's it!** VIBE will:
1. Analyze your codebase
2. Plan the implementation
3. Execute changes with your approval
4. Test and verify the result

---

## 📦 Installation

### Prerequisites
- **Node.js** >= 20.0.0
- **npm** or **yarn** or **pnpm**

### Install via npm
```bash
npm install -g vibe-ai-teammate
```

### Install via GitHub
```bash
git clone https://github.com/mk-knight23/AI-VIBE-CLI-TypeScript.git
cd AI-VIBE-CLI-TypeScript
npm install
npm run build
npm link
```

### Verify Installation
```bash
vibe --version
vibe --help
```

---

## ⚙️ Configuration

### Environment Variables
Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

**Required Variables:**
```bash
# AI Provider API Keys
ANTHROPIC_API_KEY=your_anthropic_api_key_here          # For Claude models
OPENAI_API_KEY=your_openai_api_key_here          # For GPT models (optional)
MINIMAX_API_KEY=your_minimax_api_key_here                     # For MiniMax (optional)
```

**Optional Variables:**
```bash
# VIBE API Server
VIBE_API_KEY=your_secret_key            # REST API authentication
VIBE_ALLOWED_ORIGINS=http://localhost:3000  # CORS allowed origins

# Default Provider
VIBE_PROVIDER=anthropic                 # anthropic | openai | minimax

# Debug Mode
DEBUG=true                            # Enable verbose logging
```
See [`.env.example`](./.env.example) for all options.

### VIBE Config File
VIBE also supports a `vibe.config.json` file in your project root:
```json
{
  "provider": "anthropic",
  "tier": "balanced",
  "mcpServers": ["./mcp/servers/*.json"],
  "plugins": ["@vibe/eslint", "@vibe/prettier"]
}
```

---

## 💻 Usage

### Interactive Mode (Default)
```bash
vibe
```
VIBE will start an interactive session where you can:
- Describe tasks in natural language
- Review and approve plans
- See real-time progress
- Ask follow-up questions

### Direct Task Mode
```bash
vibe "Add error handling to the user service"
vibe "Refactor: Extract validation logic"
vibe "Test: Add unit tests for AuthManager"
```

### Command Mode
VIBE also provides traditional CLI commands:
```bash
vibe scaffold react-component LoginForm
vibe test src/services/AuthService.ts
vibe fix src/utils/helpers.js
vibe commit "Add user authentication"
vibe pr
```

---

## 📚 Commands

### Core Commands
| Command | Description | Example |
|---------|-------------|---------|
| `vibe [task]` | Main AI assistant (interactive) | `vibe "Add user login"` |
| `vibe scaffold <template>` | Generate projects/components | `vcaffold react-component Button` |
| `vibe test [target]` | Generate and run tests | `vibe test src/utils/` |
| `vibe fix [target]` | Fix bugs and issues | `vibe fix src/api/` |

### Git Integration
| Command | Description | Example |
|---------|-------------|---------|
| `vibe commit` | AI-powered semantic commits | `vibe commit` |
| `vibe pr` | Generate PR descriptions | `vibe pr` |
| `vibe review` | AI code review | `vibe review` |

### Project Management
| Command | Description | Example |
|---------|-------------|---------|
| `vibe plan <task>` | Generate execution plan | `vibe plan "Add API endpoints"` |
| `vibe checkpoint` | Save/restore system state | `vibe checkpoint save` |
| `vibe batch <cmd>` | Batch process files | `vibe test **/*.test.ts` |

### System Commands
| Command | Description |
|---------|-------------|
| `vibe doctor` | System health check |
| `vibe config` | Interactive setup wizard |
| `vibe server` | Start REST API server |
| `vibe plugin` | Manage plugins |

---

## 🏗️ Architecture

<details>
<summary>Show 8-Primitives Architecture Details</summary>

### 8 Primitives
VIBE is built on 8 core primitives:
1. **Planning** - Task decomposition and strategy
2. **Completion** - LLM text generation
3. **Execution** - Command/tool execution
4. **MultiEdit** - File modifications
5. **Approval** - User confirmation flows
6. **Memory** - Context persistence
7. **Determinism** - Reproducible results
8. **Search** - Codebase analysis
9. **Orchestration** - Primitive coordination

### MCP Integration
VIBE uses [Model Context Protocol](https://modelcontextprotocol.io) for:
- Flexible context providers
- Server-side tool integration
- Extensible architecture

See `src/mcp/` for MCP implementation.
</details>


---

## 🛠️ Development

### Setup Development Environment
```bash
# Clone repository
git clone https://github.com/mk-knight23/AI-VIBE-CLI-TypeScript.git
cd AI-VIBE-CLI-TypeScript

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Run linter
npm run lint

# Type check
npm run type-check
```

### Project Structure
```
vibe/
├── src/
│   ├── cli/              # CLI entry points
│   ├── commands/         # Command implementations
│   ├── primitives/       # 8 primitives
│   ├── core/             # Core infrastructure
│   │   ├── ai-engine/   # LLM integration
│   │   ├── api/        # REST API
│   │   └── database/   # SQLite persistence
│   ├── adapters/         # LLM provider adapters
│   ├── mcp/              # Model Context Protocol
│   └── tools/            # Tool implementations
├── tests/                # Test suites
└── docs/                  # Documentation
```

### Testing
```bash
# Run all tests
npm test
# Unit tests only
npm run test:unit
# Integration tests
npm run test:integration
# E2E tests with Playwright
npm run test:e2e
# Coverage report
npm run test:coverage
```

---

## 🔌 Plugin Development
Create custom plugins to extend VIBE:
```bash
# Create plugin scaffold
vibe plugin create my-plugin
```
See [PLUGIN-SECURITY.md](./.claude/PLUGIN-SECURITY.md) for security and API reference.

---

## 🤝 Contributing
We welcome contributions! Please see:
1. [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines
2. [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System design
3. [PLUGINS.md](./docs/PLUGINS.md) - Plugin development

---

## 📄 License
MIT © KAZI

## 🙏 Acknowledgments
Built with Anthropic Claude, Model Context Protocol, Commander.js, Express, and Better SQLite3.

## 📞 Support
- **Issues:** [GitHub Issues](https://github.com/mk-knight23/AI-VIBE-CLI-TypeScript/issues)
- **Discussions:** [GitHub Discussions](https://github.com/mk-knight23/AI-VIBE-CLI-TypeScript/discussions)

## 🗺️ Roadmap
See [ROADMAP.md](./ROADMAP.md) for planned features.

---

<p align="center">
  <b>Made with ❤️ by <a href="https://github.com/mk-knight23">KAZI</a></b>
</p>
