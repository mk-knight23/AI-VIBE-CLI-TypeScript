# AI-VIBE-CLI - Best Practices
## CLI Development Standards

---

## Table of Contents

1. [CLI Architecture](#cli-architecture)
2. [Command Design](#command-design)
3. [Error Handling](#error-handling)
4. [Testing](#testing)
5. [Documentation](#documentation)

---

## CLI Architecture

### Modular Design

```typescript
// src/core/cli.ts
import { Command } from 'commander'
import { ChatCommand } from './commands/chat'
import { EditCommand } from './commands/edit'
import { ConfigCommand } from './commands/config'

export class VibeCLI {
  private program: Command

  constructor() {
    this.program = new Command()
    this.setupProgram()
    this.registerCommands()
  }

  private setupProgram(): void {
    this.program
      .name('vibe')
      .description('AI-powered CLI assistant')
      .version(getVersion())
      .option('-v, --verbose', 'verbose output')
      .option('--dry-run', 'simulate without making changes')
  }

  private registerCommands(): void {
    const commands = [
      new ChatCommand(),
      new EditCommand(),
      new ConfigCommand()
    ]

    for (const command of commands) {
      command.register(this.program)
    }
  }

  async run(args: string[]): Promise<void> {
    await this.program.parseAsync(args)
  }
}
```

### Command Pattern

```typescript
// src/commands/base.ts
export abstract class BaseCommand {
  abstract name: string
  abstract description: string

  register(program: Command): void {
    const cmd = program
      .command(this.name)
      .description(this.description)

    this.defineArgs(cmd)
    this.defineFlags(cmd)

    cmd.action(async (...args) => {
      try {
        await this.execute(...args)
      } catch (error) {
        handleError(error)
      }
    })
  }

  protected abstract defineArgs(cmd: Command): void
  protected abstract defineFlags(cmd: Command): void
  protected abstract execute(...args: any[]): Promise<void>
}

// Implementation
export class ChatCommand extends BaseCommand {
  name = 'chat'
  description = 'Start interactive chat session'

  protected defineArgs(cmd: Command): void {
    cmd.argument('[message]', 'initial message')
  }

  protected defineFlags(cmd: Command): void {
    cmd
      .option('-m, --model <model>', 'AI model to use')
      .option('-c, --context <path>', 'context file')
  }

  protected async execute(message?: string, options?: any): Promise<void> {
    const chat = new ChatSession({
      model: options.model,
      context: options.context
    })

    if (message) {
      await chat.send(message)
    }

    await chat.interactive()
  }
}
```

---

## Command Design

### Argument Parsing

```typescript
// Consistent argument handling
interface ParsedArgs {
  // Positional args
  paths: string[]

  // Options
  options: {
    recursive: boolean
    force: boolean
    output?: string
  }
}

// Validation
function validateArgs(args: ParsedArgs): void {
  if (args.paths.length === 0) {
    throw new CLIError('At least one path required', 'E_NO_PATH')
  }

  for (const path of args.paths) {
    if (!existsSync(path)) {
      throw new CLIError(`Path not found: ${path}`, 'E_PATH_NOT_FOUND')
    }
  }
}
```

### Interactive Prompts

```typescript
// src/ui/prompts.ts
import { input, select, confirm, checkbox } from '@inquirer/prompts'

export async function promptForModel(): Promise<string> {
  return select({
    message: 'Choose AI model:',
    choices: [
      { name: 'GPT-4', value: 'gpt-4' },
      { name: 'Claude 3 Opus', value: 'claude-3-opus' },
      { name: 'Local (Ollama)', value: 'ollama' }
    ]
  })
}

export async function promptForConfirmation(
  message: string
): Promise<boolean> {
  return confirm({ message })
}

export async function promptForFiles(): Promise<string[]> {
  const files = await getProjectFiles()

  return checkbox({
    message: 'Select files to include:',
    choices: files.map(f => ({
      name: f.path,
      value: f.path,
      description: f.description
    }))
  })
}
```

---

## Error Handling

### Error Types

```typescript
// src/errors/types.ts
export class CLIError extends Error {
  constructor(
    message: string,
    public code: string,
    public exitCode: number = 1
  ) {
    super(message)
    this.name = 'CLIError'
  }
}

export class ValidationError extends CLIError {
  constructor(message: string) {
    super(message, 'E_VALIDATION', 2)
  }
}

export class ConfigError extends CLIError {
  constructor(message: string) {
    super(message, 'E_CONFIG', 3)
  }
}

export class NetworkError extends CLIError {
  constructor(message: string) {
    super(message, 'E_NETWORK', 4)
  }
}

export class AIError extends CLIError {
  constructor(message: string) {
    super(message, 'E_AI', 5)
  }
}
```

### Error Handler

```typescript
// src/errors/handler.ts
export function handleError(error: unknown): never {
  if (error instanceof CLIError) {
    console.error(chalk.red(`Error (${error.code}): ${error.message}`))

    // Suggest fix if available
    if (error.code === 'E_CONFIG') {
      console.error(chalk.yellow('Run `vibe config init` to setup configuration'))
    }

    process.exit(error.exitCode)
  }

  // Unknown error
  console.error(chalk.red('Unexpected error:'), error)
  process.exit(1)
}
```

---

## Testing

### Unit Testing

```typescript
// tests/commands/chat.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ChatCommand } from '../../src/commands/chat'

describe('ChatCommand', () => {
  let command: ChatCommand

  beforeEach(() => {
    command = new ChatCommand()
  })

  it('should accept message argument', () => {
    const mockProgram = { command: vi.fn().mockReturnThis() }

    command.register(mockProgram as any)

    expect(mockProgram.command).toHaveBeenCalledWith('chat')
  })

  it('should start interactive mode without message', async () => {
    const mockChat = {
      interactive: vi.fn().mockResolvedValue(undefined)
    }
    vi.mock('../../src/core/chat', () => ({
      ChatSession: vi.fn(() => mockChat)
    }))

    await command.execute(undefined, {})

    expect(mockChat.interactive).toHaveBeenCalled()
  })
})
```

### Integration Testing

```typescript
// tests/integration/cli.test.ts
import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'

describe('CLI Integration', () => {
  it('should show help', () => {
    const output = execSync('node dist/cli.js --help').toString()

    expect(output).toContain('vibe')
    expect(output).toContain('chat')
    expect(output).toContain('edit')
  })

  it('should show version', () => {
    const output = execSync('node dist/cli.js --version').toString()

    expect(output).toMatch(/^\d+\.\d+\.\d+/)
  })
})
```

---

## Documentation

### Help Generation

```typescript
// Auto-generate help from command definitions
program.on('--help', () => {
  console.log('')
  console.log('Examples:')
  console.log('  $ vibe chat "explain this code"')
  console.log('  $ vibe edit src/app.ts --instruction "add error handling"')
  console.log('  $ vibe review --since yesterday')
})
```

### Man Pages

```markdown
# vibe(1) -- AI-powered CLI assistant

## SYNOPSIS

`vibe` [<options>] <command> [<args>]

## COMMANDS

* `chat` [<message>]:
  Start interactive chat or send one-off message

* `edit` <path>:
  Edit files with AI assistance

* `config` <subcommand>:
  Manage configuration

## OPTIONS

* `-v, --verbose`:
  Enable verbose output

* `--dry-run`:
  Simulate without making changes

* `-h, --help`:
  Show help

* `--version`:
  Show version

## EXAMPLES

Start interactive chat:
    $ vibe chat

Explain current directory:
    $ vibe chat "explain this codebase"

Generate tests:
    $ vibe edit src/utils.ts --instruction "add tests"
```

---

*Best Practices v2.0 - AI-VIBE-CLI*
