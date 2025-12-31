# Test Organization

## Classification Rules

| Type | Location | Criteria |
|------|----------|----------|
| **Unit** | `tests/unit/` | No FS, network, env, or CLI. Pure logic only. |
| **Integration** | `tests/integration/` | Uses FS, network, env, or adapters. |
| **E2E** | `tests/e2e/` | Full user flows. Max 5 tests. |
| **Fixtures** | `tests/__fixtures__/` | Static data only. No test logic. |

## Directory Structure

```
tests/
├── setup.ts           # Global test setup (temp dir isolation)
├── unit/
│   ├── cli/           # CLI parsing, commands, UI
│   ├── core/
│   │   ├── agent/     # Modes, pipelines
│   │   ├── execution/ # Tools, permissions, security
│   │   └── provider/  # API clients, fallback
│   └── infra/         # Timeout, LSP, utilities
│
├── integration/
│   ├── cli/           # Config, commands, features
│   ├── mcp/           # MCP client/manager
│   └── storage/       # Sessions, checkpoints, memory
│
├── e2e/               # Full workflow tests
│
└── __fixtures__/      # Mock data
```

## Rules

1. No test files directly under `tests/`
2. Unit tests cannot import from `infra/` modules
3. E2E tests limited to 5 maximum
4. Test location mirrors source structure

## Isolation Rules (CRITICAL)

Tests must NEVER write to the repo root. All file operations must be isolated.

### Unit Tests
- Mock `fs` and `executeTool` - no disk writes allowed
- Use `vi.mock('../../../src/tools')` to prevent file creation

### Integration/E2E Tests
- Create temp directories with `os.tmpdir()` + unique suffix
- Clean up in `afterEach` or `afterAll`
- Use `VIBE_PROJECT_ROOT` env var when available

### CI Protection
`npm test` includes `test:no-leak` which fails if these folders exist:
- `generated-project/`
- `test-project/`
- `my-app/`
