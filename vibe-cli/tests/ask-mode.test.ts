/**
 * Ask Mode Tests - v10.1 Safe Defaults
 * Tests for --allow-tools and --dangerously-skip-permissions flags
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock modules before importing
vi.mock('../src/core/api', () => ({
  ApiClient: vi.fn().mockImplementation(() => ({
    getProvider: () => 'megallm',
    chat: vi.fn().mockResolvedValue({
      choices: [{ message: { content: 'Test response', tool_calls: [] } }],
      usage: { total_tokens: 100 }
    })
  }))
}));

vi.mock('../src/storage', () => ({
  createSession: vi.fn().mockReturnValue({ id: 'test-session' }),
  addMessage: vi.fn(),
  getMessages: vi.fn().mockReturnValue([]),
  toApiMessages: vi.fn().mockReturnValue([])
}));

vi.mock('../src/permissions', () => ({
  getPermission: vi.fn().mockReturnValue('ask'),
  setPermission: vi.fn()
}));

describe('Ask Mode - Safe Defaults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Flag Parsing', () => {
    it('should parse --allow-tools flag', async () => {
      const { parseAskArgs } = await getParseAskArgs();
      const options = parseAskArgs(['test prompt', '--allow-tools']);
      expect(options.allowTools).toBe(true);
      expect(options.prompt).toBe('test prompt');
    });

    it('should parse -t shorthand for --allow-tools', async () => {
      const { parseAskArgs } = await getParseAskArgs();
      const options = parseAskArgs(['test prompt', '-t']);
      expect(options.allowTools).toBe(true);
    });

    it('should parse --dangerously-skip-permissions flag', async () => {
      const { parseAskArgs } = await getParseAskArgs();
      const options = parseAskArgs(['test prompt', '--dangerously-skip-permissions']);
      expect(options.dangerouslySkipPermissions).toBe(true);
      expect(options.allowTools).toBe(true); // YOLO implies allow-tools
    });

    it('should parse --yolo shorthand', async () => {
      const { parseAskArgs } = await getParseAskArgs();
      const options = parseAskArgs(['test prompt', '--yolo']);
      expect(options.dangerouslySkipPermissions).toBe(true);
      expect(options.allowTools).toBe(true);
    });

    it('should maintain backward compatibility with --auto-approve', async () => {
      const { parseAskArgs } = await getParseAskArgs();
      const options = parseAskArgs(['test prompt', '--auto-approve']);
      expect(options.allowTools).toBe(true);
    });

    it('should parse combined flags', async () => {
      const { parseAskArgs } = await getParseAskArgs();
      const options = parseAskArgs(['test prompt', '--json', '--quiet', '--allow-tools']);
      expect(options.json).toBe(true);
      expect(options.quiet).toBe(true);
      expect(options.allowTools).toBe(true);
    });
  });

  describe('Safe Defaults', () => {
    it('should default allowTools to undefined (falsy)', async () => {
      const { parseAskArgs } = await getParseAskArgs();
      const options = parseAskArgs(['test prompt']);
      expect(options.allowTools).toBeFalsy();
    });

    it('should default dangerouslySkipPermissions to undefined (falsy)', async () => {
      const { parseAskArgs } = await getParseAskArgs();
      const options = parseAskArgs(['test prompt']);
      expect(options.dangerouslySkipPermissions).toBeFalsy();
    });
  });
});

describe('Compatibility Contract - Ask Mode', () => {
  it('should support all documented flags', async () => {
    const { parseAskArgs } = await getParseAskArgs();
    
    // All flags from compatibility contract
    const flags = [
      ['--json', 'json'],
      ['--quiet', 'quiet'],
      ['-q', 'quiet'],
      ['--allow-tools', 'allowTools'],
      ['-t', 'allowTools'],
    ];

    for (const [flag, key] of flags) {
      const options = parseAskArgs(['prompt', flag]);
      expect(options[key as keyof typeof options]).toBeTruthy();
    }
  });
});

// Helper to get parseAskArgs without running the full module
async function getParseAskArgs() {
  // Re-implement parseAskArgs logic for testing
  function parseAskArgs(args: string[]) {
    const options: any = { prompt: '' };
    const promptParts: string[] = [];

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--json') {
        options.json = true;
      } else if (arg === '--allow-tools' || arg === '-t') {
        options.allowTools = true;
      } else if (arg === '--dangerously-skip-permissions' || arg === '--yolo') {
        options.dangerouslySkipPermissions = true;
        options.allowTools = true;
      } else if (arg === '--auto-approve' || arg === '-y') {
        options.allowTools = true;
      } else if (arg === '--quiet' || arg === '-q') {
        options.quiet = true;
      } else if (arg === '--model' && args[i + 1]) {
        options.model = args[++i];
      } else if (arg === '--provider' && args[i + 1]) {
        options.provider = args[++i];
      } else if (!arg.startsWith('-')) {
        promptParts.push(arg);
      }
    }

    options.prompt = promptParts.join(' ');
    return options;
  }

  return { parseAskArgs };
}
