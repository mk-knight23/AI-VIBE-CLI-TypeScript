# VIBE CLI - Claude Project Context

## Project Overview

| Field | Value |
|-------|-------|
| **Name** | VIBE CLI |
| **Version** | 0.0.2 |
| **Type** | Command-line interface |
| **Language** | TypeScript (Node.js 18+) |
| **Architecture** | 8-Primitives + MCP |

## Core Architecture

### 8 Primitives Pattern
1. **Planning** - Task decomposition and strategy
2. **Completion** - LLM text generation
3. **Execution** - Command/tool execution
4. **MultiEdit** - File modifications
5. **Approval** - User confirmation flows
6. **Memory** - Context persistence
7. **Determinism** - Reproducible results
8. **Search** - Codebase analysis
9. **Orchestration** - Primitive coordination

### Key Directories

```
src/
├── cli/              # CLI entry points
├── commands/         # Command implementations
├── primitives/       # Core 8 primitives
├── core/             # Core infrastructure
├── adapters/         # LLM provider adapters
├── agents/           # Agent definitions
├── mcp/              # Model Context Protocol
├── memory/           # Memory systems
├── tools/            # Tool implementations
├── utils/            # Utilities
├── ui/               # Terminal UI components
└── types.ts          # Shared types
```

## Development Guidelines

### When Implementing Features

1. **Always use the 8-Primitives pattern**
   - New features should leverage existing primitives
   - Create new primitives only when necessary
   - Use orchestration for multi-step workflows

2. **Follow TDD workflow**
   - Write tests FIRST (RED)
   - Implement minimal code (GREEN)
   - Refactor (IMPROVE)
   - Verify 80%+ coverage

3. **Immutability is CRITICAL**
   ```typescript
   // WRONG
   obj.property = value;

   // CORRECT
   const newObj = { ...obj, property: value };
   ```

4. **Error handling**
   - All functions must handle errors
   - Use structured logger, not console.log
   - Provide user-friendly error messages

5. **Input validation**
   - Use Zod for all user input
   - Validate at system boundaries
   - Fail fast with clear messages

### File Organization

- **Many small files > few large files**
- Target: 200-400 lines per file
- Maximum: 800 lines
- Organize by feature/domain, not type
- Extract utilities from large components

### Testing Requirements

| Type | Required | Location |
|------|----------|----------|
| Unit | Yes | `tests/unit/**/*.test.ts` |
| Integration | Yes | `tests/integration/**/*.test.ts` |
| E2E | Critical paths | `tests/e2e/**/*.spec.ts` |
| Coverage | 80%+ | `npm run test:coverage` |

### Code Quality Checklist

Before marking work complete:
- [ ] Code is readable and well-named
- [ ] Functions are small (<50 lines)
- [ ] Files are focused (<800 lines)
- [ ] No deep nesting (>4 levels)
- [ ] Proper error handling
- [ ] No console.log statements
- [ ] No hardcoded values
- [ ] No mutation (immutable patterns)

## Available Commands

### User-Facing
```bash
vibe [task]                    # Interactive AI engineer
vibe scaffold [template]       # Generate projects/components
vibe test [target]             # Generate unit tests
vibe fix [target]              # Fix bugs and issues
vibe plan <task>               # Generate execution plan
vibe doctor                    # System health check
vibe commit                    # AI-powered semantic commits
vibe pr                        # Generate AI PR descriptions
vibe review                    # AI code review
vibe batch <cmd>               # Batch process files
vibe watch                     # Watch mode for auto-tasks
vibe checkpoint                # System state management
vibe plugin                    # Manage extensions
vibe server                    # Start REST API server
vibe config                    # Secure interactive setup
vibe completion                # Shell completions
```

### Development
```bash
npm run build                  # Compile TypeScript
npm run build:watch           # Watch mode
npm test                       # Run all tests
npm run test:unit             # Unit tests only
npm run test:coverage         # With coverage report
npm run lint                  # ESLint
npm run type-check            # TypeScript check
```

