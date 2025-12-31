import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const testDir = path.join(os.tmpdir(), `vibe-compact-test-${Date.now()}`);
fs.mkdirSync(path.join(testDir, '.vibe'), { recursive: true });
process.chdir(testDir);

import { shouldCompact, getSessionHistory } from '../src/compact';
import { createSession, getSession, closeDb } from '../src/storage';
import { addMessage } from '../src/storage/messages';

describe('Auto-Compact', () => {
  afterEach(() => {
    closeDb();
  });

  describe('shouldCompact', () => {
    it('should return false for empty session', () => {
      const session = createSession();
      expect(shouldCompact(session.id)).toBe(false);
    });

    it('should return false below threshold', () => {
      const session = createSession();
      addMessage(session.id, 'user', 'Hello', 100);
      expect(shouldCompact(session.id, { threshold: 0.8, contextWindow: 1000 })).toBe(false);
    });

    it('should return true above threshold', () => {
      const session = createSession();
      addMessage(session.id, 'user', 'x'.repeat(1000), 900);
      expect(shouldCompact(session.id, { threshold: 0.8, contextWindow: 1000 })).toBe(true);
    });

    it('should return false for non-existent session', () => {
      expect(shouldCompact('non-existent')).toBe(false);
    });
  });

  describe('getSessionHistory', () => {
    it('should return single session for new session', () => {
      const session = createSession();
      const history = getSessionHistory(session.id);
      expect(history.length).toBe(1);
      expect(history[0].id).toBe(session.id);
    });

    it('should return chain for compacted sessions', () => {
      const parent = createSession();
      const child = createSession('model', 'provider', parent.id);
      
      const history = getSessionHistory(child.id);
      expect(history.length).toBe(2);
      expect(history[0].id).toBe(parent.id);
      expect(history[1].id).toBe(child.id);
    });
  });
});
