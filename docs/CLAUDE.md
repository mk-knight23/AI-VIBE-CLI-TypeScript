# AI-VIBE-CLI - Claude Guidance

## Product Overview
AI-VIBE-CLI is a powerful command-line interface that brings AI capabilities directly to the terminal. It enables developers to interact with AI models, automate tasks, and manage codebases without leaving their command-line environment.

## Purpose
Provide a fast, scriptable, terminal-based interface for AI-powered development workflows, enabling automation, batch processing, and integration with shell scripts and CI/CD pipelines.

## Scope
- Cross-platform CLI (macOS, Linux, Windows)
- Natural language command processing
- File and codebase operations
- Git integration
- Task automation
- Batch processing
- Scripting capabilities
- CI/CD integration
- Local and cloud execution

## Key Components

### Core Capabilities
1. **Natural Language Interface**: Type commands in plain English
2. **Code Generation**: Generate files and projects from descriptions
3. **Code Analysis**: Review, refactor, and improve code
4. **Git Automation**: Intelligent commit messages, PRs, reviews
5. **Task Runner**: Automate repetitive development tasks
6. **Batch Processing**: Process multiple files at once
7. **Terminal Integration**: Works with existing shell workflows
8. **Scriptable**: Use in shell scripts and CI/CD

### Architecture
- **Runtime**: Node.js 18+ with TypeScript
- **Parser**: Natural language to command parser
- **Executor**: Command execution engine
- **Integrations**: Git, GitHub, GitLab, VS Code
- **AI Layer**: Multi-provider LLM routing
- **Storage**: Local config and caching
- **Security**: Secrets management, sandboxing

## File Structure
```
AI-VIBE-CLI/
├── src/
│   ├── index.ts               # Entry point
│   ├── commands/              # Command implementations
│   │   ├── generate.ts        # Code generation
│   │   ├── analyze.ts         # Code analysis
│   │   ├── refactor.ts        # Refactoring
│   │   ├── git.ts             # Git commands
│   │   ├── config.ts          # Configuration
│   │   └── workflow.ts        # Automation
│   ├── core/
│   │   ├── parser.ts          # Natural language parser
│   │   ├── executor.ts        # Command executor
│   │   ├── context.ts         # Context management
│   │   └── session.ts         # Session handling
│   ├── ai/
│   │   ├── router.ts          # LLM routing
│   │   ├── providers/         # LLM providers
│   │   └── prompts/           # Prompt templates
│   ├── utils/
│   │   ├── files.ts           # File operations
│   │   ├── git.ts             # Git utilities
│   │   ├── display.ts         # Terminal output
│   │   └── config.ts          # Config management
│   └── types/                 # TypeScript types
├── bin/
│   └── vibe.js                # Executable script
├── templates/                 # Code templates
├── scripts/                   # Install scripts
└── docs/                      # Documentation
```

## Development Guidelines

### When Working on This Product:
1. Follow UNIX philosophy: do one thing well
2. Support piping and redirection
3. Respect shell conventions
4. Fast startup time critical
5. Work offline when possible
6. Secure credential storage
7. Cross-platform compatibility
8. Extensive testing on different shells

### Integration Points
- Works with bash, zsh, fish, PowerShell
- Integrates with VS Code terminal
- CI/CD systems (GitHub Actions, etc.)
- Docker containers
- Remote SSH sessions
- Tmux/screen sessions

## Critical Success Factors
- < 500ms startup time
- Works on all major platforms
- Zero dependencies (single binary)
- Comprehensive help system
- POSIX-compliant where possible
- Secure by default

## Future Extensibility
- Plugin system for custom commands
- REPL mode for interactive sessions
- GUI mode (TUI with bubbletea)
- Remote execution capability
- Marketplace for scripts

---

*Part of the Vibe Ecosystem - Product 5 of 5*
