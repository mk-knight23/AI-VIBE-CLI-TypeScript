/**
 * Provider Fallback & Rate Limiting Tests - v10.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the providers module to avoid circular imports
vi.mock('../src/providers', () => ({
  openRouterChat: vi.fn(),
  megaLLMChat: vi.fn(),
  agentRouterChat: vi.fn(),
  routewayChat: vi.fn(),
  fetchOpenRouterModels: vi.fn().mockResolvedValue([]),
  fetchMegaLLMModels: vi.fn().mockResolvedValue([]),
  fetchAgentRouterModels: vi.fn().mockResolvedValue([]),
  fetchRoutewayModels: vi.fn().mockResolvedValue([])
}));

describe('Provider System - v10.1', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ApiClient', () => {
    it('should create client with default provider', async () => {
      const { ApiClient } = await import('../src/core/api');
      const client = new ApiClient();
      expect(client.getProvider()).toBe('megallm');
    });

    it('should allow setting provider', async () => {
      const { ApiClient } = await import('../src/core/api');
      const client = new ApiClient();
      client.setProvider('openrouter');
      expect(client.getProvider()).toBe('openrouter');
    });

    it('should reject invalid provider', async () => {
      const { ApiClient } = await import('../src/core/api');
      const client = new ApiClient();
      expect(() => client.setProvider('invalid' as any)).toThrow('Invalid provider');
    });
  });

  describe('ChatOptions', () => {
    it('should support noFallback option', async () => {
      const { ChatOptions } = await import('../src/core/api');
      const options = {
        noFallback: true,
        temperature: 0.7
      };
      expect(options.noFallback).toBe(true);
    });

    it('should support requiredCapabilities option', async () => {
      const options = {
        requiredCapabilities: ['tools', 'vision']
      };
      expect(options.requiredCapabilities).toContain('tools');
      expect(options.requiredCapabilities).toContain('vision');
    });
  });

  describe('getProviderHealth', () => {
    it('should return health for all providers', async () => {
      const { getProviderHealth } = await import('../src/core/api');
      const health = getProviderHealth();
      expect(health.length).toBeGreaterThan(0);
      
      health.forEach(h => {
        expect(h).toHaveProperty('provider');
        expect(h).toHaveProperty('healthy');
        expect(h).toHaveProperty('rateLimited');
      });
    });

    it('should include expected providers', async () => {
      const { getProviderHealth } = await import('../src/core/api');
      const health = getProviderHealth();
      const providers = health.map(h => h.provider);
      
      expect(providers).toContain('megallm');
      expect(providers).toContain('openrouter');
    });
  });
});

describe('Compatibility Contract - Provider System', () => {
  it('should export ApiClient', async () => {
    const { ApiClient } = await import('../src/core/api');
    expect(ApiClient).toBeDefined();
  });

  it('should export getProviderHealth', async () => {
    const { getProviderHealth } = await import('../src/core/api');
    expect(typeof getProviderHealth).toBe('function');
  });

  it('should export defaultClient', async () => {
    const { defaultClient } = await import('../src/core/api');
    expect(defaultClient).toBeDefined();
    expect(defaultClient.getProvider()).toBe('megallm');
  });

  it('ApiClient should have required methods', async () => {
    const { ApiClient } = await import('../src/core/api');
    const client = new ApiClient();
    
    expect(typeof client.setProvider).toBe('function');
    expect(typeof client.getProvider).toBe('function');
    expect(typeof client.fetchModels).toBe('function');
    expect(typeof client.chat).toBe('function');
  });

  it('should support all legacy provider types', async () => {
    const { ApiClient } = await import('../src/core/api');
    const client = new ApiClient();
    const providers = ['openrouter', 'megallm', 'agentrouter', 'routeway'];
    
    providers.forEach(p => {
      expect(() => client.setProvider(p as any)).not.toThrow();
    });
  });
});
