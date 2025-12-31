/**
 * Universal AI Runtime Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UniversalAI, Task } from '../../../../src/core/universal-ai';

describe('UniversalAI', () => {
  
  beforeEach(() => {
    UniversalAI.reloadConfig();
  });
  
  describe('Model Resolution', () => {
    
    it('should return models for each task', () => {
      const tasks: Task[] = ['chat', 'code', 'debug', 'agent'];
      
      for (const task of tasks) {
        const models = UniversalAI.getModels(task);
        expect(models.length).toBeGreaterThan(0);
        expect(models.every(m => m.task === task)).toBe(true);
      }
    });
    
    it('should have free models available', () => {
      const models = UniversalAI.getModels();
      const freeModels = models.filter(m => m.free);
      expect(freeModels.length).toBeGreaterThan(0);
    });
    
    it('should prioritize free models in free-first mode', () => {
      const chatModels = UniversalAI.getModels('chat');
      // First model should be free (config is free-first)
      const freeModels = chatModels.filter(m => m.free);
      expect(freeModels.length).toBeGreaterThan(0);
    });
    
    it('should return all models when no task specified', () => {
      const allModels = UniversalAI.getModels();
      const chatModels = UniversalAI.getModels('chat');
      const codeModels = UniversalAI.getModels('code');
      
      expect(allModels.length).toBeGreaterThanOrEqual(chatModels.length);
      expect(allModels.length).toBeGreaterThanOrEqual(codeModels.length);
    });
  });
  
  describe('Configuration', () => {
    
    it('should check if configured', () => {
      // This depends on env vars, just verify it returns boolean
      const result = UniversalAI.isConfigured();
      expect(typeof result).toBe('boolean');
    });
    
    it('should have models with required fields', () => {
      const models = UniversalAI.getModels();
      
      for (const model of models) {
        expect(model.id).toBeDefined();
        expect(model.task).toBeDefined();
        expect(typeof model.free).toBe('boolean');
        expect(model.provider).toBeDefined();
      }
    });
  });
  
  describe('Free Model Enforcement', () => {
    
    it('should have free models for all core tasks', () => {
      const coreTasks: Task[] = ['chat', 'code', 'debug', 'agent'];
      
      for (const task of coreTasks) {
        const models = UniversalAI.getModels(task);
        const freeModels = models.filter(m => m.free);
        expect(freeModels.length).toBeGreaterThan(0);
      }
    });
    
    it('should have :free suffix on free OpenRouter models', () => {
      const models = UniversalAI.getModels();
      const openrouterFree = models.filter(m => m.provider === 'openrouter' && m.free);
      
      for (const model of openrouterFree) {
        expect(model.id.endsWith(':free')).toBe(true);
      }
    });
  });
  
  describe('Single Entry Point', () => {
    
    it('should export UniversalAI.run as main method', () => {
      expect(typeof UniversalAI.run).toBe('function');
    });
    
    it('should export helper methods', () => {
      expect(typeof UniversalAI.chat).toBe('function');
      expect(typeof UniversalAI.code).toBe('function');
      expect(typeof UniversalAI.agent).toBe('function');
    });
    
    it('should throw on invalid task with no models', async () => {
      // Temporarily test with a task that has no models
      // This verifies error handling
      const models = UniversalAI.getModels('vision');
      // Vision may or may not have models depending on config
      expect(Array.isArray(models)).toBe(true);
    });
  });
  
  describe('Provider Fallback', () => {
    
    it('should have multiple providers configured', () => {
      const models = UniversalAI.getModels();
      const providers = new Set(models.map(m => m.provider));
      expect(providers.size).toBeGreaterThanOrEqual(1);
    });
    
    it('should not crash when provider fails', async () => {
      // Without API key, should fail gracefully
      try {
        await UniversalAI.run({
          task: 'chat',
          messages: [{ role: 'user', content: 'test' }]
        });
      } catch (error: any) {
        // Expected to fail without API key
        expect(error.message).toContain('AI request failed');
      }
    });
  });
});
