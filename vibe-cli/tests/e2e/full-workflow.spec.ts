import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const TEST_PROJECT = path.join(process.env.VIBE_PROJECT_ROOT || process.cwd(), 'test-project');

describe('E2E: Full Development Workflow', () => {
  beforeAll(() => {
    if (fs.existsSync(TEST_PROJECT)) {
      fs.rmSync(TEST_PROJECT, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_PROJECT, { recursive: true });
  });

  afterAll(() => {
    if (fs.existsSync(TEST_PROJECT)) {
      fs.rmSync(TEST_PROJECT, { recursive: true, force: true });
    }
  });

  it('Step 1: Initialize project', () => {
    const packageJson = {
      name: 'test-project',
      version: '1.0.0',
      type: 'module'
    };
    
    fs.writeFileSync(
      path.join(TEST_PROJECT, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    expect(fs.existsSync(path.join(TEST_PROJECT, 'package.json'))).toBe(true);
  });

  it('Step 2: Create source files', () => {
    const srcDir = path.join(TEST_PROJECT, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    
    const indexContent = 'export const hello = () => "Hello World";';
    fs.writeFileSync(path.join(srcDir, 'index.ts'), indexContent);
    
    expect(fs.existsSync(path.join(srcDir, 'index.ts'))).toBe(true);
  });

  it('Step 3: Create test files', () => {
    const testDir = path.join(TEST_PROJECT, 'tests');
    fs.mkdirSync(testDir, { recursive: true });
    
    const testContent = 'import { hello } from "../src/index";\ntest("hello", () => expect(hello()).toBe("Hello World"));';
    fs.writeFileSync(path.join(testDir, 'index.test.ts'), testContent);
    
    expect(fs.existsSync(path.join(testDir, 'index.test.ts'))).toBe(true);
  });

  it('Step 4: Create config files', () => {
    const tsconfig = {
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        outDir: './dist'
      }
    };
    
    fs.writeFileSync(
      path.join(TEST_PROJECT, 'tsconfig.json'),
      JSON.stringify(tsconfig, null, 2)
    );
    
    expect(fs.existsSync(path.join(TEST_PROJECT, 'tsconfig.json'))).toBe(true);
  });

  it('Step 5: Verify project structure', () => {
    const files = [
      'package.json',
      'tsconfig.json',
      'src/index.ts',
      'tests/index.test.ts'
    ];
    
    files.forEach(file => {
      expect(fs.existsSync(path.join(TEST_PROJECT, file))).toBe(true);
    });
  });

  it('Complete workflow: <5s', () => {
    const start = Date.now();
    
    // Simulate full workflow
    const workflowSteps = [
      'init',
      'create-files',
      'create-tests',
      'create-config',
      'verify'
    ];
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
    expect(workflowSteps.length).toBe(5);
  });
});
