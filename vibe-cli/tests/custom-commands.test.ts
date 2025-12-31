import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const testDir = path.join(os.tmpdir(), `vibe-cmd-test-${Date.now()}`);
const commandsDir = path.join(testDir, '.vibe', 'commands');

describe('Custom Commands', () => {
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    fs.mkdirSync(commandsDir, { recursive: true });
    process.chdir(testDir);
    vi.resetModules();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should parse command file with frontmatter', async () => {
    const cmdContent = `---
name: test-cmd
description: A test command
args:
  - file
---

Process the file $file
`;
    fs.writeFileSync(path.join(commandsDir, 'test-cmd.md'), cmdContent);

    const { loadCustomCommands } = await import('../src/commands/custom/parser');
    const commands = loadCustomCommands(true);
    
    expect(commands.length).toBe(1);
    expect(commands[0].name).toBe('test-cmd');
    expect(commands[0].description).toBe('A test command');
    expect(commands[0].args.length).toBe(1);
    expect(commands[0].args[0].name).toBe('file');
  });

  it('should expand prompt with arguments', async () => {
    const cmdContent = `---
name: expand-test
description: Test expansion
args:
  - name: name
    required: true
---

Hello $name, welcome!
`;
    fs.writeFileSync(path.join(commandsDir, 'expand-test.md'), cmdContent);

    const { loadCustomCommands, expandPrompt } = await import('../src/commands/custom/parser');
    const commands = loadCustomCommands(true);
    const cmd = commands.find(c => c.name === 'expand-test');
    
    expect(cmd).toBeDefined();
    const expanded = expandPrompt(cmd!, { name: 'World' });
    expect(expanded).toBe('Hello World, welcome!');
  });

  it('should throw on missing required argument', async () => {
    const cmdContent = `---
name: required-test
description: Test required
args:
  - name: required_arg
    required: true
---

Value: $required_arg
`;
    fs.writeFileSync(path.join(commandsDir, 'required-test.md'), cmdContent);

    const { loadCustomCommands, expandPrompt } = await import('../src/commands/custom/parser');
    const commands = loadCustomCommands(true);
    const cmd = commands.find(c => c.name === 'required-test');
    
    expect(() => expandPrompt(cmd!, {})).toThrow('Missing required argument');
  });

  it('should list commands', async () => {
    fs.writeFileSync(path.join(commandsDir, 'cmd1.md'), `---
name: cmd1
description: First command
args: []
---
Prompt 1`);
    
    fs.writeFileSync(path.join(commandsDir, 'cmd2.md'), `---
name: cmd2
description: Second command
args: []
---
Prompt 2`);

    const { listCommands, loadCustomCommands } = await import('../src/commands/custom/parser');
    loadCustomCommands(true); // Force reload
    const commands = listCommands();
    
    expect(commands.length).toBe(2);
    expect(commands.map(c => c.name).sort()).toEqual(['cmd1', 'cmd2']);
  });

  it('should support command aliases', async () => {
    const cmdContent = `---
name: aliased-cmd
description: Command with aliases
aliases: ac, alias
args: []
---
Aliased prompt
`;
    fs.writeFileSync(path.join(commandsDir, 'aliased-cmd.md'), cmdContent);

    const { loadCustomCommands, getCommand } = await import('../src/commands/custom/parser');
    loadCustomCommands(true);
    
    const byName = getCommand('aliased-cmd');
    const byAlias = getCommand('ac');
    
    expect(byName).toBeDefined();
    expect(byAlias).toBeDefined();
    expect(byName?.name).toBe(byAlias?.name);
  });

  it('should support categories', async () => {
    const cmdContent = `---
name: categorized-cmd
description: Command with category
category: testing
args: []
---
Categorized prompt
`;
    fs.writeFileSync(path.join(commandsDir, 'categorized-cmd.md'), cmdContent);

    const { loadCustomCommands, getCommandsByCategory } = await import('../src/commands/custom/parser');
    loadCustomCommands(true);
    const byCategory = getCommandsByCategory();
    
    expect(byCategory.testing).toBeDefined();
    expect(byCategory.testing.length).toBe(1);
    expect(byCategory.testing[0].name).toBe('categorized-cmd');
  });
});
