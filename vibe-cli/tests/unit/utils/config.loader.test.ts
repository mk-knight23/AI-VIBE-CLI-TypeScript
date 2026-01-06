/**
 * Unit tests for config loader utility
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ConfigLoader, VIBE_CONFIG_SCHEMA, createConfigLoader } from '../../../src/utils/config.loader';

describe('ConfigLoader', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('load', () => {
    it('should load configuration from environment', () => {
      process.env.VIBE_PROVIDER = 'anthropic';
      process.env.VIBE_MODEL = 'claude-opus-4';

      const loader = new ConfigLoader({
        schema: {
          PROVIDER: { type: 'string', required: false },
          MODEL: { type: 'string', required: false },
        },
      });

      const result = loader.load();
      expect(result.config.PROVIDER).toBe('anthropic');
      expect(result.config.MODEL).toBe('claude-opus-4');
    });

    it('should apply defaults for missing optional values', () => {
      delete process.env.VIBE_PROVIDER;

      const loader = new ConfigLoader({
        schema: {
          PROVIDER: { type: 'string', required: false, default: 'openrouter' },
        },
      });

      const result = loader.load();
      expect(result.config.PROVIDER).toBe('openrouter');
    });

    it('should add error for missing required values', () => {
      delete process.env.TEST_VAR;

      const loader = new ConfigLoader({
        schema: {
          TEST_VAR: { type: 'string', required: true },
        },
      });

      const result = loader.load();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Missing required');
    });

    it('should parse boolean values correctly', () => {
      process.env.DEBUG = 'true';
      process.env.SKIP = 'false';

      const loader = new ConfigLoader({
        schema: {
          DEBUG: { type: 'boolean' },
          SKIP: { type: 'boolean' },
        },
      });

      const result = loader.load();
      expect(result.config.DEBUG).toBe(true);
      expect(result.config.SKIP).toBe(false);
    });

    it('should parse number values correctly', () => {
      process.env.PORT = '8080';

      const loader = new ConfigLoader({
        schema: {
          PORT: { type: 'number' },
        },
      });

      const result = loader.load();
      expect(result.config.PORT).toBe(8080);
    });

    it('should add error for invalid number', () => {
      process.env.PORT = 'not-a-number';

      const loader = new ConfigLoader({
        schema: {
          PORT: { type: 'number' },
        },
      });

      const result = loader.load();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should override with user config', () => {
      process.env.VALUE = 'env';

      const loader = new ConfigLoader({
        schema: {
          VALUE: { type: 'string' },
        },
      });

      const result = loader.load({ VALUE: 'user' });
      expect(result.config.VALUE).toBe('user');
    });
  });

  describe('get', () => {
    it('should get specific configuration value', () => {
      process.env.VIBE_PROVIDER = 'test-provider';

      const loader = new ConfigLoader({
        schema: VIBE_CONFIG_SCHEMA,
      });

      expect(loader.get('PROVIDER')).toBe('test-provider');
    });

    it('should return undefined for missing value', () => {
      const loader = new ConfigLoader({
        schema: {
          MISSING: { type: 'string' },
        },
      });

      expect(loader.get('MISSING')).toBeUndefined();
    });
  });

  describe('set', () => {
    it('should set environment variable', () => {
      const loader = new ConfigLoader();
      loader.set('TEST_VAR', 'test-value');
      expect(process.env.TEST_VAR).toBe('test-value');
    });
  });

  describe('has', () => {
    it('should return true for existing key', () => {
      process.env.EXISTING_VAR = 'value';

      const loader = new ConfigLoader({
        schema: {
          EXISTING_VAR: { type: 'string' },
        },
      });

      expect(loader.has('EXISTING_VAR')).toBe(true);
    });

    it('should return false for missing key', () => {
      const loader = new ConfigLoader({
        schema: {
          MISSING_VAR: { type: 'string' },
        },
      });

      expect(loader.has('MISSING_VAR')).toBe(false);
    });
  });

  describe('validate', () => {
    it('should validate valid configuration', () => {
      const loader = new ConfigLoader({
        schema: {
          REQUIRED: { type: 'string', required: true },
        },
      });

      const result = loader.validate({ REQUIRED: 'value' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for missing required fields', () => {
      const loader = new ConfigLoader({
        schema: {
          REQUIRED: { type: 'string', required: true },
        },
      });

      const result = loader.validate({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required configuration: REQUIRED');
    });
  });
});

describe('VIBE_CONFIG_SCHEMA', () => {
  it('should have required fields defined', () => {
    expect(VIBE_CONFIG_SCHEMA.PROVIDER).toBeDefined();
    expect(VIBE_CONFIG_SCHEMA.MODEL).toBeDefined();
    expect(VIBE_CONFIG_SCHEMA.DEBUG).toBeDefined();
  });
});

describe('createConfigLoader', () => {
  it('should create config loader with defaults', () => {
    const loader = createConfigLoader();
    expect(loader).toBeInstanceOf(ConfigLoader);
  });

  it('should accept custom options', () => {
    const loader = createConfigLoader({ allowMissing: true });
    expect(loader).toBeInstanceOf(ConfigLoader);
  });
});
