/**
 * VIBE CLI Help System - Comprehensive command documentation
 * Auto-generated from command registry with grouped categories
 */

import pc from 'picocolors';
import { commands, getCommandsByCategory } from '../commands/registry';
import { MODE_CONFIGS } from '../core/modes';
import { BUILTIN_AGENTS } from '../agents/builtin';
import { MCP_TEMPLATES } from '../mcp/manager';

const VERSION = '10.1.0';

// ============================================
// GLOBAL CLI HELP (vibe --help)
// ============================================

export function getGlobalHelp(): string {
  return `
${pc.bold(pc.cyan('VIBE'))} ${pc.gray(`v${VERSION}`)} - The Open Source AI Coding Agent

${pc.bold('USAGE')}
  ${pc.cyan('vibe')}                      Start interactive mode
  ${pc.cyan('vibe')} ${pc.yellow('<command>')} [options]  Run a command
  ${pc.cyan('vibe')} ${pc.yellow('ask')} "prompt"         One-shot query (non-interactive)

${pc.bold('MODES')}
  ${pc.cyan('vibe')}                      Interactive chat with tools
  ${pc.cyan('vibe ask')} "..."            Non-interactive, answer only
  ${pc.cyan('vibe ask -t')} "..."         Non-interactive with tools
  ${pc.cyan('vibe batch')} <file>         Process multiple prompts
  ${pc.cyan('vibe cmd')} <name>           Run custom command

${pc.bold('AGENT COMMANDS')}
  ${pc.cyan('vibe plan')} <goal>          Planning agent
  ${pc.cyan('vibe research')} <topic>     Research agent  
  ${pc.cyan('vibe analyze')} <target>     Analysis agent
  ${pc.cyan('vibe build')} <task>         Builder agent
  ${pc.cyan('vibe review')} <target>      Code review agent
  ${pc.cyan('vibe audit')}                Security audit agent

${pc.bold('CORE COMMANDS')}
  ${pc.cyan('vibe setup')}                Interactive provider setup
  ${pc.cyan('vibe connect')} [provider]   Add provider credentials
  ${pc.cyan('vibe providers')}            List available providers
  ${pc.cyan('vibe models')}               List available models
  ${pc.cyan('vibe doctor')}               Diagnose configuration

${pc.bold('SESSION & MEMORY')}
  ${pc.cyan('vibe sessions')} [cmd]       Manage sessions (new/list/share)
  ${pc.cyan('vibe memory')} [cmd]         Manage project memory
  ${pc.cyan('vibe rules')} [cmd]          Manage project rules

${pc.bold('WORKFLOW & AUTOMATION')}
  ${pc.cyan('vibe workflow')} [cmd]       Run/manage workflows
  ${pc.cyan('vibe pipeline')} <type>      Run specialized pipelines
  ${pc.cyan('vibe output')} <format>      Export/format data

${pc.bold('SETTINGS')}
  ${pc.cyan('vibe privacy')}              Privacy settings
  ${pc.cyan('vibe lsp')}                  Language server status
  ${pc.cyan('vibe agents')}               List/manage agents
  ${pc.cyan('vibe steering')}             View steering config
  ${pc.cyan('vibe hooks')}                Manage hooks

${pc.bold('PROVIDER SETUP')}
  ${pc.gray('1.')} Run ${pc.cyan('vibe setup')} to configure providers
  ${pc.gray('2.')} Or use ${pc.cyan('/provider')} in interactive mode
  ${pc.gray('3.')} API keys are stored in ~/.vibe/config.json
  ${pc.gray('4.')} Or set via environment variables (e.g. OPENAI_API_KEY)

${pc.bold('MODEL FILTERS')}
  ${pc.gray('--local')}    Local models only
  ${pc.gray('--cheap')}    Low-cost models
  ${pc.gray('--fast')}     Fast models
  ${pc.gray('--free')}     Free tier models

${pc.bold('ASK MODE OPTIONS')}
  ${pc.gray('--allow-tools, -t')}                Enable tool execution
  ${pc.gray('--dangerously-skip-permissions')}   Bypass permission checks
  ${pc.gray('--json')}                           Output as JSON
  ${pc.gray('--quiet, -q')}                      Suppress progress

${pc.bold('EXAMPLES')}
  ${pc.gray('$')} vibe                           ${pc.gray('# Start interactive mode')}
  ${pc.gray('$')} vibe setup                     ${pc.gray('# Configure providers')}
  ${pc.gray('$')} vibe ask "explain this code"   ${pc.gray('# Quick question')}
  ${pc.gray('$')} vibe ask -t "create a test"    ${pc.gray('# With tools enabled')}
  ${pc.gray('$')} vibe plan "add auth"           ${pc.gray('# Planning agent')}
  ${pc.gray('$')} vibe models --free             ${pc.gray('# List free models')}
  ${pc.gray('$')} vibe connect openai            ${pc.gray('# Add OpenAI key')}

${pc.bold('KEYBOARD SHORTCUTS')} (interactive mode)
  ${pc.yellow('Ctrl+K')}     Command palette
  ${pc.yellow('Ctrl+T')}     Start tangent conversation
  ${pc.yellow('Ctrl+J')}     Multi-line input
  ${pc.yellow('!cmd')}       Execute shell command
  ${pc.yellow('@file')}      Include file context

${pc.gray('Free models included - no API key required!')}
${pc.gray('Documentation: https://github.com/mk-knight23/vibe')}
`;
}

