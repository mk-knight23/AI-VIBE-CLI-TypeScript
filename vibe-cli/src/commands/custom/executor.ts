/**
 * Custom Command Executor - Run markdown-defined commands
 * Usage: vibe cmd <name> [--arg=value] or /cmd <name> [args]
 */

import { 
  getCommand, 
  expandPrompt, 
  listCommands, 
  getCommandsByCategory,
  createCommand,
  deleteCommand,
  getCommandUsage,
  CustomCommand 
} from './parser';
import { askMode } from '../../cli/modes/ask';
import pc from 'picocolors';

export interface ExecuteResult {
  success: boolean;
  prompt?: string;
  message?: string;
  error?: string;
}

// CLI mode: vibe cmd <name> [args]
export async function cmdMode(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === '--list' || args[0] === '-l') {
    showCommandList();
    return;
  }

  if (args[0] === '--new' || args[0] === '-n') {
    handleNewCLI(args.slice(1));
    return;
  }

  if (args[0] === '--delete' || args[0] === '-d') {
    handleDeleteCLI(args[1]);
    return;
  }

  const cmdName = args[0];
  const command = getCommand(cmdName);

  if (!command) {
    console.error(pc.red(`Unknown command: ${cmdName}`));
    console.error(pc.gray('Use "vibe cmd --list" to see available commands'));
    process.exit(1);
  }

  const providedArgs = parseCommandArgs(args.slice(1), command);

  try {
    const prompt = expandPrompt(command, providedArgs);
    await askMode([prompt, ...args.filter(a => a.startsWith('--') && !a.includes('='))]);
  } catch (err: any) {
    console.error(pc.red(`Error: ${err.message}`));
    console.error(pc.gray(`Usage: ${getCommandUsage(command)}`));
    process.exit(1);
  }
}

// Slash command mode: /cmd <subcommand|name> [args]
export function executeCustomCommand(input: string): ExecuteResult {
  const match = input.match(/^\/cmd\s+(\S+)(?:\s+(.*))?$/);
  if (!match) {
    return { success: false, error: 'Usage: /cmd <name> [args...] or /cmd list|new|delete' };
  }

  const [, subcommand, argsStr] = match;

  if (subcommand === 'list') return handleList();
  if (subcommand === 'new') return handleNew(argsStr);
  if (subcommand === 'delete' || subcommand === 'rm') return handleDelete(argsStr);
  if (subcommand === 'show') return handleShow(argsStr);

  const command = getCommand(subcommand);
  if (!command) {
    const available = listCommands();
    if (available.length === 0) {
      return { success: false, error: `Command "${subcommand}" not found. Create with: /cmd new <name>` };
    }
    return { success: false, error: `Command "${subcommand}" not found. Use /cmd list` };
  }

  try {
    const args = parseSlashArgs(argsStr || '', command);
    const prompt = expandPrompt(command, args);
    return { success: true, prompt };
  } catch (err: any) {
    return { success: false, error: `${err.message}\nUsage: ${getCommandUsage(command)}` };
  }
}

function handleList(): ExecuteResult {
  const byCategory = getCommandsByCategory();
  const categories = Object.keys(byCategory).filter(c => byCategory[c].length > 0);
  
  if (categories.length === 0 || (categories.length === 1 && byCategory.uncategorized?.length === 0)) {
    return { success: true, message: 'No custom commands. Create with: /cmd new <name>' };
  }

  let msg = 'Custom Commands:\n';
  for (const cat of categories) {
    if (cat !== 'uncategorized') msg += `\n[${cat}]\n`;
    for (const cmd of byCategory[cat]) {
      const src = cmd.source === 'project' ? '📁' : '👤';
      msg += `  ${src} ${cmd.name} - ${cmd.description || '(no description)'}\n`;
    }
  }
  return { success: true, message: msg };
}

function handleNew(argsStr?: string): ExecuteResult {
  if (!argsStr) return { success: false, error: 'Usage: /cmd new <name> [--user]' };
  
  const isUser = argsStr.includes('--user');
  const name = argsStr.replace('--user', '').trim().split(' ')[0];
  
  if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) {
    return { success: false, error: 'Name must start with letter, contain only a-z, 0-9, -' };
  }

  if (getCommand(name)) return { success: false, error: `Command "${name}" already exists` };

  const filePath = createCommand(name, 'Description here', 'Your prompt template. Use $ARG for arguments.', [], isUser ? 'user' : 'project');
  return { success: true, message: `Created: ${filePath}\nEdit the file to customize.` };
}

