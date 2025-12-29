/**
 * Safe Agent System Tests - P0
 * Tests for v10 core feature: Plan → Propose → Wait → Execute → Verify → Report
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SafeAgent, classifyAction, AgentPlan, AgentAction } from '../../src/core/safe-agent';

describe('SafeAgent', () => {
  let agent: SafeAgent;

  beforeEach(() => {
    agent = new SafeAgent({ autoApproveReads: true, dryRun: false });
  });

  describe('createPlan', () => {
    it('should create plan with unique step IDs', () => {
      const plan = agent.createPlan('Test goal', [
        { tool: 'read_file', description: 'Read file', params: { path: 'test.ts' }, type: 'read', riskLevel: 'safe' },
        { tool: 'write_file', description: 'Write file', params: { file_path: 'test.ts', content: 'x' }, type: 'write', riskLevel: 'low' },
      ]);

      expect(plan.id).toMatch(/^plan-\d+$/);
      expect(plan.goal).toBe('Test goal');
      expect(plan.steps).toHaveLength(2);
      expect(plan.steps[0].id).toBe('step-0');
      expect(plan.steps[1].id).toBe('step-1');
      expect(plan.status).toBe('pending');
    });

    it('should set createdAt timestamp', () => {
      const plan = agent.createPlan('Test', []);
      expect(plan.createdAt).toBeDefined();
      expect(new Date(plan.createdAt).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('classifyAction', () => {
    it('should classify read_file as safe read', () => {
      const result = classifyAction('read_file', {});
      expect(result.type).toBe('read');
      expect(result.riskLevel).toBe('safe');
    });

    it('should classify list_directory as safe read', () => {
      const result = classifyAction('list_directory', {});
      expect(result.type).toBe('read');
      expect(result.riskLevel).toBe('safe');
    });

    it('should classify write_file as low-risk write', () => {
      const result = classifyAction('write_file', { file_path: 'test.ts', content: 'x' });
      expect(result.type).toBe('write');
      expect(result.riskLevel).toBe('low');
    });

    it('should classify git_status as safe read', () => {
      const result = classifyAction('git_status', {});
      expect(result.type).toBe('read');
      expect(result.riskLevel).toBe('safe');
    });

    it('should classify git_push as medium-risk git', () => {
      const result = classifyAction('git_push', {});
      expect(result.type).toBe('git');
      expect(result.riskLevel).toBe('medium');
    });

    it('should validate shell commands', () => {
      const safeResult = classifyAction('run_shell_command', { command: 'ls -la' });
      expect(safeResult.type).toBe('shell');
      expect(safeResult.riskLevel).toBe('safe');

      const dangerousResult = classifyAction('run_shell_command', { command: 'rm -rf /' });
      expect(dangerousResult.riskLevel).toBe('blocked');
    });
  });

  describe('waitForApproval', () => {
    it('should auto-approve read-only plans', async () => {
      const plan = agent.createPlan('Read files', [
        { tool: 'read_file', description: 'Read', params: {}, type: 'read', riskLevel: 'safe', id: 'step-0' },
      ]);

      const promptFn = vi.fn().mockResolvedValue(false);
      const result = await agent.waitForApproval(plan, promptFn);

      expect(result).toBe(true);
      expect(promptFn).not.toHaveBeenCalled();
    });

    it('should reject plans with blocked actions', async () => {
      const plan = agent.createPlan('Dangerous', [
        { tool: 'run_shell_command', description: 'Bad', params: {}, type: 'shell', riskLevel: 'blocked', id: 'step-0' },
      ]);

      const promptFn = vi.fn().mockResolvedValue(true);
      const result = await agent.waitForApproval(plan, promptFn);

      expect(result).toBe(false);
      expect(promptFn).not.toHaveBeenCalled();
    });

    it('should prompt for write operations', async () => {
      const plan = agent.createPlan('Write file', [
        { tool: 'write_file', description: 'Write', params: {}, type: 'write', riskLevel: 'low', id: 'step-0' },
      ]);

      const promptFn = vi.fn().mockResolvedValue(true);
      const result = await agent.waitForApproval(plan, promptFn);

      expect(result).toBe(true);
      expect(promptFn).toHaveBeenCalled();
    });

    it('should respect user rejection', async () => {
      const plan = agent.createPlan('Write file', [
        { tool: 'write_file', description: 'Write', params: {}, type: 'write', riskLevel: 'low', id: 'step-0' },
      ]);

      const promptFn = vi.fn().mockResolvedValue(false);
      const result = await agent.waitForApproval(plan, promptFn);

      expect(result).toBe(false);
    });

    it('should block writes in dry-run mode', async () => {
      const dryAgent = new SafeAgent({ dryRun: true });
      const plan = dryAgent.createPlan('Write file', [
        { tool: 'write_file', description: 'Write', params: {}, type: 'write', riskLevel: 'low', id: 'step-0' },
      ]);

      const promptFn = vi.fn().mockResolvedValue(true);
      const result = await dryAgent.waitForApproval(plan, promptFn);

      expect(result).toBe(false);
    });
  });

  describe('executeStep', () => {
    it('should execute step and return success', async () => {
      const step: AgentAction = {
        id: 'step-0',
        tool: 'read_file',
        description: 'Read test file',
        params: { path: 'test.ts' },
        type: 'read',
        riskLevel: 'safe',
      };

      const executor = vi.fn().mockResolvedValue('file content');
      const result = await agent.executeStep(step, executor);

      expect(result.success).toBe(true);
      expect(result.result).toBe('file content');
      expect(executor).toHaveBeenCalledWith('read_file', { path: 'test.ts' });
    });

    it('should capture error on failure', async () => {
      const step: AgentAction = {
        id: 'step-0',
        tool: 'read_file',
        description: 'Read missing file',
        params: { path: 'missing.ts' },
        type: 'read',
        riskLevel: 'safe',
      };

      const executor = vi.fn().mockRejectedValue(new Error('File not found'));
      const result = await agent.executeStep(step, executor);

      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
    });

    it('should not execute if cancelled', async () => {
      agent.cancel();

      const step: AgentAction = {
        id: 'step-0',
        tool: 'read_file',
        description: 'Read',
        params: {},
        type: 'read',
        riskLevel: 'safe',
      };

      const executor = vi.fn();
      const result = await agent.executeStep(step, executor);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cancelled by user');
      expect(executor).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should set cancelled state', () => {
      expect(agent.isCancelled()).toBe(false);
      agent.cancel();
      expect(agent.isCancelled()).toBe(true);
    });
  });

  describe('rollback', () => {
    it('should track rollback count', async () => {
      expect(agent.getRollbackCount()).toBe(0);
      // Rollback stack is populated during executeStep for write operations
    });
  });
});

describe('SafeAgent Rollback', () => {
  it('should capture file state before write', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    
    const tmpDir = os.tmpdir();
    const testFile = path.join(tmpDir, `vibe-test-${Date.now()}.txt`);
    
    // Create initial file
    fs.writeFileSync(testFile, 'original content');
    
    const agent = new SafeAgent();
    const step: AgentAction = {
      id: 'step-0',
      tool: 'write_file',
      description: 'Overwrite file',
      params: { file_path: testFile, content: 'new content' },
      type: 'write',
      riskLevel: 'low',
    };

    const executor = vi.fn().mockImplementation(async (tool, params) => {
      fs.writeFileSync(params.file_path, params.content);
      return 'written';
    });

    await agent.executeStep(step, executor);
    
    // File should be changed
    expect(fs.readFileSync(testFile, 'utf8')).toBe('new content');
    expect(agent.getRollbackCount()).toBe(1);

    // Rollback should restore
    await agent.rollback();
    expect(fs.readFileSync(testFile, 'utf8')).toBe('original content');
    expect(agent.getRollbackCount()).toBe(0);

    // Cleanup
    fs.unlinkSync(testFile);
  });

  it('should delete new files on rollback', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    
    const tmpDir = os.tmpdir();
    const testFile = path.join(tmpDir, `vibe-new-${Date.now()}.txt`);
    
    // Ensure file doesn't exist
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
    
    const agent = new SafeAgent();
    const step: AgentAction = {
      id: 'step-0',
      tool: 'write_file',
      description: 'Create new file',
      params: { file_path: testFile, content: 'new file' },
      type: 'write',
      riskLevel: 'low',
    };

    const executor = vi.fn().mockImplementation(async (tool, params) => {
      fs.writeFileSync(params.file_path, params.content);
      return 'created';
    });

    await agent.executeStep(step, executor);
    
    expect(fs.existsSync(testFile)).toBe(true);
    expect(agent.getRollbackCount()).toBe(1);

    await agent.rollback();
    expect(fs.existsSync(testFile)).toBe(false);
  });

  it('should rollback in reverse order', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    
    const tmpDir = os.tmpdir();
    const file1 = path.join(tmpDir, `vibe-order1-${Date.now()}.txt`);
    const file2 = path.join(tmpDir, `vibe-order2-${Date.now()}.txt`);
    
    fs.writeFileSync(file1, 'v1');
    fs.writeFileSync(file2, 'v1');
    
    const agent = new SafeAgent();
    const executor = vi.fn().mockImplementation(async (tool, params) => {
      fs.writeFileSync(params.file_path, params.content);
    });

    // Write to file1, then file2
    await agent.executeStep({
      id: 's1', tool: 'write_file', description: '', 
      params: { file_path: file1, content: 'v2' }, type: 'write', riskLevel: 'low'
    }, executor);
    
    await agent.executeStep({
      id: 's2', tool: 'write_file', description: '',
      params: { file_path: file2, content: 'v2' }, type: 'write', riskLevel: 'low'
    }, executor);

    expect(agent.getRollbackCount()).toBe(2);
    
    // Rollback should restore both
    await agent.rollback();
    
    expect(fs.readFileSync(file1, 'utf8')).toBe('v1');
    expect(fs.readFileSync(file2, 'utf8')).toBe('v1');

    fs.unlinkSync(file1);
    fs.unlinkSync(file2);
  });
});