// ============================================
// INTERACTIVE HELP (/help)
// ============================================

export function getInteractiveHelp(specificCommand?: string): string {
  if (specificCommand) {
    return getCommandHelp(specificCommand);
  }

  return `
${pc.bold(pc.cyan('VIBE INTERACTIVE COMMANDS'))}

${pc.bold('NAVIGATION')}
  ${formatCmd('/help', 'h', 'Show this help')}
  ${formatCmd('/quit', 'q', 'Exit CLI')}
  ${formatCmd('/clear', '', 'Clear conversation')}
  ${formatCmd('/version', 'v', 'Show version')}

${pc.bold('AI & MODELS')}
  ${formatCmd('/model', 'm', 'Switch AI model')}
  ${formatCmd('/model', 'm', 'Switch AI model')}
  ${formatCmd('/provider', 'p', 'Switch provider')}
  ${formatCmd('/provider setup', '', 'Configure API key')}
  ${formatCmd('/mode', '', 'Switch mode (ask/debug/architect)')}
  ${formatCmd('/agent', '', 'Switch to agent')}
  ${formatCmd('/tangent', 't', 'Start tangent conversation')}

${pc.bold('CONTEXT & MEMORY')}
  ${formatCmd('/context', 'ctx', 'Show active context')}
  ${formatCmd('/memory', 'mem', 'View/search memory')}
  ${formatCmd('/session', 'sess', 'Manage sessions')}
  ${formatCmd('/usage', '', 'Show token usage')}

${pc.bold('TOOLS & MCP')}
  ${formatCmd('/tools', '', 'List all tools')}
  ${formatCmd('/mcp', '', 'Manage MCP servers')}
  ${formatCmd('/approve', '', 'Manage pending approvals')}
  ${formatCmd('/audit', '', 'View audit log')}

${pc.bold('PROJECT')}
  ${formatCmd('/analyze', 'az', 'Analyze code quality')}
  ${formatCmd('/security', 'sec', 'Security scan')}
  ${formatCmd('/diff', '', 'Show/checkpoint changes')}
  ${formatCmd('/scan', '', 'Full project scan')}

${pc.bold('ADVANCED')}
  ${formatCmd('/cmd', '', 'Run custom commands')}
  ${formatCmd('/refactor', '', 'Refactor code')}
  ${formatCmd('/test', '', 'Generate tests')}
  ${formatCmd('/docs', '', 'Generate documentation')}

${pc.bold('KEYBOARD SHORTCUTS')}
  ${pc.yellow('Ctrl+K')}  Command palette
  ${pc.yellow('Ctrl+T')}  Tangent conversation
  ${pc.yellow('Ctrl+J')}  Multi-line input
  ${pc.yellow('Ctrl+A')}  Approve pending tool
  ${pc.yellow('Ctrl+D')}  Deny pending tool
  ${pc.yellow('!cmd')}    Shell command
  ${pc.yellow('@file')}   Include file

${pc.gray('Type /help <command> for details')}
`;
}

