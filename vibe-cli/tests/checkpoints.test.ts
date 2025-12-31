/**
 * Checkpoint System Tests - v10.1 File Change Tracking
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  trackChange,
  updateChangeContent,
  createCheckpoint,
  listCheckpoints,
  getCheckpoint,
  revertCheckpoint,
  getPendingChanges,
  clearPendingChanges,
  getDiffSummary
} from '../src/core/checkpoints';

const TEST_SESSION = 'test-session-123';
const TEST_DIR = path.join(process.cwd(), '.vibe-test-checkpoints');

describe('Checkpoint System', () => {
  beforeEach(() => {
    clearPendingChanges(TEST_SESSION);
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    clearPendingChanges(TEST_SESSION);
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('trackChange', () => {
    it('should track a create change', () => {
      trackChange(TEST_SESSION, 'test.txt', 'create');
      const pending = getPendingChanges(TEST_SESSION);
      expect(pending.length).toBe(1);
      expect(pending[0].type).toBe('create');
    });

    it('should track a modify change with old content', () => {
      const testFile = path.join(TEST_DIR, 'existing.txt');
      fs.writeFileSync(testFile, 'original content');
      
      trackChange(TEST_SESSION, testFile, 'modify');
      const pending = getPendingChanges(TEST_SESSION);
      
      expect(pending.length).toBe(1);
      expect(pending[0].type).toBe('modify');
      expect(pending[0].oldContent).toBe('original content');
    });

    it('should track multiple changes', () => {
      trackChange(TEST_SESSION, 'file1.txt', 'create');
      trackChange(TEST_SESSION, 'file2.txt', 'create');
      trackChange(TEST_SESSION, 'file3.txt', 'modify');
      
      const pending = getPendingChanges(TEST_SESSION);
      expect(pending.length).toBe(3);
    });
  });

  describe('updateChangeContent', () => {
    it('should update change with new content', () => {
      trackChange(TEST_SESSION, 'test.txt', 'create');
      updateChangeContent(TEST_SESSION, 'test.txt', 'new content');
      
      const pending = getPendingChanges(TEST_SESSION);
      expect(pending[0].newContent).toBe('new content');
    });
  });

  describe('createCheckpoint', () => {
    it('should create checkpoint from pending changes', () => {
      trackChange(TEST_SESSION, 'file1.txt', 'create');
      trackChange(TEST_SESSION, 'file2.txt', 'create');
      
      const checkpoint = createCheckpoint(TEST_SESSION, 'test-checkpoint');
      
      expect(checkpoint).not.toBeNull();
      expect(checkpoint!.name).toBe('test-checkpoint');
      expect(checkpoint!.changes.length).toBe(2);
      expect(checkpoint!.sessionId).toBe(TEST_SESSION);
    });

    it('should clear pending changes after checkpoint', () => {
      trackChange(TEST_SESSION, 'file1.txt', 'create');
      createCheckpoint(TEST_SESSION);
      
      const pending = getPendingChanges(TEST_SESSION);
      expect(pending.length).toBe(0);
    });

    it('should return null if no pending changes', () => {
      const checkpoint = createCheckpoint(TEST_SESSION);
      expect(checkpoint).toBeNull();
    });
  });

  describe('listCheckpoints', () => {
    it('should list checkpoints for session', () => {
      // Use unique session ID to avoid conflicts with other tests
      const uniqueSession = `test-list-${Date.now()}`;
      
      trackChange(uniqueSession, 'file1.txt', 'create');
      createCheckpoint(uniqueSession, 'cp1');
      
      trackChange(uniqueSession, 'file2.txt', 'create');
      createCheckpoint(uniqueSession, 'cp2');
      
      const checkpoints = listCheckpoints(uniqueSession);
      expect(checkpoints.length).toBe(2);
      
      clearPendingChanges(uniqueSession);
    });
  });

  describe('getCheckpoint', () => {
    it('should retrieve checkpoint by id', () => {
      trackChange(TEST_SESSION, 'file1.txt', 'create');
      const created = createCheckpoint(TEST_SESSION, 'my-checkpoint');
      
      const retrieved = getCheckpoint(created!.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.name).toBe('my-checkpoint');
    });

    it('should return null for non-existent checkpoint', () => {
      const result = getCheckpoint('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('revertCheckpoint', () => {
    it('should revert created files by deleting them', () => {
      const testFile = path.join(TEST_DIR, 'new-file.txt');
      
      trackChange(TEST_SESSION, testFile, 'create');
      fs.writeFileSync(testFile, 'new content');
      updateChangeContent(TEST_SESSION, testFile, 'new content');
      
      const checkpoint = createCheckpoint(TEST_SESSION);
      expect(fs.existsSync(testFile)).toBe(true);
      
      const { reverted, errors } = revertCheckpoint(checkpoint!.id);
      expect(errors.length).toBe(0);
      expect(reverted.length).toBe(1);
      expect(fs.existsSync(testFile)).toBe(false);
    });

    it('should revert modified files by restoring old content', () => {
      const testFile = path.join(TEST_DIR, 'modify-test.txt');
      fs.writeFileSync(testFile, 'original');
      
      trackChange(TEST_SESSION, testFile, 'modify');
      fs.writeFileSync(testFile, 'modified');
      updateChangeContent(TEST_SESSION, testFile, 'modified');
      
      const checkpoint = createCheckpoint(TEST_SESSION);
      expect(fs.readFileSync(testFile, 'utf-8')).toBe('modified');
      
      const { reverted, errors } = revertCheckpoint(checkpoint!.id);
      expect(errors.length).toBe(0);
      expect(fs.readFileSync(testFile, 'utf-8')).toBe('original');
    });
  });

  describe('getDiffSummary', () => {
    it('should return summary of pending changes', () => {
      trackChange(TEST_SESSION, 'new.txt', 'create');
      trackChange(TEST_SESSION, 'old.txt', 'modify');
      
      const summary = getDiffSummary(TEST_SESSION);
      expect(summary).toContain('2 pending change(s)');
      expect(summary).toContain('+');
      expect(summary).toContain('~');
    });

    it('should return "No pending changes" when empty', () => {
      const summary = getDiffSummary(TEST_SESSION);
      expect(summary).toBe('No pending changes');
    });
  });
});

describe('Compatibility Contract - Checkpoints', () => {
  it('should export all required functions', async () => {
    const checkpoints = await import('../src/core/checkpoints');
    
    expect(typeof checkpoints.trackChange).toBe('function');
    expect(typeof checkpoints.updateChangeContent).toBe('function');
    expect(typeof checkpoints.createCheckpoint).toBe('function');
    expect(typeof checkpoints.listCheckpoints).toBe('function');
    expect(typeof checkpoints.getCheckpoint).toBe('function');
    expect(typeof checkpoints.revertCheckpoint).toBe('function');
    expect(typeof checkpoints.getPendingChanges).toBe('function');
    expect(typeof checkpoints.clearPendingChanges).toBe('function');
    expect(typeof checkpoints.getDiffSummary).toBe('function');
  });
});
