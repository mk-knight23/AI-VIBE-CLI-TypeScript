/**
 * Unit tests for planning module
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PlanningModule } from '../../../src/modules/planning';

describe('PlanningModule', () => {
  let module: PlanningModule;

  beforeEach(() => {
    module = new PlanningModule();
  });

  describe('constructor', () => {
    it('should initialize with correct info', () => {
      expect(module.getName()).toBe('planning');
      expect(module.getVersion()).toBe('1.0.0');
      expect(module.getDescription()).toContain('Architecture planning');
    });
  });

  describe('execute', () => {
    it('should return failure for unknown action', async () => {
      const result = await module.execute({ action: 'unknown' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });

    it('should require prompt for plan action', async () => {
      const result = await module.execute({ action: 'plan' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required parameter');
    });

    it('should require tasks for estimate action', async () => {
      const result = await module.execute({ action: 'estimate' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required parameter');
    });

    it('should require task for breakdown action', async () => {
      const result = await module.execute({ action: 'breakdown' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required parameter');
    });

    it('should route track action', async () => {
      const result = await module.execute({ action: 'track' });
      expect(result).toHaveProperty('success');
    });
  });

  describe('getInfo', () => {
    it('should return module info', () => {
      const info = module.getInfo();
      expect(info.name).toBe('planning');
      expect(info.version).toBe('1.0.0');
    });
  });
});
