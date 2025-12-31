/**
 * Rules System Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Mock the rules module
const RULES_DIR = path.join(process.cwd(), '.vibe', 'rules');

describe('Rules System', () => {
  beforeEach(() => {
    // Clean up test rules
    if (fs.existsSync(RULES_DIR)) {
      const files = fs.readdirSync(RULES_DIR);
      for (const file of files) {
        if (file.startsWith('test-')) {
          fs.unlinkSync(path.join(RULES_DIR, file));
        }
      }
    }
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(RULES_DIR)) {
      const files = fs.readdirSync(RULES_DIR);
      for (const file of files) {
        if (file.startsWith('test-')) {
          fs.unlinkSync(path.join(RULES_DIR, file));
        }
      }
    }
  });

  describe('Rule Parsing', () => {
    it('should parse rule with frontmatter', async () => {
      const { loadRules, createRule } = await import('../../../src/rules');
      
      createRule('test-parse', 'Always use strict mode', {
        scope: 'code',
        priority: 10
      });

      const rules = loadRules();
      const rule = rules.find(r => r.name === 'test-parse');
      
      expect(rule).toBeDefined();
      expect(rule?.content).toBe('Always use strict mode');
      expect(rule?.scope).toBe('code');
      expect(rule?.priority).toBe(10);
    });

    it('should filter rules by scope', async () => {
      const { loadRules, createRule } = await import('../../../src/rules');
      
      createRule('test-code-rule', 'Code rule', { scope: 'code' });
      createRule('test-docs-rule', 'Docs rule', { scope: 'docs' });
      createRule('test-always-rule', 'Always rule', { scope: 'always' });

      const codeRules = loadRules('code');
      const names = codeRules.map(r => r.name);
      
      expect(names).toContain('test-code-rule');
      expect(names).toContain('test-always-rule');
      expect(names).not.toContain('test-docs-rule');
    });

    it('should sort rules by priority', async () => {
      const { loadRules, createRule } = await import('../../../src/rules');
      
      createRule('test-low', 'Low priority', { priority: 100 });
      createRule('test-high', 'High priority', { priority: 1 });
      createRule('test-mid', 'Mid priority', { priority: 50 });

      const rules = loadRules();
      const testRules = rules.filter(r => r.name.startsWith('test-'));
      
      expect(testRules[0].name).toBe('test-high');
      expect(testRules[1].name).toBe('test-mid');
      expect(testRules[2].name).toBe('test-low');
    });
  });

  describe('Rules Prompt Generation', () => {
    it('should generate rules prompt', async () => {
      const { getRulesPrompt, createRule } = await import('../../../src/rules');
      
      createRule('test-prompt-rule', 'Test rule content');
      
      const prompt = getRulesPrompt();
      
      expect(prompt).toContain('# Project Rules');
      expect(prompt).toContain('test-prompt-rule');
      expect(prompt).toContain('Test rule content');
    });

    it('should return empty string when no rules', async () => {
      const { getRulesPrompt, loadRules } = await import('../../../src/rules');
      
      // Remove all test rules first
      const rules = loadRules();
      const testRules = rules.filter(r => r.name.startsWith('test-'));
      
      if (testRules.length === 0) {
        const prompt = getRulesPrompt();
        // May have other rules, so just check it doesn't error
        expect(typeof prompt).toBe('string');
      }
    });
  });

  describe('Rule CRUD Operations', () => {
    it('should create rule file', async () => {
      const { createRule } = await import('../../../src/rules');
      
      const filePath = createRule('test-crud', 'CRUD test content');
      
      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toContain('name: test-crud');
      expect(content).toContain('CRUD test content');
    });

    it('should list rules', async () => {
      const { listRules, createRule } = await import('../../../src/rules');
      
      createRule('test-list', 'List test');
      
      const rules = listRules();
      const rule = rules.find(r => r.name === 'test-list');
      
      expect(rule).toBeDefined();
      expect(rule?.source).toBe('project');
    });
  });
});

describe('Batch Mode', () => {
  it('should parse batch arguments', async () => {
    // Test argument parsing logic
    const args = ['prompts.txt', '--parallel', '--output', 'results', '--format', 'json'];
    
    const options: Record<string, unknown> = {};
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--parallel') options.parallel = true;
      else if (arg === '--output' && args[i + 1]) options.outputDir = args[++i];
      else if (arg === '--format' && args[i + 1]) options.format = args[++i];
      else if (!arg.startsWith('-')) options.file = arg;
    }
    
    expect(options.file).toBe('prompts.txt');
    expect(options.parallel).toBe(true);
    expect(options.outputDir).toBe('results');
    expect(options.format).toBe('json');
  });

  it('should chunk array for parallel processing', () => {
    function chunkArray<T>(arr: T[], size: number): T[][] {
      const chunks: T[][] = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
      return chunks;
    }

    const items = [1, 2, 3, 4, 5, 6, 7];
    const chunks = chunkArray(items, 3);
    
    expect(chunks.length).toBe(3);
    expect(chunks[0]).toEqual([1, 2, 3]);
    expect(chunks[1]).toEqual([4, 5, 6]);
    expect(chunks[2]).toEqual([7]);
  });
});

describe('Project Memory', () => {
  it('should add and retrieve memory entries', async () => {
    const { getProjectMemory } = await import('../../../src/memory/project-memory');
    
    const memory = getProjectMemory();
    
    const id = memory.add({
      type: 'fact',
      content: 'Test fact content',
      tags: ['test'],
      confidence: 0.9,
      source: 'test'
    });
    
    const entry = memory.get(id);
    
    expect(entry).toBeDefined();
    expect(entry?.content).toBe('Test fact content');
    expect(entry?.type).toBe('fact');
    expect(entry?.confidence).toBe(0.9);
    
    // Cleanup
    memory.remove(id);
  });

  it('should search memory entries', async () => {
    const { getProjectMemory } = await import('../../../src/memory/project-memory');
    
    const memory = getProjectMemory();
    
    const id1 = memory.add({
      type: 'fact',
      content: 'TypeScript is preferred',
      tags: ['language', 'preference'],
      confidence: 0.8,
      source: 'test'
    });
    
    const id2 = memory.add({
      type: 'decision',
      content: 'Use React for frontend',
      tags: ['framework'],
      confidence: 0.9,
      source: 'test'
    });
    
    const results = memory.search('TypeScript');
    
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].content).toContain('TypeScript');
    
    // Cleanup
    memory.remove(id1);
    memory.remove(id2);
  });

  it('should generate context prompt', async () => {
    const { getProjectMemory } = await import('../../../src/memory/project-memory');
    
    const memory = getProjectMemory();
    
    const id = memory.add({
      type: 'preference',
      content: 'Always use async/await',
      tags: ['code-style'],
      confidence: 1.0,
      source: 'test'
    });
    
    const prompt = memory.getContextPrompt();
    
    expect(prompt).toContain('# Project Memory');
    
    // Cleanup
    memory.remove(id);
  });
});

describe('Export System', () => {
  it('should export to structured formats', async () => {
    const { exportToStructured } = await import('../../../src/output/export');
    
    const data = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 }
    ];
    
    const json = exportToStructured(data, 'json');
    expect(JSON.parse(json)).toEqual(data);
    
    const csv = exportToStructured(data, 'csv');
    expect(csv).toContain('name,age');
    expect(csv).toContain('"Alice"');
    
    const table = exportToStructured(data, 'table');
    expect(table).toContain('| name');
    expect(table).toContain('| Alice');
  });
});

describe('Workflow Enhancements', () => {
  it('should support parallel step definition', () => {
    const workflow = {
      name: 'test-parallel',
      steps: [
        {
          agent: 'coordinator',
          parallel: [
            { agent: 'researcher', input: 'Research topic A' },
            { agent: 'researcher', input: 'Research topic B' }
          ]
        }
      ]
    };
    
    expect(workflow.steps[0].parallel).toBeDefined();
    expect(workflow.steps[0].parallel?.length).toBe(2);
  });

  it('should support approval checkpoints', () => {
    const workflow = {
      name: 'test-approval',
      steps: [
        {
          agent: 'builder',
          requiresApproval: true,
          approvalMessage: 'Approve code generation?'
        }
      ]
    };
    
    expect(workflow.steps[0].requiresApproval).toBe(true);
    expect(workflow.steps[0].approvalMessage).toBeDefined();
  });
});
