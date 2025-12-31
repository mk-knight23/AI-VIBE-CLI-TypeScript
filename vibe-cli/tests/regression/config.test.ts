/**
 * Regression Tests - Config Keys
 * Ensures all existing config keys continue to work in v10.x
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Config Key Regression Tests', () => {
  const testConfigPath = path.join(process.cwd(), 'test-vibe.json');

  afterEach(() => {
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
  });

  describe('Top-Level Config Keys', () => {
    it('should support $schema key', async () => {
      const { loadConfig, createDefaultConfig } = await import('../../src/config/loader');
      const config = createDefaultConfig();
      expect(config.$schema).toBeDefined();
      expect(config.$schema).toContain('vibe.ai');
    });

    it('should support provider key', async () => {
      const { createDefaultConfig } = await import('../../src/config/loader');
      const config = createDefaultConfig();
      expect(config.provider).toBeDefined();
      expect(typeof config.provider).toBe('object');
    });

    it('should support model key', async () => {
      const { createDefaultConfig } = await import('../../src/config/loader');
      const config = createDefaultConfig();
      expect(config.model).toBeDefined();
      expect(typeof config.model).toBe('string');
    });

    it('should support routing key', async () => {
      const { createDefaultConfig } = await import('../../src/config/loader');
      const config = createDefaultConfig();
      expect(config.routing).toBeDefined();
      expect(config.routing.code).toBeDefined();
      expect(config.routing.chat).toBeDefined();
      expect(config.routing.cheap).toBeDefined();
      expect(config.routing.reasoning).toBeDefined();
    });
  });

  describe('Legacy Config Keys (Preserved)', () => {
    it('should support apiKey key', async () => {
      const config = {
        apiKey: 'test-key',
        model: 'gpt-4',
        provider: {}
      };
      fs.writeFileSync(testConfigPath, JSON.stringify(config));
      
      const { loadConfig } = await import('../../src/config/loader');
      const { config: loaded } = loadConfig(testConfigPath);
      expect(loaded?.apiKey).toBe('test-key');
    });

    it('should support temperature key', async () => {
      const config = {
        temperature: 0.7,
        model: 'gpt-4',
        provider: {}
      };
      fs.writeFileSync(testConfigPath, JSON.stringify(config));
      
      const { loadConfig } = await import('../../src/config/loader');
      const { config: loaded } = loadConfig(testConfigPath);
      expect(loaded?.temperature).toBe(0.7);
    });

    it('should support maxTokens key', async () => {
      const config = {
        maxTokens: 2000,
        model: 'gpt-4',
        provider: {}
      };
      fs.writeFileSync(testConfigPath, JSON.stringify(config));
      
      const { loadConfig } = await import('../../src/config/loader');
      const { config: loaded } = loadConfig(testConfigPath);
      expect(loaded?.maxTokens).toBe(2000);
    });

    it('should support outputFormat key', async () => {
      const config = {
        outputFormat: 'json',
        model: 'gpt-4',
        provider: {}
      };
      fs.writeFileSync(testConfigPath, JSON.stringify(config));
      
      const { loadConfig } = await import('../../src/config/loader');
      const { config: loaded } = loadConfig(testConfigPath);
      expect(loaded?.outputFormat).toBe('json');
    });

    it('should support sessionDir key', async () => {
      const config = {
        sessionDir: '/tmp/sessions',
        model: 'gpt-4',
        provider: {}
      };
      fs.writeFileSync(testConfigPath, JSON.stringify(config));
      
      const { loadConfig } = await import('../../src/config/loader');
      const { config: loaded } = loadConfig(testConfigPath);
      expect(loaded?.sessionDir).toBe('/tmp/sessions');
    });

    it('should support verbose key', async () => {
      const config = {
        verbose: true,
        model: 'gpt-4',
        provider: {}
      };
      fs.writeFileSync(testConfigPath, JSON.stringify(config));
      
      const { loadConfig } = await import('../../src/config/loader');
      const { config: loaded } = loadConfig(testConfigPath);
      expect(loaded?.verbose).toBe(true);
    });
  });

  describe('Provider Config Keys', () => {
    it('should support provider.openai.apiKey', async () => {
      const config = {
        model: 'gpt-4',
        provider: {
          openai: {
            apiKey: 'sk-test'
          }
        }
      };
      fs.writeFileSync(testConfigPath, JSON.stringify(config));
      
      const { loadConfig } = await import('../../src/config/loader');
      const { config: loaded } = loadConfig(testConfigPath);
      expect(loaded?.provider.openai.apiKey).toBe('sk-test');
    });

    it('should support provider.openai.model', async () => {
      const config = {
        model: 'gpt-4',
        provider: {
          openai: {
            model: 'gpt-4-turbo'
          }
        }
      };
      fs.writeFileSync(testConfigPath, JSON.stringify(config));
      
      const { loadConfig } = await import('../../src/config/loader');
      const { config: loaded } = loadConfig(testConfigPath);
      expect(loaded?.provider.openai.model).toBe('gpt-4-turbo');
    });

    it('should support provider.anthropic.apiKey', async () => {
      const config = {
        model: 'claude-3',
        provider: {
          anthropic: {
            apiKey: 'sk-ant-test'
          }
        }
      };
      fs.writeFileSync(testConfigPath, JSON.stringify(config));
      
      const { loadConfig } = await import('../../src/config/loader');
      const { config: loaded } = loadConfig(testConfigPath);
      expect(loaded?.provider.anthropic.apiKey).toBe('sk-ant-test');
    });

    it('should support provider.anthropic.model', async () => {
      const config = {
        model: 'claude-3',
        provider: {
          anthropic: {
            model: 'claude-3-opus'
          }
        }
      };
      fs.writeFileSync(testConfigPath, JSON.stringify(config));
      
      const { loadConfig } = await import('../../src/config/loader');
      const { config: loaded } = loadConfig(testConfigPath);
      expect(loaded?.provider.anthropic.model).toBe('claude-3-opus');
    });

    it('should support provider.google.apiKey', async () => {
      const config = {
        model: 'gemini-pro',
        provider: {
          google: {
            apiKey: 'AIza-test'
          }
        }
      };
      fs.writeFileSync(testConfigPath, JSON.stringify(config));
      
      const { loadConfig } = await import('../../src/config/loader');
      const { config: loaded } = loadConfig(testConfigPath);
      expect(loaded?.provider.google.apiKey).toBe('AIza-test');
    });

    it('should support provider.google.model', async () => {
      const config = {
        model: 'gemini-pro',
        provider: {
          google: {
            model: 'gemini-1.5-pro'
          }
        }
      };
      fs.writeFileSync(testConfigPath, JSON.stringify(config));
      
      const { loadConfig } = await import('../../src/config/loader');
      const { config: loaded } = loadConfig(testConfigPath);
      expect(loaded?.provider.google.model).toBe('gemini-1.5-pro');
    });

    it('should support custom provider with baseURL', async () => {
      const config = {
        model: 'custom-model',
        provider: {
          custom: {
            baseURL: 'http://localhost:8000',
            apiKey: 'test-key'
          }
        }
      };
      fs.writeFileSync(testConfigPath, JSON.stringify(config));
      
      const { loadConfig } = await import('../../src/config/loader');
      const { config: loaded } = loadConfig(testConfigPath);
      expect(loaded?.provider.custom.baseURL).toBe('http://localhost:8000');
    });

    it('should support provider.*.models', async () => {
      const config = {
        model: 'gpt-4',
        provider: {
          openai: {
            models: {
              'gpt-4': { context: 8192, output: 4096 },
              'gpt-3.5': { context: 4096, output: 2048 }
            }
          }
        }
      };
      fs.writeFileSync(testConfigPath, JSON.stringify(config));
      
      const { loadConfig } = await import('../../src/config/loader');
      const { config: loaded } = loadConfig(testConfigPath);
      expect(loaded?.provider.openai.models['gpt-4']).toBeDefined();
      expect(loaded?.provider.openai.models['gpt-3.5']).toBeDefined();
    });
  });

  describe('Routing Config Keys', () => {
    it('should support routing.code', async () => {
      const config = {
        model: 'gpt-4',
        provider: {},
        routing: {
          code: ['gpt-4', 'claude-3']
        }
      };
      fs.writeFileSync(testConfigPath, JSON.stringify(config));
      
      const { loadConfig } = await import('../../src/config/loader');
      const { config: loaded } = loadConfig(testConfigPath);
      expect(loaded?.routing.code).toContain('gpt-4');
    });

    it('should support routing.chat', async () => {
      const config = {
        model: 'gpt-4',
        provider: {},
        routing: {
          chat: ['gpt-4', 'claude-3']
        }
      };
      fs.writeFileSync(testConfigPath, JSON.stringify(config));
      
      const { loadConfig } = await import('../../src/config/loader');
      const { config: loaded } = loadConfig(testConfigPath);
      expect(loaded?.routing.chat).toContain('gpt-4');
    });

    it('should support routing.cheap', async () => {
      const config = {
        model: 'gpt-4',
        provider: {},
        routing: {
          cheap: ['gpt-3.5', 'llama-2']
        }
      };
      fs.writeFileSync(testConfigPath, JSON.stringify(config));
      
      const { loadConfig } = await import('../../src/config/loader');
      const { config: loaded } = loadConfig(testConfigPath);
      expect(loaded?.routing.cheap).toContain('gpt-3.5');
    });

    it('should support routing.reasoning', async () => {
      const config = {
        model: 'gpt-4',
        provider: {},
        routing: {
          reasoning: ['o1', 'deepseek-reasoner']
        }
      };
      fs.writeFileSync(testConfigPath, JSON.stringify(config));
      
      const { loadConfig } = await import('../../src/config/loader');
      const { config: loaded } = loadConfig(testConfigPath);
      expect(loaded?.routing.reasoning).toContain('o1');
    });
  });

  describe('Config File Locations', () => {
    it('should find vibe.json', async () => {
      const { findConfigFile } = await import('../../src/config/loader');
      fs.writeFileSync(path.join(process.cwd(), 'vibe.json'), '{}');
      
      const found = findConfigFile();
      expect(found).toBeDefined();
      expect(found).toContain('vibe.json');
      
      fs.unlinkSync(path.join(process.cwd(), 'vibe.json'));
    });

    it('should find .vibe.json', async () => {
      const { findConfigFile } = await import('../../src/config/loader');
      fs.writeFileSync(path.join(process.cwd(), '.vibe.json'), '{}');
      
      const found = findConfigFile();
      expect(found).toBeDefined();
      expect(found).toContain('.vibe.json');
      
      fs.unlinkSync(path.join(process.cwd(), '.vibe.json'));
    });

    it('should find vibe.config.json', async () => {
      const { findConfigFile } = await import('../../src/config/loader');
      fs.writeFileSync(path.join(process.cwd(), 'vibe.config.json'), '{}');
      
      const found = findConfigFile();
      expect(found).toBeDefined();
      expect(found).toContain('vibe.config.json');
      
      fs.unlinkSync(path.join(process.cwd(), 'vibe.config.json'));
    });
  });
});
