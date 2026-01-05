# Developer Guide

This guide covers VIBE CLI v12 architecture and how to extend it.

## Architecture Overview

VIBE v12 follows an 8-primitive architecture with MCP-first context:

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER INTERFACE (TUI)                       │
│                     vibe> "build auth"                          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      INTENT ROUTER                              │
│              Classify → Map → Clarify → Execute                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌─────────────────┐ ┌─────────────┐ ┌─────────────┐
│   PLANNING      │ │  EXECUTION  │ │   MEMORY    │
│   PRIMITIVE     │ │  PRIMITIVE  │ │   PRIMITIVE │
└────────┬────────┘ └──────┬──────┘ └──────┬──────┘
         │                 │               │
         ▼                 ▼               ▼
┌─────────────────┐ ┌─────────────┐ ┌─────────────┐
│   AGENTS        │ │    TOOLS    │ │  CHECKPOINTS│
│ Planner/Executor│ │  Multi-Edit │ │  Decisions  │
└────────┬────────┘ └──────┬──────┘ └──────┬──────┘
         │                 │               │
         └─────────────────┼───────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                        MCP CONTEXT                              │
│  FileSystem │ Git │ OpenAPI │ Tests │ Memory │ Infra            │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     LLM PROVIDER ROUTER                         │
│    OpenAI │ Anthropic │ Google │ xAI │ Local (Ollama)          │
└─────────────────────────────────────────────────────────────────┘
```

## Core Concepts

### Primitives

All functionality maps to 8 primitives:

| Primitive | File | Responsibility |
|-----------|------|----------------|
| COMPLETION | `providers/completion.ts` | LLM calls, token management |
| PLANNING | `agents/planner.ts` | Plan generation, validation |
| MULTI-EDIT | `tools/multi-edit.ts` | Atomic file operations |
| EXECUTION | `tools/executor.ts` | Shell commands, scripts |
| APPROVAL | `approvals/index.ts` | Gate dangerous operations |
| MEMORY | `memory/index.ts` | Persist decisions, patterns |
| ORCHESTRATION | `orchestration/index.ts` | State machine, workflow |
| DETERMINISM | `tools/executor.ts` | Checkpoints, rollback |

### Intent Types

The Intent Router classifies input into:

```typescript
enum IntentType {
  BUILD = 'build',      // Create new features/code
  FIX = 'fix',          // Debug, repair, resolve
  REFACTOR = 'refactor', // Restructure without behavior change
  DEPLOY = 'deploy',    // Ship to environments
  EXECUTE = 'execute',  // Run commands/scripts
  REVIEW = 'review',    // Code review, analysis
  RESEARCH = 'research', // Investigate, explore
  MEMORY = 'memory',    // Store/recall decisions
  UNDO = 'undo',        // Rollback changes
  CLARIFY = 'clarify',  // Ask user questions
  UNKNOWN = 'unknown'
}
```

### MCP Context Providers

Context is structured and minimal:

```typescript
interface MCPContext {
  filesystem: FileSystemContext;
  git: GitContext;
  openapi: OpenAPIContext;
  tests: TestsContext;
  memory: MemoryContext;
  infra: InfraContext;
}
```

## Adding New Features

### Rule 1: Always Use Primitives

Never add feature-specific logic. Map to primitives:

```typescript
// ❌ WRONG - Feature-specific code
if (userWantsAuth) {
  createAuthModule();
}

// ✅ RIGHT - Use MULTI-EDIT primitive
const operations: EditOperation[] = [
  { type: 'create', file: 'auth/middleware.ts', content: '...' },
  { type: 'create', file: 'auth/tokens.ts', content: '...' },
];
await multiEditPrimitive.editAll(operations, sessionId);
```

### Rule 2: Context Must Be Inspectable

All context should be requestable:

```typescript
// ✅ RIGHT - Explicit context requests
const context = await contextAggregator.collectAll();
const fileTree = context.filesystem.structure;

// ❌ WRONG - Hidden context gathering
const files = glob.sync('**/*.ts'); // Hidden from user
```

### Rule 3: Approval Gates for Destructive Actions

```typescript
async function deleteFiles(files: string[]): Promise<void> {
  const approval = await approvalManager.request({
    type: 'delete',
    files,
    risk: 'high'
  });
  
  if (!approval.granted) {
    throw new Error('Operation not approved');
  }
  
  // Proceed with deletion
}
```

## Adding New Agents

Agents implement specific capabilities using primitives:

```typescript
// src/v12/agents/my-agent.ts
import { PlannerAgent } from './planner.js';
import { MultiEditPrimitive } from '../tools/multi-edit.js';
import { VibeApprovalManager } from '../approvals/index.js';

export class MyAgent {
  private planner: PlannerAgent;
  private editor: MultiEditPrimitive;
  private approvals: VibeApprovalManager;

