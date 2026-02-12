/**
 * VIBE-CLI - Fix Command Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fix, FixOptions, showFixHelp, showCommonErrors } from '../../src/commands/fix';

// Mock primitives
const mockPrimitives = {
  search: {
    execute: vi.fn(),
  } as any,
  planning: {
    execute: vi.fn(),
  } as any,
  multiEdit: {
    execute: vi.fn(),
  } as any,
  execution: {
    execute: vi.fn(),
  } as any,
  completion: {
    execute: vi.fn(),
  } as any,
};

describe('Fix Command', () => {
  const testDir = path.join(process.cwd(), 'test-fix-output');
  const originalCwd = process.cwd();

  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    process.chdir(testDir);

    // Reset mocks
    vi.clearAllMocks();

    // Mock completion to return analysis
    mockPrimitives.completion.execute.mockResolvedValue({
      success: true,
      data: JSON.stringify({
        issues: [
          {
            type: 'bug',
            description: 'Missing null check',
            line: 3,
            severity: 'high',
            fix: '// Fixed with null check',
            explanation: 'Added validation for empty string',
          },
        ],
        fixedCode: `// Fixed code
export function getFirstChar(str: string): string {
  if (!str || str.length === 0) {
    return '';
  }
  return str.charAt(0);
}`,
      }),
    });

    // Mock search
    mockPrimitives.search.execute.mockResolvedValue({
      success: true,
      data: {
        query: 'test',
        files: ['test.ts'],
        matchCount: 1,
      },
    });

    // Mock execution (tests)
    mockPrimitives.execution.execute.mockResolvedValue({
      success: true,
      data: 'Tests passed',
    });
  });

  afterEach(() => {
    // Clean up test directory
    process.chdir(originalCwd);
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Command Interface', () => {
    it('should show help when no target provided', async () => {
      const result = await fix([], mockPrimitives);
      expect(result.success).toBe(true);
    });

    it('should show help function', () => {
      expect(() => showFixHelp()).not.toThrow();
    });

    it('should show common errors function', () => {
      expect(() => showCommonErrors()).not.toThrow();
    });
  });

  describe('Error-Based Fixing', () => {
    it('should fix based on error message', async () => {
      mockPrimitives.completion.execute.mockResolvedValue({
        success: true,
        data: JSON.stringify({
          errorType: 'TypeError',
          likelyCause: 'Accessing undefined property',
          searchPattern: 'getFirstChar',
          fixStrategy: 'Add null check',
          confidence: 'high',
        }),
      });

      // Create a file to be found
      fs.writeFileSync('getFirstChar.ts', 'export function getFirstChar() {}');

      const result = await fix(['', 'error:TypeError: Cannot read property'], mockPrimitives, {
        error: 'TypeError: Cannot read property',
      });

      expect(result.success).toBe(true);
      expect(mockPrimitives.completion.execute).toHaveBeenCalled();
    });

    it('should handle error analysis failure', async () => {
      mockPrimitives.completion.execute.mockResolvedValue({
        success: true,
        data: 'Invalid response without JSON',
      });

      const result = await fix(['', 'error:test error'], mockPrimitives, {
        error: 'test error',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('analyze error');
    });
  });

  describe('File-Based Fixing', () => {
    it('should fix a specific file', async () => {
      // Create a buggy file
      const buggyFile = path.join(testDir, 'buggy.ts');
      fs.writeFileSync(buggyFile, 'export function test() {}');

      const result = await fix(['buggy.ts'], mockPrimitives);

      expect(result.success).toBe(true);
      expect(result.fixes).toBeDefined();
      expect(result.fixes?.length).toBeGreaterThan(0);
    });

    it('should handle non-existent file', async () => {
      const result = await fix(['non-existent.ts'], mockPrimitives);

      expect(result.success).toBe(true); // Command succeeds, individual fix fails
      expect(result.fixes?.[0].success).toBe(false);
      expect(result.fixes?.[0].error).toContain('not found');
    });

    it('should create backup before fixing', async () => {
      const testFile = path.join(testDir, 'backup-test.ts');
      const originalContent = 'export function original() {}';
      fs.writeFileSync(testFile, originalContent);

      await fix(['backup-test.ts'], mockPrimitives);

      // Backup should exist
      const backupFile = testFile + '.backup';
      expect(fs.existsSync(backupFile)).toBe(true);

      // Backup should have original content
      const backupContent = fs.readFileSync(backupFile, 'utf-8');
      expect(backupContent).toBe(originalContent);
    });

    it('should handle dry-run mode', async () => {
      const testFile = path.join(testDir, 'dry-run.ts');
      fs.writeFileSync(testFile, 'export function test() {}');

      const result = await fix(['dry-run.ts'], mockPrimitives, {
        dryRun: true,
      });

      expect(result.success).toBe(true);
      // File should not be modified in dry-run
      const content = fs.readFileSync(testFile, 'utf-8');
      expect(content).toBe('export function test() {}');
    });
  });

  describe('Directory Scanning', () => {
    it('should scan and fix directory', async () => {
      // Create multiple files
      fs.writeFileSync(path.join(testDir, 'file1.ts'), 'export function f1() {}');
      fs.writeFileSync(path.join(testDir, 'file2.ts'), 'export function f2() {}');

      const result = await fix(['.'], mockPrimitives);

      expect(result.success).toBe(true);
      expect(result.fixes?.length).toBeGreaterThanOrEqual(2);
    });

    it('should skip test files', async () => {
      // Create source and test files
      fs.writeFileSync(path.join(testDir, 'source.ts'), 'export function src() {}');
      fs.writeFileSync(path.join(testDir, 'source.test.ts'), 'export function test() {}');

      const result = await fix(['.'], mockPrimitives);

      // Should only process source.ts, not source.test.ts
      const processedFiles = result.fixes?.map((f) => path.basename(f.file || ''));
      expect(processedFiles).toContain('source.ts');
      expect(processedFiles).not.toContain('source.test.ts');
    });
  });

  describe('Testing Integration', () => {
    it('should test fixes by default', async () => {
      const testFile = path.join(testDir, 'with-tests.ts');
      fs.writeFileSync(testFile, 'export function test() {}');
      fs.writeFileSync(testFile + '.test.ts', 'test content');

      await fix(['with-tests.ts'], mockPrimitives);

      expect(mockPrimitives.execution.execute).toHaveBeenCalled();
    });

    it('should skip testing when requested', async () => {
      const testFile = path.join(testDir, 'no-tests.ts');
      fs.writeFileSync(testFile, 'export function test() {}');

      await fix(['no-tests.ts'], mockPrimitives, {
        test: false,
      });

      expect(mockPrimitives.execution.execute).not.toHaveBeenCalled();
    });

    it('should rollback on test failure', async () => {
      const testFile = path.join(testDir, 'rollback-test.ts');
      const originalContent = 'export function original() {}';
      fs.writeFileSync(testFile, originalContent);

      // Mock test failure
      mockPrimitives.execution.execute.mockResolvedValue({
        success: false,
        error: 'Tests failed',
      });

      const result = await fix(['rollback-test.ts'], mockPrimitives, {
        rollback: true,
      });

      const fixResult = result.fixes?.[0];

      // Should be marked as failed
      expect(fixResult?.tested).toBe(true);
      expect(fixResult?.testPassed).toBe(false);

      // File should be rolled back to original
      const content = fs.readFileSync(testFile, 'utf-8');
      expect(content).toBe(originalContent);
    });
  });

  describe('Issue Detection', () => {
    it('should detect multiple issue types', async () => {
      mockPrimitives.completion.execute.mockResolvedValue({
        success: true,
        data: JSON.stringify({
          issues: [
            { type: 'bug', description: 'Bug 1', severity: 'critical', fix: 'fix1' },
            { type: 'error-handling', description: 'Bug 2', severity: 'high', fix: 'fix2' },
            { type: 'performance', description: 'Bug 3', severity: 'medium', fix: 'fix3' },
          ],
          fixedCode: '// All fixes',
        }),
      });

      const testFile = path.join(testDir, 'multi-issue.ts');
      fs.writeFileSync(testFile, 'export function test() {}');

      const result = await fix(['multi-issue.ts'], mockPrimitives);
      const fixResult = result.fixes?.[0];

      expect(fixResult?.changes?.length).toBe(3);
    });

    it('should handle no issues found', async () => {
      mockPrimitives.completion.execute.mockResolvedValue({
        success: true,
        data: JSON.stringify({
          issues: [],
          fixedCode: 'export function test() {}',
        }),
      });

      const testFile = path.join(testDir, 'clean.ts');
      const originalContent = 'export function test() {}';
      fs.writeFileSync(testFile, originalContent);

      const result = await fix(['clean.ts'], mockPrimitives);
      const fixResult = result.fixes?.[0];

      expect(fixResult?.changes?.length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle completion errors', async () => {
      mockPrimitives.completion.execute.mockResolvedValue({
        success: false,
        error: 'AI service unavailable',
      });

      const testFile = path.join(testDir, 'error.ts');
      fs.writeFileSync(testFile, 'export function test() {}');

      const result = await fix(['error.ts'], mockPrimitives);
      const fixResult = result.fixes?.[0];

      expect(fixResult?.success).toBe(false);
      expect(fixResult?.error).toContain('AI service');
    });

    it('should handle invalid JSON in AI response', async () => {
      mockPrimitives.completion.execute.mockResolvedValue({
        success: true,
        data: 'Not valid JSON',
      });

      const testFile = path.join(testDir, 'invalid.ts');
      fs.writeFileSync(testFile, 'export function test() {}');

      const result = await fix(['invalid.ts'], mockPrimitives);
      const fixResult = result.fixes?.[0];

      expect(fixResult?.success).toBe(false);
    });
  });

  describe('Common Error Patterns', () => {
    it('should display common errors help', () => {
      expect(() => showCommonErrors()).not.toThrow();
    });
  });
});
