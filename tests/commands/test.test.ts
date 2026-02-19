/**
 * VIBE-CLI - Test Command Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { generateTests, TEST_FRAMEWORKS, analyzeForTests } from '../../src/commands/test';

// Mock primitives
const mockPrimitives = {
  search: {
    findFiles: vi.fn(),
    readFile: vi.fn(),
  } as any,
  completion: {
    execute: vi.fn(),
  } as any,
  multiEdit: {
    execute: vi.fn(),
  } as any,
};

describe('Test Command', () => {
  const testDir = path.join(process.cwd(), 'test-command-output');
  const originalCwd = process.cwd();

  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    process.chdir(testDir);

    // Reset mocks
    vi.clearAllMocks();

    // Mock completion to return test code
    mockPrimitives.completion.execute.mockResolvedValue({
      success: true,
      data: `describe('MyFunction', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
});`,
    });
  });

  afterEach(() => {
    // Clean up test directory
    process.chdir(originalCwd);
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Framework Definitions', () => {
    it('should have vitest framework defined', () => {
      expect(TEST_FRAMEWORKS.vitest).toBeDefined();
      expect(TEST_FRAMEWORKS.vitest.name).toBe('Vitest');
      expect(TEST_FRAMEWORKS.vitest.mockSyntax).toBe('vi.fn()');
    });

    it('should have jest framework defined', () => {
      expect(TEST_FRAMEWORKS.jest).toBeDefined();
      expect(TEST_FRAMEWORKS.jest.name).toBe('Jest');
      expect(TEST_FRAMEWORKS.jest.mockSyntax).toBe('jest.fn()');
    });
  });

  describe('Test Generation', () => {
    it('should show help when no target provided', async () => {
      const result = await generateTests([], mockPrimitives);
      expect(result.success).toBe(true);
    });

    it('should handle non-existent files', async () => {
      const result = await generateTests(['non-existent.ts'], mockPrimitives);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should generate tests for a TypeScript file', async () => {
      // Create a sample source file
      const sourceFile = path.join(testDir, 'utils.ts');
      fs.writeFileSync(sourceFile, `
export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}
      `, 'utf-8');

      const result = await generateTests(['utils.ts'], mockPrimitives);

      expect(result.success).toBe(true);
      expect(result.filesCreated).toBeDefined();
      expect(result.filesCreated?.length).toBeGreaterThan(0);
      expect(mockPrimitives.completion.execute).toHaveBeenCalled();
    });

    it('should generate tests for a JavaScript file', async () => {
      const sourceFile = path.join(testDir, 'helpers.js');
      fs.writeFileSync(sourceFile, `
export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
      `, 'utf-8');

      const result = await generateTests(['helpers.js'], mockPrimitives);

      expect(result.success).toBe(true);
      expect(result.filesCreated?.length).toBeGreaterThan(0);
    });

    it('should generate tests for all files in a directory', async () => {
      // Create multiple source files
      fs.writeFileSync(path.join(testDir, 'math.ts'), 'export const pi = 3.14;');
      fs.writeFileSync(path.join(testDir, 'string.ts'), 'export const hello = "world";');

      const result = await generateTests(['.'], mockPrimitives);

      expect(result.success).toBe(true);
      expect(result.filesCreated?.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Test Content Generation', () => {
    it('should include framework-specific imports', async () => {
      const sourceFile = path.join(testDir, 'test.ts');
      fs.writeFileSync(sourceFile, 'export function test() {}', 'utf-8');

      mockPrimitives.completion.execute.mockResolvedValue({
        success: true,
        data: 'it("should work", () => { expect(true).toBe(true); });',
      });

      await generateTests(['test.ts'], mockPrimitives, { framework: 'vitest' });

      const testFile = path.join(testDir, 'test.test.ts');
      expect(fs.existsSync(testFile)).toBe(true);

      const content = fs.readFileSync(testFile, 'utf-8');
      expect(content).toContain("from 'vitest'");
    });

    it('should handle AI responses with markdown code blocks', async () => {
      const sourceFile = path.join(testDir, 'clean.ts');
      fs.writeFileSync(sourceFile, 'export function clean() {}', 'utf-8');

      // Mock AI to return markdown-wrapped code
      mockPrimitives.completion.execute.mockResolvedValue({
        success: true,
        data: '```typescript\nit("test", () => {});\n```',
      });

      const result = await generateTests(['clean.ts'], mockPrimitives);

      expect(result.success).toBe(true);

      const testFile = path.join(testDir, 'clean.test.ts');
      const content = fs.readFileSync(testFile, 'utf-8');

      // Should strip markdown
      expect(content).not.toContain('```');
    });
  });

  describe('File Handling', () => {
    it('should create test file next to source file', async () => {
      const sourceFile = path.join(testDir, 'myFunc.ts');
      fs.writeFileSync(sourceFile, 'export function myFunc() {}', 'utf-8');

      await generateTests(['myFunc.ts'], mockPrimitives);

      const testFile = path.join(testDir, 'myFunc.test.ts');
      expect(fs.existsSync(testFile)).toBe(true);
    });

    it('should handle existing test files without --update', async () => {
      const sourceFile = path.join(testDir, 'existing.ts');
      fs.writeFileSync(sourceFile, 'export function existing() {}', 'utf-8');

      const testFile = path.join(testDir, 'existing.test.ts');
      fs.writeFileSync(testFile, '// Old test', 'utf-8');

      const result = await generateTests(['existing.ts'], mockPrimitives, { update: false });

      expect(result.success).toBe(true);

      // Test file should not be modified
      const content = fs.readFileSync(testFile, 'utf-8');
      expect(content).toBe('// Old test');
    });

    it('should overwrite existing test files with --update', async () => {
      const sourceFile = path.join(testDir, 'overwrite.ts');
      fs.writeFileSync(sourceFile, 'export function overwrite() {}', 'utf-8');

      const testFile = path.join(testDir, 'overwrite.test.ts');
      fs.writeFileSync(testFile, '// Old test', 'utf-8');

      const result = await generateTests(['overwrite.ts'], mockPrimitives, { update: true });

      expect(result.success).toBe(true);

      // Test file should be modified
      const content = fs.readFileSync(testFile, 'utf-8');
      expect(content).not.toBe('// Old test');
    });
  });

  describe('Analysis Function', () => {
    it('should analyze functions in a file', async () => {
      const sourceFile = path.join(testDir, 'analyze.ts');
      fs.writeFileSync(sourceFile, `
export function func1() {}
export function func2() {}
export const func3 = () => {};
      `, 'utf-8');

      const result = await analyzeForTests(sourceFile, mockPrimitives);

      expect(result.success).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(result.analysis.functions.length).toBeGreaterThan(0);
    });

    it('should estimate test coverage', async () => {
      const sourceFile = path.join(testDir, 'estimate.ts');
      fs.writeFileSync(sourceFile, `
export function test1() {}
export function test2() {}
      `, 'utf-8');

      const result = await analyzeForTests(sourceFile, mockPrimitives);

      expect(result.success).toBe(true);
      expect(result.analysis.estimatedTests).toBeGreaterThan(0);
    });

    it('should handle non-existent files in analysis', async () => {
      const result = await analyzeForTests('not-found.ts', mockPrimitives);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('Framework Selection', () => {
    it('should support vitest framework', async () => {
      const sourceFile = path.join(testDir, 'vitest.ts');
      fs.writeFileSync(sourceFile, 'export function vitestTest() {}', 'utf-8');

      const result = await generateTests(['vitest.ts'], mockPrimitives, { framework: 'vitest' });

      expect(result.success).toBe(true);
      expect(mockPrimitives.completion.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('vitest'),
        })
      );
    });

    it('should support jest framework', async () => {
      const sourceFile = path.join(testDir, 'jest.ts');
      fs.writeFileSync(sourceFile, 'export function jestTest() {}', 'utf-8');

      const result = await generateTests(['jest.ts'], mockPrimitives, { framework: 'jest' });

      expect(result.success).toBe(true);
      expect(mockPrimitives.completion.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('jest'),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle completion errors gracefully', async () => {
      const sourceFile = path.join(testDir, 'error.ts');
      fs.writeFileSync(sourceFile, 'export function errorFunc() {}', 'utf-8');

      mockPrimitives.completion.execute.mockResolvedValue({
        success: false,
        error: 'AI service unavailable',
      });

      const result = await generateTests(['error.ts'], mockPrimitives);

      // generateTests returns success: true with no files created when individual file fails
      expect(result.success).toBe(true);
      expect(result.filesCreated).toEqual([]);
    });

    it('should handle file read errors', async () => {
      // Create a file but make it unreadable (simulated by not creating it)
      const result = await generateTests(['unreadable.ts'], mockPrimitives);

      expect(result.success).toBe(false);
    });
  });
});
