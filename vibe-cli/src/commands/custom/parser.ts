/**
 * Custom Commands - Markdown-based command definitions
 * Location: .vibe/commands/*.md or ~/.vibe/commands/*.md
 */

import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

export interface CommandArg {
  name: string;
  required?: boolean;
  default?: string;
  description?: string;
}

export interface CustomCommand {
  name: string;
  description: string;
  args: CommandArg[];
  prompt: string;
  source: 'project' | 'user';
  filePath: string;
  aliases?: string[];
  category?: string;
}

const PROJECT_COMMANDS_DIR = path.join(process.cwd(), '.vibe', 'commands');
const USER_COMMANDS_DIR = path.join(homedir(), '.vibe', 'commands');

// Cache for commands
let commandCache: CustomCommand[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 5000; // 5 seconds

export function loadCustomCommands(forceReload = false): CustomCommand[] {
  const now = Date.now();
  if (!forceReload && commandCache && (now - cacheTime) < CACHE_TTL) {
    return commandCache;
  }

  const commands: CustomCommand[] = [];

  // Load project commands (higher priority)
  if (fs.existsSync(PROJECT_COMMANDS_DIR)) {
    commands.push(...loadCommandsFromDir(PROJECT_COMMANDS_DIR, 'project'));
  }

  // Load user commands
  if (fs.existsSync(USER_COMMANDS_DIR)) {
    const userCmds = loadCommandsFromDir(USER_COMMANDS_DIR, 'user');
    // Only add if not overridden by project
    for (const cmd of userCmds) {
      if (!commands.find(c => c.name === cmd.name)) {
        commands.push(cmd);
      }
    }
  }

  commandCache = commands;
  cacheTime = now;
  return commands;
}

function loadCommandsFromDir(dir: string, source: 'project' | 'user'): CustomCommand[] {
  const commands: CustomCommand[] = [];
  
  try {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const cmd = parseCommandFile(content, source, filePath);
      if (cmd) commands.push(cmd);
    }
  } catch {}

  return commands;
}

function parseCommandFile(content: string, source: 'project' | 'user', filePath: string): CustomCommand | null {
  // Parse YAML frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!frontmatterMatch) return null;

  const frontmatter = frontmatterMatch[1];
  const prompt = frontmatterMatch[2].trim();

  // Simple YAML parsing
  const name = extractYamlValue(frontmatter, 'name');
  const description = extractYamlValue(frontmatter, 'description') || '';
  const category = extractYamlValue(frontmatter, 'category');
  const aliasesRaw = extractYamlValue(frontmatter, 'aliases');
  const argsRaw = extractYamlArray(frontmatter, 'args');

  if (!name) return null;

  const args: CommandArg[] = argsRaw.map(arg => {
    if (typeof arg === 'string') {
      return { name: arg, required: true };
    }
    return {
      name: arg.name || arg,
      required: arg.required !== false,
      default: arg.default,
      description: arg.description
    };
  });

  const aliases = aliasesRaw ? aliasesRaw.split(',').map(a => a.trim()) : undefined;

  return { name, description, args, prompt, source, filePath, aliases, category };
}

function extractYamlValue(yaml: string, key: string): string | undefined {
  const match = yaml.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : undefined;
}

function extractYamlArray(yaml: string, key: string): any[] {
  const match = yaml.match(new RegExp(`${key}:\\s*\\n((?:\\s+-[^\\n]+\\n?)+)`, 'm'));
  if (!match) return [];
  
  return match[1]
    .split('\n')
    .filter(line => line.trim().startsWith('-'))
    .map(line => {
      const value = line.replace(/^\s*-\s*/, '').trim();
      // Check if it's an object (has colon)
      if (value.includes(':')) {
        const obj: any = {};
        value.split(',').forEach(part => {
          const [k, v] = part.split(':').map(s => s.trim());
          obj[k] = v === 'true' ? true : v === 'false' ? false : v;
        });
        return obj;
      }
      return value;
    });
}

export function getCommand(name: string): CustomCommand | undefined {
  const commands = loadCustomCommands();
  return commands.find(c => c.name === name || c.aliases?.includes(name));
}

export function expandPrompt(command: CustomCommand, providedArgs: Record<string, string>): string {
  let prompt = command.prompt;

  for (const arg of command.args) {
    const value = providedArgs[arg.name] || arg.default || '';
    if (arg.required && !value) {
      throw new Error(`Missing required argument: ${arg.name}`);
    }
    // Support both $ARG and ${ARG} syntax
    prompt = prompt.replace(new RegExp(`\\$\\{?${arg.name}\\}?`, 'g'), value);
  }

  return prompt;
}

export function listCommands(): { name: string; description: string; source: string; category?: string }[] {
  return loadCustomCommands().map(c => ({
    name: c.name,
    description: c.description,
    source: c.source,
    category: c.category
  }));
}

export function getCommandsByCategory(): Record<string, CustomCommand[]> {
  const commands = loadCustomCommands();
  const byCategory: Record<string, CustomCommand[]> = { uncategorized: [] };
  
  for (const cmd of commands) {
    const cat = cmd.category || 'uncategorized';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(cmd);
  }
  
  return byCategory;
}

export function createCommand(
  name: string,
  description: string,
  prompt: string,
  args: CommandArg[] = [],
  location: 'project' | 'user' = 'project'
): string {
  const dir = location === 'project' ? PROJECT_COMMANDS_DIR : USER_COMMANDS_DIR;
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const argsYaml = args.length > 0 
    ? `args:\n${args.map(a => `  - name: ${a.name}${a.required === false ? ', required: false' : ''}${a.default ? `, default: ${a.default}` : ''}`).join('\n')}\n`
    : '';

  const content = `---
name: ${name}
description: ${description}
${argsYaml}---
${prompt}
`;

  const filePath = path.join(dir, `${name}.md`);
  fs.writeFileSync(filePath, content);
  
  // Invalidate cache
  commandCache = null;
  
  return filePath;
}

export function deleteCommand(name: string): boolean {
  const cmd = getCommand(name);
  if (!cmd) return false;
  
  try {
    fs.unlinkSync(cmd.filePath);
    commandCache = null;
    return true;
  } catch {
    return false;
  }
}

export function getCommandUsage(command: CustomCommand): string {
  const args = command.args.map(a => {
    if (a.required) return `<${a.name}>`;
    return `[${a.name}${a.default ? `=${a.default}` : ''}]`;
  }).join(' ');
  
  return `vibe cmd ${command.name} ${args}`.trim();
}