function formatCmd(name: string, alias: string, desc: string): string {
  const aliasStr = alias ? pc.gray(` (${alias})`) : '';
  return `  ${pc.cyan(name.padEnd(12))}${aliasStr.padEnd(8)} ${pc.gray(desc)}`;
}

function getCommandHelp(name: string): string {
  const cmd = commands.find(c => c.name === name || c.aliases?.includes(name));
  
  if (!cmd) {
    // Check for special commands
    if (name === 'mode') return getModeHelp();
    if (name === 'agent' || name === 'agents') return getAgentHelp();
    if (name === 'mcp') return getMcpHelp();
    
    return pc.red(`Unknown command: ${name}\n`) + pc.gray('Type /help for available commands');
  }

  let help = `
${pc.bold(pc.cyan(cmd.name.toUpperCase()))}
${pc.gray('─'.repeat(50))}
${cmd.description}

${pc.bold('Usage:')} ${cmd.usage}
`;

  if (cmd.aliases?.length) {
    help += `${pc.bold('Aliases:')} ${cmd.aliases.join(', ')}\n`;
  }

  // Add command-specific examples
  const examples = getCommandExamples(cmd.name);
  if (examples) {
    help += `\n${pc.bold('Examples:')}\n${examples}`;
  }

  return help;
}

function getCommandExamples(name: string): string | null {
  const examples: Record<string, string> = {
    model: `  /model                    ${pc.gray('# Interactive model picker')}
  /model gpt-4o             ${pc.gray('# Switch to specific model')}
  /model openai/gpt-4o      ${pc.gray('# With provider prefix')}`,
    
    mode: `  /mode                     ${pc.gray('# Show current mode')}
  /mode ask                 ${pc.gray('# Answer-only mode')}
  /mode debug               ${pc.gray('# Heavy diagnostics')}
  /mode architect           ${pc.gray('# Planning mode')}`,
    
    session: `  /session                  ${pc.gray('# List sessions')}
  /session new              ${pc.gray('# Create new session')}
  /session switch abc123    ${pc.gray('# Switch to session')}`,
    
    provider: `  /provider                 ${pc.gray('# Interactive provider picker')}
  /provider setup           ${pc.gray('# Configure API key')}
  /provider setup openai    ${pc.gray('# Setup specific provider')}
  /provider list            ${pc.gray('# List all providers')}
  /provider status openai   ${pc.gray('# Check provider status')}`,
    
    mcp: `  /mcp status               ${pc.gray('# Show connected servers')}
  /mcp connect filesystem   ${pc.gray('# Connect MCP server')}
  /mcp tools                ${pc.gray('# List MCP tools')}`,
    
    diff: `  /diff                     ${pc.gray('# Show pending changes')}
  /diff checkpoint          ${pc.gray('# Save checkpoint')}
  /diff revert abc123       ${pc.gray('# Revert to checkpoint')}`,
    
    approve: `  /approve                  ${pc.gray('# List pending approvals')}
  /approve 1                ${pc.gray('# Approve first item')}
  /approve all              ${pc.gray('# Approve all')}
  /approve all --session    ${pc.gray('# Approve all for session')}`,
  };

  return examples[name] || null;
}

// ============================================
// SPECIALIZED HELP SECTIONS
// ============================================

