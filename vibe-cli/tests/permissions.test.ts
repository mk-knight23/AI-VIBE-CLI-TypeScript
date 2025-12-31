import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const testDir = path.join(os.tmpdir(), `vibe-perm-test-${Date.now()}`);
fs.mkdirSync(path.join(testDir, '.vibe'), { recursive: true });
process.chdir(testDir);

import { 
  getPermission, setPermission, clearSessionPermissions,
  shouldPrompt, isDenied, isAllowed
} from '../src/permissions';
import { closeDb } from '../src/storage';

describe('Permission System', () => {
  afterEach(() => {
    closeDb();
  });

  describe('Default Permissions', () => {
    it('should allow read operations by default', () => {
      expect(getPermission('read_file')).toBe('allow_session');
      expect(getPermission('list_directory')).toBe('allow_session');
      expect(getPermission('glob')).toBe('allow_session');
    });

    it('should require ask for write operations', () => {
      expect(getPermission('write_file')).toBe('ask');
      expect(getPermission('run_shell_command')).toBe('ask');
      expect(getPermission('delete_file')).toBe('ask');
    });

    it('should default to ask for unknown tools', () => {
      expect(getPermission('unknown_tool')).toBe('ask');
    });
  });

  describe('Permission Setting', () => {
    it('should set session permission', () => {
      const sessionId = 'test-session-1';
      setPermission('write_file', 'allow_session', sessionId);
      expect(getPermission('write_file', sessionId)).toBe('allow_session');
    });

    it('should set deny permission', () => {
      const sessionId = 'test-session-2';
      setPermission('run_shell_command', 'deny', sessionId);
      expect(getPermission('run_shell_command', sessionId)).toBe('deny');
    });

    it('should clear session permissions', () => {
      const sessionId = 'test-session-3';
      setPermission('write_file', 'allow_session', sessionId);
      clearSessionPermissions(sessionId);
      expect(getPermission('write_file', sessionId)).toBe('ask');
    });
  });

  describe('Permission Helpers', () => {
    it('shouldPrompt returns true for ask level', () => {
      expect(shouldPrompt('write_file')).toBe(true);
    });

    it('shouldPrompt returns false for allowed tools', () => {
      expect(shouldPrompt('read_file')).toBe(false);
    });

    it('isDenied returns true for denied tools', () => {
      const sessionId = 'test-session-4';
      setPermission('dangerous_tool', 'deny', sessionId);
      expect(isDenied('dangerous_tool', sessionId)).toBe(true);
    });

    it('isAllowed returns true for allowed tools', () => {
      expect(isAllowed('read_file')).toBe(true);
    });
  });
});
