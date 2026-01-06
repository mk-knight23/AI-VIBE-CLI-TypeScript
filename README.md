# VIBE CLI v12

<p align="center">
  <strong>The AI Engineer That Feels Like a Teammate</strong>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-philosophy">Philosophy</a> •
  <a href="#-features">Features</a> •
  <a href="docs/index.md">Documentation</a> •
  <a href="docs/faq.md">FAQ</a>
</p>

---

## What is VIBE?

VIBE CLI v12 is an **interactive AI developer tool** that feels like Claude Code + Warp + Devin + Cursor — but simpler, safer, and deterministic.

**One command. One UI. Zero memorization.**

Instead of learning complex CLI syntax:

```bash
# Old way - memorization required
vibe --mode batch --model gpt-4 --agent planner --approval manual
vibe run workflow --name deploy --env production --approve
vibe exec --agent code --task "fix the bug" --provider anthropic
```

You just type what you want:

```
> vibe
vibe> "build auth for the API"
vibe> "fix the failing tests"
vibe> "deploy to gcp"
vibe> "undo that"
vibe> "remember this decision"
```

## Why v12?

VIBE CLI v12 represents a complete architectural redesign:

| Before | v12 |
|--------|-----|
| 75+ LLM providers | 5 best-in-class (OpenAI, Anthropic, Google, xAI, Local) |
| Multiple commands & subcommands | **Single** `vibe` command |
| Mode switching | Intent-driven natural language |
| 60+ scattered tools | **8 unified primitives** |
| Manual safety checks | Approval-first, safe-by-default |
| Complex setup | Zero-config TUI |

## 🚀 Quick Start

### Installation

```bash
# From source
git clone https://github.com/mk-knight23/VIBE-CLI.git
cd VIBE-CLI
npm install
npm run build

# Link globally
npm link

# Or run directly
node bin/vibe.js
```

### First Run

```bash
$ vibe

  ╔═══════════════════════════════════════════════════════════╗
  ║  VIBE CLI v12                                             ║
  ║  Your AI Development Teammate                             ║
  ╠═══════════════════════════════════════════════════════════╣
  ║                                                           ║
  ║  Project: my-awesome-project                              ║
  ║  Model: Claude Sonnet 4 (Balanced)                        ║
  ║  Memory: 12 decisions remembered                          ║
  ║                                                           ║
  ╠═══════════════════════════════════════════════════════════╣
  ║  What would you like to do?                              ║
  ║                                                           ║
  ║  > _                                                     ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
```

## 🎯 Philosophy

### One Command, Infinite Possibilities

VIBE v12 removes all user-facing commands. There is only `vibe`, which launches an interactive terminal UI (TUI).

**Every feature is intent-driven and implicit.**

| User Types | VIBE Understands | VIBE Does |
|------------|------------------|-----------|
| `"build auth"` | `BUILD` intent → Auth capability | Creates auth module |
| `"fix tests"` | `FIX` intent → Tests capability | Runs & fixes tests |
| `"deploy to gcp"` | `DEPLOY` intent → Infra capability | Deploys to GCP |
| `"undo that"` | `UNDO` intent → Determinism | Restores checkpoint |
| `"remember this"` | `MEMORY` intent → Memory | Stores in project memory |

### Approval-First, Safe-by-Default

VIBE never makes destructive changes without approval:

```
vibe> "delete all logs"

⚠️  This will delete 47 log files across 3 directories.

Options:
  [A]pprove  [R]eview files  [C]ancel

>
```

### MCP-First Architecture

VIBE uses the Model Context Protocol for all context:

- **File System**: Structured project tree with exclusions
- **Git**: Commit history, status, diffs
- **OpenAPI**: Endpoint discovery and schema mapping
- **Tests**: Framework detection and coverage
- **Memory**: Persistent decisions and patterns

## 🛠 Features

### 8 Primitives Architecture

All VIBE functionality maps to 8 primitives:

| Primitive | Purpose | Example |
|-----------|---------|---------|
| **COMPLETION** | LLM calls with smart routing | `"explain this code"` |
| **PLANNING** | Create execution plans | `"plan the auth implementation"` |
| **MULTI-EDIT** | Atomic multi-file changes | `"rename this function everywhere"` |
| **EXECUTION** | Run commands & scripts | `"run the build"` |
| **APPROVAL** | Gate dangerous operations | `"delete production data"` |
| **MEMORY** | Persist decisions & patterns | `"remember this approach"` |
| **ORCHESTRATION** | State machine workflow | `"deploy with rollback"` |
| **DETERMINISM** | Checkpoints & rollback | `"undo the last change"` |

### Intent Router

VIBE's intent classifier maps natural language to primitives:

1. **Classify**: Analyze user input
2. **Map**: Connect to internal capabilities
3. **Clarify**: Ask questions if confidence < 60%
4. **Execute**: Run through primitives

### LLM Strategy

VIBE selects the **best model per task**:

| Task Type | Model Tier | Examples |
|-----------|------------|----------|
| Quick fixes | `fast` | gpt-4o-mini |
| General coding | `balanced` | gpt-4o, claude-sonnet-4 |
| Complex reasoning | `reasoning` | claude-opus-4 |
| Maximum quality | `max` | gpt-4o, o1 |

## 📁 Project Structure

```
VIBE-CLI/
├── bin/               # CLI entry point
├── src/               # Source code
├── docs/              # Documentation
├── tests/             # Test suite
├── .vibe/             # Runtime configuration
├── .github/           # CI/CD workflows
├── CLAUDE.md          # AI context
├── README.md          # User documentation
├── LICENSE            # MIT License
└── package.json       # Package config
```

## 🔧 Configuration

VIBE uses `.vibe/config.json`:

```json
{
  "model": {
    "defaultTier": "balanced",
    "providers": ["openai", "anthropic"],
    "fallbackOrder": ["anthropic", "openai"]
  },
  "approval": {
    "defaultPolicy": "prompt",
    "autoApprovePatterns": ["tests/**", "docs/**"]
  },
  "memory": {
    "persistDecisions": true,
    "maxContextTokens": 128000
  }
}
```

## 📚 Documentation

- **[Index](docs/index.md)**: Getting started guide
- **[Features](docs/features.md)**: Complete feature list
- **[Installation](docs/installation.md)**: Setup instructions
- **[FAQ](docs/faq.md)**: Common questions

## 🤝 Contributing

VIBE CLI v12 welcomes contributions:

1. Fork the repository
2. Create a feature branch
3. Make changes (add to primitives, not new commands)
4. Run tests: `npm test`
5. Submit PR

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with ❤️ by the VIBE Team
</p>
