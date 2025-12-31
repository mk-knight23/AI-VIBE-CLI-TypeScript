import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Storage Module', () => {
  const testDir = path.join(os.tmpdir(), `vibe-storage-test-${Date.now()}`);
  const originalCwd = process.cwd();

  beforeAll(() => {
    fs.mkdirSync(path.join(testDir, '.vibe'), { recursive: true });
    process.chdir(testDir);
  });

  afterAll(() => {
    process.chdir(originalCwd);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('Database', () => {
    it('should initialize database and generate IDs', async () => {
      const { getDb, generateId, closeDb } = await import('../src/storage');
      
      const db = getDb();
      expect(db).toBeDefined();
      
      const id1 = generateId('test-');
      const id2 = generateId('test-');
      expect(id1).not.toBe(id2);
      expect(id1.startsWith('test-')).toBe(true);
      
      closeDb();
    });
  });

  describe('Sessions', () => {
    it('should create and retrieve sessions', async () => {
      const { createSession, getSession, closeDb } = await import('../src/storage');
      
      const session = createSession('gpt-4', 'openai');
      expect(session.id).toMatch(/^sess-/);
      expect(session.model).toBe('gpt-4');
      
      const retrieved = getSession(session.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(session.id);
      
      closeDb();
    });
  });

  describe('Messages', () => {
    it('should add and retrieve messages', async () => {
      const { createSession, addMessage, getMessages, getSessionTokenCount, closeDb } = await import('../src/storage');
      
      const session = createSession();
      addMessage(session.id, 'user', 'Hello', 10);
      addMessage(session.id, 'assistant', 'Hi there', 8);
      
      const messages = getMessages(session.id);
      expect(messages.length).toBe(2);
      expect(messages[0].role).toBe('user');
      
      const count = getSessionTokenCount(session.id);
      expect(count).toBe(18);
      
      closeDb();
    });
  });
});