export function getModeHelp(): string {
  const modes = Object.entries(MODE_CONFIGS);
  
  let help = `
${pc.bold(pc.cyan('MODES'))}
${pc.gray('─'.repeat(50))}
Modes change how the AI behaves and which tools are available.

${pc.bold('Available Modes:')}
`;

  for (const [key, config] of modes) {
    const tools = config.toolsEnabled ? pc.green('tools') : pc.yellow('no-tools');
    help += `  ${pc.cyan(key.padEnd(14))} ${tools.padEnd(12)} ${pc.gray(config.description)}\n`;
  }

  help += `
${pc.bold('Usage:')}
  /mode              ${pc.gray('# Show current mode')}
  /mode <name>       ${pc.gray('# Switch to mode')}

${pc.bold('Examples:')}
  /mode ask          ${pc.gray('# Answer questions without tools')}
  /mode debug        ${pc.gray('# Heavy diagnostics mode')}
  /mode architect    ${pc.gray('# Planning before implementation')}
`;

  return help;
}

export function getAgentHelp(): string {
  const agents = Object.entries(BUILTIN_AGENTS);
  
  let help = `
${pc.bold(pc.cyan('AGENTS'))}
${pc.gray('─'.repeat(50))}
Specialized agents for different tasks.

${pc.bold('Built-in Agents:')}
`;

  for (const [name, agent] of agents) {
    help += `  ${pc.cyan(name.padEnd(14))} ${pc.gray(agent.description)}\n`;
  }

  help += `
${pc.bold('Usage:')}
  /agent             ${pc.gray('# List agents')}
  /agent <name>      ${pc.gray('# Switch to agent')}
  vibe plan <goal>   ${pc.gray('# Run planner agent')}
  vibe research <t>  ${pc.gray('# Run researcher agent')}

${pc.bold('Examples:')}
  /agent planner     ${pc.gray('# Switch to planning agent')}
  /agent builder     ${pc.gray('# Switch to builder agent')}
`;

  return help;
}

export function getMcpHelp(): string {
  const templates = Object.keys(MCP_TEMPLATES);
  
  return `
${pc.bold(pc.cyan('MCP (Model Context Protocol)'))}
${pc.gray('─'.repeat(50))}
Connect external tool servers via MCP.

${pc.bold('Commands:')}
  /mcp status        ${pc.gray('# Show connected servers')}
  /mcp connect <n>   ${pc.gray('# Connect to server')}
  /mcp disconnect    ${pc.gray('# Disconnect server')}
  /mcp tools         ${pc.gray('# List MCP tools')}
  /mcp init          ${pc.gray('# Initialize MCP config')}

${pc.bold('Available Templates:')}
  ${templates.map(t => pc.cyan(t)).join(', ')}

${pc.bold('Examples:')}
  /mcp connect filesystem   ${pc.gray('# Connect filesystem server')}
  /mcp connect git          ${pc.gray('# Connect git server')}

${pc.bold('Config File:')} .vibe/mcp.json
`;
}

export function getProvidersHelp(): string {
  // Dynamic import to avoid circular dependency
  let ENHANCED_PROVIDERS: any;
  let hasApiKey: any;
  try {
    const registry = require('../providers/enhanced-registry');
    ENHANCED_PROVIDERS = registry.ENHANCED_PROVIDERS;
    hasApiKey = registry.hasApiKey;
  } catch {
    return `
${pc.bold(pc.cyan('PROVIDERS'))}
Run ${pc.cyan('vibe setup')} to configure providers.
`;
  }
  
  const providers = Object.values(ENHANCED_PROVIDERS) as any[];
  
  let help = `
${pc.bold(pc.cyan('PROVIDERS'))}
${pc.gray('─'.repeat(60))}
VIBE supports ${providers.length}+ AI providers. You bring your own API keys.

${pc.bold('Configured Providers:')}
`;

  const configured = providers.filter((p: any) => hasApiKey(p.id));
  const unconfigured = providers.filter((p: any) => p.requiresApiKey && !hasApiKey(p.id));
  const local = providers.filter((p: any) => !p.requiresApiKey);

  if (configured.length > 0) {
    configured.forEach((p: any) => {
      help += `  ${pc.green('✓')} ${p.displayName.padEnd(16)} ${pc.gray(p.description)}\n`;
    });
  } else {
    help += `  ${pc.gray('None configured yet')}\n`;
  }

  help += `\n${pc.bold('Available Providers:')}\n`;
  unconfigured.forEach((p: any) => {
    help += `  ${pc.yellow('○')} ${p.displayName.padEnd(16)} ${pc.gray(p.apiKeyHelp.url)}\n`;
  });

  help += `\n${pc.bold('Local Providers:')}\n`;
  local.forEach((p: any) => {
    help += `  ${pc.blue('●')} ${p.displayName.padEnd(16)} ${pc.gray(p.description)}\n`;
  });

  help += `
${pc.bold('Setup:')}
  vibe setup         ${pc.gray('# Interactive setup wizard')}
  /provider          ${pc.gray('# Switch provider in chat')}
  /provider setup    ${pc.gray('# Configure API key')}

${pc.bold('Environment Variables:')}
  OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY, etc.
`;

  return help;
}

