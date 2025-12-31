/**
 * Regression Tests - Commands
 * Ensures all existing commands continue to work in v10.x
 */

import { describe, it, expect } from 'vitest';

describe('Command Regression Tests', () => {
  describe('Core Commands', () => {
    it.skip('should have vibe command entry point', async () => {
      const { main } = await import('../../src/cli/index');
      expect(main).toBeTypeOf('function');
    });

    it.skip('should export version constant', async () => {
      const fs = await import('fs');
      const pkg = JSON.parse(fs.readFileSync('vibe-cli/package.json', 'utf8'));
      expect(pkg.version).toBe('10.1.0');
    });
  });

  describe('Provider Commands', () => {
    it('should export connect command', async () => {
      const { connectCommand } = await import('../../src/commands/connect');
      expect(connectCommand).toBeTypeOf('function');
    });

    it('should export providers command', async () => {
      const { providersCommand } = await import('../../src/commands/providers');
      expect(providersCommand).toBeTypeOf('function');
    });

    it('should export models command', async () => {
      const { modelsCommand } = await import('../../src/commands/models');
      expect(modelsCommand).toBeTypeOf('function');
    });
  });

  describe('Agent Commands', () => {
    it('should export agents command', async () => {
      const { agentsCommand } = await import('../../src/commands/agents');
      expect(agentsCommand).toBeTypeOf('function');
    });

    it('should export quick agent commands', async () => {
      const { planCommand, researchCommand, analyzeCommand, buildCommand, reviewCommand, auditCommand } = 
        await import('../../src/commands/quick-agents');
      expect(planCommand).toBeTypeOf('function');
      expect(researchCommand).toBeTypeOf('function');
      expect(analyzeCommand).toBeTypeOf('function');
      expect(buildCommand).toBeTypeOf('function');
      expect(reviewCommand).toBeTypeOf('function');
      expect(auditCommand).toBeTypeOf('function');
    });
  });

  describe('Session Commands', () => {
    it('should export sessions command', async () => {
      const { sessionsCommand } = await import('../../src/commands/sessions');
      expect(sessionsCommand).toBeTypeOf('function');
    });
  });

  describe('Configuration Commands', () => {
    it('should export doctor command', async () => {
      const { doctorCommand } = await import('../../src/commands/doctor');
      expect(doctorCommand).toBeTypeOf('function');
    });

    it('should export privacy command', async () => {
      const { privacyCommand } = await import('../../src/commands/privacy');
      expect(privacyCommand).toBeTypeOf('function');
    });

    it('should export lsp command', async () => {
      const { lspCommand } = await import('../../src/commands/lsp');
      expect(lspCommand).toBeTypeOf('function');
    });
  });

  describe('Workflow Commands', () => {
    it('should export workflow command', async () => {
      const { workflowCommand } = await import('../../src/commands/workflow');
      expect(workflowCommand).toBeTypeOf('function');
    });

    it('should export memory command', async () => {
      const { memoryCommand } = await import('../../src/commands/memory');
      expect(memoryCommand).toBeTypeOf('function');
    });

    it('should export output command', async () => {
      const { outputCommand } = await import('../../src/commands/output');
      expect(outputCommand).toBeTypeOf('function');
    });

    it('should export rules command', async () => {
      const { rulesCommand } = await import('../../src/commands/rules');
      expect(rulesCommand).toBeTypeOf('function');
    });

    it('should export pipeline command', async () => {
      const { pipelineCommand } = await import('../../src/commands/pipeline');
      expect(pipelineCommand).toBeTypeOf('function');
    });

    it('should export steering command', async () => {
      const { steeringCommand } = await import('../../src/commands/steering');
      expect(steeringCommand).toBeTypeOf('function');
    });

    it('should export hooks command', async () => {
      const { hooksCommand } = await import('../../src/commands/hooks');
      expect(hooksCommand).toBeTypeOf('function');
    });
  });

  describe('Mode Commands', () => {
    it('should export ask mode', async () => {
      const { askMode } = await import('../../src/cli/modes/ask');
      expect(askMode).toBeTypeOf('function');
    });

    it('should export batch mode', async () => {
      const { batchMode } = await import('../../src/cli/modes/batch');
      expect(batchMode).toBeTypeOf('function');
    });

    it('should export cmd mode', async () => {
      const { cmdMode } = await import('../../src/commands/custom/executor');
      expect(cmdMode).toBeTypeOf('function');
    });
  });

  describe('Slash Commands Registry', () => {
    it.skip('should have help command', async () => {
      const { findCommand } = await import('../../src/commands/registry');
      const cmd = findCommand('help');
      expect(cmd).toBeDefined();
      expect(cmd?.name).toBe('help');
    });

    it.skip('should have exit/quit commands', async () => {
      const { findCommand } = await import('../../src/commands/registry');
      expect(findCommand('exit')).toBeDefined();
      expect(findCommand('quit')).toBeDefined();
    });

    it.skip('should have clear command', async () => {
      const { findCommand } = await import('../../src/commands/registry');
      expect(findCommand('clear')).toBeDefined();
    });

    it.skip('should have model command', async () => {
      const { findCommand } = await import('../../src/commands/registry');
      expect(findCommand('model')).toBeDefined();
    });

    it.skip('should have tools command', async () => {
      const { findCommand } = await import('../../src/commands/registry');
      expect(findCommand('tools')).toBeDefined();
    });

    it.skip('should have session command', async () => {
      const { findCommand } = await import('../../src/commands/registry');
      expect(findCommand('session')).toBeDefined();
    });

    it.skip('should have diff command', async () => {
      const { findCommand } = await import('../../src/commands/registry');
      expect(findCommand('diff')).toBeDefined();
    });

    it.skip('should have mode command', async () => {
      const { findCommand } = await import('../../src/commands/registry');
      expect(findCommand('mode')).toBeDefined();
    });

    it.skip('should have cmd command', async () => {
      const { findCommand } = await import('../../src/commands/registry');
      expect(findCommand('cmd')).toBeDefined();
    });

    it.skip('should have context command', async () => {
      const { findCommand } = await import('../../src/commands/registry');
      expect(findCommand('context')).toBeDefined();
    });

    it.skip('should have approve command', async () => {
      const { findCommand } = await import('../../src/commands/registry');
      expect(findCommand('approve')).toBeDefined();
    });

    it.skip('should have audit command', async () => {
      const { findCommand } = await import('../../src/commands/registry');
      expect(findCommand('audit')).toBeDefined();
    });

    it.skip('should have bug command', async () => {
      const { findCommand } = await import('../../src/commands/registry');
      expect(findCommand('bug')).toBeDefined();
    });

    it.skip('should have mcp command', async () => {
      const { findCommand } = await import('../../src/commands/registry');
      expect(findCommand('mcp')).toBeDefined();
    });

    it.skip('should have memory command', async () => {
      const { findCommand } = await import('../../src/commands/registry');
      expect(findCommand('memory')).toBeDefined();
    });

    it.skip('should have agent command', async () => {
      const { findCommand } = await import('../../src/commands/registry');
      expect(findCommand('agent')).toBeDefined();
    });

    it.skip('should have privacy command', async () => {
      const { findCommand } = await import('../../src/commands/registry');
      expect(findCommand('privacy')).toBeDefined();
    });
  });
});
