# VIBE CLI - Project Memory

## Key Patterns

### 8-Primitives Architecture
All features should leverage the 8-primitives pattern:
- Planning → Task decomposition
- Completion → LLM generation
- Execution → Command execution
- MultiEdit → File changes
- Approval → User confirmation
- Memory → Context persistence
- Determinism → Reproducible results
- Search → Codebase analysis
- Orchestration → Coordination

### Command Structure
Commands follow consistent pattern:
1. Parse arguments/options
2. Get required primitives from map
3. Execute with error handling
4. Return standardized result

### Error Handling Pattern
```typescript
try {
  const result = await operation();
  return { success: true, data: result };
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  logger.error('Failed:', message);
  return { success: false, error: message };
}
```

## Critical Learnings

### Console.log Warning
Project has hooks that warn on console.log usage. Always use structured logger:
```typescript
import { logger } from '../utils/structured-logger';
logger.info('message');
logger.error('failed:', error);
```

### Test Generation
Test command supports multiple frameworks:
- vitest (default)
- jest
Always add framework imports to generated tests.

### MCP Integration
MCP Manager initializes at CLI startup. All commands have access to MCP servers configured in vibe.config.js

## File Size Guidelines
- Target: 200-400 lines
- Maximum: 800 lines
- Current largest files to refactor:
  - src/config.ts (14KB)
  - src/types.ts (11KB)

## Dependencies to Add (Phase 3)
1. keytar - Secure credential storage
2. cosmiconfig - Configuration management
3. pino - Structured logging
4. cli-progress - Batch operation progress
5. chokidar - Watch mode
6. update-notifier - Update checking

## Code Quality Enforcement
- Prettier runs on all JS/TS edits
- TypeScript check runs after TS edits
- Console.log warning on edits
- Session-end audit for console.log

## Performance Targets
- Startup: <500ms (currently ~800ms)
- Coverage: 80%+ (currently ~30%)
- Memory: <200MB

## Security Reminders
- Never hardcode secrets
- Use env vars for API keys (temporary)
- keytar integration planned for secure storage
- Validate all user input with Zod
- Sandboxed execution for user code
