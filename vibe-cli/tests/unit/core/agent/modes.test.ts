/**
 * Mode System Tests - v10.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AgentMode,
  MODE_CONFIGS,
  getMode,
  setMode,
  getModeConfig,
  isToolAllowed,
  isToolPreferred,
  getModeSystemPrompt,
  detectMode,
  getModeSummary
} from '../../../../src/core/modes';

describe('Mode System', () => {
  beforeEach(() => {
    setMode('auto'); // Reset to default
  });

  describe('MODE_CONFIGS', () => {
    it('should have all required modes', () => {
      const modes: AgentMode[] = ['ask', 'debug', 'architect', 'orchestrator', 'auto'];
      modes.forEach(mode => {
        expect(MODE_CONFIGS[mode]).toBeDefined();
      });
    });

    it('each mode should have required properties', () => {
      Object.values(MODE_CONFIGS).forEach(config => {
        expect(config).toHaveProperty('name');
        expect(config).toHaveProperty('description');
        expect(config).toHaveProperty('toolsEnabled');
        expect(config).toHaveProperty('autoApprove');
        expect(config).toHaveProperty('systemPromptAddition');
        expect(config).toHaveProperty('preferredTools');
        expect(config).toHaveProperty('disabledTools');
        expect(config).toHaveProperty('maxSteps');
        expect(config).toHaveProperty('requiresApproval');
      });
    });
  });

  describe('getMode / setMode', () => {
    it('should default to auto mode', () => {
      expect(getMode()).toBe('auto');
    });

    it('should set and get mode', () => {
      setMode('debug');
      expect(getMode()).toBe('debug');
      
      setMode('architect');
      expect(getMode()).toBe('architect');
    });

    it('should throw on invalid mode', () => {
      expect(() => setMode('invalid' as AgentMode)).toThrow('Invalid mode');
    });

    it('should return config when setting mode', () => {
      const config = setMode('debug');
      expect(config.name).toBe('Debug');
    });
  });

  describe('getModeConfig', () => {
    it('should return current mode config', () => {
      setMode('ask');
      const config = getModeConfig();
      expect(config.name).toBe('Ask');
      expect(config.toolsEnabled).toBe(false);
    });
  });

  describe('isToolAllowed', () => {
    it('should allow read tools in ask mode', () => {
      setMode('ask');
      expect(isToolAllowed('read_file')).toBe(true);
      expect(isToolAllowed('list_directory')).toBe(true);
    });

    it('should disallow write tools in ask mode', () => {
      setMode('ask');
      expect(isToolAllowed('write_file')).toBe(false);
      expect(isToolAllowed('run_shell_command')).toBe(false);
    });

    it('should allow all tools in debug mode', () => {
      setMode('debug');
      expect(isToolAllowed('read_file')).toBe(true);
      expect(isToolAllowed('write_file')).toBe(true);
      expect(isToolAllowed('run_tests')).toBe(true);
    });
  });

  describe('isToolPreferred', () => {
    it('should identify preferred tools in debug mode', () => {
      setMode('debug');
      expect(isToolPreferred('get_diagnostics')).toBe(true);
      expect(isToolPreferred('run_tests')).toBe(true);
      expect(isToolPreferred('write_file')).toBe(false);
    });
  });

  describe('getModeSystemPrompt', () => {
    it('should return system prompt for mode', () => {
      setMode('ask');
      const prompt = getModeSystemPrompt();
      expect(prompt).toContain('ASK mode');
      expect(prompt).toContain('Do NOT execute tools');
    });

    it('should return empty for auto mode', () => {
      setMode('auto');
      const prompt = getModeSystemPrompt();
      expect(prompt).toBe('');
    });
  });

  describe('detectMode', () => {
    it('should detect debug mode from error keywords', () => {
      expect(detectMode('fix this bug')).toBe('debug');
      expect(detectMode('why is this error happening')).toBe('debug');
      expect(detectMode('the app crash on startup')).toBe('debug');
    });

    it('should detect architect mode from planning keywords', () => {
      expect(detectMode('plan the new feature')).toBe('architect');
      expect(detectMode('design the database schema')).toBe('architect');
      expect(detectMode('refactor the authentication module')).toBe('architect');
    });

    it('should detect orchestrator mode from build keywords', () => {
      expect(detectMode('create a new React app')).toBe('orchestrator');
      expect(detectMode('setup the CI/CD pipeline')).toBe('orchestrator');
      expect(detectMode('implement user authentication')).toBe('orchestrator');
    });

    it('should detect ask mode from questions', () => {
      expect(detectMode('what is TypeScript?')).toBe('ask');
      expect(detectMode('how does React work?')).toBe('ask');
      expect(detectMode('can you explain hooks?')).toBe('ask');
    });

    it('should default to auto for ambiguous input', () => {
      expect(detectMode('hello')).toBe('auto');
      expect(detectMode('thanks')).toBe('auto');
    });
  });

  describe('getModeSummary', () => {
    it('should return formatted summary', () => {
      setMode('debug');
      const summary = getModeSummary();
      expect(summary).toContain('Mode: Debug');
      expect(summary).toContain('Tools: enabled');
      expect(summary).toContain('Max steps: 10');
    });
  });
});

describe('Compatibility Contract - Mode System', () => {
  it('should export all required functions', async () => {
    const modes = await import('../../../../src/core/modes');
    
    expect(typeof modes.getMode).toBe('function');
    expect(typeof modes.setMode).toBe('function');
    expect(typeof modes.getModeConfig).toBe('function');
    expect(typeof modes.isToolAllowed).toBe('function');
    expect(typeof modes.isToolPreferred).toBe('function');
    expect(typeof modes.getModeSystemPrompt).toBe('function');
    expect(typeof modes.detectMode).toBe('function');
    expect(typeof modes.getModeSummary).toBe('function');
  });

  it('should export MODE_CONFIGS', async () => {
    const { MODE_CONFIGS } = await import('../../../../src/core/modes');
    expect(MODE_CONFIGS).toBeDefined();
    expect(Object.keys(MODE_CONFIGS).length).toBeGreaterThan(0);
  });
});