function handleDelete(argsStr?: string): ExecuteResult {
  const name = argsStr?.trim();
  if (!name) return { success: false, error: 'Usage: /cmd delete <name>' };
  if (deleteCommand(name)) return { success: true, message: `Deleted: ${name}` };
  return { success: false, error: `Command "${name}" not found` };
}

function handleShow(argsStr?: string): ExecuteResult {
  const name = argsStr?.trim();
  if (!name) return { success: false, error: 'Usage: /cmd show <name>' };

  const cmd = getCommand(name);
  if (!cmd) return { success: false, error: `Command "${name}" not found` };

  let msg = `Command: ${cmd.name}\nDescription: ${cmd.description || '(none)'}\nSource: ${cmd.source} (${cmd.filePath})\n`;
  if (cmd.aliases?.length) msg += `Aliases: ${cmd.aliases.join(', ')}\n`;
  if (cmd.args.length) {
    msg += `Arguments:\n`;
    for (const arg of cmd.args) {
      msg += `  ${arg.name}${arg.required ? ' (required)' : ''}${arg.default ? ` [default: ${arg.default}]` : ''}\n`;
    }
  }
  msg += `\nUsage: ${getCommandUsage(cmd)}`;
  return { success: true, message: msg };
}

function handleNewCLI(args: string[]): void {
  const result = handleNew(args.join(' '));
  if (result.success) {
    console.log(pc.green(result.message!));
  } else {
    console.error(pc.red(result.error!));
    process.exit(1);
  }
}

function handleDeleteCLI(name?: string): void {
  const result = handleDelete(name);
  if (result.success) {
    console.log(pc.green(result.message!));
  } else {
    console.error(pc.red(result.error!));
    process.exit(1);
  }
}

function parseCommandArgs(args: string[], command: CustomCommand): Record<string, string> {
  const result: Record<string, string> = {};
  let positionalIndex = 0;

  for (const arg of args) {
    if (arg.startsWith('--') && arg.includes('=')) {
      const [key, value] = arg.slice(2).split('=');
      result[key] = value;
    } else if (!arg.startsWith('-')) {
      if (positionalIndex < command.args.length) {
        result[command.args[positionalIndex++].name] = arg;
      }
    }
  }
  return result;
}

function parseSlashArgs(argsStr: string, command: CustomCommand): Record<string, string> {
  const args: Record<string, string> = {};
  const tokens = tokenize(argsStr);
  let positionalIndex = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.startsWith('--')) {
      const eqIndex = token.indexOf('=');
      if (eqIndex > 0) {
        args[token.slice(2, eqIndex)] = token.slice(eqIndex + 1);
      } else {
        args[token.slice(2)] = tokens[++i] || '';
      }
    } else if (positionalIndex < command.args.length) {
      args[command.args[positionalIndex++].name] = token;
    }
  }
  return args;
}

function tokenize(str: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';

  for (const char of str) {
    if ((char === '"' || char === "'") && !inQuote) {
      inQuote = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuote) {
      inQuote = false;
    } else if (char === ' ' && !inQuote) {
      if (current) { tokens.push(current); current = ''; }
    } else {
      current += char;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

function showCommandList(): void {
  const commands = listCommands();

  if (commands.length === 0) {
    console.log(pc.yellow('No custom commands found.'));
    console.log(pc.gray('\nCreate: vibe cmd --new <name>'));
    console.log(pc.gray('Or add .vibe/commands/*.md files'));
    return;
  }

  console.log(pc.bold('\nCustom Commands:\n'));
  
  const projectCmds = commands.filter(c => c.source === 'project');
  const userCmds = commands.filter(c => c.source === 'user');

  if (projectCmds.length > 0) {
    console.log(pc.cyan('Project (.vibe/commands/):'));
    projectCmds.forEach(c => console.log(`  ${pc.green(c.name)} - ${pc.gray(c.description)}`));
  }

  if (userCmds.length > 0) {
    console.log(pc.cyan('\nUser (~/.vibe/commands/):'));
    userCmds.forEach(c => console.log(`  ${pc.green(c.name)} - ${pc.gray(c.description)}`));
  }

  console.log(pc.gray('\nUsage: vibe cmd <name> [args...]'));
}

export function getCustomCommandHelp(): string {
  return `Custom Commands:
  /cmd list              - List all commands
  /cmd new <name>        - Create command (--user for global)
  /cmd delete <name>     - Delete a command
  /cmd show <name>       - Show command details
  /cmd <name> [args...]  - Run a command`;
}

export { listCommands, getCommand };
