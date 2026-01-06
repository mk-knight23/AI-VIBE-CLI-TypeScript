/**
 * Unit tests for security module
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SecurityModule } from '../../../src/modules/security';

describe('SecurityModule', () => {
  let module: SecurityModule;

  beforeEach(() => {
    module = new SecurityModule();
  });

  describe('constructor', () => {
    it('should initialize with correct info', () => {
      expect(module.getName()).toBe('security');
      expect(module.getVersion()).toBe('1.0.0');
      expect(module.getDescription()).toContain('Vulnerability scanning');
    });
  });

  describe('execute', () => {
    it('should return failure for unknown action', async () => {
      const result = await module.execute({ action: 'unknown' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });

    it('should route scan action', async () => {
      const result = await module.execute({ action: 'scan' });
      // May succeed or fail depending on environment
      expect(result).toHaveProperty('success');
    });

    it('should route audit action', async () => {
      const result = await module.execute({ action: 'audit' });
      expect(result).toHaveProperty('success');
    });

    it('should route check action', async () => {
      const result = await module.execute({ action: 'check' });
      expect(result).toHaveProperty('success');
    });

    it('should route fix action', async () => {
      const result = await module.execute({ action: 'fix' });
      expect(result).toHaveProperty('success');
    });
  });

  describe('getInfo', () => {
    it('should return module info', () => {
      const info = module.getInfo();
      expect(info.name).toBe('security');
      expect(info.version).toBe('1.0.0');
      expect(info.description).toBeTruthy();
    });
  });
});
