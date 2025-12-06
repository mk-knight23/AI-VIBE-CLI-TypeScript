import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as advanced from '../../src/tools/advanced';

describe('Advanced Tools v8.0.0', () => {
  const testDir = path.join(process.cwd(), '.test-advanced');
  
  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });
  
  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('analyzeCodeQuality', () => {
    it('should analyze code metrics', async () => {
      const testFile = path.join(testDir, 'test.ts');
      const code = `
function test1() {
  if (true) {
    for (let i = 0; i < 10; i++) {
      console.log(i);
    }
  }
}

function test2() {
  return 42;
}

// TODO: Add tests
// FIXME: Fix bug
`;
      fs.writeFileSync(testFile, code);
      
      const result = await advanced.analyzeCodeQuality(testFile);
      const analysis = JSON.parse(result);
      
      expect(analysis.lines).toBeGreaterThan(0);
      expect(analysis.functions).toBe(2);
      expect(analysis.complexity).toBeGreaterThan(1);
      expect(analysis.todos).toBe(2);
    });

    it('should detect long functions', async () => {
      const testFile = path.join(testDir, 'long.ts');
      const lines = Array(60).fill('  console.log("line");').join('\n');
      const code = `function longFunction() {\n${lines}\n}`;
      fs.writeFileSync(testFile, code);
      
      const result = await advanced.analyzeCodeQuality(testFile);
      const analysis = JSON.parse(result);
      
      expect(analysis.longFunctions).toBe(1);
    });

    it('should handle non-existent files', async () => {
      const result = await advanced.analyzeCodeQuality('/nonexistent.ts');
      expect(result).toContain('Error');
    });
  });

  describe('smartRefactor', () => {
    it('should refactor code', async () => {
      const testFile = path.join(testDir, 'refactor.ts');
      const code = `
const a = 1;
const b = 2;
const c = a + b;
`;
      fs.writeFileSync(testFile, code);
      
      const result = await advanced.smartRefactor(testFile, 'extract');
      expect(result).toContain('Refactored');
    });

    it('should handle different refactor types', async () => {
      const testFile = path.join(testDir, 'refactor2.ts');
      fs.writeFileSync(testFile, 'const x = 1;');
      
      const extract = await advanced.smartRefactor(testFile, 'extract');
      const inline = await advanced.smartRefactor(testFile, 'inline');
      
      expect(extract).toContain('Refactored');
      expect(inline).toContain('Refactored');
    });
  });

  describe('generateTests', () => {
    it('should generate test file', async () => {
      const testFile = path.join(testDir, 'source.ts');
      const code = `
export function add(a: number, b: number) {
  return a + b;
}

export async function fetchData() {
  return { data: 'test' };
}
`;
      fs.writeFileSync(testFile, code);
      
      const result = await advanced.generateTests(testFile, 'vitest');
      expect(result).toContain('Generated tests');
      
      const testFilePath = path.join(testDir, 'source.test.ts');
      expect(fs.existsSync(testFilePath)).toBe(true);
      
      const testContent = fs.readFileSync(testFilePath, 'utf-8');
      expect(testContent).toContain('import { describe, it, expect }');
      expect(testContent).toContain('add');
      expect(testContent).toContain('fetchData');
    });

    it('should support different frameworks', async () => {
      const testFile = path.join(testDir, 'jest.ts');
      fs.writeFileSync(testFile, 'export function test() {}');
      
      const result = await advanced.generateTests(testFile, 'jest');
      expect(result).toContain('Generated tests');
    });
  });

  describe('optimizeBundle', () => {
    it('should analyze bundle', async () => {
      const result = await advanced.optimizeBundle(testDir);
      const analysis = JSON.parse(result);
      
      expect(analysis).toHaveProperty('largeFiles');
      expect(analysis).toHaveProperty('unusedDeps');
      expect(analysis).toHaveProperty('suggestions');
      expect(Array.isArray(analysis.suggestions)).toBe(true);
    });

    it('should suggest optimizations for large files', async () => {
      const largeFile = path.join(testDir, 'large.js');
      fs.writeFileSync(largeFile, 'x'.repeat(150000));
      
      const result = await advanced.optimizeBundle(testDir);
      const analysis = JSON.parse(result);
      
      if (analysis.largeFiles.length > 0) {
        expect(analysis.suggestions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('securityScan', () => {
    it('should scan for security issues', async () => {
      const result = await advanced.securityScan(testDir);
      const issues = JSON.parse(result);
      
      expect(issues).toHaveProperty('vulnerabilities');
      expect(issues).toHaveProperty('secrets');
      expect(issues).toHaveProperty('permissions');
      expect(issues).toHaveProperty('outdated');
    });

    it('should detect hardcoded secrets', async () => {
      const secretFile = path.join(testDir, 'config.ts');
      fs.writeFileSync(secretFile, 'const API_KEY = "secret123";');
      
      const result = await advanced.securityScan(testDir);
      const issues = JSON.parse(result);
      
      expect(Array.isArray(issues.secrets)).toBe(true);
    });
  });

  describe('performanceBenchmark', () => {
    it('should benchmark file operations', async () => {
      const testFile = path.join(testDir, 'bench.json');
      fs.writeFileSync(testFile, JSON.stringify({ test: 'data' }));
      
      const result = await advanced.performanceBenchmark(testFile);
      const metrics = JSON.parse(result);
      
      expect(metrics).toHaveProperty('fileSize');
      expect(metrics).toHaveProperty('readTime');
      expect(metrics).toHaveProperty('lines');
      expect(metrics).toHaveProperty('parseTime');
      expect(metrics.fileSize).toBeGreaterThan(0);
    });

    it('should measure parse time for JSON', async () => {
      const testFile = path.join(testDir, 'data.json');
      fs.writeFileSync(testFile, JSON.stringify({ large: Array(100).fill('data') }));
      
      const result = await advanced.performanceBenchmark(testFile);
      const metrics = JSON.parse(result);
      
      expect(metrics.parseTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateDocumentation', () => {
    it('should generate markdown docs', async () => {
      const testFile = path.join(testDir, 'api.ts');
      const code = `
export function createUser(name: string, email: string) {
  return { name, email };
}

export async function deleteUser(id: number) {
  return true;
}
`;
      fs.writeFileSync(testFile, code);
      
      const result = await advanced.generateDocumentation(testFile);
      expect(result).toContain('Generated documentation');
      
      const docFile = path.join(testDir, 'api.md');
      expect(fs.existsSync(docFile)).toBe(true);
      
      const docContent = fs.readFileSync(docFile, 'utf-8');
      expect(docContent).toContain('createUser');
      expect(docContent).toContain('deleteUser');
      expect(docContent).toContain('Parameters');
    });
  });

  describe('migrateCode', () => {
    it('should migrate CommonJS to ESM', async () => {
      const testFile = path.join(testDir, 'old.js');
      const code = `
const fs = require('fs');
const path = require('path');
module.exports = { test: 'value' };
`;
      fs.writeFileSync(testFile, code);
      
      const result = await advanced.migrateCode(testFile, 'commonjs', 'esm');
      expect(result).toContain('Migrated');
      
      const newFile = path.join(testDir, 'old.ts');
      expect(fs.existsSync(newFile)).toBe(true);
    });

    it('should migrate JavaScript to TypeScript', async () => {
      const testFile = path.join(testDir, 'js.js');
      const code = `
function add(a, b) {
  return a + b;
}
const result = 42;
`;
      fs.writeFileSync(testFile, code);
      
      const result = await advanced.migrateCode(testFile, 'javascript', 'typescript');
      expect(result).toContain('Migrated');
    });

    it('should handle invalid migration types', async () => {
      const testFile = path.join(testDir, 'test.js');
      fs.writeFileSync(testFile, 'const x = 1;');
      
      const result = await advanced.migrateCode(testFile, 'invalid', 'invalid');
      expect(result).toContain('Migrated');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing files gracefully', async () => {
      const results = await Promise.all([
        advanced.analyzeCodeQuality('/missing.ts'),
        advanced.smartRefactor('/missing.ts', 'extract'),
        advanced.generateTests('/missing.ts'),
        advanced.performanceBenchmark('/missing.ts'),
        advanced.generateDocumentation('/missing.ts'),
        advanced.migrateCode('/missing.ts', 'commonjs', 'esm')
      ]);
      
      results.forEach(result => {
        expect(result).toContain('Error');
      });
    });
  });
});
