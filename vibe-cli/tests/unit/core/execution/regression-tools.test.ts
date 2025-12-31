/**
 * Regression Tests - Tools
 * Ensures all existing tools continue to work in v10.x
 */

import { describe, it, expect } from 'vitest';

describe('Tool Regression Tests', () => {
  describe('Tool Registry', () => {
    it('should export tools array', async () => {
      const { tools } = await import('../../../../src/tools');
      expect(tools).toBeInstanceOf(Array);
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should export executeTool function', async () => {
      const { executeTool } = await import('../../../../src/tools');
      expect(executeTool).toBeTypeOf('function');
    });

    it('should export getToolSchemas function', async () => {
      const { getToolSchemas } = await import('../../../../src/tools');
      expect(getToolSchemas).toBeTypeOf('function');
    });

    it('should export getToolsByCategory function', async () => {
      const { getToolsByCategory } = await import('../../../../src/tools');
      expect(getToolsByCategory).toBeTypeOf('function');
    });
  });

  describe('Filesystem Tools', () => {
    it('should have list_directory tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'list_directory');
      expect(tool).toBeDefined();
      expect(tool?.category).toBe('filesystem');
    });

    it('should have read_file tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'read_file');
      expect(tool).toBeDefined();
      expect(tool?.category).toBe('filesystem');
    });

    it('should have write_file tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'write_file');
      expect(tool).toBeDefined();
      expect(tool?.requiresConfirmation).toBe(true);
    });

    it('should have glob tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'glob');
      expect(tool).toBeDefined();
      expect(tool?.category).toBe('filesystem');
    });

    it('should have search_file_content tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'search_file_content');
      expect(tool).toBeDefined();
    });

    it('should have replace tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'replace');
      expect(tool).toBeDefined();
      expect(tool?.requiresConfirmation).toBe(true);
    });

    it('should have create_directory tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'create_directory');
      expect(tool).toBeDefined();
    });

    it('should have delete_file tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'delete_file');
      expect(tool).toBeDefined();
    });

    it('should have move_file tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'move_file');
      expect(tool).toBeDefined();
    });

    it('should have copy_file tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'copy_file');
      expect(tool).toBeDefined();
    });

    it('should have append_to_file tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'append_to_file');
      expect(tool).toBeDefined();
    });
  });

  describe('Shell Tools', () => {
    it('should have run_shell_command tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'run_shell_command');
      expect(tool).toBeDefined();
      expect(tool?.category).toBe('shell');
      expect(tool?.requiresConfirmation).toBe(true);
    });
  });

  describe('Git Tools', () => {
    it('should have git_status tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'git_status');
      expect(tool).toBeDefined();
      expect(tool?.category).toBe('git');
    });

    it('should have git_diff tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'git_diff');
      expect(tool).toBeDefined();
    });

    it('should have git_log tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'git_log');
      expect(tool).toBeDefined();
    });

    it('should have git_blame tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'git_blame');
      expect(tool).toBeDefined();
    });
  });

  describe('Web Tools', () => {
    it('should have web_fetch tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'web_fetch');
      expect(tool).toBeDefined();
      expect(tool?.category).toBe('web');
    });

    it('should have google_web_search tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'google_web_search');
      expect(tool).toBeDefined();
    });
  });

  describe('Memory Tools', () => {
    it('should have save_memory tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'save_memory');
      expect(tool).toBeDefined();
      expect(tool?.category).toBe('memory');
    });

    it('should have write_todos tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'write_todos');
      expect(tool).toBeDefined();
    });
  });

  describe('Project Tools', () => {
    it('should have check_dependency tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'check_dependency');
      expect(tool).toBeDefined();
      expect(tool?.category).toBe('project');
    });

    it('should have get_project_info tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'get_project_info');
      expect(tool).toBeDefined();
    });

    it('should have run_tests tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'run_tests');
      expect(tool).toBeDefined();
    });

    it('should have run_lint tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'run_lint');
      expect(tool).toBeDefined();
    });

    it('should have run_typecheck tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'run_typecheck');
      expect(tool).toBeDefined();
    });
  });

  describe('Analysis Tools', () => {
    it('should have analyze_code_quality tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'analyze_code_quality');
      expect(tool).toBeDefined();
      expect(tool?.category).toBe('analysis');
    });

    it('should have smart_refactor tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'smart_refactor');
      expect(tool).toBeDefined();
    });

    it('should have generate_tests tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'generate_tests');
      expect(tool).toBeDefined();
    });

    it('should have optimize_bundle tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'optimize_bundle');
      expect(tool).toBeDefined();
    });

    it('should have security_scan tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'security_scan');
      expect(tool).toBeDefined();
    });

    it('should have performance_benchmark tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'performance_benchmark');
      expect(tool).toBeDefined();
    });

    it('should have generate_documentation tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'generate_documentation');
      expect(tool).toBeDefined();
    });

    it('should have migrate_code tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'migrate_code');
      expect(tool).toBeDefined();
    });
  });

  describe('LSP Tools', () => {
    it('should have get_diagnostics tool', async () => {
      const { tools } = await import('../../../../src/tools');
      const tool = tools.find(t => t.name === 'get_diagnostics');
      expect(tool).toBeDefined();
      expect(tool?.category).toBe('analysis');
    });
  });

  describe('Tool Properties', () => {
    it('all tools should have required properties', async () => {
      const { tools } = await import('../../../../src/tools');
      for (const tool of tools) {
        expect(tool.name).toBeDefined();
        expect(tool.displayName).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.parameters).toBeDefined();
        expect(tool.handler).toBeTypeOf('function');
      }
    });

    it('all tools should have category', async () => {
      const { tools } = await import('../../../../src/tools');
      for (const tool of tools) {
        expect(tool.category).toBeDefined();
        expect(['filesystem', 'shell', 'git', 'web', 'memory', 'project', 'analysis']).toContain(tool.category);
      }
    });

    it('write tools should require confirmation', async () => {
      const { tools } = await import('../../../../src/tools');
      const writeTools = ['write_file', 'replace', 'create_directory', 'delete_file', 'move_file', 'copy_file', 'append_to_file', 'run_shell_command'];
      for (const name of writeTools) {
        const tool = tools.find(t => t.name === name);
        expect(tool?.requiresConfirmation).toBe(true);
      }
    });
  });

  describe('Tool Categories', () => {
    it('should have filesystem tools', async () => {
      const { getToolsByCategory } = await import('../../../../src/tools');
      const tools = getToolsByCategory('filesystem');
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should have shell tools', async () => {
      const { getToolsByCategory } = await import('../../../../src/tools');
      const tools = getToolsByCategory('shell');
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should have git tools', async () => {
      const { getToolsByCategory } = await import('../../../../src/tools');
      const tools = getToolsByCategory('git');
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should have web tools', async () => {
      const { getToolsByCategory } = await import('../../../../src/tools');
      const tools = getToolsByCategory('web');
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should have analysis tools', async () => {
      const { getToolsByCategory } = await import('../../../../src/tools');
      const tools = getToolsByCategory('analysis');
      expect(tools.length).toBeGreaterThan(0);
    });
  });
});
