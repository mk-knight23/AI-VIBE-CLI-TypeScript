/**
 * Command Palette - Fuzzy searchable command interface
 * Triggered by Ctrl+K or / in interactive mode
 * Auto-generated from command registry
 */

import pc from 'picocolors';
import inquirer from 'inquirer';
import { commands, Command } from '../commands/registry';
import { MODE_CONFIGS, AgentMode } from '../core/modes';
import { BUILTIN_AGENTS } from '../agents/builtin';
import { mcpManager } from '../mcp/manager';
import { tools } from '../tools';

// ============================================
// PALETTE ITEM TYPES
// ============================================

export interface PaletteItem {
  id: string;
  label: string;
  description: string;
  category: PaletteCategory;
  action: () => Promise<PaletteResult>;
  keywords?: string[];
  shortcut?: string;
}

export type PaletteCategory = 
  | 'navigation'
  | 'ai'
  | 'mode'
  | 'agent'
  | 'model'
  | 'provider'
  | 'session'
  | 'tools'
  | 'mcp'
  | 'project'
  | 'memory'
  | 'advanced';

export interface PaletteResult {
  action: 'none' | 'quit' | 'clear' | 'model' | 'provider' | 'mode' | 'agent' | 'execute';
  data?: any;
  message?: string;
}

// ============================================
// PALETTE GENERATION
// ============================================

