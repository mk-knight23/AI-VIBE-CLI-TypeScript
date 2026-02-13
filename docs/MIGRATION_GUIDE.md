# Migration Guide: VIBE CLI v0.0.1 → v0.0.2

## Overview

This guide helps you migrate from VIBE CLI v0.0.1 to v0.0.2. This release includes significant architectural improvements while maintaining backward compatibility for most use cases.

## Breaking Changes

### 1. Single Command Interface

**Before:**
```bash
vibe scaffold react-component Button
vibe test src/utils/auth.ts
vibe fix "login bug"
```

**After:**
```bash
vibe "scaffold react-component Button"
vibe "test src/utils/auth.ts"
vibe "fix login bug"
```

The CLI now uses intent-driven natural language - just describe what you need!

### 2. MCP-First Architecture

The v0.0.2 release introduces Model Context Protocol (MCP) as the primary context integration mechanism. MCP servers can now be configured in `vibe.config.json`:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]
    }
  }
}
```

### 3. Provider Configuration

Environment variable names have been standardized:

| Old Variable | New Variable |
|--------------|--------------|
| `ANTHROPIC_KEY` | `ANTHROPIC_API_KEY` |
| `OPENAI_KEY` | `OPENAI_API_KEY` |
| `GOOGLE_KEY` | `GOOGLE_API_KEY` |

## New Features in v0.0.2

### 1. Enhanced MCP Manager

The new `EnhancedMCPManager` provides:
- Automatic reconnection with exponential backoff
- Health checks and heartbeat monitoring
- Tool caching for improved performance
- Event-driven architecture

```typescript
import { enhancedMCPManager } from './mcp/enhanced-manager.js';

await enhancedMCPManager.initialize();
const tools = await enhancedMCPManager.listTools('my-server');
```

### 2. Enhanced Command Handler

Type-safe CLI command registration:

```typescript
import { EnhancedCommandHandler } from './cli/enhanced-command-handler.js';

const handler = new EnhancedCommandHandler({
  programName: 'vibe',
  version: '0.0.2'
});

handler.registerSimple(
  'hello',
  'Say hello',
  async (args) => {
    console.log('Hello, World!');
  },
  { examples: ['vibe hello'] }
);
```

### 3. Enhanced Interactive Mode

New interactive shell features:
- Command history with persistent storage
- Auto-complete for commands and file paths
- Session management
- Built-in help system

### 4. Provider Router Improvements

- Fallback chain configuration
- Cost tracking per provider
- Usage statistics

```typescript
import { providerRouter } from './providers/router.js';

const stats = providerRouter.getUsage();
console.log(`Total cost: $${stats.totalCost}`);
```

## Deprecations

The following are deprecated and will be removed in v0.1.0:

| Deprecated | Replacement |
|------------|-------------|
| `src/adapters/router.ts` | `src/providers/unified.router.ts` |
| `src/mcp/index.ts` | `src/mcp/enhanced-manager.ts` |

## Migration Steps

### Step 1: Update Environment Variables

Update your `.env` file with the new variable names:

```bash
# Old
ANTHROPIC_KEY=sk-...

# New
ANTHROPIC_API_KEY=sk-...
```

### Step 2: Update MCP Configuration

If you use MCP servers, update your `vibe.config.json`:

```json
{
  "mcpServers": {
    "your-server": {
      "command": "npx",
      "args": ["-y", "@your/mcp-server"],
      "enabled": true
    }
  }
}
```

### Step 3: Update Command Usage

For programmatic usage, update imports:

```typescript
// Old
import { ProviderRouter } from './adapters/router.js';

// New
import { VibeProviderRouter } from './providers/router.js';
```

## Testing the Migration

Run the health check to verify your setup:

```bash
vibe doctor
```

## Getting Help

- Issues: [GitHub Issues](https://github.com/mk-knight23/AI-VIBE-CLI-TypeScript/issues)
- Discussions: [GitHub Discussions](https://github.com/mk-knight23/AI-VIBE-CLI-TypeScript/discussions)

---

*Last Updated: 2026-02-13*
*Version: 0.0.2*
