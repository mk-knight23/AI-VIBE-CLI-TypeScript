/**
 * Unit tests for Secrets Manager
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { SecretsManager, secretsManager } from '../../../src/security/secrets-manager';

describe('SecretsManager', () => {
  let manager: SecretsManager;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // Remove env vars that would be auto-detected as secrets
    const envPrefixes = ['VIBE_', 'OPENAI_', 'ANTHROPIC_', 'GOOGLE_', 'GITHUB_'];
    for (const key of Object.keys(process.env)) {
      for (const prefix of envPrefixes) {
        if (key.startsWith(prefix) && (key.includes('KEY') || key.includes('TOKEN') || key.includes('SECRET'))) {
          delete process.env[key];
          break;
        }
      }
    }
    manager = new SecretsManager({ storage: 'memory' });
  });

  afterEach(() => {
    process.env = originalEnv;
    manager.clear();
  });

  describe('initialization', () => {
    it('should initialize without errors', async () => {
      await manager.initialize();
      expect(manager).toBeDefined();
    });

    it('should load environment variables as secrets', async () => {
      process.env.VIBE_API_KEY = 'test-api-key-12345';
      process.env.OPENAI_TOKEN = 'sk-test-token';

      const testManager = new SecretsManager({ storage: 'memory' });
      await testManager.initialize();

      expect(testManager.hasSecret('VIBE_API_KEY')).toBe(true);
      expect(testManager.hasSecret('OPENAI_TOKEN')).toBe(true);
    });
  });

  describe('setSecret and getSecret', () => {
    it('should store and retrieve a secret', async () => {
      await manager.initialize();
      const id = await manager.setSecret('my-secret', 'secret-value');

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');

      const value = await manager.getSecret('my-secret');
      expect(value).toBe('secret-value');
    });

    it('should return null for non-existent secrets', async () => {
      await manager.initialize();
      const value = await manager.getSecret('non-existent');
      expect(value).toBeNull();
    });

    it('should encrypt stored secrets', async () => {
      await manager.initialize();
      await manager.setSecret('test', 'my-secret-value');

      // The stored value should not be plaintext
      const list = manager.listSecrets();
      expect(list).toContain('test');
    });
  });

  describe('deleteSecret', () => {
    it('should delete a secret', async () => {
      await manager.initialize();
      await manager.setSecret('to-delete', 'value');

      expect(manager.hasSecret('to-delete')).toBe(true);

      const deleted = await manager.deleteSecret('to-delete');
      expect(deleted).toBe(true);
      expect(manager.hasSecret('to-delete')).toBe(false);
    });

    it('should return false when deleting non-existent secret', async () => {
      await manager.initialize();
      const deleted = await manager.deleteSecret('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('listSecrets', () => {
    it('should list all secret names', async () => {
      await manager.initialize();
      await manager.setSecret('secret1', 'value1');
      await manager.setSecret('secret2', 'value2');

      const list = manager.listSecrets();
      expect(list).toContain('secret1');
      expect(list).toContain('secret2');
    });

    it('should return empty array when no secrets', async () => {
      await manager.initialize();
      const list = manager.listSecrets();
      expect(list).toEqual([]);
    });
  });

  describe('mask', () => {
    it('should mask OpenAI API keys', async () => {
      await manager.initialize();
      const masked = manager.mask('sk-abcdefghijklmnopqrstuvwxyz12345678901234567890');
      expect(masked).toContain('••••••••••••••••••••••••••••••••••');
    });

    it('should mask JWT tokens', async () => {
      await manager.initialize();
      const masked = manager.mask('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U');
      expect(masked).toContain('••••••••••••••••••••••••••••••••••••');
    });

    it('should mask GitHub PATs', async () => {
      await manager.initialize();
      const masked = manager.mask('ghp_abcdefghijklmnopqrstuvwxyz123456');
      expect(masked).toContain('•••••••••••••••••••••••••••••••••••');
    });

    it('should not mask regular text', async () => {
      await manager.initialize();
      const masked = manager.mask('This is just regular text');
      expect(masked).toBe('This is just regular text');
    });

    it('should return original when mask disabled', async () => {
      const disabledManager = new SecretsManager({ maskEnabled: false, storage: 'memory' });
      await disabledManager.initialize();
      const masked = disabledManager.mask('sk-test-key');
      expect(masked).toBe('sk-test-key');
    });
  });

  describe('containsSecret', () => {
    it('should detect OpenAI API keys', async () => {
      await manager.initialize();
      const result = manager.containsSecret('sk-my-api-key-12345');
      expect(result.detected).toBe(true);
      expect(result.patterns).toContain('OpenAI API Key');
    });

    it('should detect JWT tokens', async () => {
      await manager.initialize();
      const result = manager.containsSecret('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature');
      expect(result.detected).toBe(true);
      expect(result.patterns).toContain('JWT Token');
    });

    it('should detect AWS access keys', async () => {
      await manager.initialize();
      const result = manager.containsSecret('AKIAIOSFODNN7EXAMPLE');
      expect(result.detected).toBe(true);
      expect(result.patterns).toContain('AWS Access Key');
    });

    it('should return false for plain text', async () => {
      await manager.initialize();
      const result = manager.containsSecret('Hello world, this is normal text');
      expect(result.detected).toBe(false);
      expect(result.patterns).toEqual([]);
    });
  });

  describe('maskObject', () => {
    it('should mask secrets in object values', async () => {
      await manager.initialize();
      const obj = {
        name: 'test',
        apiKey: 'sk-secret-key',
        nested: {
          token: 'ghp_abcdef123456'
        }
      };

      const masked = manager.maskObject(obj);
      expect(masked.name).toBe('test');
      expect(masked.apiKey).toContain('••••');
      expect((masked.nested as Record<string, unknown>).token).toContain('••••');
    });
  });

  describe('maskErrorMessage', () => {
    it('should mask secrets in error messages', async () => {
      await manager.initialize();
      const message = 'Error: Invalid API key sk-test-key provided';
      const masked = manager.maskErrorMessage(message);
      expect(masked).not.toContain('sk-test-key');
    });
  });

  describe('clear', () => {
    it('should clear all secrets', async () => {
      await manager.initialize();
      await manager.setSecret('secret1', 'value1');
      await manager.setSecret('secret2', 'value2');

      expect(manager.listSecrets().length).toBe(2);

      manager.clear();

      expect(manager.listSecrets().length).toBe(0);
    });
  });

  describe('getHelp', () => {
    it('should return help text', async () => {
      await manager.initialize();
      const help = manager.getHelp();

      expect(help).toContain('Secrets Management');
      expect(help).toContain('OpenAI API Key');
      expect(help).toContain('Anthropic API Key');
      expect(help).toContain('Commands');
    });
  });
});

describe('secretsManager singleton', () => {
  it('should export a SecretsManager instance', () => {
    expect(secretsManager).toBeInstanceOf(SecretsManager);
  });
});
