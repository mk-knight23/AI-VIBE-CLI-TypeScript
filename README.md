<div align="center">

# 🔷 AI-VIBE-CLI-TypeScript

### **Vibe — The 8-Primitive AI Development Tool**
*TypeScript · Node.js · MCP · Commander · Better SQLite3*

[![npm](https://img.shields.io/npm/v/vibe-ai-teammate?style=for-the-badge&color=CB3837&logo=npm)](https://npmjs.com/package/vibe-ai-teammate)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![MCP](https://img.shields.io/badge/MCP-Native-8B5CF6?style=for-the-badge)](https://modelcontextprotocol.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

**[📦 npm](https://npmjs.com/package/vibe-ai-teammate)** · **[📖 Docs](#documentation)** · **[⭐ Star](https://github.com/mk-knight23/AI-VIBE-CLI-TypeScript)**

</div>

---

## 🎯 The 8-Primitive Architecture

Unlike other AI CLIs that add features randomly, **Vibe** is built around exactly 8 core primitives that compose into any workflow:

| Primitive | Purpose | Example |
|-----------|---------|---------|
| **1. Context** | Load project context | Read files, git history, config |
| **2. Plan** | Create execution plan | Break task into steps |
| **3. Execute** | Run code/commands | Bash, Node, Python |
| **4. Observe** | Read results | Parse output, check errors |
| **5. Decide** | Branch on conditions | If tests pass → deploy |
| **6. Remember** | Persist state | Save to SQLite, config |
| **7. Communicate** | Output results | Rich terminal, notifications |
| **8. Adapt** | Learn from feedback | Update plan based on results |

Every feature in Vibe is built from combinations of these 8 primitives.

---

## ⚡ Installation

```bash
npm install -g vibe-ai-teammate
vibe init                    # Initialize in current project
vibe config set key sk-ant-... # Set Anthropic API key
vibe start                   # Launch interactive session
```

---

## 🏗️ Architecture

```
src/
├── core/
│   ├── primitives/
│   │   ├── context.ts       # Primitive 1: Context loading
│   │   ├── plan.ts          # Primitive 2: Task planning
│   │   ├── execute.ts       # Primitive 3: Code execution
│   │   ├── observe.ts       # Primitive 4: Output observation
│   │   ├── decide.ts        # Primitive 5: Decision branching
│   │   ├── remember.ts      # Primitive 6: State persistence
│   │   ├── communicate.ts   # Primitive 7: Rich output
│   │   └── adapt.ts         # Primitive 8: Learning/adaptation
│   ├── agent.ts             # Agent loop orchestrating primitives
│   └── session.ts           # Session management (SQLite)
├── modules/
│   ├── code-assistant/      # Code writing, review, refactor
│   ├── debugging/           # Error analysis, stack traces
│   ├── deployment/          # CI/CD, Docker, cloud deploys
│   ├── testing/             # Test generation, coverage
│   ├── security/            # Vulnerability scanning (NEW v2.0)
│   └── analytics/           # Code metrics, complexity (NEW v2.0)
├── mcp/
│   ├── client.ts            # MCP client (connects to servers)
│   ├── server.ts            # Vibe as MCP server (expose tools)
│   └── registry.ts          # MCP server discovery
└── vibe-home/               # React dashboard (browser UI)
```

---

## 🔌 MCP — Native Integration

Vibe is MCP-native — both as a **client** (uses MCP tools) and a **server** (exposes its tools):

```typescript
// vibe as MCP server — expose Vibe tools to Claude Desktop, etc.
vibe mcp serve --port 3100

// vibe as MCP client — use any MCP server
vibe mcp connect github://ghcr.io/github/mcp-server
vibe mcp connect postgresql://localhost/mydb
vibe mcp connect filesystem:///path/to/project

// List all connected tools
vibe mcp tools
```

---

## 🧩 Module System

```bash
# Code Assistant Module
vibe code review src/api/auth.ts
vibe code refactor --pattern "callback to async/await" src/
vibe code generate "REST API endpoint for user authentication"

# Debugging Module
vibe debug --stack-trace error.log
vibe debug --reproduce "TypeError: Cannot read property 'id' of undefined"

# Testing Module
vibe test generate src/services/userService.ts
vibe test run --coverage --watch
vibe test audit  # Analyze test quality and gaps

# Deployment Module
vibe deploy --provider vercel
vibe deploy --provider aws-ecs --image myapp:latest
vibe deploy status

# Security Module (v2.0)
vibe security scan  # Full codebase security audit
vibe security deps  # Dependency vulnerability check
vibe security secrets  # Detect hardcoded secrets

# Analytics Module (v2.0)
vibe analytics complexity  # Cyclomatic complexity report
vibe analytics coverage    # Test coverage gaps
vibe analytics duplication # Code duplication detection
```

---

## 🖥️ Web Dashboard

```bash
vibe dashboard  # Opens browser dashboard at http://localhost:4000
```

The built-in React dashboard (in `vibe-home/`) provides:
- Real-time session monitoring
- Tool call history visualization
- Code metrics dashboard
- MCP server connection manager
- API key management

---

## 💾 SQLite-Powered Sessions

All sessions are stored in a local SQLite database:

```typescript
// Automatic session management
vibe session list              # All previous sessions
vibe session resume <id>       # Resume from any point
vibe session export <id>       # Export session as markdown
vibe session search "auth bug" # Semantic search through sessions
```

---

## 📦 Commands

```bash
vibe start                  # Interactive REPL
vibe run "<task>"           # Autonomous task execution
vibe init                   # Initialize project
vibe config                 # Configuration management
vibe mcp                    # MCP server management
vibe module list            # Available modules
vibe session                # Session management
vibe dashboard              # Web dashboard
```

---

## 🔗 AI-VIBE Ecosystem

> Part of **[AI-VIBE-ECOSYSTEM](https://github.com/mk-knight23/AI-VIBE-ECOSYSTEM)** — 11 production AI projects by [Kazi Musharraf](https://mkazi.live)

---

<div align="center">

**Built with 🔷 by [Kazi Musharraf](https://mkazi.live)**

[![GitHub](https://img.shields.io/badge/GitHub-mk--knight23-181717?style=flat&logo=github)](https://github.com/mk-knight23)
[![npm](https://img.shields.io/badge/npm-vibe--ai--teammate-CB3837?style=flat&logo=npm)](https://npmjs.com/package/vibe-ai-teammate)
[![Twitter](https://img.shields.io/badge/Twitter-@mk__knight__23-1DA1F2?style=flat&logo=twitter)](https://twitter.com/mk_knight_23)

*Part of the [AI-VIBE Ecosystem](https://github.com/mk-knight23/AI-VIBE-ECOSYSTEM) · Built in India 🇮🇳*

</div>
