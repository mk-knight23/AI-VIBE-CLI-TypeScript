# AI-VIBE-CLI - Testing Guide
## Testing Strategy for CLI Application

---

## Table of Contents

1. [Test Architecture](#test-architecture)
2. [Unit Testing](#unit-testing)
3. [Integration Testing](#integration-testing)
4. [E2E Testing](#e2e-testing)

---

## Test Architecture

### Test Structure

```
tests/
├── unit/
│   ├── commands/          # Command tests
│   ├── core/              # Core module tests
│   ├── llm/               # LLM client tests
│   └── utils/             # Utility tests
├── integration/
│   ├── cli.test.ts        # CLI integration
│   └── config.test.ts     # Config handling
└── e2e/
    └── scenarios/         # End-to-end scenarios
```

---

## Unit Testing

### Command Testing

```typescript
// tests/commands/edit.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EditCommand } from '../../src/commands/edit'

describe('EditCommand', () => {
  let command: EditCommand
  let mockFS: any

  beforeEach(() => {
    mockFS = {
      readFile: vi.fn().mockResolvedValue('const x = 1'),
      writeFile: vi.fn().mockResolvedValue(undefined)
    }
    command = new EditCommand(mockFS)
  })

  it('should edit file with instruction', async () => {
    const mockLLM = vi.fn().mockResolvedValue('const x = 2')

    await command.execute('src/test.ts', {
      instruction: 'change to 2',
      llm: mockLLM
    })

    expect(mockFS.readFile).toHaveBeenCalledWith('src/test.ts', 'utf-8')
    expect(mockLLM).toHaveBeenCalled()
    expect(mockFS.writeFile).toHaveBeenCalled()
  })

  it('should require instruction flag', async () => {
    await expect(
      command.execute('src/test.ts', {})
    ).rejects.toThrow('Instruction required')
  })
})
```

---

## Integration Testing

### CLI Integration

```typescript
// tests/integration/cli.test.ts
import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'
import { mkdtempSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

describe('CLI Integration', () => {
  const run = (args: string, cwd?: string): string => {
    return execSync(`node dist/cli.js ${args}`, {
      cwd,
      encoding: 'utf-8',
      env: { ...process.env, VIBE_TEST: 'true' }
    })
  }

  it('should show version', () => {
    const output = run('--version')
    expect(output).toMatch(/^\d+\.\d+\.\d+/)
  })

  it('should execute chat command', () => {
    const output = run('chat --help')
    expect(output).toContain('chat')
    expect(output).toContain('message')
  })

  it('should respect config file', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'vibe-test-'))
    writeFileSync(
      join(tmpDir, '.vibe.json'),
      JSON.stringify({ model: 'test-model' })
    )

    const output = run('config get model', tmpDir)
    expect(output).toContain('test-model')
  })
})
```

---

## E2E Testing

### Scenario Testing

```typescript
// tests/e2e/scenarios/code-generation.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { execSync } from 'child_process'

describe('Code Generation E2E', () => {
  let testDir: string

  beforeAll(() => {
    testDir = mkdtempSync(join(tmpdir(), 'vibe-e2e-'))
  })

  afterAll(() => {
    execSync(`rm -rf ${testDir}`)
  })

  it('should generate and edit code', () => {
    // Generate file
    execSync(
      `node dist/cli.js generate component Button --output ${join(testDir, 'Button.tsx')}`,
      { env: { ...process.env, VIBE_MOCK_LLM: 'true' } }
    )

    const content = readFileSync(join(testDir, 'Button.tsx'), 'utf-8')
    expect(content).toContain('Button')

    // Edit file
    execSync(
      `node dist/cli.js edit ${join(testDir, 'Button.tsx')} --instruction "add props interface"`,
      { env: { ...process.env, VIBE_MOCK_LLM: 'true' } }
    )

    const edited = readFileSync(join(testDir, 'Button.tsx'), 'utf-8')
    expect(edited).toContain('interface')
  })
})
```

---

*Testing Guide v2.0 - AI-VIBE-CLI*
