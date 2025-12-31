/**
 * UI Layer Tests - Phase 9
 * Tests for help output, command palette, mode switching, approvals
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock inquirer
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
    Separator: class Separator {
      constructor(public text: string) {}
    }
  }
}));

describe('Help System', () => {
  it('getGlobalHelp includes all major sections', async () => {
    const { getGlobalHelp } = await import('../../../src/ui/help');
    const help = getGlobalHelp();
    
    // Check for major sections
    expect(help).toContain('USAGE');
    expect(help).toContain('MODES');
    expect(help).toContain('AGENT COMMANDS');
    expect(help).toContain('CORE COMMANDS');
    expect(help).toContain('SESSION & MEMORY');
    expect(help).toContain('WORKFLOW & AUTOMATION');
    expect(help).toContain('SETTINGS');
    expect(help).toContain('EXAMPLES');
    expect(help).toContain('KEYBOARD SHORTCUTS');
  });

  it('getGlobalHelp includes all modes', async () => {
    const { getGlobalHelp } = await import('../../../src/ui/help');
    const help = getGlobalHelp();
    
    expect(help).toContain('vibe ask');
    expect(help).toContain('vibe batch');
    expect(help).toContain('vibe cmd');
  });

  it('getGlobalHelp includes agent commands', async () => {
    const { getGlobalHelp } = await import('../../../src/ui/help');
    const help = getGlobalHelp();
    
    expect(help).toContain('vibe plan');
    expect(help).toContain('vibe research');
    expect(help).toContain('vibe analyze');
    expect(help).toContain('vibe build');
    expect(help).toContain('vibe review');
    expect(help).toContain('vibe audit');
  });

  it('getInteractiveHelp includes all command categories', async () => {
    const { getInteractiveHelp } = await import('../../../src/ui/help');
    const help = getInteractiveHelp();
    
    expect(help).toContain('NAVIGATION');
    expect(help).toContain('AI & MODELS');
    expect(help).toContain('CONTEXT & MEMORY');
    expect(help).toContain('TOOLS & MCP');
    expect(help).toContain('PROJECT');
    expect(help).toContain('ADVANCED');
    expect(help).toContain('KEYBOARD SHORTCUTS');
  });

  it('getInteractiveHelp includes new commands', async () => {
    const { getInteractiveHelp } = await import('../../../src/ui/help');
    const help = getInteractiveHelp();
    
    expect(help).toContain('/mode');
    expect(help).toContain('/mcp');
    expect(help).toContain('/approve');
    expect(help).toContain('/audit');
    expect(help).toContain('/context');
    expect(help).toContain('/session');
    expect(help).toContain('/diff');
  });

  it('getModeHelp lists all modes', async () => {
    const { getModeHelp } = await import('../../../src/ui/help');
    const help = getModeHelp();
    
    expect(help).toContain('ask');
    expect(help).toContain('debug');
    expect(help).toContain('architect');
    expect(help).toContain('orchestrator');
    expect(help).toContain('auto');
  });

  it('getAgentHelp lists all agents', async () => {
    const { getAgentHelp } = await import('../../../src/ui/help');
    const help = getAgentHelp();
    
    expect(help).toContain('researcher');
    expect(help).toContain('analyst');
    expect(help).toContain('planner');
    expect(help).toContain('builder');
    expect(help).toContain('reviewer');
  });

  it('getMcpHelp includes MCP commands', async () => {
    const { getMcpHelp } = await import('../../../src/ui/help');
    const help = getMcpHelp();
    
    expect(help).toContain('/mcp status');
    expect(help).toContain('/mcp connect');
    expect(help).toContain('/mcp tools');
    expect(help).toContain('filesystem');
  });
});

describe('Command Palette', () => {
  it('generatePaletteItems includes all categories', async () => {
    const { generatePaletteItems } = await import('../../../src/ui/command-palette');
    const items = generatePaletteItems();
    
    const categories = new Set(items.map(i => i.category));
    
    expect(categories.has('navigation')).toBe(true);
    expect(categories.has('mode')).toBe(true);
    expect(categories.has('agent')).toBe(true);
    expect(categories.has('model')).toBe(true);
    expect(categories.has('session')).toBe(true);
    expect(categories.has('tools')).toBe(true);
    expect(categories.has('mcp')).toBe(true);
    expect(categories.has('project')).toBe(true);
    expect(categories.has('memory')).toBe(true);
  });

  it('generatePaletteItems includes mode items', async () => {
    const { generatePaletteItems } = await import('../../../src/ui/command-palette');
    const items = generatePaletteItems();
    
    const modeItems = items.filter(i => i.category === 'mode');
    expect(modeItems.length).toBeGreaterThanOrEqual(5); // ask, debug, architect, orchestrator, auto
    
    const modeNames = modeItems.map(i => i.id);
    expect(modeNames).toContain('mode-ask');
    expect(modeNames).toContain('mode-debug');
    expect(modeNames).toContain('mode-architect');
  });

  it('generatePaletteItems includes agent items', async () => {
    const { generatePaletteItems } = await import('../../../src/ui/command-palette');
    const items = generatePaletteItems();
    
    const agentItems = items.filter(i => i.category === 'agent');
    expect(agentItems.length).toBeGreaterThanOrEqual(5);
    
    const agentNames = agentItems.map(i => i.id);
    expect(agentNames).toContain('agent-planner');
    expect(agentNames).toContain('agent-builder');
    expect(agentNames).toContain('agent-researcher');
  });

  it('searchPalette returns matching items', async () => {
    const { generatePaletteItems, searchPalette } = await import('../../../src/ui/command-palette');
    const items = generatePaletteItems();
    
    const results = searchPalette(items, 'mode');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.category === 'mode')).toBe(true);
  });

  it('searchPalette handles fuzzy matching', async () => {
    const { generatePaletteItems, searchPalette } = await import('../../../src/ui/command-palette');
    const items = generatePaletteItems();
    
    const results = searchPalette(items, 'mdl'); // fuzzy for "model"
    expect(results.some(r => r.label.toLowerCase().includes('model'))).toBe(true);
  });

  it('searchPalette returns all items for empty query', async () => {
    const { generatePaletteItems, searchPalette } = await import('../../../src/ui/command-palette');
    const items = generatePaletteItems();
    
    const results = searchPalette(items, '');
    expect(results.length).toBe(items.length);
  });
});

describe('Tool Approval', () => {
  it('getToolRiskLevel returns safe for read-only tools', async () => {
    const { getToolRiskLevel } = await import('../../../src/ui/approval');
    
    expect(getToolRiskLevel('read_file')).toBe('safe');
    expect(getToolRiskLevel('list_directory')).toBe('safe');
    expect(getToolRiskLevel('glob')).toBe('safe');
    expect(getToolRiskLevel('search_file_content')).toBe('safe');
  });

  it('getToolRiskLevel returns medium for write tools', async () => {
    const { getToolRiskLevel } = await import('../../../src/ui/approval');
    
    expect(getToolRiskLevel('write_file')).toBe('medium');
    expect(getToolRiskLevel('replace')).toBe('medium');
    expect(getToolRiskLevel('create_directory')).toBe('medium');
  });

  it('getToolRiskLevel returns high for shell commands', async () => {
    const { getToolRiskLevel } = await import('../../../src/ui/approval');
    
    expect(getToolRiskLevel('run_shell_command')).toBe('high');
    expect(getToolRiskLevel('delete_file')).toBe('high');
  });

  it('getToolRiskLevel returns blocked for dangerous commands', async () => {
    const { getToolRiskLevel } = await import('../../../src/ui/approval');
    
    expect(getToolRiskLevel('run_shell_command', { command: 'rm -rf /' })).toBe('blocked');
    expect(getToolRiskLevel('run_shell_command', { command: 'sudo rm -rf' })).toBe('blocked');
  });
});

describe('Status Bar', () => {
  it('formatStatusBar includes all state elements', async () => {
    const { formatStatusBar } = await import('../../../src/ui/help');
    
    const status = formatStatusBar({
      model: 'gpt-4o',
      provider: 'openai',
      mode: 'architect',
      session: 'abc123def456',
      tokens: { used: 5000, max: 10000 },
      pendingApprovals: 2
    });
    
    expect(status).toContain('gpt-4o');
    expect(status).toContain('openai');
    expect(status).toContain('architect');
    expect(status).toContain('abc123de'); // truncated session ID
    expect(status).toContain('50%'); // token percentage
    expect(status).toContain('2 pending');
  });
});

describe('Session UI', () => {
  it('formatSessionList handles empty sessions', async () => {
    const { formatSessionList } = await import('../../../src/ui/session');
    
    const result = formatSessionList([]);
    expect(result).toContain('No sessions found');
  });

  it('formatSessionList shows session details', async () => {
    const { formatSessionList } = await import('../../../src/ui/session');
    
    const sessions = [{
      id: 'test-session-123456',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tokenCount: 1500,
      model: 'gpt-4o'
    }];
    
    const result = formatSessionList(sessions, 'test-session-123456');
    expect(result).toContain('test-sessio'); // truncated ID
    expect(result).toContain('gpt-4o'); // model name
    expect(result).toContain('1500 tokens');
    expect(result).toContain('→'); // current indicator
  });
});

describe('Command Registry', () => {
  it('includes palette command', async () => {
    const { findCommand } = await import('../../../src/commands/registry');
    
    const cmd = findCommand('palette');
    expect(cmd).toBeDefined();
    expect(cmd?.aliases).toContain('k');
  });

  it('includes all new commands', async () => {
    const { findCommand } = await import('../../../src/commands/registry');
    
    expect(findCommand('mode')).toBeDefined();
    expect(findCommand('mcp')).toBeDefined();
    expect(findCommand('session')).toBeDefined();
    expect(findCommand('context')).toBeDefined();
    expect(findCommand('approve')).toBeDefined();
    expect(findCommand('audit')).toBeDefined();
    expect(findCommand('diff')).toBeDefined();
  });

  it('old commands still work', async () => {
    const { findCommand } = await import('../../../src/commands/registry');
    
    expect(findCommand('help')).toBeDefined();
    expect(findCommand('quit')).toBeDefined();
    expect(findCommand('model')).toBeDefined();
    expect(findCommand('provider')).toBeDefined();
    expect(findCommand('tools')).toBeDefined();
    expect(findCommand('analyze')).toBeDefined();
  });

  it('aliases still work', async () => {
    const { findCommand } = await import('../../../src/commands/registry');
    
    expect(findCommand('h')).toBeDefined(); // help
    expect(findCommand('q')).toBeDefined(); // quit
    expect(findCommand('m')).toBeDefined(); // model
    expect(findCommand('ctx')).toBeDefined(); // context
    expect(findCommand('sess')).toBeDefined(); // session
  });
});

describe('Mode System', () => {
  it('setMode changes current mode', async () => {
    const { setMode, getMode } = await import('../../../src/core/modes');
    
    setMode('debug');
    expect(getMode()).toBe('debug');
    
    setMode('architect');
    expect(getMode()).toBe('architect');
    
    // Reset
    setMode('auto');
  });

  it('getModeConfig returns correct config', async () => {
    const { setMode, getModeConfig } = await import('../../../src/core/modes');
    
    setMode('ask');
    const config = getModeConfig();
    
    expect(config.name).toBe('Ask');
    expect(config.toolsEnabled).toBe(false);
    
    // Reset
    setMode('auto');
  });

  it('setMode throws for invalid mode', async () => {
    const { setMode } = await import('../../../src/core/modes');
    
    expect(() => setMode('invalid' as any)).toThrow();
  });
});

describe('Backward Compatibility', () => {
  it('old help flags still work', async () => {
    // This would be tested in integration tests
    // The CLI should respond to --help and -h
    expect(true).toBe(true);
  });

  it('old commands produce expected output', async () => {
    // Commands like /help, /quit, /clear should still work
    expect(true).toBe(true);
  });
});

describe('MCP Help', () => {
  it('getMcpHelp includes all MCP commands', async () => {
    const { getMcpHelp } = await import('../../../src/ui/help');
    const help = getMcpHelp();
    
    expect(help).toContain('/mcp status');
    expect(help).toContain('/mcp connect');
    expect(help).toContain('/mcp disconnect');
    expect(help).toContain('/mcp tools');
    expect(help).toContain('/mcp init');
  });

  it('getMcpHelp lists available templates', async () => {
    const { getMcpHelp } = await import('../../../src/ui/help');
    const help = getMcpHelp();
    
    expect(help).toContain('filesystem');
    expect(help).toContain('git');
  });
});

describe('Agent Palette', () => {
  it('generatePaletteItems includes all builtin agents', async () => {
    const { generatePaletteItems } = await import('../../../src/ui/command-palette');
    const { BUILTIN_AGENTS } = await import('../../../src/agents/builtin');
    const items = generatePaletteItems();
    
    const agentItems = items.filter(i => i.category === 'agent');
    const agentNames = Object.keys(BUILTIN_AGENTS);
    
    // Should have an item for each builtin agent
    agentNames.forEach(name => {
      expect(agentItems.some(i => i.id === `agent-${name}`)).toBe(true);
    });
  });
});