export function generatePaletteItems(): PaletteItem[] {
  const items: PaletteItem[] = [];

  // Navigation commands
  items.push({
    id: 'quit',
    label: 'Quit',
    description: 'Exit VIBE CLI',
    category: 'navigation',
    shortcut: 'Ctrl+C',
    action: async () => ({ action: 'quit' })
  });

  items.push({
    id: 'clear',
    label: 'Clear Conversation',
    description: 'Clear chat history and memory',
    category: 'navigation',
    action: async () => ({ action: 'clear' })
  });

  items.push({
    id: 'help',
    label: 'Help',
    description: 'Show help and commands',
    category: 'navigation',
    shortcut: '/help',
    action: async () => ({ action: 'execute', data: '/help' })
  });

  // Mode switching
  for (const [key, config] of Object.entries(MODE_CONFIGS)) {
    items.push({
      id: `mode-${key}`,
      label: `Mode: ${config.name}`,
      description: config.description,
      category: 'mode',
      keywords: ['mode', 'switch', key],
      action: async () => ({ action: 'mode', data: key })
    });
  }

  // Agent switching
  for (const [name, agent] of Object.entries(BUILTIN_AGENTS)) {
    items.push({
      id: `agent-${name}`,
      label: `Agent: ${name}`,
      description: agent.description,
      category: 'agent',
      keywords: ['agent', 'switch', name],
      action: async () => ({ action: 'agent', data: name })
    });
  }

  // Model selection
  items.push({
    id: 'model-switch',
    label: 'Switch Model',
    description: 'Change AI model',
    category: 'model',
    shortcut: '/model',
    keywords: ['model', 'llm', 'ai'],
    action: async () => ({ action: 'model' })
  });

  // Provider selection
  items.push({
    id: 'provider-switch',
    label: 'Switch Provider',
    description: 'Change AI provider',
    category: 'provider',
    shortcut: '/provider',
    keywords: ['provider', 'api', 'switch'],
    action: async () => ({ action: 'provider' })
  });

  items.push({
    id: 'provider-setup',
    label: 'Setup Provider',
    description: 'Configure API key for a provider',
    category: 'provider',
    shortcut: '/provider setup',
    keywords: ['provider', 'setup', 'api', 'key', 'configure'],
    action: async () => ({ action: 'execute', data: '/provider setup' })
  });

  items.push({
    id: 'provider-list',
    label: 'List Providers',
    description: 'Show all available providers',
    category: 'provider',
    keywords: ['provider', 'list', 'all'],
    action: async () => ({ action: 'execute', data: '/help providers' })
  });

  // Session management
  items.push({
    id: 'session-new',
    label: 'New Session',
    description: 'Create a new conversation session',
    category: 'session',
    keywords: ['session', 'new', 'create'],
    action: async () => ({ action: 'execute', data: '/session new' })
  });

  items.push({
    id: 'session-list',
    label: 'List Sessions',
    description: 'Show all sessions',
    category: 'session',
    keywords: ['session', 'list', 'history'],
    action: async () => ({ action: 'execute', data: '/session list' })
  });

  items.push({
    id: 'session-switch',
    label: 'Switch Session',
    description: 'Switch to another session',
    category: 'session',
    keywords: ['session', 'switch'],
    action: async () => ({ action: 'execute', data: '/session' })
  });

  // Tools
  items.push({
    id: 'tools-list',
    label: 'List Tools',
    description: `Show all ${tools.length} available tools`,
    category: 'tools',
    shortcut: '/tools',
    keywords: ['tools', 'list', 'available'],
    action: async () => ({ action: 'execute', data: '/tools' })
  });

  items.push({
    id: 'approve-list',
    label: 'Pending Approvals',
    description: 'Show pending tool approvals',
    category: 'tools',
    shortcut: '/approve',
    keywords: ['approve', 'pending', 'permission'],
    action: async () => ({ action: 'execute', data: '/approve' })
  });

  items.push({
    id: 'approve-all',
    label: 'Approve All',
    description: 'Approve all pending operations',
    category: 'tools',
    shortcut: 'Ctrl+A',
    keywords: ['approve', 'all', 'yes'],
    action: async () => ({ action: 'execute', data: '/approve all' })
  });

  // MCP
  items.push({
    id: 'mcp-status',
    label: 'MCP Status',
    description: 'Show connected MCP servers',
    category: 'mcp',
    keywords: ['mcp', 'status', 'servers'],
    action: async () => ({ action: 'execute', data: '/mcp status' })
  });

  items.push({
    id: 'mcp-tools',
    label: 'MCP Tools',
    description: 'List tools from MCP servers',
    category: 'mcp',
    keywords: ['mcp', 'tools'],
    action: async () => ({ action: 'execute', data: '/mcp tools' })
  });

  // Project commands
  items.push({
    id: 'analyze',
    label: 'Analyze Code',
    description: 'Analyze code quality',
    category: 'project',
    shortcut: '/analyze',
    keywords: ['analyze', 'quality', 'lint'],
    action: async () => ({ action: 'execute', data: '/analyze' })
  });

  items.push({
    id: 'security',
    label: 'Security Scan',
    description: 'Run security scan',
    category: 'project',
    shortcut: '/security',
    keywords: ['security', 'scan', 'vulnerability'],
    action: async () => ({ action: 'execute', data: '/security' })
  });

  items.push({
    id: 'diff',
    label: 'Show Changes',
    description: 'Show pending file changes',
    category: 'project',
    shortcut: '/diff',
    keywords: ['diff', 'changes', 'modified'],
    action: async () => ({ action: 'execute', data: '/diff' })
  });

  items.push({
    id: 'checkpoint',
    label: 'Create Checkpoint',
    description: 'Save current changes as checkpoint',
    category: 'project',
    keywords: ['checkpoint', 'save', 'snapshot'],
    action: async () => ({ action: 'execute', data: '/diff checkpoint' })
  });

  // Memory
  items.push({
    id: 'memory-show',
    label: 'Show Memory',
    description: 'View project memory',
    category: 'memory',
    shortcut: '/memory',
    keywords: ['memory', 'context', 'history'],
    action: async () => ({ action: 'execute', data: '/memory' })
  });

  items.push({
    id: 'memory-search',
    label: 'Search Memory',
    description: 'Search project memory',
    category: 'memory',
    keywords: ['memory', 'search', 'find'],
    action: async () => ({ action: 'execute', data: '/memory search' })
  });

  items.push({
    id: 'context',
    label: 'Show Context',
    description: 'Show active steering, rules, memory',
    category: 'memory',
    shortcut: '/context',
    keywords: ['context', 'steering', 'rules'],
    action: async () => ({ action: 'execute', data: '/context' })
  });

  // Advanced
  items.push({
    id: 'audit',
    label: 'Audit Log',
    description: 'View tool execution audit log',
    category: 'advanced',
    shortcut: '/audit',
    keywords: ['audit', 'log', 'history'],
    action: async () => ({ action: 'execute', data: '/audit' })
  });

  items.push({
    id: 'cmd-list',
    label: 'Custom Commands',
    description: 'List custom commands',
    category: 'advanced',
    keywords: ['cmd', 'custom', 'commands'],
    action: async () => ({ action: 'execute', data: '/cmd list' })
  });

  items.push({
    id: 'tangent',
    label: 'Start Tangent',
    description: 'Start a tangent conversation',
    category: 'advanced',
    shortcut: 'Ctrl+T',
    keywords: ['tangent', 'branch', 'side'],
    action: async () => ({ action: 'execute', data: '/tangent' })
  });

  items.push({
    id: 'bug',
    label: 'Report Bug',
    description: 'Generate bug report template',
    category: 'advanced',
    keywords: ['bug', 'report', 'issue'],
    action: async () => ({ action: 'execute', data: '/bug' })
  });

  return items;
}

