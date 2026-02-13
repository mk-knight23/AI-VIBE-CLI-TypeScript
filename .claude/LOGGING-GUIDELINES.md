# Logging Guidelines

## When to Use `console.log` vs Structured Logger

### ✅ Use `console.log` for:
- **User-facing CLI output** that's part of the UX
- **Interactive prompts** and progress indicators
- **Formatted output** with colors (using `chalk`)
- **One-time informational messages** during startup

**Example:**
```typescript
// GOOD: User-facing output
console.log(chalk.cyan('Building project...'));
console.log(chalk.green('✓ Build complete!'));
```

### ❌ Use `logger` for:
- **Debug information** for troubleshooting
- **Error logging** and exceptions
- **Warning messages** that should be tracked
- **Operational events** (API calls, file operations, etc.)
- **Anything with metadata/context**

**Example:**
```typescript
// BAD: Debug info via console.log
console.log('Loading config from', configPath);

// GOOD: Structured logging
logger.debug({ path: configPath }, 'Loading configuration');
logger.error({ error, file: filePath }, 'Failed to read file');
```

## Logger Usage

### Import the logger
```typescript
import { createLogger } from '../utils/pino-logger.js';

const logger = createLogger('my-module');
```

### Log levels
```typescript
logger.debug({ details }, 'Detailed debug message');
logger.info({ user, action }, 'User performed action');
logger.warn({ deprecated }, 'Feature is deprecated');
logger.error({ error, stack }, 'Operation failed');
```

### Always include metadata
```typescript
// GOOD: Structured data
logger.info(
  { method: 'POST', endpoint: '/api/projects', status: 200 },
  'API request successful'
);

// BAD: String interpolation
logger.info(`POST /api/projects returned 200`);
```

## Conversion Patterns

### Before → After

```typescript
// Before
console.log(`Starting ${service}...`);
console.error(`Failed to connect: ${error.message}`);

// After
logger.debug({ service }, 'Starting service');
logger.error({ error, service }, 'Failed to connect');
```

### For errors that should be shown to users
```typescript
// Log the error for tracking
logger.error({ error }, 'Database connection failed');

// Show user-friendly message
console.error(chalk.red('Failed to connect to database. Check your configuration.'));
```

## Performance Considerations

- Use `logger.debug()` for verbose output in hot paths
- Avoid string concatenation in log calls - use metadata object
- Batch logs when possible in loops

## Migration Checklist

When converting console.log to logger:

- [ ] Is this user-facing output? → Keep console.log
- [ ] Is this debug info? → Use logger.debug()
- [ ] Is this an error? → Use logger.error()
- [ ] Add metadata object with relevant context
- [ ] Test that logs appear correctly in output

## Files with User-Facing console.log (Keep as-is)

The following files intentionally use console.log for CLI UX:
- src/cli/main.ts - Main CLI interface
- src/ui/* - All UI components
- src/commands/* - Command output formatting
- src/core/engine.ts - Startup sequence display

These are **NOT bugs** - they provide the CLI user experience.

## Files to Audit (Potential Debug Logs)

Audit these files for unintended debug logs:
- src/core/dependency-manager.ts
- src/core/update-manager.ts
- src/core/workflow-manager.ts
- src/core/diagnostics.ts
- src/utils/* - Utility modules
