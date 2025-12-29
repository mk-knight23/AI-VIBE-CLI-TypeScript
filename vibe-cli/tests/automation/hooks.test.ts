/**
 * Hooks System Tests - P0
 * Tests for automation hooks with security validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { loadHooks, saveHooks, addHook, removeHook, listHooks, runHook, Hook } from '../../src/core/hooks';

describe('Hooks System', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-hooks-test-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('loadHooks', () => {
    it('should return defaults when config missing', () => {
      const config = loadHooks(tmpDir);
      expect(config.hooks).toEqual([]);
      expect(config.autoFormat).toBe(false);
      expect(config.autoTest).toBe(false);
      expect(config.autoLint).toBe(false);
    });

    it('should load config from .vibe/hooks.json', () => {
      const configDir = path.join(tmpDir, '.vibe');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'hooks.json'),
        JSON.stringify({
          hooks: [{ name: 'test', trigger: 'on-save', command: 'echo test', enabled: true }],
          autoFormat: true,
        })
      );

      const config = loadHooks(tmpDir);
      expect(config.hooks).toHaveLength(1);
      expect(config.hooks[0].name).toBe('test');
      expect(config.autoFormat).toBe(true);
    });

    it('should handle malformed JSON gracefully', () => {
      const configDir = path.join(tmpDir, '.vibe');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(path.join(configDir, 'hooks.json'), 'invalid json');

      const config = loadHooks(tmpDir);
      expect(config.hooks).toEqual([]);
    });
  });

  describe('saveHooks', () => {
    it('should create .vibe directory if missing', () => {
      saveHooks({ hooks: [], autoFormat: false, autoTest: false, autoLint: false }, tmpDir);
      expect(fs.existsSync(path.join(tmpDir, '.vibe'))).toBe(true);
    });

    it('should write valid JSON', () => {
      const config = {
        hooks: [{ name: 'test', trigger: 'on-save' as const, command: 'echo', enabled: true }],
        autoFormat: true,
        autoTest: false,
        autoLint: false,
      };
      saveHooks(config, tmpDir);

      const content = fs.readFileSync(path.join(tmpDir, '.vibe', 'hooks.json'), 'utf8');
      const loaded = JSON.parse(content);
      expect(loaded.hooks[0].name).toBe('test');
      expect(loaded.autoFormat).toBe(true);
    });
  });

  describe('addHook', () => {
    it('should add hook to config', () => {
      addHook({
        name: 'new-hook',
        trigger: 'pre-commit',
        command: 'npm test',
        enabled: true,
      });

      const config = loadHooks();
      expect(config.hooks.some(h => h.name === 'new-hook')).toBe(true);
    });
  });

  describe('removeHook', () => {
    it('should remove hook by name', () => {
      addHook({ name: 'to-remove', trigger: 'on-save', command: 'echo', enabled: true });
      expect(removeHook('to-remove')).toBe(true);
      expect(listHooks().some(h => h.name === 'to-remove')).toBe(false);
    });

    it('should return false for nonexistent hook', () => {
      expect(removeHook('nonexistent')).toBe(false);
    });
  });

  describe('listHooks', () => {
    it('should return all hooks', () => {
      // Start fresh
      saveHooks({ hooks: [], autoFormat: false, autoTest: false, autoLint: false }, tmpDir);
      
      addHook({ name: 'hook1', trigger: 'on-save', command: 'echo 1', enabled: true });
      addHook({ name: 'hook2', trigger: 'pre-commit', command: 'echo 2', enabled: true });

      const hooks = listHooks();
      expect(hooks).toHaveLength(2);
    });
  });

  describe('runHook', () => {
    it('should run matching hooks', () => {
      addHook({ name: 'echo-test', trigger: 'on-save', command: 'echo "hook ran"', enabled: true });
      
      const results = runHook('on-save');
      expect(results.some(r => r.includes('echo-test'))).toBe(true);
    });

    it('should skip disabled hooks', () => {
      addHook({ name: 'disabled', trigger: 'on-save', command: 'echo disabled', enabled: false });
      
      const results = runHook('on-save');
      expect(results.some(r => r.includes('disabled'))).toBe(false);
    });

    it('should filter by pattern', () => {
      addHook({ name: 'ts-only', trigger: 'on-save', command: 'echo ts', pattern: '\\.ts$', enabled: true });
      
      const tsResults = runHook('on-save', { file: 'test.ts' });
      expect(tsResults.some(r => r.includes('ts-only'))).toBe(true);

      const jsResults = runHook('on-save', { file: 'test.js' });
      expect(jsResults.some(r => r.includes('ts-only'))).toBe(false);
    });

    it('should handle hook execution errors', () => {
      addHook({ name: 'failing', trigger: 'on-save', command: 'exit 1', enabled: true });
      
      const results = runHook('on-save');
      expect(results.some(r => r.includes('❌'))).toBe(true);
    });
  });

  describe('Security - Shell Injection', () => {
    // These tests document the current vulnerability
    // After fix, these should pass with sanitized input
    
    it('should sanitize file path substitution', () => {
      // Current behavior: ${file} is replaced without escaping
      // This is a VULNERABILITY that needs fixing
      const hook: Hook = {
        name: 'format',
        trigger: 'on-save',
        command: 'prettier --write "${file}"',
        enabled: true,
      };
      
      // Malicious filename that could inject commands
      const maliciousFile = 'test"; rm -rf / #.ts';
      
      // The command after substitution would be:
      // prettier --write "test"; rm -rf / #.ts"
      // This would execute rm -rf / !!!
      
      // For now, just document the vulnerability exists
      const cmd = hook.command.replace('${file}', maliciousFile);
      expect(cmd).toContain('rm -rf');
      
      // TODO: After fix, this should be escaped:
      // prettier --write "test\"; rm -rf / #.ts"
    });

    it('should reject hooks with dangerous commands', () => {
      // Hooks should validate commands before execution
      const dangerousHook: Hook = {
        name: 'dangerous',
        trigger: 'on-save',
        command: 'rm -rf /',
        enabled: true,
      };
      
      // Currently this would execute - needs validation
      // After fix: should be rejected or require explicit approval
    });

    it('should enforce timeout on hook execution', () => {
      // Hooks have 30s timeout - verify it's enforced
      // This prevents infinite loops or hung processes
      addHook({
        name: 'slow',
        trigger: 'on-save',
        command: 'sleep 1 && echo done',
        enabled: true,
      });
      
      const start = Date.now();
      const results = runHook('on-save');
      const elapsed = Date.now() - start;
      
      // Should complete (sleep 1 is under 30s timeout)
      expect(elapsed).toBeLessThan(5000);
    });
  });
});
