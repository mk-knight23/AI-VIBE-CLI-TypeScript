# VIBE CLI v8.0.0 - Developer Documentation

## 🏗️ Architecture

### Project Structure
```
vibe-cli/
├── src/
│   ├── cli/           # CLI entry point
│   ├── commands/      # Command handlers
│   ├── core/          # Core functionality
│   │   └── memory.ts  # 3-layer memory system
│   ├── providers/     # AI providers
│   ├── tools/         # 36 tools
│   │   ├── index.ts   # Tool registry
│   │   └── advanced.ts # 8 advanced AI tools
│   └── utils/         # Utilities
├── tests/             # Test suites (103 tests)
├── dist/              # Compiled output
└── docs/              # Documentation
```

---

## 🧠 Memory System

### Implementation

**File:** `src/core/memory.ts`

```typescript
interface StoryMemory {
  projectGoal: string;
  milestones: string[];
  challenges: string[];
  solutions: string[];
  learnings: string[];
  timeline: Array<{ event: string; timestamp: number }>;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  tokens?: number;
}

interface WorkspaceMemory {
  files: string[];
  recentChanges: string[];
  dependencies: Record<string, string>;
  scripts: Record<string, string>;
  gitBranch?: string;
  gitRemote?: string;
  structure?: string;
}
```

### Key Methods

```typescript
// Story Memory
setProjectGoal(goal: string): void
addMilestone(milestone: string): void
addChallenge(challenge: string, solution: string): void
addLearning(learning: string): void

// Chat History
addChatMessage(role: string, content: string, tokens?: number): void
searchChatHistory(query: string): ChatMessage[]

// Workspace
updateWorkspaceMemory(): void
onFileWrite(path: string, content: string): void

// Tasks
startTask(description: string): void
completeTask(success: boolean, duration: number): void

// Context
getMemoryContext(): string
```

### Limits
- Task history: 20 tasks
- Recent changes: 50 changes
- Chat history: 100 messages
- Message length: 500 chars

---

## 🛠️ Tool System

### Tool Structure

```typescript
interface Tool {
  name: string;
  displayName: string;
  description: string;
  category: string;
  parameters: Record<string, ParameterDefinition>;
  handler: (params: any) => Promise<string>;
  requiresConfirmation: boolean;
}
```

### Categories (14)
1. filesystem
2. shell
3. web
4. memory
5. git
6. project
7. analysis
8. refactor
9. testing
10. optimization
11. security
12. performance
13. documentation
14. migration

### Adding a New Tool

```typescript
// In src/tools/index.ts
{
  name: 'my_tool',
  displayName: 'My Tool',
  description: 'Does something',
  category: 'analysis',
  parameters: {
    input: {
      type: 'string',
      description: 'Input parameter',
      required: true
    }
  },
  handler: async (params) => {
    // Implementation
    return 'Result';
  },
  requiresConfirmation: false
}
```

---

## 🔧 Advanced Tools

### Implementation

**File:** `src/tools/advanced.ts`

Each tool follows this pattern:

```typescript
export async function toolName(param: string): Promise<string> {
  try {
    // 1. Validate input
    if (!fs.existsSync(param)) {
      return JSON.stringify({ error: 'Not found' });
    }
    
    // 2. Process
    const result = processData(param);
    
    // 3. Return JSON
    return JSON.stringify(result);
  } catch (error) {
    return JSON.stringify({ error: error.message });
  }
}
```

### Tool Details

**analyzeCodeQuality**
- Calculates cyclomatic complexity
- Detects code duplicates
- Finds long functions (>50 lines)
- Counts TODOs/FIXMEs

**smartRefactor**
- Extract function refactoring
- Inline code refactoring
- Creates backup before changes

**generateTests**
- Detects functions in source
- Supports vitest, jest, mocha
- Generates test file with imports

**optimizeBundle**
- Finds files >100KB
- Detects unused dependencies
- Suggests optimizations

**securityScan**
- Detects hardcoded secrets (API_KEY, SECRET, etc.)
- Checks file permissions
- Identifies outdated packages

**performanceBenchmark**
- Measures file read time
- Measures JSON parse time
- Reports file size and line count

**generateDocumentation**
- Extracts functions from code
- Generates markdown docs
- Includes parameters and descriptions

**migrateCode**
- CommonJS → ESM (require → import)
- JavaScript → TypeScript (adds types)
- Creates new file with .ts extension

---

## 🧪 Testing

### Test Structure

```
tests/
├── unit/                    # 45 tests
│   ├── memory-v8.spec.ts   # Memory system (20)
│   ├── advanced-tools.spec.ts # Advanced tools (18)
│   └── commands.spec.ts    # Commands (7)
├── integration/             # 23 tests
│   └── tools-v8.spec.ts    # Tool integration
├── e2e/                     # 14 tests
│   ├── workflow-v8.spec.ts # Workflows (8)
│   └── full-workflow.spec.ts # Full workflow (6)
├── security/                # 15 tests
│   └── dangerous-commands.spec.ts
└── performance/             # 6 tests
    └── benchmarks.spec.ts
```

