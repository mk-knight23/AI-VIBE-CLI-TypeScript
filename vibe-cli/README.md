# VIBE CLI v8.0.0

**Revolutionary AI Development Platform** - 36 Tools | 14 Categories | 3-Layer Memory | 8 Advanced AI Tools

[![npm version](https://badge.fury.io/js/vibe-ai-cli.svg)](https://www.npmjs.com/package/vibe-ai-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/tests-103%20passing-success)](https://github.com/mk-knight23/vibe)

## 🎉 What's New in v8.0.0

### Revolutionary 3-Layer Memory System
- **Story Memory** - Track project goals, milestones, challenges, and learnings across sessions
- **Chat History** - 100-message history with semantic search
- **Enhanced Workspace** - 50 recent changes, dependency tracking, git integration

### 8 Advanced AI-Powered Tools
1. **Code Quality Analyzer** - Complexity, duplicates, long functions
2. **Smart Refactoring** - Extract, inline refactoring
3. **Auto Test Generator** - Vitest, jest, mocha support
4. **Bundle Optimizer** - Large files, unused dependencies
5. **Security Scanner** - Secrets, vulnerabilities
6. **Performance Benchmark** - File ops, parse time
7. **Documentation Generator** - Markdown docs from code
8. **Code Migrator** - CommonJS→ESM, JS→TS

### Enhanced Tool System
- **36 tools** across **14 categories** (up from 28 tools, 6 categories)
- Better organization and discoverability
- 100% test coverage (103 tests passing)

---

## 🚀 Quick Start

```bash
# Install
npm install -g vibe-ai-cli

# Run
vibe

# Start chatting
"Build a REST API with authentication"
```

---

## ✨ Key Features

### 🧠 Revolutionary Memory System
- **Story Memory** - Maintains project context across weeks/months
- **Chat History** - Search past conversations with semantic search
- **Workspace Tracking** - Monitors dependencies, git, and 50 recent changes
- **Task History** - Tracks 20 recent tasks with duration and success metrics

### 🛠️ 36 Development Tools in 14 Categories

**Filesystem** (14 tools)
- read_file, write_file, delete_file, copy_file, move_file
- create_directory, list_directory, search_files
- get_file_info, read_multiple_files, glob_search
- append_to_file, replace_in_file, batch_operations

**Shell** (1 tool)
- run_shell_command

**Web** (2 tools)
- web_fetch, web_search

**Memory** (3 tools)
- get_memory_context, search_chat_history, clear_memory

**Git** (4 tools)
- git_commit, git_push, git_pull, git_branch

**Project** (1 tool)
- create_project

**Analysis** (1 tool)
- analyze_code_quality

**Refactor** (1 tool)
- smart_refactor

**Testing** (1 tool)
- generate_tests

**Optimization** (1 tool)
- optimize_bundle

**Security** (1 tool)
- security_scan

**Performance** (1 tool)
- performance_benchmark

**Documentation** (1 tool)
- generate_documentation

**Migration** (1 tool)
- migrate_code

### 🤖 Multi-Provider AI Support
- **OpenRouter** - 27+ models (GPT-4, Claude, Gemini, DeepSeek)
- **MegaLLM** - Free API with powerful models
- **AgentRouter** - Specialized AI agents
- **Routeway** - Optimized routing

---

## 📖 Usage

### Basic Commands
```bash
/help              # Show all commands
/model <name>      # Switch AI model
/provider <name>   # Switch AI provider
/memory            # View memory context
/quit              # Exit
```

### Advanced AI Tools
```bash
/analyze <file>           # Code quality analysis
/refactor <file> <type>   # Smart refactoring
/test <file> [framework]  # Generate tests
/optimize                 # Bundle optimization
/security                 # Security scan
/benchmark <file>         # Performance benchmark
/docs <file>              # Generate documentation
/migrate <file> <from> <to> # Code migration
```

### Memory Commands
```bash
/memory                   # View all memory
/memory search <query>    # Search chat history
/memory clear             # Clear memory
```

---

## 🎯 Use Cases

### Long-term Project Development
```bash
# Session 1: Start
"Build a microservices platform"
/create node api-gateway

# Session 2 (days later)
# Memory remembers your goal
/analyze src/
/test src/gateway.js

# Session 3 (weeks later)
# Full context maintained
/security
/deploy
```

### Code Quality Workflow
```bash
/analyze src/app.js
/refactor src/app.js extract
/test src/app.js vitest
/docs src/app.js
/security
```

### Migration Workflow
```bash
/migrate old.js commonjs esm
/migrate old.js javascript typescript
/test old.ts vitest
/docs old.ts
```

---

## 📊 Statistics

| Metric | v7.0.7 | v8.0.0 | Change |
|--------|--------|--------|--------|
| Tools | 28 | 36 | +29% |
| Categories | 6 | 14 | +133% |
| Task History | 10 | 20 | +100% |
| Recent Changes | 20 | 50 | +150% |
| Chat History | 0 | 100 | New |
| Advanced Tools | 0 | 8 | New |
| Memory Layers | 1 | 3 | +200% |
| Tests | 99 | 103 | +4% |

---

## 🧪 Testing

**Complete Test Suite: 103/103 Passing**

```bash
npm test                    # Run all tests
npm test:unit              # Unit tests (45)
npm test:integration       # Integration tests (23)
npm test:e2e               # E2E tests (14)
npm test:security          # Security tests (15)
npm test:performance       # Performance tests (6)
```

---

## 📚 Documentation

- **User Guide:** [docs/USER_DOCUMENTATION.md](docs/USER_DOCUMENTATION.md)
- **Developer Guide:** [docs/DEVELOPER_DOCUMENTATION.md](docs/DEVELOPER_DOCUMENTATION.md)
- **Release Notes:** [docs/V8_RELEASE_NOTES.md](docs/V8_RELEASE_NOTES.md)

---

## 🔒 Security

- Dangerous command blocking (rm -rf /, chmod 777, etc.)
- Sandbox isolation
- Secret detection
- Memory limits (128MB)
- Timeout enforcement (60s)

---

## ⚡ Performance

- File operations: <100ms
- Batch operations: <500ms
- Memory usage: <128MB
- Tool execution: <1s

---

## 🛠️ Development

```bash
# Clone
git clone https://github.com/mk-knight23/vibe.git
cd vibe/vibe-cli

# Install
npm install

# Build
npm run build

# Test
npm test

# Run locally
npm start
```

---

## 📦 Installation

### Global Installation
```bash
npm install -g vibe-ai-cli
```

### Local Installation
```bash
npm install vibe-ai-cli
npx vibe
```

### Upgrade from v7
```bash
npm update -g vibe-ai-cli
```

---

## 🔄 Migration from v7.0.7

v8.0.0 is **fully backward compatible**. No breaking changes.

**New features to adopt:**
1. Set project goals for better context
2. Use memory search to find past conversations
3. Try advanced AI tools (/analyze, /security, /optimize)
4. Track your progress with story memory

---

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

---

## 📄 License

MIT © VIBE Team

---

## 🔗 Links

- **GitHub:** https://github.com/mk-knight23/vibe
- **NPM:** https://www.npmjs.com/package/vibe-ai-cli
- **Website:** https://vibe-ai.vercel.app
- **Issues:** https://github.com/mk-knight23/vibe/issues

---

## 🙏 Acknowledgments

Thanks to all contributors and users who helped shape v8.0.0!

---

**Version:** 8.0.0  
**Release Date:** December 6, 2025  
**Status:** ✅ Production Ready  
**Tests:** 103/103 Passing
