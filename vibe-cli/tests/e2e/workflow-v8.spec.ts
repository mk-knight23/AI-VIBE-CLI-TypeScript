import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryManager } from '../../src/core/memory';
import { executeTool } from '../../src/tools';
import * as fs from 'fs';
import * as path from 'path';

describe('E2E Workflows v8.0.0', () => {
  const testDir = path.join(process.cwd(), '.test-e2e-v8');
  let memory: MemoryManager;
  
  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    memory = new MemoryManager(testDir);
  });
  
  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Complete Development Workflow', () => {
    it('should handle full project lifecycle', async () => {
      // 1. Set project goal
      memory.setProjectGoal('Build a REST API');
      
      // 2. Create project structure
      const srcDir = path.join(testDir, 'src');
      await executeTool('create_directory', { dir_path: srcDir });
      
      // 3. Create main file
      const mainFile = path.join(srcDir, 'index.ts');
      await executeTool('write_file', {
        file_path: mainFile,
        content: 'export function hello() { return "world"; }'
      });
      memory.onFileWrite(mainFile, 'export function hello() { return "world"; }');
      
      // 4. Mark milestone
      memory.addMilestone('Project structure created');
      
      // 5. Generate tests
      await executeTool('generate_tests', {
        file_path: mainFile,
        framework: 'vitest'
      });
      
      // 6. Analyze code quality
      const analysis = await executeTool('analyze_code_quality', {
        file_path: mainFile
      });
      expect(analysis).toBeDefined();
      
      // 7. Mark completion
      memory.addMilestone('Tests and analysis complete');
      
      // Verify workflow
      const state = memory.getState();
      expect(state.storyMemory.projectGoal).toBe('Build a REST API');
      expect(state.storyMemory.milestones).toHaveLength(2);
      expect(state.workspaceMemory.recentChanges.length).toBeGreaterThan(0);
    });
  });

  describe('Code Quality Improvement Workflow', () => {
    it('should analyze, refactor, test, and document', async () => {
      memory.startTask('Code quality improvement');
      const startTime = Date.now();
      
      // 1. Create source file
      const sourceFile = path.join(testDir, 'app.ts');
      const code = `
export function calculate(a: number, b: number) {
  if (a > 0) {
    if (b > 0) {
      return a + b;
    }
  }
  return 0;
}

export function process(data: string) {
  return data.toUpperCase();
}
`;
      await executeTool('write_file', {
        file_path: sourceFile,
        content: code
      });
      
      // 2. Analyze quality
      const analysis = await executeTool('analyze_code_quality', {
        file_path: sourceFile
      });
      const metrics = JSON.parse(analysis);
      expect(metrics.functions).toBe(2);
      
      // 3. Generate tests
      const testResult = await executeTool('generate_tests', {
        file_path: sourceFile,
        framework: 'vitest'
      });
      expect(testResult).toContain('Generated tests');
      
      // 4. Generate documentation
      const docResult = await executeTool('generate_documentation', {
        file_path: sourceFile
      });
      expect(docResult).toContain('Generated documentation');
      
      // 5. Complete task
      const duration = Date.now() - startTime;
      memory.completeTask(true, duration);
      
      const state = memory.getState();
      expect(state.taskHistory[0].success).toBe(true);
      expect(state.taskHistory[0].duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Security and Optimization Workflow', () => {
    it('should scan security and optimize bundle', async () => {
      memory.startTask('Security and optimization');
      
      // 1. Create files with potential issues
      const configFile = path.join(testDir, 'config.ts');
      await executeTool('write_file', {
        file_path: configFile,
        content: 'export const API_KEY = "secret123";'
      });
      
      // 2. Run security scan
      const securityResult = await executeTool('security_scan', {
        project_path: testDir
      });
      const issues = JSON.parse(securityResult);
      expect(issues).toHaveProperty('secrets');
      
      // 3. Log challenge
      if (issues.secrets.length > 0) {
        memory.addChallenge(
          'Found hardcoded secrets',
          'Move to environment variables'
        );
      }
      
      // 4. Optimize bundle
      const optimizeResult = await executeTool('optimize_bundle', {
        project_path: testDir
      });
      const optimization = JSON.parse(optimizeResult);
      expect(optimization).toHaveProperty('suggestions');
      
      // 5. Add learning
      memory.addLearning('Never hardcode secrets in source files');
      
      const state = memory.getState();
      expect(state.storyMemory.challenges.length).toBeGreaterThan(0);
      expect(state.storyMemory.learnings.length).toBeGreaterThan(0);
    });
  });

  describe('Migration Workflow', () => {
    it('should migrate code and update memory', async () => {
      memory.startTask('Code migration');
      
      // 1. Create CommonJS file
      const oldFile = path.join(testDir, 'old.js');
      await executeTool('write_file', {
        file_path: oldFile,
        content: 'const fs = require("fs");\nmodule.exports = { test: 1 };'
      });
      
      // 2. Migrate to ESM
      const migrateResult = await executeTool('migrate_code', {
        file_path: oldFile,
        from: 'commonjs',
        to: 'esm'
      });
      expect(migrateResult).toContain('Migrated');
      
      // 3. Mark milestone
      memory.addMilestone('Migrated to ESM');
      
      // 4. Add code pattern
      memory.addCodePattern('Use ESM imports');
      
      const state = memory.getState();
      expect(state.codePatterns).toContain('Use ESM imports');
    });
  });

  describe('Long-term Memory Workflow', () => {
    it('should maintain context across multiple sessions', async () => {
      // Session 1: Initial setup
      memory.setProjectGoal('Build microservices platform');
      memory.addMilestone('Project initialized');
      memory.addDecision('Use TypeScript');
      memory.setPreference('framework', 'Express');
      
      // Session 2: Development
      memory.addMilestone('API endpoints created');
      memory.addChallenge('Rate limiting needed', 'Added express-rate-limit');
      memory.trackCommand('/deploy');
      memory.trackCommand('/test');
      
      // Session 3: Optimization
      memory.addMilestone('Performance optimized');
      memory.addLearning('Cache frequently accessed data');
      
      // Verify complete history
      const context = memory.getMemoryContext();
      expect(context).toContain('Build microservices platform');
      expect(context).toContain('Project initialized');
      expect(context).toContain('Use TypeScript');
      expect(context).toContain('Rate limiting needed');
      expect(context).toContain('Cache frequently accessed data');
      
      // Verify persistence
      const newMemory = new MemoryManager(testDir);
      const newContext = newMemory.getMemoryContext();
      expect(newContext).toContain('Build microservices platform');
    });
  });

  describe('Chat History Workflow', () => {
    it('should track and search conversations', async () => {
      // Simulate conversation
      memory.addChatMessage('user', 'How do I add authentication?', 50);
      memory.addChatMessage('assistant', 'Use JWT tokens with bcrypt', 80);
      memory.addChatMessage('user', 'Add database connection', 40);
      memory.addChatMessage('assistant', 'Use Prisma ORM', 60);
      memory.addChatMessage('user', 'How to secure authentication?', 45);
      memory.addChatMessage('assistant', 'Add rate limiting and HTTPS', 70);
      
      // Search history
      const authResults = memory.searchChatHistory('authentication');
      expect(authResults.length).toBeGreaterThan(0);
      
      const dbResults = memory.searchChatHistory('database');
      expect(dbResults.length).toBeGreaterThan(0);
      
      // Verify token tracking
      const state = memory.getState();
      const totalTokens = state.chatHistory.reduce((sum, msg) => sum + (msg.tokens || 0), 0);
      expect(totalTokens).toBeGreaterThan(0);
    });
  });

  describe('Performance Workflow', () => {
    it('should benchmark and optimize', async () => {
      // 1. Create test file
      const testFile = path.join(testDir, 'data.json');
      const largeData = { items: Array(1000).fill({ id: 1, name: 'test' }) };
      await executeTool('write_file', {
        file_path: testFile,
        content: JSON.stringify(largeData)
      });
      
      // 2. Benchmark
      const benchResult = await executeTool('performance_benchmark', {
        file_path: testFile
      });
      const metrics = JSON.parse(benchResult);
      
      expect(metrics.fileSize).toBeGreaterThan(0);
      expect(metrics.readTime).toBeGreaterThanOrEqual(0);
      expect(metrics.parseTime).toBeGreaterThanOrEqual(0);
      
      // 3. Log performance data
      memory.addLearning(`File size: ${metrics.fileSize} bytes, Read: ${metrics.readTime}ms`);
    });
  });

  describe('Complete Feature Test', () => {
    it('should use all v8.0.0 features together', async () => {
      // Story Memory
      memory.setProjectGoal('Full-stack app with AI');
      memory.addMilestone('Backend complete');
      memory.addChallenge('Slow API', 'Added caching');
      memory.addLearning('Use Redis for sessions');
      
      // Chat History
      memory.addChatMessage('user', 'Create API');
      memory.addChatMessage('assistant', 'Creating Express API');
      
      // Workspace Memory
      memory.updateWorkspaceMemory();
      
      // Task Tracking
      memory.startTask('Build feature');
      
      // File Operations
      const file = path.join(testDir, 'feature.ts');
      await executeTool('write_file', {
        file_path: file,
        content: 'export function feature() { return true; }'
      });
      memory.onFileWrite(file, 'content');
      
      // Advanced Tools
      await executeTool('analyze_code_quality', { file_path: file });
      await executeTool('generate_tests', { file_path: file });
      await executeTool('generate_documentation', { file_path: file });
      
      // Security
      await executeTool('security_scan', { project_path: testDir });
      
      // Preferences
      memory.setPreference('editor', 'vscode');
      memory.addCodePattern('Use functional style');
      memory.trackCommand('/deploy');
      
      // Complete task
      memory.completeTask(true, 5000);
      
      // Verify everything
      const state = memory.getState();
      expect(state.storyMemory.projectGoal).toBeDefined();
      expect(state.storyMemory.milestones.length).toBeGreaterThan(0);
      expect(state.chatHistory.length).toBeGreaterThan(0);
      expect(state.taskHistory.length).toBeGreaterThan(0);
      expect(state.userPreferences.editor).toBe('vscode');
      expect(state.codePatterns.length).toBeGreaterThan(0);
      expect(state.frequentCommands['/deploy']).toBe(1);
      
      // Verify context
      const context = memory.getMemoryContext();
      expect(context).toContain('Full-stack app with AI');
      expect(context).toContain('Backend complete');
      expect(context).toContain('Use Redis for sessions');
    });
  });
});
