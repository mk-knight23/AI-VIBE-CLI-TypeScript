/**
 * Unit tests for testing module
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TestingModule } from '../../../src/modules/testing';

describe('TestingModule', () => {
  let module: TestingModule;

  beforeEach(() => {
    module = new TestingModule();
  });

  describe('constructor', () => {
    it('should initialize with correct info', () => {
      expect(module.getName()).toBe('testing');
      expect(module.getVersion()).toBe('1.0.0');
      expect(module.getDescription()).toContain('Test generation');
    });
  });

  describe('execute', () => {
    it('should return failure for unknown action', async () => {
      const result = await module.execute({ action: 'unknown' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });

    it('should require file parameter for generate action', async () => {
      const result = await module.execute({ action: 'generate' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required parameter');
    });

    it('should fail generate for non-existent file', async () => {
      const result = await module.execute({ action: 'generate', file: 'nonexistent.ts' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('getInfo', () => {
    it('should return module info', () => {
      const info = module.getInfo();
      expect(info.name).toBe('testing');
      expect(info.version).toBe('1.0.0');
    });
  });
});