### Claude Skills
```
/tdd [feature]                # Test-driven development
/code-review                  # Review code
/build-fix                    # Fix build errors
/update-docs                  # Update documentation
/update-codemaps              # Update codemaps
/test-coverage                # Check coverage
/verify                       # Verify implementation
/checkpoint                   # Create checkpoint
/plan [feature]               # Create implementation plan
```

## Technology Stack

| Category | Technology |
|----------|------------|
| Runtime | Node.js 18+ |
| Language | TypeScript 5.9+ |
| CLI Framework | Commander.js |
| API Framework | Express |
| Testing | Vitest |
| Linting | ESLint + Prettier |
| Logging | Pino |
| Config | cosmiconfig |
| Secure Storage | keytar |
| LLM SDK | @anthropic-ai/sdk, openai |
| MCP | @modelcontextprotocol/sdk |
| HTTP | axios |
| Git | simple-git |
| Prompts | inquirer |
| Styling | chalk, picocolors |
| Validation | zod |

## Integration Points

- **LLM Providers**: Anthropic, OpenAI, MiniMax
- **Git**: Local operations via simple-git
- **MCP Servers**: Configurable via mcpServers
- **Shell**: bash, zsh, fish, PowerShell
- **CI/CD**: GitHub Actions

## Security Considerations

- API keys from environment variables
- No secrets in code (verified by hooks)
- Sandboxed code execution
- Input validation on all commands
- Secure credential storage planned (keytar)

## Critical Files

| File | Purpose |
|------|---------|
| `src/cli/main.ts` | CLI entry point |
| `src/primitives/*.ts` | 8 primitives implementation |
| `src/commands/*.ts` | Command handlers |
| `src/core/api-server.ts` | REST API Server |
| `src/config.ts` | Configuration system |
| `src/types.ts` | Shared TypeScript types |
| `package.json` | Dependencies and scripts |
| `tsconfig.json` | TypeScript configuration |

## Common Patterns

### Adding a New Command
1. Create `src/commands/my-command.ts`
2. Import primitives as needed
3. Add to `src/cli/main.ts` program
4. Write tests in `tests/commands/my-command.test.ts`
5. Run tests and verify coverage

### Using Primitives
```typescript
import { PlanningPrimitive } from '../primitives/planning';

const planner = new PlanningPrimitive();
const result = await planner.execute({ task: '...' });

if (!result.success) {
  throw new Error(result.error);
}

const plan = result.data;
```

### Error Handling
```typescript
try {
  const result = await operation();
  return result;
} catch (error) {
  logger.error('Operation failed:', error);
  throw new Error('User-friendly message');
}
```

## Roadmap

See `.claude/workflows/upgrade.md` for detailed upgrade path.

### Phase 3: Infrastructure Enhancement (COMPLETED)
1. Secure credential storage (keytar)
2. Configuration system (cosmiconfig)
3. Structured logging (pino)
4. Progress indicators
5. Error handling framework
6. REST API Foundation (Express)

### Phase 4: Advanced Features (COMPLETED)
- Git integration commands (`commit`, `pr`, `review`)
- Batch processing (`test`, `fix`)
- Watch mode
- Plugin system (`registry`, `loader`, `API`)
- REST API Server integration

### Phase 5: Distribution & Polish (COMPLETED)
- Update checker
- Dockerization
- Binary redistribution (`pkg`)
- Windows/PowerShell support

### Phase 6: Ecosystem (COMPLETED)
- [x] VS Code extension foundation
- [x] GitHub Actions integration
- [x] Marketplace API for templates
- [x] Community plugin registry logic

### Phase 7: Advanced Ecosystem (COMPLETED)
- [x] VS Code diagnostics and sidebar
- [x] Real Marketplace distribution logic
- [x] Vibe Home (React Dashboard)
- [x] Opt-in telemetry and crash reporting

### Phase 8: Production Polish & Community (COMPLETED)
- [x] `vibe publish` contribution pipeline
- [x] VS Code 'Code Actions' (Smart Fixes)
- [x] Real Analytics in Vibe Home

---

*This file provides context for Claude Code when working on VIBE CLI*
