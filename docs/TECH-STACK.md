# AI-VIBE-CLI - Technology Stack

## Runtime

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20.x+ | Runtime environment |
| TypeScript | 5.3.x | Type-safe development |
| esbuild | 0.19+ | Fast bundling and compilation |
| pkg | 5.x | Binary compilation |

## CLI Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| Commander.js | 11.x | Command parsing and help |
| enquirer | 2.x | Interactive prompts |
| ora | 7.x | Spinners and progress |
| cli-progress | 3.x | Progress bars |
| chalk | 5.x | Terminal colors |
| ink | 4.x | React-based CLI UI (optional) |

## AI/ML Integration

| Technology | Version | Purpose |
|------------|---------|---------|
| @anthropic-ai/sdk | 0.24+ | Claude integration |
| openai | 4.20+ | GPT integration |
| @google/generative-ai | 0.2+ | Gemini integration |
| ollama | 0.5+ | Local model support |
| ai | 2.2+ | Vercel AI SDK for streaming |

## Core Utilities

| Technology | Version | Purpose |
|------------|---------|---------|
| cosmiconfig | 9.x | Config file discovery |
| keytar | 7.9+ | Secure credential storage |
| simple-git | 3.20+ | Git operations |
| globby | 14.x | File globbing |
| fs-extra | 11.x | Enhanced file operations |
| p-limit | 5.x | Concurrency limiting |
| chokidar | 3.x | File watching |

## Code Analysis

| Technology | Version | Purpose |
|------------|---------|---------|
| @typescript-eslint/parser | 6.x | TypeScript parsing |
| @babel/parser | 7.23+ | JavaScript AST parsing |
| recast | 0.23+ | AST transformation |
| prettier | 3.1+ | Code formatting |
| eslint | 8.x | Linting |

## Testing

| Technology | Version | Purpose |
|------------|---------|---------|
| vitest | 1.x | Fast unit testing |
| @vitest/ui | 1.x | Test UI |
| execa | 8.x | Process execution in tests |
| tempy | 3.x | Temporary files in tests |

## Build & Distribution

| Technology | Version | Purpose |
|------------|---------|---------|
| esbuild | 0.19+ | Fast bundling |
| tsup | 8.x | TypeScript bundling |
| pkg | 5.x | Binary compilation |
| changesets | 2.x | Version management |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLI Entry Point                         │
│              ┌──────────────┐  ┌──────────────┐             │
│              │   Natural    │  │  Structured  │             │
│              │   Language   │  │   Commands   │             │
│              │   Parser     │  │   (Commander)│             │
│              └──────┬───────┘  └──────┬───────┘             │
│                     │                 │                      │
│                     └────────┬────────┘                      │
│                              │                              │
└──────────────────────────────┼──────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────┐
│                              ▼                              │
│                    ┌──────────────────┐                     │
│                    │   LLM Router     │                     │
│                    │  (Multi-provider)│                     │
│                    └────────┬─────────┘                     │
│                             │                               │
│           ┌─────────────────┼─────────────────┐             │
│           ▼                 ▼                 ▼             │
│    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│    │   OpenAI     │  │  Anthropic   │  │   Ollama     │    │
│    │   API        │  │   API        │  │   Local      │    │
│    └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────┐
│                              ▼                              │
│                    ┌──────────────────┐                     │
│                    │  Command Executor │                     │
│                    └────────┬─────────┘                     │
│                             │                               │
│           ┌─────────────────┼─────────────────┐             │
│           ▼                 ▼                 ▼             │
│    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│    │  File Ops    │  │   Git Ops    │  │  Code Gen    │    │
│    │  (fs-extra)  │  │ (simple-git) │  │  (templates) │    │
│    └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Environment Requirements

```
Node.js >= 20.0.0
npm >= 10.0.0
Git >= 2.30.0
```

## Package.json

```json
{
  "name": "@vibe/cli",
  "version": "1.0.0",
  "description": "AI-powered CLI for developers",
  "bin": {
    "vibe": "./bin/vibe.js"
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs --out-dir dist",
    "dev": "tsx watch src/index.ts",
    "test": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write \"src/**/*.ts\"",
    "package": "pkg . --out-path=dist/bin",
    "package:all": "pkg . --targets node20-macos-x64,node20-linux-x64,node20-win-x64"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.24.0",
    "openai": "^4.20.0",
    "commander": "^11.0.0",
    "enquirer": "^2.4.0",
    "ora": "^7.0.0",
    "cli-progress": "^3.12.0",
    "chalk": "^5.3.0",
    "cosmiconfig": "^9.0.0",
    "keytar": "^7.9.0",
    "simple-git": "^3.20.0",
    "globby": "^14.0.0",
    "fs-extra": "^11.0.0",
    "p-limit": "^5.0.0",
    "chokidar": "^3.5.0",
    "handlebars": "^4.7.0",
    "prettier": "^3.1.0",
    "pino": "^8.16.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/fs-extra": "^11.0.0",
    "typescript": "^5.3.0",
    "tsup": "^8.0.0",
    "tsx": "^4.0.0",
    "vitest": "^1.0.0",
    "@vitest/coverage-v8": "^1.0.0",
    "eslint": "^8.50.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "prettier": "^3.1.0",
    "pkg": "^5.8.0"
  },
  "pkg": {
    "scripts": ["dist/**/*.js"],
    "assets": ["templates/**/*", "node_modules/**/*"],
    "targets": ["node20"]
  }
}
```

## Performance Targets

| Metric | Target |
|--------|--------|
| Startup Time | < 500ms |
| Command Execution | < 2 seconds (simple) |
| Code Generation | < 10 seconds |
| Memory Usage | < 100MB |
| Binary Size | < 50MB |

## Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| macOS (Intel) | ✅ Supported | Tested on macOS 12+ |
| macOS (Apple Silicon) | ✅ Supported | Native arm64 builds |
| Linux (x64) | ✅ Supported | Tested on Ubuntu 22.04+ |
| Linux (arm64) | ✅ Supported | Raspberry Pi, ARM servers |
| Windows 10/11 | ✅ Supported | Native builds |
| Windows Server | ⚠️ Best effort | Limited testing |
| Alpine Linux | ⚠️ Best effort | musl libc compatibility |

---

*Technology Stack v2.0 - AI-VIBE-CLI*