  async execute(intent: VibeIntent): Promise<AgentResult> {
    // 1. Plan using PLANNING primitive
    const plan = await this.planner.createPlan(intent);
    
    // 2. Get approval if needed
    if (plan.requiresApproval) {
      await this.approvals.request(plan);
    }
    
    // 3. Execute using primitives
    const result = await this.executePlan(plan);
    
    return result;
  }
}
```

## Adding New MCP Context Providers

Implement `IContextProvider` interface:

```typescript
// src/v12/mcp/my-provider.ts
import { IContextProvider } from './context-provider.js';

interface MyContext {
  type: 'my-context';
  data: MyData;
}

export class MyContextProvider implements IContextProvider {
  contextType = 'my-context';

  async isAvailable(): boolean {
    // Check if context is available
    return fs.existsSync('.my-config');
  }

  async collect(): Promise<MyContext> {
    // Gather context data
    return {
      type: 'my-context',
      data: await this.gatherData()
    };
  }

  async getResource(resourceId: string): Promise<unknown> {
    // Get specific resource
    return this.getSpecificResource(resourceId);
  }

  async refresh(): Promise<void> {
    // Update cached context
  }
}

// Register with aggregator
contextAggregator.register(new MyContextProvider());
```

## Adding New LLM Providers

Implement the provider interface:

```typescript
// src/v12/providers/my-provider.ts
import { ILLMProvider, CompletionRequest } from './types.js';

export class MyProvider implements ILLMProvider {
  name = 'my-provider';
  
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    // Call LLM API
    const response = await this.api.call(request.prompt, {
      model: request.model,
      temperature: request.temperature,
      maxTokens: request.maxTokens
    });
    
    return {
      content: response.text,
      usage: response.usage,
      model: request.model
    };
  }

  async stream(request: CompletionRequest): Promise<AsyncIterable<string>> {
    // Streaming implementation
  }
}

// Register in provider router
providerRouter.register(new MyProvider(), ['balanced', 'reasoning']);
```

## Configuration Schema

```typescript
// src/v12/config/schema.ts
export const configSchema = {
  model: {
    defaultTier: { type: 'string', enum: ['fast', 'balanced', 'reasoning', 'max'] },
    providers: { type: 'array', items: { type: 'string' } },
    fallbackOrder: { type: 'array', items: { type: 'string' } }
  },
  approval: {
    defaultPolicy: { type: 'string', enum: ['auto', 'prompt', 'block'] },
    autoApprovePatterns: { type: 'array', items: { type: 'string' } }
  },
  memory: {
    persistDecisions: { type: 'boolean' },
    maxContextTokens: { type: 'number' }
  }
};
```

## Testing

### Unit Tests

```typescript
// tests/intent/router.test.ts
describe('IntentRouter', () => {
  it('should classify build intent', async () => {
    const router = new IntentRouter();
    const result = await router.classify('build auth module');
    
    expect(result.intent.type).toBe(IntentType.BUILD);
    expect(result.confidence).toBeGreaterThan(0.8);
  });
});
```

### Integration Tests

```typescript
// tests/e2e/workflow.test.ts
describe('Workflow', () => {
  it('should complete build workflow', async () => {
    const tui = new InteractiveTUI();
    
    await tui.input('build auth');
    await tui.approvePlan();
    
    expect(tui.lastOutput).toContain('auth module created');
  });
});
```

## Building and Publishing

### Build

```bash
npm run build
# Outputs to dist/
```

### Publish

```bash
npm publish
# Uses semantic-release for versioning
```

## Debugging

Enable debug mode:

```bash
DEBUG=vibe:* vibe
```

Common debug namespaces:
- `vibe:intent` - Intent classification
- `vibe:llm` - LLM calls
- `vibe:mcp` - Context providers
- `vibe:approval` - Approval flow

## Best Practices

1. **No User-Facing Commands**: All features must be accessible via natural language
2. **Approval-First**: Always gate destructive operations
3. **Deterministic**: Support checkpoints and rollback
4. **Context-Driven**: Use MCP for all context
5. **Primitive-Based**: Never bypass primitives

## Directory Structure

```
src/v12/
├── agents/           # Agent implementations
├── approvals/        # Approval gates
├── context/          # Shared context
├── intent/           # Intent classification
├── memory/           # Persistence
├── mcp/              # Context providers
├── orchestration/    # State machine
├── providers/        # LLM routing
├── tools/            # Tool primitives
├── tui/              # Terminal UI
├── config/           # Configuration
└── index.ts          # Main exports
```

## Next Steps

- **[Architecture Diagrams](../architecture/README.md)**: System design
- **[Features Reference](../features/README.md)**: Complete feature list
- **[API Reference](../api/README.md)**: Detailed API docs
