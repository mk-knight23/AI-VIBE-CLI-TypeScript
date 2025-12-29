/**
 * Provider Registry Tests - P0
 * Tests for v10 config-driven provider system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getProvider,
  listProviders,
  listConfiguredProviders,
  registerProvider,
  hasCapability,
  getApiKey,
  getBaseUrl,
  PROVIDER_REGISTRY,
} from '../../src/providers/registry';

describe('Provider Registry', () => {
  describe('PROVIDER_REGISTRY', () => {
    it('should have at least 15 built-in providers', () => {
      const count = Object.keys(PROVIDER_REGISTRY).length;
      expect(count).toBeGreaterThanOrEqual(15);
    });

    it('should include legacy providers', () => {
      expect(PROVIDER_REGISTRY.openrouter).toBeDefined();
      expect(PROVIDER_REGISTRY.megallm).toBeDefined();
      expect(PROVIDER_REGISTRY.agentrouter).toBeDefined();
      expect(PROVIDER_REGISTRY.routeway).toBeDefined();
    });

    it('should include new v10 providers', () => {
      expect(PROVIDER_REGISTRY.openai).toBeDefined();
      expect(PROVIDER_REGISTRY.anthropic).toBeDefined();
      expect(PROVIDER_REGISTRY.deepseek).toBeDefined();
      expect(PROVIDER_REGISTRY.groq).toBeDefined();
    });

    it('should include local providers', () => {
      expect(PROVIDER_REGISTRY.ollama).toBeDefined();
      expect(PROVIDER_REGISTRY.lmstudio).toBeDefined();
    });
  });

  describe('getProvider', () => {
    it('should return provider config by name', () => {
      const provider = getProvider('openrouter');
      expect(provider?.name).toBe('OpenRouter');
      expect(provider?.type).toBe('openai-compatible');
      expect(provider?.baseUrl).toContain('openrouter.ai');
    });

    it('should return undefined for unknown provider', () => {
      expect(getProvider('nonexistent')).toBeUndefined();
    });
  });

  describe('listProviders', () => {
    it('should list all provider names', () => {
      const providers = listProviders();
      expect(providers).toContain('openrouter');
      expect(providers).toContain('megallm');
      expect(providers).toContain('openai');
      expect(providers).toContain('ollama');
    });
  });

  describe('listConfiguredProviders', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should include local providers without API key', () => {
      const configured = listConfiguredProviders();
      expect(configured).toContain('ollama');
      expect(configured).toContain('lmstudio');
    });

    it('should include providers with API key set', () => {
      process.env.OPENROUTER_API_KEY = 'test-key';
      const configured = listConfiguredProviders();
      expect(configured).toContain('openrouter');
    });

    it('should exclude providers without API key', () => {
      delete process.env.OPENAI_API_KEY;
      const configured = listConfiguredProviders();
      // OpenAI requires key, so shouldn't be in list unless env is set
      if (!process.env.OPENAI_API_KEY) {
        expect(configured).not.toContain('openai');
      }
    });
  });

  describe('registerProvider', () => {
    it('should register custom provider', () => {
      registerProvider('custom-test', {
        name: 'Custom Test',
        type: 'openai-compatible',
        baseUrl: 'https://custom.example.com/v1',
        apiKeyEnv: 'CUSTOM_API_KEY',
        capabilities: ['chat'],
      });

      const provider = getProvider('custom-test');
      expect(provider?.name).toBe('Custom Test');
      expect(provider?.baseUrl).toBe('https://custom.example.com/v1');
    });

    it('should include custom provider in list', () => {
      registerProvider('custom-list-test', {
        name: 'Custom List',
        type: 'openai-compatible',
        baseUrl: 'https://example.com',
        apiKeyEnv: '',
      });

      expect(listProviders()).toContain('custom-list-test');
    });
  });

  describe('hasCapability', () => {
    it('should return true for supported capability', () => {
      expect(hasCapability('openrouter', 'chat')).toBe(true);
      expect(hasCapability('openrouter', 'tools')).toBe(true);
      expect(hasCapability('openrouter', 'streaming')).toBe(true);
    });

    it('should return false for unsupported capability', () => {
      expect(hasCapability('perplexity', 'tools')).toBe(false);
    });

    it('should return false for unknown provider', () => {
      expect(hasCapability('nonexistent', 'chat')).toBe(false);
    });
  });

  describe('getApiKey', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return API key from environment', () => {
      process.env.OPENROUTER_API_KEY = 'test-api-key';
      expect(getApiKey('openrouter')).toBe('test-api-key');
    });

    it('should return empty string for missing key', () => {
      delete process.env.OPENAI_API_KEY;
      expect(getApiKey('openai')).toBe('');
    });

    it('should return empty for local providers', () => {
      expect(getApiKey('ollama')).toBe('');
    });
  });

  describe('getBaseUrl', () => {
    it('should return base URL for provider', () => {
      expect(getBaseUrl('openrouter')).toBe('https://openrouter.ai/api/v1');
      expect(getBaseUrl('ollama')).toBe('http://localhost:11434');
    });

    it('should return empty for unknown provider', () => {
      expect(getBaseUrl('nonexistent')).toBe('');
    });

    it('should handle Azure special case', () => {
      const originalEnv = process.env.AZURE_OPENAI_ENDPOINT;
      process.env.AZURE_OPENAI_ENDPOINT = 'https://my-azure.openai.azure.com';
      
      expect(getBaseUrl('azure-openai')).toBe('https://my-azure.openai.azure.com');
      
      process.env.AZURE_OPENAI_ENDPOINT = originalEnv;
    });
  });

  describe('Provider Config Validation', () => {
    it('should have valid baseUrl for all cloud providers', () => {
      const cloudProviders = Object.entries(PROVIDER_REGISTRY)
        .filter(([_, p]) => p.type !== 'ollama' && p.apiKeyEnv);

      for (const [name, provider] of cloudProviders) {
        if (name !== 'azure-openai' && name !== 'bedrock' && name !== 'vertex') {
          expect(provider.baseUrl, `${name} missing baseUrl`).toBeTruthy();
          expect(provider.baseUrl).toMatch(/^https?:\/\//);
        }
      }
    });

    it('should have apiKeyEnv for cloud providers', () => {
      const cloudProviders = ['openrouter', 'openai', 'anthropic', 'deepseek', 'groq'];
      
      for (const name of cloudProviders) {
        const provider = PROVIDER_REGISTRY[name];
        expect(provider.apiKeyEnv, `${name} missing apiKeyEnv`).toBeTruthy();
      }
    });

    it('should have capabilities array for all providers', () => {
      for (const [name, provider] of Object.entries(PROVIDER_REGISTRY)) {
        expect(provider.capabilities, `${name} missing capabilities`).toBeDefined();
        expect(Array.isArray(provider.capabilities)).toBe(true);
      }
    });
  });
});
