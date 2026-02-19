/**
 * Unit tests for testing module
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TestingModule } from '../../../src/modules/testing';

// Mock child_process to avoid actual command execution during tests
const mockExecSync = vi.fn();
const mockExec = vi.fn();

vi.mock('child_process', () => ({
  execSync: (...args: any[]) => mockExecSync(...args),
  exec: (...args: any[]) => mockExec(...args),
}));

// Mock fs to avoid actual file system operations
const mockExistsSync = vi.fn(() => true);
const mockReadFileSync = vi.fn(() => '{"scripts": {"test": "jest"}}');
const mockWriteFileSync = vi.fn();
const mockMkdirSync = vi.fn();

vi.mock('fs', () => ({
  existsSync: (...args: any[]) => mockExistsSync(...args),
  readFileSync: (...args: any[]) => mockReadFileSync(...args),
  writeFileSync: (...args: any[]) => mockWriteFileSync(...args),
  mkdirSync: (...args: any[]) => mockMkdirSync(...args),
}));

// Mock the provider router to avoid actual API calls
const mockChat = vi.fn().mockResolvedValue({
  content: '=== FILENAME ===\ntest.test.ts\n=== CODE ===\nconsole.log("test");\n=== END ===',
  usage: { totalTokens: 100 },
  model: 'claude-sonnet-4-20250514',
});

vi.mock('../../../src/providers/router.js', () => ({
  VibeProviderRouter: vi.fn().mockImplementation(() => ({
    chat: (...args: any[]) => mockChat(...args),
  })),
}));

describe('TestingModule', () => {
  let module: TestingModule;

  beforeEach(() => {
    // Reset all mocks
    mockExecSync.mockReset();
    mockExec.mockReset();
    mockExistsSync.mockReset();
    mockReadFileSync.mockReset();
    mockWriteFileSync.mockReset();
    mockMkdirSync.mockReset();
    mockChat.mockReset();

    // Set default mock behaviors
    mockExecSync.mockReturnValue('Tests: 5 passed, 0 failed\nTime: 1.5s');
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('{"scripts": {"test": "jest"}}');
    mockChat.mockResolvedValue({
      content: '=== FILENAME ===\ntest.test.ts\n=== CODE ===\nconsole.log("test");\n=== END ===',
      usage: { totalTokens: 100 },
      model: 'claude-sonnet-4-20250514',
    });

    module = new TestingModule();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct info', () => {
      expect(module.getName()).toBe('testing');
      expect(module.getVersion()).toBe('1.0.0');
      expect(module.getDescription()).toContain('Test generation');
    });
  });

  describe('execute', () => {
    it('should return failure for unknown action', async () => {
      const result = await module.execute({ action: 'unknown' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });

    it('should route generate action', async () => {
      const result = await module.execute({ action: 'generate', file: 'nonexistent.ts' });
      expect(result).toHaveProperty('success');
    });

    it('should route run action', async () => {
      const result = await module.execute({ action: 'run' });
      expect(result).toHaveProperty('success');
    });

    it('should route coverage action', async () => {
      const result = await module.execute({ action: 'coverage' });
      expect(result).toHaveProperty('success');
    });

    it('should route watch action', async () => {
      const result = await module.execute({ action: 'watch' });
      expect(result).toHaveProperty('success');
    });

    it('should route analyze action', async () => {
      const result = await module.execute({ action: 'analyze' });
      expect(result).toHaveProperty('success');
    });
  });

  describe('getInfo', () => {
    it('should return module info', () => {
      const info = module.getInfo();
      expect(info.name).toBe('testing');
      expect(info.version).toBe('1.0.0');
    });
  });
});
