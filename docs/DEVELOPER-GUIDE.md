# AI-VIBE-CLI - Developer Guide

## Development Setup

### Prerequisites

**Required:**
- Node.js 20.x+
- npm 10.x+
- Git

**Recommended:**
- VS Code with ESLint and Prettier extensions
- shellcheck (for shell script validation)

### Clone and Setup

```bash
git clone https://github.com/yourorg/ai-vibe-cli.git
cd ai-vibe-cli
npm install
```

### Development Commands

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run linting
npm run lint

# Package binary
npm run package

# Package for all platforms
npm run package:all
```

---

## Architecture

### Project Structure

```
ai-vibe-cli/
├── src/
│   ├── index.ts              # Entry point
│   ├── commands/             # Command implementations
│   │   ├── generate.ts       # Code generation
│   │   ├── analyze.ts        # Code analysis
│   │   ├── refactor.ts       # Refactoring
│   │   ├── git.ts            # Git integration
│   │   ├── config.ts         # Configuration
│   │   └── workflow.ts       # Automation
│   ├── core/
│   │   ├── parser.ts         # Natural language parser
│   │   ├── executor.ts       # Command executor
│   │   ├── context.ts        # CLI context
│   │   └── session.ts        # Session management
│   ├── ai/
│   │   ├── router.ts         # LLM routing
│   │   ├── providers/        # Provider implementations
│   │   │   ├── openai.ts
│   │   │   ├── anthropic.ts
│   │   │   ├── google.ts
│   │   │   └── ollama.ts
│   │   └── prompts/          # Prompt templates
│   ├── utils/
│   │   ├── files.ts          # File operations
│   │   ├── git.ts            # Git utilities
│   │   ├── display.ts        # Terminal output
│   │   └── config.ts         # Config management
│   └── types/                # TypeScript types
├── bin/
│   └── vibe.js               # Executable script
├── templates/                # Code templates
├── scripts/                  # Build scripts
└── docs/                     # Documentation
```

---

## Building Commands

### Command Structure

```typescript
// src/commands/generate.ts
import { Command } from 'commander';

export const generateCommand = new Command('generate')
  .description('Generate code from description')
  .argument('<type>', 'Type to generate (component, api, test)')
  .argument('<name>', 'Name of the generated item')
  .option('-p, --props <props>', 'Properties (comma-separated)')
  .option('-o, --output <file>', 'Output file')
  .option('--preview', 'Preview without writing')
  .option('--template <name>', 'Use specific template')
  .action(async (type, name, options) => {
    const generator = new CodeGenerator();

    const result = await generator.generate({
      type,
      name,
      props: options.props?.split(','),
      output: options.output,
      preview: options.preview,
      template: options.template
    });

    if (options.preview) {
      console.log(result.code);
    } else {
      await fs.writeFile(result.filePath, result.code);
      console.log(`✓ Generated ${result.filePath}`);
    }
  });
```

### Natural Language Parser

```typescript
// src/core/parser.ts
export class NaturalLanguageParser {
  async parse(input: string): Promise<ParsedCommand> {
    // Use LLM to parse natural language into structured command
    const response = await this.llm.complete({
      prompt: `Parse this command: "${input}"

Return JSON:
{
  "intent": "generate|refactor|analyze|git|config|...",
  "entities": {
    "files": [],
    "actions": [],
    "parameters": {}
  },
  "confidence": 0.95
}`,
      model: 'claude-haiku-4.5'
    });

    return JSON.parse(response.content);
  }

  async classifyIntent(input: string): Promise<Intent> {
    const intents = [
      'generate_code',
      'analyze_code',
      'refactor_code',
      'git_operation',
      'config_change',
      'workflow_run'
    ];

    const response = await this.llm.complete({
      prompt: `Classify the intent of: "${input}"\n\n${intents.join('\n')}`,
      model: 'claude-haiku-4.5'
    });

    return response.content.trim() as Intent;
  }
}
```

---

## AI Integration

### LLM Router

```typescript
// src/ai/router.ts
export class LLMRouter {
  private providers: Map<string, LLMProvider> = new Map();

