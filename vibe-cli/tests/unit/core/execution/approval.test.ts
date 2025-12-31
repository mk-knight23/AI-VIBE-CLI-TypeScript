/**
 * Audit & Approval System Tests - v10.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  queueForApproval,
  getPendingApprovals,
  approveOperation,
  approveAll,
  denyOperation,
  denyAll,
  clearApprovalQueue,
  formatPendingApprovals
} from '../../../../src/permissions';

const TEST_SESSION = 'test-audit-session';

describe('Batch Approval System', () => {
  beforeEach(() => {
    clearApprovalQueue(TEST_SESSION);
  });

  describe('queueForApproval', () => {
    it('should add operation to queue', () => {
      const id = queueForApproval(TEST_SESSION, 'write_file', 'Create test.txt', 'medium');
      expect(id).toBeTruthy();
      
      const pending = getPendingApprovals(TEST_SESSION);
      expect(pending.length).toBe(1);
      expect(pending[0].tool).toBe('write_file');
    });

    it('should queue multiple operations', () => {
      queueForApproval(TEST_SESSION, 'write_file', 'Create file1.txt', 'medium');
      queueForApproval(TEST_SESSION, 'run_shell_command', 'npm install', 'high');
      queueForApproval(TEST_SESSION, 'delete_file', 'Remove old.txt', 'high');
      
      const pending = getPendingApprovals(TEST_SESSION);
      expect(pending.length).toBe(3);
    });

    it('should include path when provided', () => {
      queueForApproval(TEST_SESSION, 'write_file', 'Create config', 'medium', '/etc/config');
      
      const pending = getPendingApprovals(TEST_SESSION);
      expect(pending[0].path).toBe('/etc/config');
    });
  });

  describe('approveOperation', () => {
    it('should approve specific operation', () => {
      const id = queueForApproval(TEST_SESSION, 'write_file', 'Test', 'medium');
      
      const result = approveOperation(TEST_SESSION, id);
      expect(result).toBe(true);
      
      const pending = getPendingApprovals(TEST_SESSION);
      expect(pending.length).toBe(0);
    });

    it('should return false for non-existent operation', () => {
      const result = approveOperation(TEST_SESSION, 'non-existent');
      expect(result).toBe(false);
    });
  });

  describe('approveAll', () => {
    it('should approve all pending operations', () => {
      queueForApproval(TEST_SESSION, 'write_file', 'File 1', 'medium');
      queueForApproval(TEST_SESSION, 'write_file', 'File 2', 'medium');
      queueForApproval(TEST_SESSION, 'write_file', 'File 3', 'medium');
      
      const count = approveAll(TEST_SESSION);
      expect(count).toBe(3);
      
      const pending = getPendingApprovals(TEST_SESSION);
      expect(pending.length).toBe(0);
    });

    it('should return 0 when no pending operations', () => {
      const count = approveAll(TEST_SESSION);
      expect(count).toBe(0);
    });
  });

  describe('denyOperation', () => {
    it('should deny specific operation', () => {
      const id = queueForApproval(TEST_SESSION, 'delete_file', 'Remove important', 'high');
      
      const result = denyOperation(TEST_SESSION, id);
      expect(result).toBe(true);
      
      const pending = getPendingApprovals(TEST_SESSION);
      expect(pending.length).toBe(0);
    });
  });

  describe('denyAll', () => {
    it('should deny all pending operations', () => {
      queueForApproval(TEST_SESSION, 'write_file', 'File 1', 'medium');
      queueForApproval(TEST_SESSION, 'delete_file', 'File 2', 'high');
      
      const count = denyAll(TEST_SESSION);
      expect(count).toBe(2);
      
      const pending = getPendingApprovals(TEST_SESSION);
      expect(pending.length).toBe(0);
    });
  });

  describe('formatPendingApprovals', () => {
    it('should format empty queue', () => {
      const output = formatPendingApprovals(TEST_SESSION);
      expect(output).toBe('No pending approvals');
    });

    it('should format pending operations', () => {
      queueForApproval(TEST_SESSION, 'write_file', 'Create config.json', 'medium');
      queueForApproval(TEST_SESSION, 'run_shell_command', 'npm install', 'high');
      
      const output = formatPendingApprovals(TEST_SESSION);
      expect(output).toContain('2 operation(s)');
      expect(output).toContain('write_file');
      expect(output).toContain('run_shell_command');
      expect(output).toContain('🟠'); // medium risk
      expect(output).toContain('🔴'); // high risk
    });
  });
});

describe('Audit Logger Enhanced', () => {
  it('should export AuditLogger with new methods', async () => {
    const { AuditLogger, getAuditLogger } = await import('../../../../src/core/security');
    
    const logger = getAuditLogger();
    expect(typeof logger.getStats).toBe('function');
    expect(typeof logger.resetStats).toBe('function');
    expect(typeof logger.getByTool).toBe('function');
    expect(typeof logger.getByRisk).toBe('function');
    expect(typeof logger.exportLog).toBe('function');
  });

  it('should track stats', async () => {
    const { AuditLogger } = await import('../../../../src/core/security');
    const logger = new AuditLogger();
    logger.resetStats();
    
    logger.log({ action: 'test_tool', riskLevel: 'safe', approved: true });
    logger.log({ action: 'test_tool', riskLevel: 'medium', approved: false });
    
    const stats = logger.getStats();
    expect(stats.totalCalls).toBe(2);
    expect(stats.approved).toBe(1);
    expect(stats.denied).toBe(1);
    expect(stats.byRisk.safe).toBe(1);
    expect(stats.byRisk.medium).toBe(1);
  });
});

describe('Compatibility Contract - Audit & Approval', () => {
  it('should export all approval functions', async () => {
    const perms = await import('../../../../src/permissions');
    
    expect(typeof perms.queueForApproval).toBe('function');
    expect(typeof perms.getPendingApprovals).toBe('function');
    expect(typeof perms.approveOperation).toBe('function');
    expect(typeof perms.approveAll).toBe('function');
    expect(typeof perms.denyOperation).toBe('function');
    expect(typeof perms.denyAll).toBe('function');
    expect(typeof perms.clearApprovalQueue).toBe('function');
    expect(typeof perms.formatPendingApprovals).toBe('function');
  });

  it('should export singleton audit logger', async () => {
    const { getAuditLogger } = await import('../../../../src/core/security');
    
    const logger1 = getAuditLogger();
    const logger2 = getAuditLogger();
    expect(logger1).toBe(logger2);
  });
});
