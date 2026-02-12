/**
 * Session Store Tests
 *
 * Tests for session persistence and storage operations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SessionStore } from '../../../../src/core/session/session-store';
import { Session, SessionStatus } from '../../../../src/core/session/session-types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { rimraf } from 'rimraf';

describe('SessionStore', () => {
  const testDataDir = '.ralph/test-sessions';
  let store: SessionStore;

  const mockSession: Session = {
    id: 'test-session-1',
    projectId: 'test-project',
    startTime: new Date('2024-01-01T10:00:00Z'),
    iterations: [],
    context: {
      task: 'Test task',
      objectives: ['Objective 1', 'Objective 2'],
      completed: [],
      inProgress: [],
      blocked: [],
      tokenCount: 0,
    },
    status: SessionStatus.ACTIVE,
    metadata: {
      author: 'Test Author',
      description: 'Test session',
      tags: ['test', 'unit-test'],
    },
  };

  beforeEach(async () => {
    // Clean up test directory
    await rimraf(testDataDir);
    store = new SessionStore({ dataDir: testDataDir });
  });

  afterEach(async () => {
    // Clean up test directory
    await rimraf(testDataDir);
  });

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      const defaultStore = new SessionStore();

      const config = defaultStore.getConfig();
      expect(config.dataDir).toBe('.ralph/sessions');
      expect(config.maxSessions).toBe(100);
    });

    it('should accept custom config', () => {
      const customStore = new SessionStore({
        dataDir: 'custom/path',
        maxSessions: 50,
      });

      const config = customStore.getConfig();
      expect(config.dataDir).toBe('custom/path');
      expect(config.maxSessions).toBe(50);
    });

    it('should create data directory on first save', async () => {
      await store.save(mockSession);

      const exists = await fs.access(testDataDir).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe('Saving Sessions', () => {
    it('should save a session', async () => {
      await store.save(mockSession);

      const filePath = path.join(testDataDir, `${mockSession.id}.json`);
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should save session data correctly', async () => {
      await store.save(mockSession);

      const loaded = await store.load(mockSession.id);
      expect(loaded).toEqual(mockSession);
    });

    it('should handle updating existing session', async () => {
      await store.save(mockSession);

      const updated = {
        ...mockSession,
        status: SessionStatus.COMPLETED,
        endTime: new Date(),
      };

      await store.save(updated);

      const loaded = await store.load(mockSession.id);
      expect(loaded?.status).toBe(SessionStatus.COMPLETED);
      expect(loaded?.endTime).toBeDefined();
    });

    it('should preserve dates across save/load', async () => {
      await store.save(mockSession);

      const loaded = await store.load(mockSession.id);
      expect(loaded?.startTime).toEqual(mockSession.startTime);
    });
  });

  describe('Loading Sessions', () => {
    it('should load a saved session', async () => {
      await store.save(mockSession);

      const loaded = await store.load(mockSession.id);
      expect(loaded).toBeDefined();
      expect(loaded?.id).toBe(mockSession.id);
    });

    it('should return null for non-existent session', async () => {
      const loaded = await store.load('non-existent');
      expect(loaded).toBeNull();
    });

    it('should load all session data', async () => {
      await store.save(mockSession);

      const loaded = await store.load(mockSession.id);
      expect(loaded).toEqual(mockSession);
    });

    it('should handle multiple sessions', async () => {
      const session2 = { ...mockSession, id: 'test-session-2' };

      await store.save(mockSession);
      await store.save(session2);

      const loaded1 = await store.load(mockSession.id);
      const loaded2 = await store.load(session2.id);

      expect(loaded1?.id).toBe(mockSession.id);
      expect(loaded2?.id).toBe(session2.id);
    });
  });

  describe('Deleting Sessions', () => {
    it('should delete a session', async () => {
      await store.save(mockSession);
      await store.delete(mockSession.id);

      const loaded = await store.load(mockSession.id);
      expect(loaded).toBeNull();
    });

    it('should handle deleting non-existent session', async () => {
      await expect(store.delete('non-existent')).resolves.toBeUndefined();
    });

    it('should not affect other sessions when deleting', async () => {
      const session2 = { ...mockSession, id: 'test-session-2' };

      await store.save(mockSession);
      await store.save(session2);
      await store.delete(mockSession.id);

      const loaded2 = await store.load(session2.id);
      expect(loaded2).toBeDefined();
    });
  });

  describe('Listing Sessions', () => {
    it('should return empty array when no sessions', async () => {
      const sessions = await store.list();
      expect(sessions).toEqual([]);
    });

    it('should list all sessions', async () => {
      await store.save(mockSession);

      const sessions = await store.list();
      expect(sessions).toHaveLength(1);
      expect(sessions[0]).toEqual(mockSession);
    });

    it('should sort sessions by start time (newest first)', async () => {
      const session1 = { ...mockSession, id: 'session-1', startTime: new Date('2024-01-01') };
      const session2 = { ...mockSession, id: 'session-2', startTime: new Date('2024-01-02') };
      const session3 = { ...mockSession, id: 'session-3', startTime: new Date('2024-01-03') };

      await store.save(session1);
      await store.save(session2);
      await store.save(session3);

      const sessions = await store.list();
      expect(sessions[0].id).toBe('session-3');
      expect(sessions[1].id).toBe('session-2');
      expect(sessions[2].id).toBe('session-1');
    });

    it('should handle large number of sessions', async () => {
      const sessions: Session[] = [];

      for (let i = 0; i < 50; i++) {
        const session = {
          ...mockSession,
          id: `session-${i}`,
          startTime: new Date(Date.now() + i * 1000),
        };
        sessions.push(session);
        await store.save(session);
      }

      const loaded = await store.list();
      expect(loaded).toHaveLength(50);
    });
  });

  describe('Active Sessions', () => {
    it('should return only active sessions', async () => {
      const activeSession = { ...mockSession, id: 'active', status: SessionStatus.ACTIVE };
      const completedSession = { ...mockSession, id: 'completed', status: SessionStatus.COMPLETED };

      await store.save(activeSession);
      await store.save(completedSession);

      const active = await store.getActiveSessions();
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe('active');
    });

    it('should return empty array when no active sessions', async () => {
      const completedSession = { ...mockSession, status: SessionStatus.COMPLETED };

      await store.save(completedSession);

      const active = await store.getActiveSessions();
      expect(active).toEqual([]);
    });
  });

  describe('Completed Sessions', () => {
    it('should return only completed sessions', async () => {
      const activeSession = { ...mockSession, id: 'active', status: SessionStatus.ACTIVE };
      const completedSession = { ...mockSession, id: 'completed', status: SessionStatus.COMPLETED };

      await store.save(activeSession);
      await store.save(completedSession);

      const completed = await store.getCompletedSessions();
      expect(completed).toHaveLength(1);
      expect(completed[0].id).toBe('completed');
    });

    it('should return empty array when no completed sessions', async () => {
      const activeSession = { ...mockSession, status: SessionStatus.ACTIVE };

      await store.save(activeSession);

      const completed = await store.getCompletedSessions();
      expect(completed).toEqual([]);
    });
  });

  describe('Cleanup', () => {
    it('should not delete sessions when under limit', async () => {
      const limitedStore = new SessionStore({
        dataDir: testDataDir,
        maxSessions: 10,
      });

      for (let i = 0; i < 5; i++) {
        const session = { ...mockSession, id: `session-${i}` };
        await limitedStore.save(session);
      }

      const deleted = await limitedStore.cleanup();
      expect(deleted).toBe(0);

      const sessions = await limitedStore.list();
      expect(sessions).toHaveLength(5);
    });

    it('should delete oldest sessions when over limit', async () => {
      const limitedStore = new SessionStore({
        dataDir: testDataDir,
        maxSessions: 3,
      });

      // Create 5 sessions with different times
      for (let i = 0; i < 5; i++) {
        const session = {
          ...mockSession,
          id: `session-${i}`,
          startTime: new Date(Date.now() + i * 1000),
          status: i < 2 ? SessionStatus.COMPLETED : SessionStatus.ACTIVE,
        };
        await limitedStore.save(session);
      }

      const deleted = await limitedStore.cleanup();
      expect(deleted).toBeGreaterThan(0);

      const sessions = await limitedStore.list();
      expect(sessions.length).toBeLessThanOrEqual(3);
    });

    it('should preserve active sessions during cleanup', async () => {
      const limitedStore = new SessionStore({
        dataDir: testDataDir,
        maxSessions: 2,
      });

      const activeSession = { ...mockSession, id: 'active', status: SessionStatus.ACTIVE };
      const completedSession = { ...mockSession, id: 'completed', status: SessionStatus.COMPLETED };

      await limitedStore.save(activeSession);
      await limitedStore.save(completedSession);

      await limitedStore.cleanup();

      const active = await limitedStore.getActiveSessions();
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe('active');
    });
  });

  describe('Configuration Management', () => {
    it('should get current config', () => {
      const config = store.getConfig();
      expect(config).toHaveProperty('dataDir');
      expect(config).toHaveProperty('maxSessions');
    });

    it('should update config', () => {
      store.updateConfig({ maxSessions: 50 });

      const config = store.getConfig();
      expect(config.maxSessions).toBe(50);
    });

    it('should preserve other config on update', () => {
      const originalDataDir = store.getConfig().dataDir;
      store.updateConfig({ maxSessions: 50 });

      expect(store.getConfig().dataDir).toBe(originalDataDir);
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted session file', async () => {
      const filePath = path.join(testDataDir, 'corrupt.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(filePath, 'invalid json{', 'utf-8');

      await expect(store.load('corrupt')).rejects.toThrow();
    });

    it('should handle concurrent saves', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        const session = { ...mockSession, id: `concurrent-${i}` };
        promises.push(store.save(session));
      }

      await expect(Promise.all(promises)).resolves.toBeDefined();
    });
  });

  describe('Data Integrity', () => {
    it('should preserve complex objects', async () => {
      const complexSession = {
        ...mockSession,
        iterations: [
          {
            number: 1,
            timestamp: new Date(),
            response: 'Test response',
            actionItems: ['Task 1', 'Task 2'],
            completion: 0.5,
            durationMs: 1000,
            errors: ['Error 1'],
          },
        ],
      };

      await store.save(complexSession);

      const loaded = await store.load(complexSession.id);
      expect(loaded).toEqual(complexSession);
    });

    it('should handle unicode characters', async () => {
      const unicodeSession = {
        ...mockSession,
        context: {
          ...mockSession.context,
          task: '🚀 Test task with emoji 𝕌𝕟𝕚𝕔𝕠𝕕𝕖',
        },
      };

      await store.save(unicodeSession);

      const loaded = await store.load(unicodeSession.id);
      expect(loaded?.context.task).toBe(unicodeSession.context.task);
    });

    it('should handle special characters in strings', async () => {
      const specialSession = {
        ...mockSession,
        context: {
          ...mockSession.context,
          task: 'Test with "quotes" and \'apostrophes\' and\nnewlines\ttabs',
        },
      };

      await store.save(specialSession);

      const loaded = await store.load(specialSession.id);
      expect(loaded?.context.task).toBe(specialSession.context.task);
    });
  });
});