  constructor() {
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('anthropic', new AnthropicProvider());
    this.providers.set('google', new GoogleProvider());
    this.providers.set('ollama', new OllamaProvider());
  }

  async route(request: Request): Promise<LLMProvider> {
    const config = await loadConfig();

    // Check for local models first if configured
    if (config.preferLocal && await this.isOllamaAvailable()) {
      return this.providers.get('ollama')!;
    }

    // Route based on request characteristics
    if (request.complexity === 'high') {
      return this.providers.get('anthropic')!.useModel('claude-opus-4.5');
    }

    if (request.latency === 'critical') {
      return this.providers.get('anthropic')!.useModel('claude-haiku-4.5');
    }

    // Default to configured provider
    switch (config.provider) {
      case 'openai':
        return this.providers.get('openai')!;
      case 'anthropic':
        return this.providers.get('anthropic')!;
      case 'google':
        return this.providers.get('google')!;
      default:
        return this.providers.get('openai')!;
    }
  }

  private async isOllamaAvailable(): Promise<boolean> {
    try {
      await fetch('http://localhost:11434/api/tags');
      return true;
    } catch {
      return false;
    }
  }
}
```

### Streaming Responses

```typescript
// src/ai/providers/anthropic.ts
export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    });
  }

  async *stream(request: Request): AsyncGenerator<string> {
    const stream = await this.client.messages.create({
      model: request.model || 'claude-3-5-sonnet-20241022',
      messages: request.messages,
      stream: true,
      max_tokens: request.maxTokens || 4096
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta') {
        yield chunk.delta.text;
      }
    }
  }

  async complete(request: Request): Promise<Response> {
    const response = await this.client.messages.create({
      model: request.model || 'claude-3-5-sonnet-20241022',
      messages: request.messages,
      max_tokens: request.maxTokens || 4096
    });

    return {
      content: response.content[0].text,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens
      }
    };
  }
}
```

---

## Terminal UI

### Progress Indicators

```typescript
// src/utils/display.ts
import ora from 'ora';
import chalk from 'chalk';
import cliProgress from 'cli-progress';

export class Display {
  private spinner: ora.Ora | null = null;
  private progressBar: cliProgress.SingleBar | null = null;

  start(message: string): void {
    this.spinner = ora(message).start();
  }

  succeed(message?: string): void {
    this.spinner?.succeed(message);
    this.spinner = null;
  }

  fail(message?: string): void {
    this.spinner?.fail(message);
    this.spinner = null;
  }

  info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  warning(message: string): void {
    console.log(chalk.yellow('⚠'), message);
  }

  error(message: string): void {
    console.log(chalk.red('✖'), message);
  }

  success(message: string): void {
    console.log(chalk.green('✔'), message);
  }

  startProgress(total: number, message: string): void {
    this.progressBar = new cliProgress.SingleBar({
      format: `${message} |${chalk.cyan('{bar}')}| {percentage}% | {value}/{total}`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });
    this.progressBar.start(total, 0);
  }

  updateProgress(value: number): void {
    this.progressBar?.update(value);
  }

  stopProgress(): void {
    this.progressBar?.stop();
    this.progressBar = null;
  }

  table(data: Record<string, string>[]): void {
    const keys = Object.keys(data[0]);
    const widths = keys.map(key =>
      Math.max(key.length, ...data.map(row => String(row[key]).length))
    );

    // Header
    console.log(keys.map((key, i) => key.padEnd(widths[i])).join('  '));
    console.log(keys.map((_, i) => '-'.repeat(widths[i])).join('  '));

    // Rows
    data.forEach(row => {
      console.log(keys.map((key, i) => String(row[key]).padEnd(widths[i])).join('  '));
    });
  }
}
```

### Interactive Prompts

```typescript
// src/utils/prompts.ts
import { prompt } from 'enquirer';

export async function confirm(message: string, initial = false): Promise<boolean> {
  const response = await prompt<{ confirmed: boolean }>({
    type: 'confirm',
    name: 'confirmed',
    message,
    initial
  });

  return response.confirmed;
}

export async function select<T extends string>(message: string, choices: T[]): Promise<T> {
  const response = await prompt<{ choice: T }>({
    type: 'select',
    name: 'choice',
    message,
    choices
  });

  return response.choice;
}