export function getToolsHelp(tools: any[]): string {
  const byCategory: Record<string, any[]> = {};
  
  for (const tool of tools) {
    const cat = tool.category || 'other';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(tool);
  }

  let help = `
${pc.bold(pc.cyan(`AVAILABLE TOOLS (${tools.length})`))}
`;

  for (const [category, categoryTools] of Object.entries(byCategory).sort()) {
    help += `\n${pc.bold(category.toUpperCase())}\n`;
    for (const tool of categoryTools) {
      const confirm = tool.requiresConfirmation ? pc.yellow('⚠') : ' ';
      help += `  ${confirm} ${pc.cyan(tool.name.padEnd(24))} ${pc.gray(tool.description)}\n`;
    }
  }

  help += `\n${pc.yellow('⚠')} = Requires approval\n`;
  return help;
}

// ============================================
// STATUS BAR
// ============================================

export interface StatusBarState {
  model: string;
  provider: string;
  mode: string;
  session?: string;
  tokens?: { used: number; max: number };
  pendingApprovals?: number;
}

export function formatStatusBar(state: StatusBarState): string {
  const parts: string[] = [];
  
  // Model & Provider
  parts.push(`${pc.cyan('⚡')} ${state.model}`);
  parts.push(`${pc.blue('◆')} ${state.provider}`);
  
  // Mode
  const modeColor = state.mode === 'ask' ? pc.yellow : 
                    state.mode === 'debug' ? pc.red :
                    state.mode === 'architect' ? pc.magenta : pc.green;
  parts.push(`${modeColor('●')} ${state.mode}`);
  
  // Session
  if (state.session) {
    parts.push(`${pc.gray('◎')} ${state.session.slice(0, 8)}`);
  }
  
  // Tokens
  if (state.tokens) {
    const pct = Math.round((state.tokens.used / state.tokens.max) * 100);
    const tokenColor = pct > 80 ? pc.red : pct > 50 ? pc.yellow : pc.green;
    parts.push(`${tokenColor('◐')} ${pct}%`);
  }
  
  // Pending approvals
  if (state.pendingApprovals && state.pendingApprovals > 0) {
    parts.push(`${pc.yellow('⚠')} ${state.pendingApprovals} pending`);
  }
  
  return pc.gray('─'.repeat(60)) + '\n' + parts.join(pc.gray(' │ ')) + '\n' + pc.gray('─'.repeat(60));
}

// ============================================
// HINTS & TIPS
// ============================================

export function getInlineHint(): string {
  const hints = [
    `${pc.gray('Tip:')} Press ${pc.yellow('Ctrl+K')} for command palette`,
    `${pc.gray('Tip:')} Use ${pc.yellow('@file:path')} to include files`,
    `${pc.gray('Tip:')} Type ${pc.yellow('/mode')} to change behavior`,
    `${pc.gray('Tip:')} Use ${pc.yellow('!cmd')} to run shell commands`,
    `${pc.gray('Tip:')} Press ${pc.yellow('Ctrl+T')} for tangent conversation`,
  ];
  return hints[Math.floor(Math.random() * hints.length)];
}

export function getWelcomeHints(): string {
  return `
${pc.gray('Quick Start:')}
  • Type your request to start coding
  • ${pc.yellow('Ctrl+K')} opens command palette
  • ${pc.yellow('/help')} shows all commands
  • ${pc.yellow('/mode')} changes AI behavior
`;
}
