/**
 * Session Manager Tests
 *
 * Tests for session lifecycle and orchestration.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SessionManager } from '../../../../src/core/session/session-manager';
import { SessionStatus } from '../../../../src/core/session/session-types';
import * as fs from 'fs/promises';
import { rimraf } from 'rimraf';

describe('SessionManager', () => {
  const testDataDir = '.ralph/test-sessions-mgr';
  let manager: SessionManager;

  beforeEach(async () => {
    await rimraf(testDataDir);
    manager = new SessionManager(testDataDir);
  });

  afterEach(async () => {
    await rimraf(testDataDir);
  });

  describe('Creating Sessions', () => {
    it('should create a new session', async () => {
      const session = await manager.createSession({
        projectId: 'test-project',
        task: 'Implement feature',
      });

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.projectId).toBe('test-project');
      expect(session.context.task).toBe('Implement feature');
      expect(session.status).toBe(SessionStatus.ACTIVE);
    });

    it('should set current session', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      const current = manager.getCurrentSession();
      expect(current).toBeDefined();
      expect(current?.status).toBe(SessionStatus.ACTIVE);
    });

    it('should accept objectives', async () => {
      const session = await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
        objectives: ['Obj 1', 'Obj 2'],
      });

      expect(session.context.objectives).toEqual(['Obj 1', 'Obj 2']);
    });

    it('should accept metadata', async () => {
      const session = await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
        metadata: {
          author: 'Test Author',
          tags: ['test'],
          priority: 'high',
        },
      });

      expect(session.metadata.author).toBe('Test Author');
      expect(session.metadata.tags).toEqual(['test']);
      expect(session.metadata.priority).toBe('high');
    });

    it('should generate unique session IDs', async () => {
      const session1 = await manager.createSession({
        projectId: 'test-project',
        task: 'Task 1',
      });

      const session2 = await manager.createSession({
        projectId: 'test-project',
        task: 'Task 2',
      });

      expect(session1.id).not.toBe(session2.id);
    });
  });

  describe('Loading Sessions', () => {
    it('should load an existing session', async () => {
      const created = await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      // Create new manager to test persistence
      const newManager = new SessionManager(testDataDir);
      const loaded = await newManager.loadSession(created.id);

      expect(loaded).toBeDefined();
      expect(loaded?.id).toBe(created.id);
      expect(loaded?.context.task).toBe('Test task');
    });

    it('should return null for non-existent session', async () => {
      const loaded = await manager.loadSession('non-existent');

      expect(loaded).toBeNull();
    });

    it('should set as current session', async () => {
      const created = await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      const newManager = new SessionManager(testDataDir);
      await newManager.loadSession(created.id);

      expect(newManager.getCurrentSession()?.id).toBe(created.id);
    });
  });

  describe('Getting Current Session', () => {
    it('should return undefined when no current session', () => {
      const current = manager.getCurrentSession();

      expect(current).toBeUndefined();
    });

    it('should return current session', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      const current = manager.getCurrentSession();

      expect(current).toBeDefined();
    });
  });

  describe('Adding Iterations', () => {
    it('should add iteration to session', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      const iteration = await manager.addIteration({
        response: 'Working on it',
      });

      expect(iteration.number).toBe(1);
      expect(iteration.response).toBe('Working on it');
    });

    it('should require active session', async () => {
      await expect(manager.addIteration({
        response: 'Test',
      })).rejects.toThrow('No active session');
    });

    it('should increment iteration numbers', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      await manager.addIteration({ response: 'Iter 1' });
      await manager.addIteration({ response: 'Iter 2' });

      const current = manager.getCurrentSession();
      expect(current?.iterations).toHaveLength(2);
      expect(current?.iterations[1].number).toBe(2);
    });

    it('should accept action items', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      await manager.addIteration({
        response: 'Done',
        actionItems: ['Task 1', 'Task 2'],
      });

      const current = manager.getCurrentSession();
      expect(current?.iterations[0].actionItems).toEqual(['Task 1', 'Task 2']);
    });

    it('should accept completion percentage', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      await manager.addIteration({
        response: 'Half done',
        completion: 0.5,
      });

      const current = manager.getCurrentSession();
      expect(current?.iterations[0].completion).toBe(0.5);
    });

    it('should accept duration', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      await manager.addIteration({
        response: 'Done',
        durationMs: 5000,
      });

      const current = manager.getCurrentSession();
      expect(current?.iterations[0].durationMs).toBe(5000);
    });

    it('should accept errors', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      await manager.addIteration({
        response: 'Failed',
        errors: ['Error 1', 'Error 2'],
      });

      const current = manager.getCurrentSession();
      expect(current?.iterations[0].errors).toEqual(['Error 1', 'Error 2']);
    });

    it('should persist iterations', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      await manager.addIteration({ response: 'Test' });

      const newManager = new SessionManager(testDataDir);
      await newManager.loadSession(manager.getCurrentSession()!.id);

      expect(newManager.getCurrentSession()?.iterations).toHaveLength(1);
    });
  });

  describe('Completing Sessions', () => {
    it('should complete current session', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      const completed = await manager.completeSession();

      expect(completed.status).toBe(SessionStatus.COMPLETED);
      expect(completed.endTime).toBeDefined();
    });

    it('should require active session', async () => {
      await expect(manager.completeSession()).rejects.toThrow('No active session');
    });

    it('should accept custom summary', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      const summary = 'Custom summary';
      const completed = await manager.completeSession(summary);

      expect(completed.context.summary).toBe(summary);
    });

    it('should generate summary if not provided', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      await manager.addIteration({ response: 'Done', completion: 1 });

      const completed = await manager.completeSession();

      expect(completed.context.summary).toBeDefined();
    });

    it('should clear current session', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      await manager.completeSession();

      expect(manager.getCurrentSession()).toBeUndefined();
    });

    it('should persist completion', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      await manager.completeSession();

      const newManager = new SessionManager(testDataDir);
      const sessions = await newManager.listSessions();

      expect(sessions[0].status).toBe(SessionStatus.COMPLETED);
    });
  });

  describe('Pausing Sessions', () => {
    it('should pause current session', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      const paused = await manager.pauseSession();

      expect(paused.status).toBe(SessionStatus.PAUSED);
    });

    it('should keep as current session', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      await manager.pauseSession();

      expect(manager.getCurrentSession()?.status).toBe(SessionStatus.PAUSED);
    });

    it('should require active session', async () => {
      await expect(manager.pauseSession()).rejects.toThrow('No active session');
    });
  });

  describe('Resuming Sessions', () => {
    it('should resume paused session', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      await manager.pauseSession();

      const sessionId = manager.getCurrentSession()!.id;
      const resumed = await manager.resumeSession(sessionId);

      expect(resumed.status).toBe(SessionStatus.ACTIVE);
    });

    it('should fail to resume active session', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      const sessionId = manager.getCurrentSession()!.id;

      await expect(manager.resumeSession(sessionId)).rejects.toThrow('not paused');
    });

    it('should fail to resume non-existent session', async () => {
      await expect(manager.resumeSession('non-existent')).rejects.toThrow('not found');
    });

    it('should set as current session', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      const sessionId = manager.getCurrentSession()!.id;
      await manager.pauseSession();

      const newManager = new SessionManager(testDataDir);
      await newManager.resumeSession(sessionId);

      expect(newManager.getCurrentSession()?.id).toBe(sessionId);
    });
  });

  describe('Cancelling Sessions', () => {
    it('should cancel current session', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      const cancelled = await manager.cancelSession();

      expect(cancelled.status).toBe(SessionStatus.CANCELLED);
      expect(cancelled.endTime).toBeDefined();
    });

    it('should accept cancellation reason', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      const reason = 'User requested cancellation';
      const cancelled = await manager.cancelSession(reason);

      expect(cancelled.context.summary).toBe(reason);
    });

    it('should clear current session', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      await manager.cancelSession();

      expect(manager.getCurrentSession()).toBeUndefined();
    });

    it('should require active session', async () => {
      await expect(manager.cancelSession()).rejects.toThrow('No active session');
    });
  });

  describe('Task Status Management', () => {
    it('should mark task as completed', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
        objectives: ['Task 1', 'Task 2'],
      });

      await manager.markTaskCompleted('Task 1');

      const current = manager.getCurrentSession();
      expect(current?.context.completed).toContain('Task 1');
    });

    it('should remove from in progress when completed', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      await manager.addIteration({
        response: 'Test',
        actionItems: ['Task 1'],
      });

      await manager.markTaskCompleted('Task 1');

      const current = manager.getCurrentSession();
      expect(current?.context.inProgress).not.toContain('Task 1');
      expect(current?.context.completed).toContain('Task 1');
    });

    it('should mark task as blocked', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      await manager.addIteration({
        response: 'Test',
        actionItems: ['Task 1'],
      });

      await manager.markTaskBlocked('Task 1');

      const current = manager.getCurrentSession();
      expect(current?.context.blocked).toContain('Task 1');
    });

    it('should remove from in progress when blocked', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      await manager.addIteration({
        response: 'Test',
        actionItems: ['Task 1'],
      });

      await manager.markTaskBlocked('Task 1');

      const current = manager.getCurrentSession();
      expect(current?.context.inProgress).not.toContain('Task 1');
    });

    it('should require active session', async () => {
      await expect(manager.markTaskCompleted('Task 1')).rejects.toThrow('No active session');
      await expect(manager.markTaskBlocked('Task 1')).rejects.toThrow('No active session');
    });
  });

  describe('Getting Context', () => {
    it('should build context for current session', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
        objectives: ['Obj 1'],
      });

      const context = manager.getContext();

      expect(context).toContain('Test task');
      expect(context).toContain('Obj 1');
    });

    it('should require active session', async () => {
      expect(() => manager.getContext()).toThrow('No active session');
    });

    it('should include iterations in context', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      await manager.addIteration({ response: 'Iteration 1' });

      const context = manager.getContext();

      expect(context).toContain('Iteration 1');
    });
  });

  describe('Listing Sessions', () => {
    it('should return empty array when no sessions', async () => {
      const sessions = await manager.listSessions();

      expect(sessions).toEqual([]);
    });

    it('should list all sessions', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Task 1',
      });

      await manager.completeSession();

      await manager.createSession({
        projectId: 'test-project',
        task: 'Task 2',
      });

      const sessions = await manager.listSessions();

      expect(sessions).toHaveLength(2);
    });

    it('should list active sessions', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Active task',
      });

      await manager.createSession({
        projectId: 'test-project',
        task: 'Task 2',
      });
      await manager.completeSession();

      const active = await manager.listActiveSessions();

      expect(active).toHaveLength(1);
      expect(active[0].context.task).toBe('Active task');
    });

    it('should list completed sessions', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Task 1',
      });
      await manager.completeSession();

      await manager.createSession({
        projectId: 'test-project',
        task: 'Task 2',
      });
      await manager.completeSession();

      const completed = await manager.listCompletedSessions();

      expect(completed).toHaveLength(2);
    });
  });

  describe('Deleting Sessions', () => {
    it('should delete a session', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      const sessionId = manager.getCurrentSession()!.id;

      await manager.deleteSession(sessionId);

      const sessions = await manager.listSessions();
      expect(sessions).toHaveLength(0);
    });

    it('should clear current session if deleted', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      const sessionId = manager.getCurrentSession()!.id;

      await manager.deleteSession(sessionId);

      expect(manager.getCurrentSession()).toBeUndefined();
    });

    it('should not affect current session if different deleted', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Task 1',
      });
      const firstId = manager.getCurrentSession()!.id;

      await manager.completeSession();

      await manager.createSession({
        projectId: 'test-project',
        task: 'Task 2',
      });

      await manager.deleteSession(firstId);

      expect(manager.getCurrentSession()).toBeDefined();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup old sessions', async () => {
      const limitedManager = new SessionManager(testDataDir);

      // Create and complete sessions
      for (let i = 0; i < 5; i++) {
        await limitedManager.createSession({
          projectId: 'test-project',
          task: `Task ${i}`,
        });
        await limitedManager.completeSession();
      }

      const deleted = await limitedManager.cleanup();

      expect(deleted).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Accessing Components', () => {
    it('should provide access to store', () => {
      const store = manager.getStore();

      expect(store).toBeDefined();
    });

    it('should provide access to context builder', () => {
      const builder = manager.getContextBuilder();

      expect(builder).toBeDefined();
    });
  });

  describe('Persistence', () => {
    it('should persist sessions across manager instances', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      const sessionId = manager.getCurrentSession()!.id;

      const newManager = new SessionManager(testDataDir);
      await newManager.loadSession(sessionId);

      expect(newManager.getCurrentSession()?.context.task).toBe('Test task');
    });

    it('should persist iterations', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      await manager.addIteration({ response: 'Iter 1' });

      const sessionId = manager.getCurrentSession()!.id;

      const newManager = new SessionManager(testDataDir);
      await newManager.loadSession(sessionId);

      expect(newManager.getCurrentSession()?.iterations).toHaveLength(1);
    });

    it('should persist task status changes', async () => {
      await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
      });

      await manager.markTaskCompleted('Task 1');

      const sessionId = manager.getCurrentSession()!.id;

      const newManager = new SessionManager(testDataDir);
      await newManager.loadSession(sessionId);

      expect(newManager.getCurrentSession()?.context.completed).toContain('Task 1');
    });
  });

  describe('Error Handling', () => {
    it('should handle creating session with invalid data', async () => {
      const session = await manager.createSession({
        projectId: '',
        task: '',
      });

      expect(session).toBeDefined();
    });

    it('should handle empty objectives', async () => {
      const session = await manager.createSession({
        projectId: 'test-project',
        task: 'Test task',
        objectives: [],
      });

      expect(session.context.objectives).toEqual([]);
    });
  });
});