### Running Tests

```bash
# All tests
npm test

# Specific suite
npm test tests/unit/memory-v8.spec.ts

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

### Writing Tests

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Feature', () => {
  beforeEach(() => {
    // Setup
  });
  
  afterEach(() => {
    // Cleanup
  });
  
  it('should do something', async () => {
    const result = await doSomething();
    expect(result).toBe(expected);
  });
});
```

---

## 🔨 Building

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Clean build
rm -rf dist && npm run build
```

---

## 📦 Publishing

```bash
# Update version
npm version patch|minor|major

# Build
npm run build

# Publish
npm publish
```

---

## 🎨 Code Style

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true
  }
}
```

### Conventions
- Use async/await over promises
- Prefer functional style
- Add JSDoc comments for public APIs
- Use descriptive variable names
- Keep functions under 50 lines

---

## 🔍 Debugging

### Enable Debug Mode

```typescript
// In src/cli/index.ts
const DEBUG = process.env.DEBUG === 'true';

if (DEBUG) {
  console.log('Debug info:', data);
}
```

### Run with Debug

```bash
DEBUG=true npm start
```

---

## 🚀 Performance Optimization

### Memory Management
- Limit chat history to 100 messages
- Truncate long messages to 500 chars
- Keep task history to 20 tasks
- Limit recent changes to 50

### File Operations
- Use streaming for large files
- Cache frequently accessed data
- Batch file operations when possible

### Tool Execution
- Set timeout to 60s
- Limit memory to 128MB
- Use worker threads for heavy operations

---

## 🔒 Security

### Dangerous Command Patterns

```typescript
const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+\//,
  /chmod\s+777\s+\//,
  /killall/,
  /dd\s+if=\/dev\/zero/,
  /mkfs/,
  /:\(\)/,
  /mv\s+\/\s+/
];
```

### Secret Detection

```typescript
const SECRET_PATTERNS = [
  /API_KEY\s*=\s*["'][^"']+["']/,
  /SECRET\s*=\s*["'][^"']+["']/,
  /PASSWORD\s*=\s*["'][^"']+["']/,
  /TOKEN\s*=\s*["'][^"']+["']/,
  /PRIVATE_KEY\s*=\s*["'][^"']+["']/
];
```

---

## 📊 Monitoring

### Metrics to Track
- Memory usage (heap)
- Tool execution time
- API response time
- Error rates
- Token usage

### Logging

```typescript
import { logger } from './utils/logger';

logger.info('Operation started');
logger.error('Operation failed', error);
logger.debug('Debug info', data);
```

---

## 🔄 CI/CD

### GitHub Actions

```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
      - run: npm run build
```

---

## 🆕 Adding Features

### Checklist
1. [ ] Implement feature in `src/`
2. [ ] Add tests in `tests/`
3. [ ] Update documentation
4. [ ] Run `npm test`
5. [ ] Run `npm run build`
6. [ ] Update version in `package.json`
7. [ ] Update CHANGELOG.md
8. [ ] Create PR

---

## 📚 API Reference

### Memory Manager

```typescript
class MemoryManager {
  constructor(workspaceRoot: string)
  
  // Story Memory
  setProjectGoal(goal: string): void
  addMilestone(milestone: string): void
  addChallenge(challenge: string, solution: string): void
  addLearning(learning: string): void
  
  // Chat History
  addChatMessage(role: string, content: string, tokens?: number): void
  searchChatHistory(query: string): ChatMessage[]
  
  // Workspace
  updateWorkspaceMemory(): void
  onFileWrite(path: string, content: string): void
  
  // Tasks
  startTask(description: string): void
  completeTask(success: boolean, duration: number): void
  
  // Context
  getMemoryContext(): string
  getState(): ConversationState
  
  // Preferences
  setPreference(key: string, value: any): void
  addCodePattern(pattern: string): void
  trackCommand(command: string): void
}
```

### Tool Execution

```typescript
async function executeTool(
  toolName: string,
  params: Record<string, any>
): Promise<string>

function getToolsByCategory(category: string): Tool[]
```

---

## 🐛 Common Issues

### Build Errors
```bash
# Clear cache
rm -rf node_modules dist
npm install
npm run build
```

### Test Failures
```bash
# Run specific test
npm test tests/unit/memory-v8.spec.ts

# Debug mode
DEBUG=true npm test
```

### Memory Issues
```bash
# Increase Node memory
NODE_OPTIONS=--max-old-space-size=4096 npm start
```

---

## 📞 Support

- GitHub Issues: https://github.com/mk-knight23/vibe/issues
- Email: support@vibe-ai.com
- Discord: https://discord.gg/vibe-ai

---

**Version:** 8.0.0  
**Last Updated:** December 6, 2025  
**Status:** Production Ready
