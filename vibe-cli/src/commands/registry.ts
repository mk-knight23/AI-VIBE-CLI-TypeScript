import { ApiClient } from '../core/api';

export interface Command {
  name: string;
  aliases?: string[];
  category: 'basic' | 'ai' | 'project' | 'advanced';
  description: string;
  usage: string;
  crossPlatform: boolean;
  handler: (client: ApiClient, model: string, args?: any) => Promise<string | void>;
}

export const commands: Command[] = [
  // BASIC
  {
    name: 'help',
    aliases: ['h', '?'],
    category: 'basic',
    description: 'Show help',
    usage: '/help [command]',
    crossPlatform: true,
    handler: async () => 'help'
  },
  {
    name: 'palette',
    aliases: ['k', 'commands'],
    category: 'basic',
    description: 'Open command palette',
    usage: '/palette',
    crossPlatform: true,
    handler: async () => 'palette'
  },
  {
    name: 'quit',
    aliases: ['exit', 'q'],
    category: 'basic',
    description: 'Exit CLI',
    usage: '/quit',
    crossPlatform: true,
    handler: async () => 'quit'
  },
  {
    name: 'clear',
    aliases: ['cls'],
    category: 'basic',
    description: 'Clear conversation',
    usage: '/clear',
    crossPlatform: true,
    handler: async () => 'clear'
  },
  {
    name: 'version',
    aliases: ['v'],
    category: 'basic',
    description: 'Show version',
    usage: '/version',
    crossPlatform: true,
    handler: async () => 'version'
  },
  {
    name: 'tools',
    aliases: ['tl'],
    category: 'basic',
    description: 'List all tools',
    usage: '/tools',
    crossPlatform: true,
    handler: async () => 'tools'
  },

  // AI
  {
    name: 'model',
    aliases: ['m'],
    category: 'ai',
    description: 'Switch AI model',
    usage: '/model [provider/model]',
    crossPlatform: true,
    handler: async () => 'model'
  },
  {
    name: 'provider',
    aliases: ['p'],
    category: 'ai',
    description: 'Switch provider',
    usage: '/provider [name]',
    crossPlatform: true,
    handler: async () => 'provider'
  },
  {
    name: 'models',
    category: 'ai',
    description: 'List available models',
    usage: '/models [--local|--cheap|--fast]',
    crossPlatform: true,
    handler: async () => 'models'
  },
  {
    name: 'providers',
    category: 'ai',
    description: 'List providers with health status',
    usage: '/providers [health]',
    crossPlatform: true,
    handler: async () => 'providers'
  },
  {
    name: 'connect',
    category: 'ai',
    description: 'Add provider credentials',
    usage: '/connect [provider]',
    crossPlatform: true,
    handler: async () => 'connect'
  },
  {
    name: 'doctor',
    category: 'ai',
    description: 'Diagnose config issues',
    usage: '/doctor',
    crossPlatform: true,
    handler: async () => 'doctor'
  },
  {
    name: 'status',
    aliases: ['st'],
    category: 'ai',
    description: 'Show system status and metrics',
    usage: '/status [health|metrics|traces]',
    crossPlatform: true,
    handler: async () => 'status'
  },
  {
    name: 'agent',
    category: 'ai',
    description: 'Switch to agent',
    usage: '/agent <name>',
    crossPlatform: true,
    handler: async () => 'agent'
  },
  {
    name: 'tangent',
    aliases: ['t'],
    category: 'ai',
    description: 'Start tangent conversation',
    usage: '/tangent',
    crossPlatform: true,
    handler: async () => 'tangent'
  },
  {
    name: 'usage',
    category: 'ai',
    description: 'Show context usage',
    usage: '/usage',
    crossPlatform: true,
    handler: async () => 'usage'
  },
  {
    name: 'save',
    category: 'ai',
    description: 'Export conversation',
    usage: '/save [file]',
    crossPlatform: true,
    handler: async () => 'save'
  },
  {
    name: 'load',
    category: 'ai',
    description: 'Import conversation',
    usage: '/load <file>',
    crossPlatform: true,
    handler: async () => 'load'
  },

  // PROJECT
  {
    name: 'analyze',
    aliases: ['az'],
    category: 'project',
    description: 'Analyze code quality',
    usage: '/analyze [path]',
    crossPlatform: true,
    handler: async () => 'analyze'
  },
  {
    name: 'security',
    aliases: ['sec'],
    category: 'project',
    description: 'Security scan',
    usage: '/security [path]',
    crossPlatform: true,
    handler: async () => 'security'
  },
  {
    name: 'optimize',
    aliases: ['opt'],
    category: 'project',
    description: 'Optimize bundle',
    usage: '/optimize [path]',
    crossPlatform: true,
    handler: async () => 'optimize'
  },
  {
    name: 'scan',
    category: 'project',
    description: 'Full project scan (quality + security + optimization)',
    usage: '/scan [path]',
    crossPlatform: true,
    handler: async () => 'scan'
  },

  // MCP
  {
    name: 'mcp',
    category: 'ai',
    description: 'Manage MCP servers',
    usage: '/mcp [init|connect|disconnect|tools|status]',
    crossPlatform: true,
    handler: async () => 'mcp'
  },

  // SESSION
  {
    name: 'session',
    aliases: ['sess'],
    category: 'ai',
    description: 'Manage sessions',
    usage: '/session [new|list|switch|rename|delete]',
    crossPlatform: true,
    handler: async () => 'session'
  },

  // DIFF
  {
    name: 'diff',
    category: 'project',
    description: 'Show/checkpoint/revert file changes',
    usage: '/diff [show [file]|full|checkpoint|list|revert <id>]',
    crossPlatform: true,
    handler: async () => 'diff'
  },

  // BUG REPORT
  {
    name: 'bug',
    category: 'basic',
    description: 'Generate bug report template',
    usage: '/bug',
    crossPlatform: true,
    handler: async () => 'bug'
  },

  // CONTEXT
  {
    name: 'context',
    aliases: ['ctx'],
    category: 'ai',
    description: 'Show active context (steering, rules, memory)',
    usage: '/context [show|steering|clear]',
    crossPlatform: true,
    handler: async () => 'context'
  },

  // MODE
  {
    name: 'mode',
    category: 'ai',
    description: 'Switch mode (ask/debug/architect/orchestrator)',
    usage: '/mode [ask|debug|architect|orchestrator]',
    crossPlatform: true,
    handler: async () => 'mode'
  },

  // AUDIT
  {
    name: 'audit',
    category: 'advanced',
    description: 'View tool execution audit log',
    usage: '/audit [stats|recent|export|clear]',
    crossPlatform: true,
    handler: async () => 'audit'
  },

  // APPROVE
  {
    name: 'approve',
    category: 'advanced',
    description: 'Manage pending tool approvals',
    usage: '/approve [list|all|<n>|deny <n>]',
    crossPlatform: true,
    handler: async () => 'approve'
  },

  // ADVANCED
  {
    name: 'refactor',
    category: 'advanced',
    description: 'Refactor code',
    usage: '/refactor <file> [extract|inline]',
    crossPlatform: true,
    handler: async () => 'refactor'
  },
  {
    name: 'test',
    category: 'advanced',
    description: 'Generate tests',
    usage: '/test <file> [framework]',
    crossPlatform: true,
    handler: async () => 'test'
  },
  {
    name: 'docs',
    category: 'advanced',
    description: 'Generate docs',
    usage: '/docs <file>',
    crossPlatform: true,
    handler: async () => 'docs'
  },
  {
    name: 'migrate',
    category: 'advanced',
    description: 'Migrate code',
    usage: '/migrate <file> <from> <to>',
    crossPlatform: true,
    handler: async () => 'migrate'
  },
  {
    name: 'benchmark',
    aliases: ['bench'],
    category: 'advanced',
    description: 'Performance benchmark',
    usage: '/benchmark <file>',
    crossPlatform: true,
    handler: async () => 'benchmark'
  },
  {
    name: 'memory',
    aliases: ['mem'],
    category: 'advanced',
    description: 'View/search memory',
    usage: '/memory [search <query>|clear]',
    crossPlatform: true,
    handler: async () => 'memory'
  },
  {
    name: 'auto',
    aliases: ['autonomous'],
    category: 'advanced',
    description: 'Autonomous mode',
    usage: '/auto',
    crossPlatform: true,
    handler: async () => 'auto'
  },
  {
    name: 'create',
    aliases: ['c'],
    category: 'advanced',
    description: 'Create files from response',
    usage: '/create',
    crossPlatform: true,
    handler: async () => 'create'
  },
  {
    name: 'cmd',
    category: 'advanced',
    description: 'Run custom commands',
    usage: '/cmd <name|list|new|delete|show> [args...]',
    crossPlatform: true,
    handler: async () => 'cmd'
  }
];

export function findCommand(input: string): Command | undefined {
  const name = input.toLowerCase();
  return commands.find(cmd => 
    cmd.name === name || cmd.aliases?.includes(name)
  );
}

export function getCommandsByCategory(category: string): Command[] {
  return commands.filter(cmd => cmd.category === category);
}
