/**
 * VIBE-CLI v12 - Base Module Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseModule, ModuleInfo, ModuleResult } from '../../src/modules/base.module';

describe('BaseModule', () => {
  describe('Module Info', () => {
    it('should store module name, version, and description', () => {
      const info: ModuleInfo = {
        name: 'test-module',
        version: '1.0.0',
        description: 'A test module',
      };

      class TestModule extends BaseModule {
        async execute(): Promise<ModuleResult> {
          return this.success({});
        }
      }

      const module = new TestModule(info);

      expect(module.getName()).toBe('test-module');
      expect(module.getVersion()).toBe('1.0.0');
      expect(module.getDescription()).toBe('A test module');
      expect(module.getInfo()).toEqual(info);
    });
  });

  describe('Success Result', () => {
    it('should create a success result with data', () => {
      class TestModule extends BaseModule {
        async execute(): Promise<ModuleResult> {
          return this.success({ test: 'data' });
        }
      }

      const module = new TestModule({ name: 'test', version: '1.0.0', description: '' });
      const result = module.success({ test: 'data' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ test: 'data' });
      expect(result.error).toBeUndefined();
    });

    it('should create a success result with metadata', () => {
      class TestModule extends BaseModule {
        async execute(): Promise<ModuleResult> {
          return this.success({ test: 'data' }, { tokens: 100, duration: 500, model: 'claude' });
        }
      }

      const module = new TestModule({ name: 'test', version: '1.0.0', description: '' });
      const result = module.success({ test: 'data' }, { tokens: 100, duration: 500, model: 'claude' });

      expect(result.success).toBe(true);
      expect(result.metadata).toEqual({ tokens: 100, duration: 500, model: 'claude' });
    });
  });

  describe('Failure Result', () => {
    it('should create a failure result with error message', () => {
      class TestModule extends BaseModule {
        async execute(): Promise<ModuleResult> {
          return this.failure('Something went wrong');
        }
      }

      const module = new TestModule({ name: 'test', version: '1.0.0', description: '' });
      const result = module.failure('Something went wrong');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Something went wrong');
      expect(result.data).toBeUndefined();
    });
  });

  describe('Parameter Validation', () => {
    it('should return true when all required params are present', () => {
      class TestModule extends BaseModule {
        async execute(): Promise<ModuleResult> {
          if (!this.validateParams({ file: 'test.js', mode: 'read' }, ['file', 'mode'])) {
            return this.failure('Validation failed');
          }
          return this.success({});
        }
      }

      const module = new TestModule({ name: 'test', version: '1.0.0', description: '' });
      const params = { file: 'test.js', mode: 'read' };
      const result = module.validateParams(params, ['file', 'mode']);

      expect(result).toBe(true);
    });

    it('should return false when required param is missing', () => {
      class TestModule extends BaseModule {
        async execute(): Promise<ModuleResult> {
          return this.success({});
        }
      }

      const module = new TestModule({ name: 'test', version: '1.0.0', description: '' });
      const result = module.validateParams({ file: 'test.js' }, ['file', 'mode']);

      expect(result).toBe(false);
    });

    it('should return false when required param is null', () => {
      class TestModule extends BaseModule {
        async execute(): Promise<ModuleResult> {
          return this.success({});
        }
      }

      const module = new TestModule({ name: 'test', version: '1.0.0', description: '' });
      const result = module.validateParams({ file: null }, ['file']);

      expect(result).toBe(false);
    });

    it('should return false when required param is empty string', () => {
      class TestModule extends BaseModule {
        async execute(): Promise<ModuleResult> {
          return this.success({});
        }
      }

      const module = new TestModule({ name: 'test', version: '1.0.0', description: '' });
      const result = module.validateParams({ file: '' }, ['file']);

      expect(result).toBe(false);
    });
  });

  describe('Abstract Execute', () => {
    it('should allow subclasses to implement custom execute logic', async () => {
      // This test verifies that subclasses can implement execute
      class CustomModule extends BaseModule {
        async execute(params: Record<string, any>): Promise<ModuleResult> {
          return this.success({ custom: true, params });
        }
      }

      const module = new CustomModule({
        name: 'custom',
        version: '1.0.0',
        description: 'Custom module',
      });

      const result = await module.execute({ test: true });
      expect(result.success).toBe(true);
      expect(result.data?.custom).toBe(true);
    });
  });
});
