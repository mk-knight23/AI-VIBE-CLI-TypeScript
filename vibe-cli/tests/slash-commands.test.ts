/**
 * Slash Commands Tests - v10.1 New Commands
 * Tests for /session, /diff, /bug, /context, /mode
 */

import { describe, it, expect } from 'vitest';
import { commands, findCommand, getCommandsByCategory } from '../src/commands/registry';

describe('Slash Commands - v10.1', () => {
  describe('New Commands Exist', () => {
    const newCommands = ['session', 'diff', 'bug', 'context', 'mode'];

    newCommands.forEach(cmdName => {
      it(`should have /${cmdName} command`, () => {
        const cmd = findCommand(cmdName);
        expect(cmd).toBeDefined();
        expect(cmd?.name).toBe(cmdName);
      });
    });
  });

  describe('Command Aliases', () => {
    it('/session should have sess alias', () => {
      const cmd = findCommand('sess');
      expect(cmd?.name).toBe('session');
    });

    it('/context should have ctx alias', () => {
      const cmd = findCommand('ctx');
      expect(cmd?.name).toBe('context');
    });
  });

  describe('Command Categories', () => {
    it('/session should be in ai category', () => {
      const cmd = findCommand('session');
      expect(cmd?.category).toBe('ai');
    });

    it('/diff should be in project category', () => {
      const cmd = findCommand('diff');
      expect(cmd?.category).toBe('project');
    });

    it('/bug should be in basic category', () => {
      const cmd = findCommand('bug');
      expect(cmd?.category).toBe('basic');
    });

    it('/context should be in ai category', () => {
      const cmd = findCommand('context');
      expect(cmd?.category).toBe('ai');
    });

    it('/mode should be in ai category', () => {
      const cmd = findCommand('mode');
      expect(cmd?.category).toBe('ai');
    });
  });

  describe('Command Usage', () => {
    it('/session should have proper usage', () => {
      const cmd = findCommand('session');
      expect(cmd?.usage).toContain('new');
      expect(cmd?.usage).toContain('list');
    });

    it('/diff should have proper usage', () => {
      const cmd = findCommand('diff');
      expect(cmd?.usage).toContain('show');
      expect(cmd?.usage).toContain('checkpoint');
      expect(cmd?.usage).toContain('revert');
    });

    it('/mode should have proper usage', () => {
      const cmd = findCommand('mode');
      expect(cmd?.usage).toContain('ask');
      expect(cmd?.usage).toContain('debug');
      expect(cmd?.usage).toContain('architect');
    });
  });
});

describe('Compatibility Contract - Slash Commands', () => {
  const requiredCommands = [
    // Basic (existing)
    'help', 'quit', 'clear', 'version', 'tools',
    // AI (existing)
    'model', 'provider', 'models', 'providers', 'connect', 'doctor', 'agent',
    // Project (existing)
    'analyze', 'security', 'optimize', 'scan',
    // Advanced (existing)
    'refactor', 'test', 'docs', 'migrate', 'benchmark', 'memory', 'create',
    // New v10.1
    'session', 'diff', 'bug', 'context', 'mode', 'mcp'
  ];

  requiredCommands.forEach(cmdName => {
    it(`should have /${cmdName} command (compatibility)`, () => {
      const cmd = findCommand(cmdName);
      expect(cmd).toBeDefined();
    });
  });

  it('should have all required categories', () => {
    const categories = ['basic', 'ai', 'project', 'advanced'];
    categories.forEach(cat => {
      const cmds = getCommandsByCategory(cat);
      expect(cmds.length).toBeGreaterThan(0);
    });
  });
});
