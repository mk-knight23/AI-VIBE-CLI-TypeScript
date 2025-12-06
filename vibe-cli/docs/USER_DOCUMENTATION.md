# VIBE CLI v8.0.0 - User Documentation

## 🚀 Quick Start

```bash
npm install -g vibe-ai-cli
vibe
```

---

## 📖 Overview

VIBE CLI is an AI-powered development assistant with revolutionary memory, 36 tools across 14 categories, and 8 advanced AI capabilities.

**Key Features:**
- 3-layer memory system (Story, Chat, Workspace)
- 8 advanced AI tools (analyze, refactor, test, optimize, etc.)
- 36 tools across 14 categories
- Multi-provider AI support (OpenRouter, MegaLLM, AgentRouter, Routeway)
- 27+ models available

---

## 🎯 Core Commands

### Essential Commands
```bash
/help              # Show all commands
/model <name>      # Switch AI model
/provider <name>   # Switch AI provider
/memory            # View memory context
/clear             # Clear conversation
/quit              # Exit CLI
```

### Development Commands
```bash
/create <type>     # Create project (react, node, etc.)
/analyze           # Analyze codebase
/test              # Generate tests
/refactor          # Smart refactoring
/optimize          # Optimize bundle
/security          # Security scan
/docs              # Generate documentation
/migrate           # Migrate code (CommonJS→ESM, JS→TS)
```

### Git Commands
```bash
/commit            # Smart commit with AI message
/push              # Push to remote
/pull              # Pull from remote
/branch            # Manage branches
```

### Deployment Commands
```bash
/deploy            # Deploy to cloud
/docker            # Docker operations
/cloud             # Cloud management
```

---

## 🧠 Memory System

### Story Memory
Tracks your development journey across sessions:
- Project goals and milestones
- Challenges and solutions
- Key learnings
- Timeline of events

### Chat History
- Stores last 100 messages
- Semantic search: Find past conversations
- Token tracking for optimization

### Workspace Memory
- Tracks 50 recent changes
- Monitors dependencies
- Git branch/remote tracking
- Project structure analysis

**Usage:**
```bash
/memory            # View all memory
/memory search <query>  # Search chat history
/memory clear      # Clear memory
```

---

## 🛠️ Advanced AI Tools

### 1. Code Quality Analyzer
Analyzes code metrics, complexity, duplicates, and long functions.
```bash
/analyze <file>
```

### 2. Smart Refactoring
Extract functions, inline code, improve structure.
```bash
/refactor <file> <type>
```

### 3. Auto Test Generator
Generate tests for vitest, jest, or mocha.
```bash
/test <file> [framework]
```

### 4. Bundle Optimizer
Find large files and unused dependencies.
```bash
/optimize
```

### 5. Security Scanner
Detect secrets, vulnerabilities, and security issues.
```bash
/security
```

### 6. Performance Benchmark
Measure file operations and parse times.
```bash
/benchmark <file>
```

### 7. Documentation Generator
Create markdown documentation from code.
```bash
/docs <file>
```

### 8. Code Migrator
Migrate CommonJS→ESM or JavaScript→TypeScript.
```bash
/migrate <file> <from> <to>
```

---

## 📂 Tool Categories

**14 Categories, 36 Tools:**

1. **Filesystem** (14 tools) - read, write, delete, copy, move, etc.
2. **Shell** (1 tool) - execute commands
3. **Web** (2 tools) - fetch, search
4. **Memory** (3 tools) - context, search, clear
5. **Git** (4 tools) - commit, push, pull, branch
6. **Project** (1 tool) - create projects
7. **Analysis** (1 tool) - code quality
8. **Refactor** (1 tool) - smart refactoring
9. **Testing** (1 tool) - test generation
10. **Optimization** (1 tool) - bundle optimization
11. **Security** (1 tool) - security scanning
12. **Performance** (1 tool) - benchmarking
13. **Documentation** (1 tool) - doc generation
14. **Migration** (1 tool) - code migration

---

## 🎨 Usage Examples

### Create a React Project
```bash
/create react my-app
cd my-app
/analyze src/App.jsx
/test src/App.jsx vitest
```

### Security Audit
```bash
/security
/optimize
/analyze src/
```

### Code Migration
```bash
/migrate old.js commonjs esm
/test old.ts vitest
/docs old.ts
```

### Smart Development Workflow
```bash
# 1. Set goal
"I want to build a REST API"

# 2. Create project
/create node api-server

# 3. Analyze code
/analyze src/index.js

# 4. Generate tests
/test src/index.js

# 5. Security check
/security

# 6. Deploy
/deploy vercel
```

---

## ⚙️ Configuration

### Set Preferences
```bash
/config set framework react
/config set testFramework vitest
/config set editor vscode
```

### View Configuration
```bash
/config list
```

---

## 🔒 Security Features

- Dangerous command blocking (rm -rf /, chmod 777, etc.)
- Sandbox isolation
- Memory limits (128MB)
- Timeout enforcement (60s)
- Secret detection in code

---

## ⚡ Performance

- File operations: <100ms
- Batch operations: <500ms
- Memory usage: <128MB
- Tool execution: <1s

---

## 🆘 Troubleshooting

### Common Issues

**Memory full?**
```bash
/memory clear
```

**Slow performance?**
```bash
/optimize
/benchmark <file>
```

**Security concerns?**
```bash
/security
```

**Need help?**
```bash
/help
/help <command>
```

---

## 📊 Tips & Best Practices

1. **Use memory search** to find past solutions
2. **Set project goals** for better context
3. **Run security scans** regularly
4. **Generate tests** before refactoring
5. **Optimize bundles** before deployment
6. **Use smart commits** for better git history

---

## 🔗 Resources

- GitHub: https://github.com/mk-knight23/vibe
- NPM: https://www.npmjs.com/package/vibe-ai-cli
- Website: https://vibe-ai.vercel.app

---

**Version:** 8.0.0  
**Status:** Production Ready  
**License:** MIT
