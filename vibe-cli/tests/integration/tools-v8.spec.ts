import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tools, executeTool, getToolsByCategory } from '../../src/tools';
import * as fs from 'fs';
import * as path from 'path';

describe('Tools Integration v8.0.0', () => {
  const testDir = path.join(process.cwd(), '.test-tools-integration');
  
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

  describe('Tool Registry', () => {
    it('should have 36 tools', () => {
      expect(tools.length).toBe(36);
    });

    it('should have all required properties', () => {
      tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('displayName');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('parameters');
        expect(tool).toHaveProperty('handler');
        expect(tool).toHaveProperty('category');
      });
    });

    it('should have unique tool names', () => {
      const names = tools.map(t => t.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe('Tool Categories', () => {
    it('should have 14 categories', () => {
      const categories = new Set(tools.map(t => t.category));
      expect(categories.size).toBe(14);
    });

    it('should organize tools by category', () => {
      const filesystemTools = getToolsByCategory('filesystem');
      const gitTools = getToolsByCategory('git');
      const analysisTools = getToolsByCategory('analysis');
      
      expect(filesystemTools.length).toBe(14);
      expect(gitTools.length).toBe(4);
      expect(analysisTools.length).toBe(1);
    });

    it('should have all expected categories', () => {
      const expectedCategories = [
        'filesystem', 'shell', 'web', 'memory', 'git', 'project',
        'analysis', 'refactor', 'testing', 'optimization', 
        'security', 'performance', 'documentation', 'migration'
      ];
      
      expectedCategories.forEach(category => {
        const categoryTools = getToolsByCategory(category);
        expect(categoryTools.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Tool Execution', () => {
    it('should execute write_file tool', async () => {
      const testFile = path.join(testDir, 'test.txt');
      await executeTool('write_file', {
        file_path: testFile,
        content: 'Hello World'
      });
      
      expect(fs.existsSync(testFile)).toBe(true);
      expect(fs.readFileSync(testFile, 'utf-8')).toBe('Hello World');
    });

    it('should execute read_file tool', async () => {
      const testFile = path.join(testDir, 'read.txt');
      fs.writeFileSync(testFile, 'Test content');
      
      const result = await executeTool('read_file', { path: testFile });
      expect(result).toContain('Test content');
    });

    it('should execute create_directory tool', async () => {
      const newDir = path.join(testDir, 'newdir');
      await executeTool('create_directory', {
        dir_path: newDir,
        recursive: true
      });
      
      expect(fs.existsSync(newDir)).toBe(true);
    });

    it('should throw error for non-existent tool', async () => {
      await expect(
        executeTool('non_existent_tool', {})
      ).rejects.toThrow('Tool not found');
    });
  });

  describe('Advanced Tools Integration', () => {
    it('should execute analyze_code_quality', async () => {
      const testFile = path.join(testDir, 'analyze.ts');
      fs.writeFileSync(testFile, 'function test() { return 42; }');
      
      const result = await executeTool('analyze_code_quality', {
        file_path: testFile
      });
      
      expect(result).toBeDefined();
      const analysis = JSON.parse(result);
      expect(analysis).toHaveProperty('lines');
      expect(analysis).toHaveProperty('functions');
    });

    it('should execute generate_tests', async () => {
      const testFile = path.join(testDir, 'source.ts');
      fs.writeFileSync(testFile, 'export function add(a: number, b: number) { return a + b; }');
      
      const result = await executeTool('generate_tests', {
        file_path: testFile,
        framework: 'vitest'
      });
      
      expect(result).toContain('Generated tests');
    });

    it('should execute security_scan', async () => {
      const result = await executeTool('security_scan', {
        project_path: testDir
      });
      
      expect(result).toBeDefined();
      const issues = JSON.parse(result);
      expect(issues).toHaveProperty('vulnerabilities');
      expect(issues).toHaveProperty('secrets');
    });

    it('should execute optimize_bundle', async () => {
      const result = await executeTool('optimize_bundle', {
        project_path: testDir
      });
      
      expect(result).toBeDefined();
      const analysis = JSON.parse(result);
      expect(analysis).toHaveProperty('suggestions');
    });
  });

  describe('Tool Confirmation Flags', () => {
    it('should mark destructive operations for confirmation', () => {
      const destructiveTools = tools.filter(t => t.requiresConfirmation);
      
      expect(destructiveTools.length).toBeGreaterThan(0);
      
      const destructiveNames = destructiveTools.map(t => t.name);
      expect(destructiveNames).toContain('write_file');
      expect(destructiveNames).toContain('delete_file');
      expect(destructiveNames).toContain('run_shell_command');
    });

    it('should not require confirmation for read operations', () => {
      const readTools = ['read_file', 'list_directory', 'get_file_info'];
      
      readTools.forEach(toolName => {
        const tool = tools.find(t => t.name === toolName);
        expect(tool?.requiresConfirmation).toBe(false);
      });
    });
  });

  describe('Tool Parameters', () => {
    it('should have required parameters defined', () => {
      tools.forEach(tool => {
        expect(tool.parameters).toBeDefined();
        expect(typeof tool.parameters).toBe('object');
      });
    });

    it('should validate write_file parameters', () => {
      const writeTool = tools.find(t => t.name === 'write_file');
      expect(writeTool?.parameters.file_path.required).toBe(true);
      expect(writeTool?.parameters.content.required).toBe(true);
    });

    it('should validate analyze_code_quality parameters', () => {
      const analyzeTool = tools.find(t => t.name === 'analyze_code_quality');
      expect(analyzeTool?.parameters.file_path.required).toBe(true);
    });
  });

  describe('Tool Performance', () => {
    it('should execute tools within reasonable time', async () => {
      const testFile = path.join(testDir, 'perf.txt');
      fs.writeFileSync(testFile, 'test');
      
      const start = Date.now();
      await executeTool('read_file', { path: testFile });
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(1000); // Should complete in < 1s
    });
  });

  describe('Error Handling', () => {
    it('should handle file not found errors', async () => {
      await expect(
        executeTool('read_file', { path: '/nonexistent.txt' })
      ).rejects.toThrow('File not found');
    });

    it('should handle invalid parameters gracefully', async () => {
      await expect(
        executeTool('write_file', { invalid: 'param' })
      ).rejects.toThrow();
    });
  });

  describe('Tool Compatibility', () => {
    it('should work with all filesystem tools', async () => {
      const testFile = path.join(testDir, 'compat.txt');
      
      // Write
      await executeTool('write_file', {
        file_path: testFile,
        content: 'test'
      });
      
      // Read
      const content = await executeTool('read_file', { path: testFile });
      expect(content).toContain('test');
      
      // Info
      const info = await executeTool('get_file_info', { file_path: testFile });
      expect(info).toBeDefined();
      
      // Delete
      await executeTool('delete_file', { file_path: testFile });
      expect(fs.existsSync(testFile)).toBe(false);
    });
  });
});
