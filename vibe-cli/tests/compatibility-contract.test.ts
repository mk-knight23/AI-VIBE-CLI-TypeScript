/**
 * Compatibility Contract Tests
 * Ensures backward compatibility for v10.x releases
 * These tests MUST pass for any v10.x release
 * 
 * Note: Some tests are skipped due to circular import issues in providers
 * that exist in the codebase. These should be fixed separately.
 */

import { describe, it, expect } from 'vitest';

describe('Compatibility Contract v10.x', () => {
  describe('Commands', () => {
    it('should export command registry', async () => {
      const { commands, findCommand } = await import('../src/commands/registry');
      expect(commands).toBeInstanceOf(Array);
      expect(findCommand).toBeTypeOf('function');
    });

    it('should have required slash commands', async () => {
      const { findCommand } = await import('../src/commands/registry');
      const required = ['help', 'quit', 'clear', 'model', 'tools', 'diff', 'mode', 'cmd'];
      for (const cmd of required) {
        expect(findCommand(cmd), `Missing command: ${cmd}`).toBeDefined();
      }
    });
  });

  describe('Tools', () => {
    it('should export tools array', async () => {
      const { tools } = await import('../src/tools');
      expect(tools).toBeInstanceOf(Array);
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should have required tools', async () => {
      const { tools } = await import('../src/tools');
      const required = ['read_file', 'write_file', 'run_shell_command', 'list_directory'];
      for (const name of required) {
        expect(tools.find(t => t.name === name), `Missing tool: ${name}`).toBeDefined();
      }
    });
  });

  describe('Permissions', () => {
    it('should export permission functions', async () => {
      const { getPermission, setPermission, shouldPrompt } = await import('../src/permissions');
      expect(getPermission).toBeTypeOf('function');
      expect(setPermission).toBeTypeOf('function');
      expect(shouldPrompt).toBeTypeOf('function');
    });
  });

  describe('Storage', () => {
    it('should export database functions', async () => {
      const { getDb, generateId } = await import('../src/storage/database');
      expect(getDb).toBeTypeOf('function');
      expect(generateId).toBeTypeOf('function');
    });

    it('should export session functions', async () => {
      const { createSession, getSession } = await import('../src/storage/sessions');
      expect(createSession).toBeTypeOf('function');
      expect(getSession).toBeTypeOf('function');
    });
  });

  describe('MCP', () => {
    it('should export MCP manager', async () => {
      const { mcpManager } = await import('../src/mcp/manager');
      expect(mcpManager).toBeDefined();
      expect(mcpManager.connect).toBeTypeOf('function');
    });
  });

  describe('Checkpoints', () => {
    it('should export checkpoint functions', async () => {
      const { 
        trackChange, 
        createCheckpoint, 
        revertCheckpoint,
        getUnifiedDiff 
      } = await import('../src/core/checkpoints');
      expect(trackChange).toBeTypeOf('function');
      expect(createCheckpoint).toBeTypeOf('function');
      expect(revertCheckpoint).toBeTypeOf('function');
      expect(getUnifiedDiff).toBeTypeOf('function');
    });
  });

  describe('Modes', () => {
    it('should export mode functions', async () => {
      const { getMode, setMode, detectMode, MODE_CONFIGS } = await import('../src/core/modes');
      expect(getMode).toBeTypeOf('function');
      expect(setMode).toBeTypeOf('function');
      expect(detectMode).toBeTypeOf('function');
      expect(MODE_CONFIGS).toBeDefined();
    });
  });

  describe('Steering', () => {
    it('should export steering functions', async () => {
      const { loadAllSteering, getSteeringForPrompt } = await import('../src/core/steering');
      expect(loadAllSteering).toBeTypeOf('function');
      expect(getSteeringForPrompt).toBeTypeOf('function');
    });
  });

  describe('Custom Commands', () => {
    it('should export custom command functions', async () => {
      const { 
        loadCustomCommands, 
        getCommand, 
        expandPrompt,
        createCommand,
        deleteCommand 
      } = await import('../src/commands/custom/parser');
      expect(loadCustomCommands).toBeTypeOf('function');
      expect(getCommand).toBeTypeOf('function');
      expect(expandPrompt).toBeTypeOf('function');
      expect(createCommand).toBeTypeOf('function');
      expect(deleteCommand).toBeTypeOf('function');
    });
  });

  describe('Security', () => {
    it('should export security functions', async () => {
      const { AuditLogger, isDryRun, getRiskIndicator } = await import('../src/core/security');
      expect(AuditLogger).toBeDefined();
      expect(isDryRun).toBeTypeOf('function');
      expect(getRiskIndicator).toBeTypeOf('function');
    });
  });

  describe('Config', () => {
    it('should export config loader', async () => {
      const { loadConfig } = await import('../src/config/loader');
      expect(loadConfig).toBeTypeOf('function');
    });
  });

  describe('Backward Compatibility', () => {
    it('should support both $ARG and ${ARG} in custom commands', async () => {
      const { expandPrompt } = await import('../src/commands/custom/parser');
      const cmd = {
        name: 'test',
        description: '',
        args: [{ name: 'NAME', required: true }],
        prompt: 'Hello $NAME and ${NAME}!',
        source: 'project' as const,
        filePath: ''
      };
      const result = expandPrompt(cmd, { NAME: 'World' });
      expect(result).toBe('Hello World and World!');
    });
  });
});