// ============================================
// FUZZY SEARCH
// ============================================

function fuzzyMatch(query: string, text: string): number {
  query = query.toLowerCase();
  text = text.toLowerCase();
  
  if (text.includes(query)) return 100;
  if (text.startsWith(query)) return 90;
  
  let score = 0;
  let queryIdx = 0;
  let consecutive = 0;
  
  for (let i = 0; i < text.length && queryIdx < query.length; i++) {
    if (text[i] === query[queryIdx]) {
      score += 10 + consecutive * 5;
      consecutive++;
      queryIdx++;
    } else {
      consecutive = 0;
    }
  }
  
  return queryIdx === query.length ? score : 0;
}

export function searchPalette(items: PaletteItem[], query: string): PaletteItem[] {
  if (!query.trim()) return items;
  
  const scored = items.map(item => {
    let score = fuzzyMatch(query, item.label);
    score = Math.max(score, fuzzyMatch(query, item.description) * 0.8);
    
    if (item.keywords) {
      for (const kw of item.keywords) {
        score = Math.max(score, fuzzyMatch(query, kw) * 0.9);
      }
    }
    
    return { item, score };
  });
  
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.item);
}

// ============================================
// PALETTE UI
// ============================================

const CATEGORY_LABELS: Record<PaletteCategory, string> = {
  navigation: '🧭 Navigation',
  ai: '🤖 AI',
  mode: '🎯 Mode',
  agent: '👤 Agent',
  model: '⚡ Model',
  provider: '🔌 Provider',
  session: '📋 Session',
  tools: '🔧 Tools',
  mcp: '🔗 MCP',
  project: '📁 Project',
  memory: '🧠 Memory',
  advanced: '⚙️ Advanced'
};

const CATEGORY_ORDER: PaletteCategory[] = [
  'navigation', 'mode', 'agent', 'model', 'provider',
  'session', 'tools', 'mcp', 'project', 'memory', 'advanced'
];

export function formatPaletteItem(item: PaletteItem): string {
  const shortcut = item.shortcut ? pc.gray(` (${item.shortcut})`) : '';
  return `${item.label}${shortcut} - ${pc.gray(item.description)}`;
}

export function groupByCategory(items: PaletteItem[]): Map<PaletteCategory, PaletteItem[]> {
  const groups = new Map<PaletteCategory, PaletteItem[]>();
  
  for (const item of items) {
    if (!groups.has(item.category)) {
      groups.set(item.category, []);
    }
    groups.get(item.category)!.push(item);
  }
  
  return groups;
}

