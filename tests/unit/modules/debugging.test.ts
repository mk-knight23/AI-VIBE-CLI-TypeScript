/**
 * Unit tests for debugging module
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DebuggingModule } from '../../../src/modules/debugging';

describe('DebuggingModule', () => {
  let module: DebuggingModule;

  beforeEach(() => {
    module = new DebuggingModule();
  });

  describe('constructor', () => {
    it('should initialize with correct info', () => {
      expect(module.getName()).toBe('debugging');
      expect(module.getVersion()).toBe('1.0.0');
      expect(module.getDescription()).toContain('Error analysis');
    });
  });

  describe('execute', () => {
    it('should return failure for unknown action', async () => {
      const result = await module.execute({ action: 'unknown' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });

    it('should route analyze action', async () => {
      const result = await module.execute({ action: 'analyze', error: 'test error' });
      expect(result).toHaveProperty('success');
    });

    it('should route suggest action', async () => {
      const result = await module.execute({ action: 'suggest', error: 'test error' });
      expect(result).toHaveProperty('success');
    });

    it('should route profile action', async () => {
      const result = await module.execute({ action: 'profile', file: 'nonexistent.ts' });
      expect(result).toHaveProperty('success');
    });

    it('should route trace action', async () => {
      const result = await module.execute({ action: 'trace', code: 'console.log("test")' });
      expect(result).toHaveProperty('success');
    });

    it('should route fix action', async () => {
      const result = await module.execute({ action: 'fix', code: 'x', fix: 'y' });
      expect(result).toHaveProperty('success');
    });
  });

  describe('getInfo', () => {
    it('should return module info', () => {
      const info = module.getInfo();
      expect(info.name).toBe('debugging');
      expect(info.version).toBe('1.0.0');
    });
  });
});