export async function input(message: string, defaultValue?: string): Promise<string> {
  const response = await prompt<{ value: string }>({
    type: 'input',
    name: 'value',
    message,
    initial: defaultValue
  });

  return response.value;
}

export async function multiselect<T extends string>(message: string, choices: T[]): Promise<T[]> {
  const response = await prompt<{ selected: T[] }>({
    type: 'multiselect',
    name: 'selected',
    message,
    choices
  });

  return response.selected;
}
```

---

## File Operations

### Safe File Writing

```typescript
// src/utils/files.ts
import fs from 'fs/promises';
import path from 'path';

export async function writeFileSafe(
  filePath: string,
  content: string,
  options: { backup?: boolean; dryRun?: boolean } = {}
): Promise<void> {
  if (options.dryRun) {
    console.log(`[DRY RUN] Would write to ${filePath}`);
    return;
  }

  // Backup existing file
  if (options.backup && await fileExists(filePath)) {
    const backupPath = `${filePath}.backup.${Date.now()}`;
    await fs.copyFile(filePath, backupPath);
    console.log(`Created backup: ${backupPath}`);
  }

  // Ensure directory exists
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  // Write file
  await fs.writeFile(filePath, content, 'utf-8');
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readFileSafe(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}
```

### Batch Processing

```typescript
// src/utils/batch.ts
import { globby } from 'globby';
import pLimit from 'p-limit';

export async function processFiles(
  pattern: string,
  processor: (file: string) => Promise<void>,
  options: {
    parallel?: boolean;
    concurrency?: number;
    dryRun?: boolean;
  } = {}
): Promise<{ processed: number; errors: Error[] }> {
  const files = await globby(pattern);
  const errors: Error[] = [];

  if (options.dryRun) {
    console.log(`[DRY RUN] Would process ${files.length} files:`);
    files.forEach(f => console.log(`  - ${f}`));
    return { processed: 0, errors: [] };
  }

  if (options.parallel) {
    const limit = pLimit(options.concurrency || 4);
    await Promise.all(
      files.map(file =>
        limit(async () => {
          try {
            await processor(file);
          } catch (error) {
            errors.push(error as Error);
          }
        })
      )
    );
  } else {
    for (const file of files) {
      try {
        await processor(file);
      } catch (error) {
        errors.push(error as Error);
      }
    }
  }

  return { processed: files.length - errors.length, errors };
}
```

---

## Git Integration

### Git Operations

```typescript
// src/utils/git.ts
import simpleGit from 'simple-git';

export class GitHelper {
  private git = simpleGit();

  async getDiff(staged = true): Promise<string> {
    return staged
      ? this.git.diff(['--cached'])
      : this.git.diff();
  }

  async getRecentCommits(count: number = 5): Promise<Commit[]> {
    const log = await this.git.log({ maxCount: count });
    return log.all.map(commit => ({
      hash: commit.hash,
      message: commit.message,
      author: commit.author_name,
      date: new Date(commit.date)
    }));
  }

  async commit(message: string, files?: string[]): Promise<void> {
    if (files && files.length > 0) {
      await this.git.add(files);
    }
    await this.git.commit(message);
  }

  async analyzeChanges(): Promise<ChangeAnalysis> {
    const diff = await this.getDiff();
    const stats = await this.git.diffSummary(['--cached']);

    return {
      files: stats.files.map(f => f.file),
      insertions: stats.insertions,
      deletions: stats.deletions,
      summary: diff
    };
  }

  async getBranchName(): Promise<string> {
    const branch = await this.git.branch();
    return branch.current;
  }

  async isClean(): Promise<boolean> {
    const status = await this.git.status();
    return status.files.length === 0;
  }
}
```

---

## Configuration

### Config Management

```typescript
// src/core/config.ts
import { cosmiconfig } from 'cosmiconfig';
import path from 'path';
import os from 'os';

const explorer = cosmiconfig('vibe');

export interface Config {
  defaultModel: string;
  autoApprove: boolean;
  theme: 'dark' | 'light' | 'auto';
  editor: string;
  apiKeys: {
    openai?: string;
    anthropic?: string;
    google?: string;
  };
  aliases: Record<string, string>;
  preferences: {
    confirmDestructive: boolean;
    showProgress: boolean;
    defaultOutputFormat: 'text' | 'json' | 'yaml';
  };
}

export async function loadConfig(): Promise<Config> {
  const result = await explorer.search();
  const userConfig = result?.config || {};

  return {
    defaultModel: userConfig.defaultModel || 'claude-sonnet-4.5',
    autoApprove: userConfig.autoApprove || false,
    theme: userConfig.theme || 'dark',
    editor: userConfig.editor || process.env.EDITOR || 'code',
    apiKeys: userConfig.apiKeys || {},
    aliases: userConfig.aliases || {},
    preferences: {
      confirmDestructive: true,
      showProgress: true,
      defaultOutputFormat: 'text',
      ...userConfig.preferences
    }
  };
}

export async function saveConfig(config: Partial<Config>): Promise<void> {
  const configPath = path.join(os.homedir(), '.vibe', 'config.json');
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

export async function loadGlobalConfig(): Promise<Config> {
  const configPath = path.join(os.homedir(), '.vibe', 'config.json');
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return loadConfig();
  }
}
```

---

## Testing

### Unit Tests

```typescript
// src/test/commands/generate.test.ts
import { CodeGenerator } from '../../commands/generate';

describe('generate command', () => {
  let generator: CodeGenerator;

  beforeEach(() => {
    generator = new CodeGenerator();
  });

  it('should generate component', async () => {
    const result = await generator.generate({
      type: 'component',
      name: 'Button',
      props: ['label', 'onClick']
    });

    expect(result.code).toContain('export const Button');
    expect(result.filePath).toBe('Button.tsx');
  });

  it('should respect preview flag', async () => {
    const result = await generator.generate({
      type: 'component',
      name: 'Test',
      preview: true
    });

    expect(result.written).toBe(false);
  });
});
```

### Integration Tests

```typescript
// src/test/integration/cli.test.ts
import { execa } from 'execa';

describe('CLI Integration', () => {
  it('should process natural language', async () => {
    const result = await execa('vibe', ['explain this file']);
    expect(result.stdout).toContain('Explanation');
  });

  it('should show help', async () => {
    const result = await execa('vibe', ['--help']);
    expect(result.stdout).toContain('Usage');
  });

  it('should handle config commands', async () => {
    const result = await execa('vibe', ['config', 'list']);
    expect(result.exitCode).toBe(0);
  });
});
```

---

## Packaging

### Binary Compilation

```json
// package.json
{
  "scripts": {
    "build": "tsc",
    "package": "pkg . --out-path=dist",
    "package:all": "pkg . --targets node18-macos-x64,node18-linux-x64,node18-win-x64 --out-path=dist"
  },
  "pkg": {
    "scripts": ["dist/**/*.js"],
    "assets": ["templates/**/*"],
    "targets": ["node18"]
  }
}
```

### Distribution

```bash
# Build for all platforms
npm run package:all

# Create archives
cd dist
tar -czf vibe-macos.tar.gz vibe-macos
zip vibe-windows.zip vibe-win.exe
```

### Shell Completions

```typescript
// src/commands/completions.ts
import { Command } from 'commander';

export const completionsCommand = new Command('completions')
  .description('Generate shell completions')
  .argument('<shell>', 'Shell type (bash, zsh, fish)')
  .action(async (shell) => {
    const completions = generateCompletions(shell);
    console.log(completions);
  });

function generateCompletions(shell: string): string {
  switch (shell) {
    case 'bash':
      return generateBashCompletions();
    case 'zsh':
      return generateZshCompletions();
    case 'fish':
      return generateFishCompletions();
    default:
      throw new Error(`Unsupported shell: ${shell}`);
  }
}
```

---

## Contributing

### Code Standards

- Follow TypeScript strict mode
- Use immutable patterns
- Handle all errors comprehensively
- Write tests for new features
- Update documentation

### Commit Messages

Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `refactor:` Code restructuring
- `test:` Tests
- `chore:` Maintenance

---

*Developer Guide v2.0 - AI-VIBE-CLI*