export async function showCommandPalette(): Promise<PaletteResult> {
  const allItems = generatePaletteItems();
  const groups = groupByCategory(allItems);
  
  // Build choices with separators
  const choices: any[] = [];
  
  for (const category of CATEGORY_ORDER) {
    const items = groups.get(category);
    if (!items || items.length === 0) continue;
    
    choices.push(new inquirer.Separator(pc.bold(CATEGORY_LABELS[category])));
    
    for (const item of items) {
      choices.push({
        name: formatPaletteItem(item),
        value: item.id,
        short: item.label
      });
    }
  }
  
  console.log();
  console.log(pc.bold(pc.cyan('Command Palette')) + pc.gray(' (type to search)'));
  console.log(pc.gray('─'.repeat(50)));
  
  try {
    const { selected } = await inquirer.prompt<{ selected: string }>([{
      type: 'list',
      name: 'selected',
      message: '>',
      choices,
      pageSize: 15,
      loop: false
    }]);
    
    const item = allItems.find(i => i.id === selected);
    if (item) {
      return await item.action();
    }
    
    return { action: 'none' };
  } catch (error) {
    return { action: 'none' };
  }
}

// ============================================
// QUICK PALETTE (for specific categories)
// ============================================

export async function showModePalette(): Promise<PaletteResult> {
  const modes = Object.entries(MODE_CONFIGS);
  
  console.log();
  console.log(pc.bold(pc.cyan('Select Mode')));
  console.log(pc.gray('─'.repeat(50)));
  
  const choices = modes.map(([key, config]) => {
    const tools = config.toolsEnabled ? pc.green('tools') : pc.yellow('no-tools');
    return {
      name: `${config.name.padEnd(14)} ${tools.padEnd(12)} ${pc.gray(config.description)}`,
      value: key,
      short: config.name
    };
  });
  
  const { mode } = await inquirer.prompt<{ mode: string }>([{
    type: 'list',
    name: 'mode',
    message: 'Mode:',
    choices,
    pageSize: 10
  }]);
  
  return { action: 'mode', data: mode };
}

export async function showAgentPalette(): Promise<PaletteResult> {
  const agents = Object.entries(BUILTIN_AGENTS);
  
  console.log();
  console.log(pc.bold(pc.cyan('Select Agent')));
  console.log(pc.gray('─'.repeat(50)));
  
  const choices = agents.map(([name, agent]) => ({
    name: `${name.padEnd(14)} ${pc.gray(agent.description)}`,
    value: name,
    short: name
  }));
  
  const { agent } = await inquirer.prompt<{ agent: string }>([{
    type: 'list',
    name: 'agent',
    message: 'Agent:',
    choices,
    pageSize: 12
  }]);
  
  return { action: 'agent', data: agent };
}

export async function showModelPalette(models: any[], currentModel: string): Promise<PaletteResult> {
  if (models.length === 0) {
    return { action: 'none', message: 'No models available' };
  }
  
  console.log();
  console.log(pc.bold(pc.cyan('Select Model')));
  console.log(pc.gray('─'.repeat(50)));
  
  // Group by provider if possible
  const choices = models.map((m: any) => {
    const id = m.id || m.name;
    const context = m.contextLength ? pc.gray(` (${m.contextLength} tokens)`) : '';
    const current = id === currentModel ? pc.green(' ✓') : '';
    return {
      name: `${id}${context}${current}`,
      value: id,
      short: id
    };
  });
  
  const { model } = await inquirer.prompt<{ model: string }>([{
    type: 'list',
    name: 'model',
    message: 'Model:',
    choices,
    default: currentModel,
    pageSize: 15
  }]);
  
  return { action: 'model', data: model };
}

export async function showProviderPalette(_currentProvider: string): Promise<PaletteResult> {
  // Provider switching removed - show status instead
  const { providersCommand } = await import('../commands/providers');
  providersCommand();
  return { action: 'none' };
}
