/**
 * Unit tests for security module
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SecurityModule } from '../../../src/modules/security';

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
const mockReaddirSync = vi.fn(() => []);

vi.mock('fs', () => ({
  existsSync: (...args: any[]) => mockExistsSync(...args),
  readFileSync: (...args: any[]) => mockReadFileSync(...args),
  writeFileSync: (...args: any[]) => mockWriteFileSync(...args),
  mkdirSync: (...args: any[]) => mockMkdirSync(...args),
  readdirSync: (...args: any[]) => mockReaddirSync(...args),
}));

// Mock the provider router to avoid actual API calls
const mockChat = vi.fn().mockResolvedValue({
  content: 'Security scan complete',
  usage: { totalTokens: 50 },
  model: 'claude-sonnet-4-20250514',
});

vi.mock('../../../src/providers/router.js', () => ({
  VibeProviderRouter: vi.fn().mockImplementation(() => ({
    chat: (...args: any[]) => mockChat(...args),
  })),
}));

describe('SecurityModule', () => {
  let module: SecurityModule;

  beforeEach(() => {
    // Reset all mocks
    mockExecSync.mockReset();
    mockExec.mockReset();
    mockExistsSync.mockReset();
    mockReadFileSync.mockReset();
    mockWriteFileSync.mockReset();
    mockMkdirSync.mockReset();
    mockReaddirSync.mockReset();
    mockChat.mockReset();

    // Set default mock behaviors
    mockExecSync.mockReturnValue('Security scan complete');
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([]);
    mockChat.mockResolvedValue({
      content: 'Security scan complete',
      usage: { totalTokens: 50 },
      model: 'claude-sonnet-4-20250514',
    });

    module = new SecurityModule();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct info', () => {
      expect(module.getName()).toBe('security');
      expect(module.getVersion()).toBe('1.0.0');
      expect(module.getDescription()).toContain('Vulnerability scanning');
    });
  });

  describe('execute', () => {
    it('should return failure for unknown action', async () => {
      const result = await module.execute({ action: 'unknown' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });

    it('should route scan action', async () => {
      const result = await module.execute({ action: 'scan' });
      expect(result).toHaveProperty('success');
    });

    it('should route audit action', async () => {
      const result = await module.execute({ action: 'audit' });
      expect(result).toHaveProperty('success');
    });

    it('should route check action', async () => {
      const result = await module.execute({ action: 'check' });
      expect(result).toHaveProperty('success');
    });

    it('should route fix action', async () => {
      const result = await module.execute({ action: 'fix' });
      expect(result).toHaveProperty('success');
    });
  });

  describe('getInfo', () => {
    it('should return module info', () => {
      const info = module.getInfo();
      expect(info.name).toBe('security');
      expect(info.version).toBe('1.0.0');
      expect(info.description).toBeTruthy();
    });
  });
});
