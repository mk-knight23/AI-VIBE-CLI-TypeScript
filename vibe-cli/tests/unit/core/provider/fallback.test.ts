/**
 * Universal AI Provider Tests
 */

import { describe, it, expect } from 'vitest';
import { ApiClient, getProviderHealth } from '../../../../src/core/api';
import { UniversalAI } from '../../../../src/core/universal-ai';

describe('Universal AI System', () => {
  
  describe('ApiClient', () => {
    
    it('should create client without arguments', () => {
      const client = new ApiClient();
      expect(client).toBeDefined();
    });
    
    it('should return universal as provider', () => {
      const client = new ApiClient();
      expect(client.getProvider()).toBe('universal');
    });
    
    it('should have setProvider as no-op', () => {
      const client = new ApiClient();
      client.setProvider('anything');
      expect(client.getProvider()).toBe('universal');
    });
    
    it('should fetch models', async () => {
      const client = new ApiClient();
      const models = await client.fetchModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });
    
    it('should check if configured', () => {
      const client = new ApiClient();
      const result = client.isConfigured();
      expect(typeof result).toBe('boolean');
    });
  });
  
  describe('getProviderHealth', () => {
    
    it('should return health array', () => {
      const health = getProviderHealth();
      expect(Array.isArray(health)).toBe(true);
      expect(health.length).toBeGreaterThan(0);
    });
    
    it('should have universal provider', () => {
      const health = getProviderHealth();
      expect(health[0].provider).toBe('universal');
    });
  });
  
  describe('UniversalAI', () => {
    
    it('should have run method', () => {
      expect(typeof UniversalAI.run).toBe('function');
    });
    
    it('should have chat helper', () => {
      expect(typeof UniversalAI.chat).toBe('function');
    });
    
    it('should have code helper', () => {
      expect(typeof UniversalAI.code).toBe('function');
    });
    
    it('should have agent helper', () => {
      expect(typeof UniversalAI.agent).toBe('function');
    });
    
    it('should get models', () => {
      const models = UniversalAI.getModels();
      expect(Array.isArray(models)).toBe(true);
    });
    
    it('should get models by task', () => {
      const chatModels = UniversalAI.getModels('chat');
      expect(chatModels.every(m => m.task === 'chat')).toBe(true);
    });
  });
});
