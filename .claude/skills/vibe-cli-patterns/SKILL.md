# VIBE CLI Patterns

Patterns and conventions for working with the VIBE CLI codebase.

## Architecture Patterns

### 8-Primitives Pattern
All features should be built using the 8 core primitives:

```typescript
// Standard primitive usage pattern
const primitiveMap = new Map<string, IPrimitive>();
primitiveMap.set('completion', new CompletionPrimitive());
primitiveMap.set('planning', new PlanningPrimitive());
// ... etc

// Execute with standardized result
const result = await primitive.execute({ ...args });
if (!result.success) {
  throw new Error(result.error);
}
return result.data;
```

### Command Pattern
Commands follow a consistent structure:

```typescript
export async function commandName(
  args: string[],
  primitives: {
    search: SearchPrimitive;
    completion: CompletionPrimitive;
    // ... other needed primitives
  },
  options: {
    // command-specific options
  }
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    // Implementation
    return { success: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Command failed:', message);
    return { success: false, error: message };
  }
}
```

## Code Patterns

### Result Type Standardization
All operations return a standardized result:

```typescript
interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### Immutability
Never mutate objects; always create new ones:

```typescript
// WRONG
config.debug = true;
return config;

// CORRECT
return { ...config, debug: true };
```

### Error Handling
Always use structured logger and provide context:

```typescript
import { logger } from '../utils/structured-logger';

try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  logger.error('Operation failed:', error);
  throw new Error(`Failed to complete operation: ${errorMessage}`);
}
```

### Input Validation
Use Zod for all user input validation:

```typescript
import { z } from 'zod';

const schema = z.object({
  target: z.string().min(1),
  framework: z.enum(['vitest', 'jest']).default('vitest'),
});

const validated = schema.parse(input);
```

## Testing Patterns

### TDD Workflow
1. Write test first (RED)
2. Run test - it should FAIL
3. Write minimal implementation (GREEN)
4. Run test - it should PASS
5. Refactor (IMPROVE)
6. Verify coverage (80%+)

### Test File Organization
```
tests/
├── unit/           # Individual functions, utilities
├── integration/    # API endpoints, command flows
└── e2e/            # Critical user flows
```

### Mocking Pattern
```typescript
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));
```

## File Organization

### Size Guidelines
- Target: 200-400 lines
- Maximum: 800 lines
- If exceeding: extract utilities

### Directory Structure
```
src/
├── commands/       # Command implementations
├── primitives/     # 8 core primitives
├── core/          # Core infrastructure
├── adapters/      # LLM provider adapters
├── utils/         # Shared utilities
└── types.ts       # Shared types
```

## Anti-Patterns to Avoid

1. **Direct console.log usage** - Use structured logger
2. **Mutating objects** - Always create new objects
3. **Deep nesting >4 levels** - Extract functions
4. **Functions >50 lines** - Break into smaller functions
5. **Hardcoded values** - Use constants/config
6. **Skipping error handling** - Always handle errors
7. **Large files >800 lines** - Split by feature

## Common Utilities

### Logger Usage
```typescript
import { logger } from '../utils/structured-logger';

logger.info('Starting operation');
logger.warn('Deprecation warning');
logger.error('Failed:', error);
```

### Spinner Usage
```typescript
import ora from 'ora';

const spinner = ora('Loading...').start();
try {
  await operation();
  spinner.succeed('Complete');
} catch (error) {
  spinner.fail('Failed');
}
```

### Chalk Styling
```typescript
import chalk from 'chalk';

console.log(chalk.green('✓ Success'));
console.log(chalk.red('✗ Failed'));
console.log(chalk.blue('ℹ Info'));
```

## Performance Guidelines

- Lazy load heavy dependencies
- Cache repeated operations
- Stream large files
- Avoid blocking operations
- Use async/await consistently

## Security Guidelines

- Never hardcode secrets
- Validate all inputs
- Sanitize file paths
- Use parameterized queries
- Sandboxed code execution
