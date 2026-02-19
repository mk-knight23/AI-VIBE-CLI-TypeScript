/**
 * Unit tests for deployment module (replacing non-existent planning module)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DeploymentModule } from '../../../src/modules/deployment';

describe('DeploymentModule', () => {
  let module: DeploymentModule;

  beforeEach(() => {
    module = new DeploymentModule();
  });

  describe('constructor', () => {
    it('should initialize with correct info', () => {
      expect(module.getName()).toBe('deployment');
      expect(module.getVersion()).toBeDefined();
      expect(module.getDescription()).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return failure for unknown action', async () => {
      const result = await module.execute({ action: 'unknown' });
      expect(result.success).toBe(false);
    });
  });

  describe('getInfo', () => {
    it('should return module info', () => {
      const info = module.getInfo();
      expect(info.name).toBe('deployment');
      expect(info.version).toBeDefined();
    });
  });
});
