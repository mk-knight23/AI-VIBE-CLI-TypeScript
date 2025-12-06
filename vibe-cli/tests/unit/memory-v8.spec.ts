import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryManager } from '../../src/core/memory';
import * as fs from 'fs';
import * as path from 'path';

describe('MemoryManager v8.0.0', () => {
  let memory: MemoryManager;
  const testDir = path.join(process.cwd(), '.test-vibe');
  
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

  describe('Story Memory', () => {
    it('should set and retrieve project goal', () => {
      memory.setProjectGoal('Build SaaS platform');
      const state = memory.getState();
      expect(state.storyMemory.projectGoal).toBe('Build SaaS platform');
    });

    it('should add milestones with timeline', () => {
      memory.addMilestone('MVP completed');
      memory.addMilestone('First deployment');
      const state = memory.getState();
      expect(state.storyMemory.milestones).toHaveLength(2);
      expect(state.storyMemory.timeline).toHaveLength(2);
      expect(state.storyMemory.timeline[0].event).toBe('MVP completed');
    });

    it('should not duplicate milestones', () => {
      memory.addMilestone('MVP completed');
      memory.addMilestone('MVP completed');
      const state = memory.getState();
      expect(state.storyMemory.milestones).toHaveLength(1);
    });

    it('should track challenges and solutions', () => {
      memory.addChallenge('Slow queries', 'Added indexes');
      const state = memory.getState();
      expect(state.storyMemory.challenges).toContain('Slow queries');
      expect(state.storyMemory.solutions).toContain('Added indexes');
    });

    it('should add learnings without duplicates', () => {
      memory.addLearning('Always validate input');
      memory.addLearning('Always validate input');
      memory.addLearning('Use TypeScript');
      const state = memory.getState();
      expect(state.storyMemory.learnings).toHaveLength(2);
    });
  });

  describe('Chat History', () => {
    it('should add chat messages', () => {
      memory.addChatMessage('user', 'Hello', 10);
      memory.addChatMessage('assistant', 'Hi there', 15);
      const state = memory.getState();
      expect(state.chatHistory).toHaveLength(2);
      expect(state.chatHistory[0].role).toBe('user');
      expect(state.chatHistory[0].tokens).toBe(10);
    });

    it('should limit chat history to 100 messages', () => {
      for (let i = 0; i < 150; i++) {
        memory.addChatMessage('user', `Message ${i}`);
      }
      const state = memory.getState();
      expect(state.chatHistory).toHaveLength(100);
    });

    it('should truncate long messages to 500 chars', () => {
      const longMessage = 'a'.repeat(1000);
      memory.addChatMessage('user', longMessage);
      const state = memory.getState();
      expect(state.chatHistory[0].content).toHaveLength(500);
    });

    it('should search chat history', () => {
      memory.addChatMessage('user', 'Add authentication');
      memory.addChatMessage('user', 'Create database');
      memory.addChatMessage('user', 'Add authentication tests');
      const results = memory.searchChatHistory('authentication');
      expect(results).toHaveLength(2);
    });
  });

  describe('Enhanced Workspace Memory', () => {
    it('should track dependencies', () => {
      memory.updateWorkspaceMemory();
      const state = memory.getState();
      expect(state.workspaceMemory.dependencies).toBeDefined();
    });

    it('should track npm scripts', () => {
      memory.updateWorkspaceMemory();
      const state = memory.getState();
      expect(state.workspaceMemory.scripts).toBeDefined();
    });

    it('should track git branch', () => {
      memory.updateWorkspaceMemory();
      const state = memory.getState();
      expect(state.workspaceMemory.gitBranch).toBeDefined();
    });

    it('should track 50 recent changes', () => {
      for (let i = 0; i < 60; i++) {
        memory.onFileWrite(`file${i}.ts`, 'content');
      }
      const state = memory.getState();
      expect(state.workspaceMemory.recentChanges.length).toBeLessThanOrEqual(50);
    });
  });

  describe('Task Tracking', () => {
    it('should track task duration and success', () => {
      memory.startTask('Add authentication');
      memory.completeTask(true, 30000);
      const state = memory.getState();
      expect(state.taskHistory[0].duration).toBe(30000);
      expect(state.taskHistory[0].success).toBe(true);
    });

    it('should limit task history to 20', () => {
      for (let i = 0; i < 30; i++) {
        memory.startTask(`Task ${i}`);
      }
      const state = memory.getState();
      expect(state.taskHistory).toHaveLength(20);
    });
  });

  describe('User Preferences', () => {
    it('should set and retrieve preferences', () => {
      memory.setPreference('framework', 'Next.js');
      memory.setPreference('testFramework', 'vitest');
      const state = memory.getState();
      expect(state.userPreferences.framework).toBe('Next.js');
      expect(state.userPreferences.testFramework).toBe('vitest');
    });
  });

  describe('Code Patterns', () => {
    it('should add code patterns without duplicates', () => {
      memory.addCodePattern('Use async/await');
      memory.addCodePattern('Use async/await');
      memory.addCodePattern('Prefer functional');
      const state = memory.getState();
      expect(state.codePatterns).toHaveLength(2);
    });
  });

  describe('Command Tracking', () => {
    it('should track command frequency', () => {
      memory.trackCommand('/deploy');
      memory.trackCommand('/deploy');
      memory.trackCommand('/create');
      const state = memory.getState();
      expect(state.frequentCommands['/deploy']).toBe(2);
      expect(state.frequentCommands['/create']).toBe(1);
    });
  });

  describe('Memory Context', () => {
    it('should generate comprehensive context', () => {
      memory.setProjectGoal('Build app');
      memory.addMilestone('Setup complete');
      memory.addKeyPoint('Using TypeScript');
      memory.addDecision('Use Next.js');
      memory.addPendingTask('Add tests');
      
      const context = memory.getMemoryContext();
      expect(context).toContain('Build app');
      expect(context).toContain('Setup complete');
      expect(context).toContain('Using TypeScript');
      expect(context).toContain('Use Next.js');
      expect(context).toContain('Add tests');
    });
  });

  describe('Persistence', () => {
    it('should persist and load state', () => {
      memory.setProjectGoal('Test persistence');
      memory.addMilestone('First milestone');
      
      const newMemory = new MemoryManager(testDir);
      const state = newMemory.getState();
      expect(state.storyMemory.projectGoal).toBe('Test persistence');
      expect(state.storyMemory.milestones).toContain('First milestone');
    });
  });
});
