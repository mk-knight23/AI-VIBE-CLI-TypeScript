/**
 * VIBE-CLI v0.0.2 - Terminal Command Generator
 * Convert natural language to shell commands
 */

import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

/**
 * Shell type
 */
export type ShellType = 'bash' | 'zsh' | 'powershell' | 'fish' | 'cmd';

/**
 * Command generation options
 */
export interface CommandGenerationOptions {
  shell?: ShellType;
  dryRun?: boolean;
  explain?: boolean;
}

/**
 * Generated command
 */
export interface GeneratedCommand {
  command: string;
  shell: ShellType;
  explanation: string;
  parts: CommandPart[];
  syntax: string;
  isValid: boolean;
  validationErrors: string[];
}

/**
 * Command part
 */
export interface CommandPart {
  type: 'command' | 'argument' | 'flag' | 'option' | 'pipe' | 'redirect' | 'variable';
  value: string;
  description?: string;
}

/**
 * Command template
 */
interface CommandTemplate {
  patterns: RegExp[];
  generate: (matches: RegExpMatchArray, shell: ShellType) => GeneratedCommand;
}

/**
 * Terminal Command Generator
 */
export class CommandGenerator {
  private readonly shellType!: ShellType;
  private readonly templates: CommandTemplate[];

  constructor(shell?: ShellType) {
    this.shellType = shell || this.detectShell();
    this.templates = this.initializeTemplates();
  }

  /**
   * Detect current shell
   */
  private detectShell(): ShellType {
    const shellPath = process.env.SHELL || '';
    if (shellPath.includes('zsh')) return 'zsh';
    if (shellPath.includes('bash')) return 'bash';
    if (shellPath.includes('fish')) return 'fish';
    if (process.env.POWERSHELL_VERSION) return 'powershell';
    if (process.env.COMSPEC?.includes('cmd')) return 'cmd';
    return 'bash';
  }

  /**
   * Initialize command templates
   */
  private initializeTemplates(): CommandTemplate[] {
    return [
      // Find files
      {
        patterns: [
          /find\s+(all\s+)?([a-zA-Z0-9_-]+)\s+files?/i,
          /search\s+(for\s+)?([a-zA-Z0-9_-]+)\s+files?/i,
          /list\s+(all\s+)?([a-zA-Z0-9_-]+)\s+files?/i,
          /find\s+([a-zA-Z0-9_-]+)$/i,
        ],
        generate: (matches, shell) => {
          const extension = matches[2] || matches[1];
          return this.generateFindCommand(extension, shell);
        },
      },
      // Find modified files
      {
        patterns: [
          /find\s+(all\s+)?modified\s+(files?|since|after|in)/i,
          /files?\s+(that\s+)?changed/i,
        ],
        generate: (_matches, shell) => this.generateModifiedFilesCommand(shell),
      },
      // Find recent files
      {
        patterns: [
          /find\s+(all\s+)?recent\s+(files?|changes)/i,
          /files?\s+(from|modified)\s+(today|yesterday|last\s+\w+)/i,
        ],
        generate: (_matches, shell) => this.generateRecentFilesCommand(shell),
      },
      // Grep search
      {
        patterns: [
          /search\s+(for\s+)?["']([^"']+)["']/i,
          /grep\s+(for\s+)?["']([^"']+)["']/i,
          /find\s+(all\s+)?lines?\s+(with|containing)\s+["']([^"']+)["']/i,
        ],
        generate: (matches, shell) => this.generateGrepCommand(matches[2] || matches[3], shell),
      },
      // Replace text
      {
        patterns: [
          /replace\s+(all\s+)?["']([^"']+)["']\s+(with|in)\s+["']([^"']+)["']/i,
          /change\s+(all\s+)?["']([^"']+)["']\s+to\s+["']([^"']+)["']/i,
          /sed\s+(for\s+)?["']([^"']+)["']/i,
        ],
        generate: (matches, shell) =>
          this.generateSedCommand(matches[2], matches[4], shell),
      },
      // List directory
      {
        patterns: [
          /list\s+(all\s+)?files?(\s+in\s+(current\s+)?directory)?/i,
          /ls\s+(all\s+)?files?/i,
        ],
        generate: (_matches, shell) => this.generateLsCommand(shell),
      },
      // Check disk usage
      {
        patterns: [
          /check\s+(disk\s+)?usage/i,
          /disk\s+space/i,
          /du\s+(-sh)?/i,
        ],
        generate: (_matches, shell) => this.generateDiskUsageCommand(shell),
      },
      // Process management
      {
        patterns: [
          /show\s+(all\s+)?processes?/i,
          /list\s+(all\s+)?processes?/i,
          /ps\s+aux/i,
        ],
        generate: (_matches, shell) => this.generatePsCommand(shell),
      },
      // Kill process
      {
        patterns: [
          /kill\s+(process\s+)?(\d+)/i,
          /stop\s+(process\s+)?(\d+)/i,
        ],
        generate: (matches, shell) => this.generateKillCommand(matches[2], shell),
      },
      // Network connections
      {
        patterns: [
          /show\s+(network\s+)?connections?/i,
          /netstat/i,
          /ss\s+/i,
        ],
        generate: (_matches, shell) => this.generateNetstatCommand(shell),
      },
      // Git commands
      {
        patterns: [
          /git\s+(status|log|branch|checkout|commit|push|pull|merge)/i,
        ],
        generate: (matches, shell) => this.generateGitCommand(matches[1].toLowerCase(), shell),
      },
      // Package management
      {
        patterns: [
          /npm\s+install/i,
          /yarn\s+install/i,
          /pip\s+install/i,
          /apt\s+install/i,
        ],
        generate: (matches, shell) =>
          this.generatePackageCommand(matches[0], shell),
      },
    ];
  }

  /**
   * Generate command from natural language
   */
  async generate(naturalLanguage: string, options: CommandGenerationOptions & { history?: string[], provider?: any } = {}): Promise<GeneratedCommand> {
    const { shell = this.shellType, history, provider } = options;

    // 1. Try to match against templates
    for (const template of this.templates) {
      for (const pattern of template.patterns) {
        const matches = naturalLanguage.match(pattern);
        if (matches) {
          return template.generate(matches, shell);
        }
      }
    }

    // 2. Try predictive history matching
    if (history) {
      const suggestion = this.suggestFromHistory(naturalLanguage, history);
      if (suggestion) return suggestion;
    }

    // 3. AI Fallback if provider is available
    if (provider) {
      return this.generateWithAI(naturalLanguage, provider, shell);
    }

    // Fallback: return help
    return this.generateHelpCommand(shell);
  }

  /**
   * Suggest a command based on history
   */
  private suggestFromHistory(query: string, history: string[]): GeneratedCommand | null {
    const queryLower = query.toLowerCase();
    // Simple reversal search for last similar command
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].toLowerCase().includes(queryLower)) {
        return {
          command: history[i],
          shell: this.shellType,
          explanation: 'Found in command history',
          parts: [{ type: 'command', value: history[i] }],
          syntax: history[i],
          isValid: true,
          validationErrors: [],
        };
      }
    }
    return null;
  }

  /**
   * AI-powered command generation fallback
   */
  private async generateWithAI(input: string, provider: any, shell: ShellType): Promise<GeneratedCommand> {
    const prompt = `Convert this natural language request into a single SHELL command for ${shell}: "${input}".
Respond ONLY with the command. No other text.`;

    try {
      const response = await provider.chat([{ role: 'system', content: 'You are a shell command expert.' }, { role: 'user', content: prompt }]);
      const command = response.content.trim().replace(/```/g, '');

      return {
        command,
        shell,
        explanation: 'AI-generated command suggestion',
        parts: [{ type: 'command', value: command }],
        syntax: command,
        isValid: true,
        validationErrors: [],
      };
    } catch (error) {
      return this.generateHelpCommand(shell);
    }
  }

  /**
   * Validate a command
   */
  validate(command: string, shell: ShellType = this.shellType): {
    isValid: boolean;
    errors: string[];
    suggestions: string[];
  } {
    const errors: string[] = [];
    const suggestions: string[] = [];

    // Check for common syntax errors
    if (command.includes(';') && !command.includes('\\;')) {
      suggestions.push('Consider using && instead of ; for sequential commands');
    }

    if (command.includes('rm -rf') && !command.includes('/')) {
      errors.push('Destructive command detected: rm -rf');
      suggestions.push('Double-check the path before execution');
    }

    if (command.includes('sudo') && !command.includes('password')) {
      suggestions.push('This command requires sudo privileges');
    }

    // Check for unclosed quotes
    const singleQuotes = (command.match(/'/g) || []).length;
    const doubleQuotes = (command.match(/"/g) || []).length;
    if (singleQuotes % 2 !== 0) {
      errors.push('Unclosed single quote');
    }
    if (doubleQuotes % 2 !== 0) {
      errors.push('Unclosed double quote');
    }

    // Check for dangerous commands
    const dangerousCommands = ['rm', 'mkfs', 'dd', 'format'];
    for (const cmd of dangerousCommands) {
      if (new RegExp(`\\b${cmd}\\s+-?[rf]?\\b`).test(command)) {
        suggestions.push(`Command '${cmd}' is potentially destructive`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      suggestions,
    };
  }

  /**
   * Generate explanation for command
   */
  explain(command: string, shell: ShellType = this.shellType): string {
    const parts = this.parseCommandParts(command);
    const explanations: string[] = [];

    for (const part of parts) {
      switch (part.type) {
        case 'command':
          explanations.push(`'${part.value}' is the main command`);
          break;
        case 'flag':
          explanations.push(`-${part.value} is a flag/option`);
          break;
        case 'argument':
          explanations.push(`'${part.value}' is an argument`);
          break;
        case 'pipe':
          explanations.push(`'|' pipes output to the next command`);
          break;
        case 'redirect':
          explanations.push(`'>' redirects output to a file`);
          break;
      }
    }

    return explanations.join('\n');
  }

  /**
   * Parse command into parts
   */
  private parseCommandParts(command: string): CommandPart[] {
    const parts: CommandPart[] = [];
    const tokens = command.split(/\s+(?=(?:[^'"]*['"][^'"]*['"])*[^'"]*$)/);

    for (const token of tokens) {
      if (token.startsWith('-')) {
        parts.push({ type: 'flag', value: token });
      } else if (token === '|') {
        parts.push({ type: 'pipe', value: token });
      } else if (token.includes('>') || token.includes('<')) {
        parts.push({ type: 'redirect', value: token });
      } else if (token.startsWith('$')) {
        parts.push({ type: 'variable', value: token });
      } else {
        parts.push({ type: 'command', value: token });
      }
    }

    return parts;
  }

  /**
   * Generate find command for files
   */
  private generateFindCommand(extension: string, shell: ShellType): GeneratedCommand {
    const extPattern = extension.startsWith('.') ? extension : `*.${extension}`;
    const command = `find . -type f -name "${extPattern}"`;

    return {
      command,
      shell,
      explanation: `Find all files matching the pattern ${extPattern}`,
      parts: [
        { type: 'command', value: 'find', description: 'Search for files' },
        { type: 'argument', value: '.', description: 'Start from current directory' },
        { type: 'flag', value: '-type f', description: 'Find files only (not directories)' },
        { type: 'flag', value: `-name "${extPattern}"`, description: 'Match filename pattern' },
      ],
      syntax: command,
      isValid: true,
      validationErrors: [],
    };
  }

  /**
   * Generate modified files command
   */
  private generateModifiedFilesCommand(shell: ShellType): GeneratedCommand {
    const command = 'git status --porcelain | grep "^.M" | awk "{print $2}"';

    return {
      command,
      shell,
      explanation: 'Show all modified (not staged) files',
      parts: [
        { type: 'command', value: 'git status', description: 'Show working tree status' },
        { type: 'flag', value: '--porcelain', description: 'Machine-parseable output' },
        { type: 'pipe', value: '|' },
        { type: 'command', value: 'grep', description: 'Filter lines' },
        { type: 'flag', value: '"^.M"', description: 'Match modified files' },
        { type: 'pipe', value: '|' },
        { type: 'command', value: 'awk', description: 'Extract second column' },
        { type: 'flag', value: '"{print $2}"', description: 'Print filename' },
      ],
      syntax: command,
      isValid: true,
      validationErrors: [],
    };
  }

  /**
   * Generate recent files command
   */
  private generateRecentFilesCommand(shell: ShellType): GeneratedCommand {
    const command = 'find . -type f -mtime -1';

    return {
      command,
      shell,
      explanation: 'Find all files modified in the last day',
      parts: [
        { type: 'command', value: 'find', description: 'Search for files' },
        { type: 'argument', value: '.', description: 'Start from current directory' },
        { type: 'flag', value: '-type f', description: 'Find files only' },
        { type: 'flag', value: '-mtime -1', description: 'Modified within last 24 hours' },
      ],
      syntax: command,
      isValid: true,
      validationErrors: [],
    };
  }

  /**
   * Generate grep command
   */
  private generateGrepCommand(pattern: string, shell: ShellType): GeneratedCommand {
    const command = `grep -r "${pattern}" . --include="*.ts" --include="*.js"`;

    return {
      command,
      shell,
      explanation: `Recursively search for "${pattern}" in TypeScript and JavaScript files`,
      parts: [
        { type: 'command', value: 'grep', description: 'Search text patterns' },
        { type: 'flag', value: '-r', description: 'Search recursively' },
        { type: 'argument', value: `"${pattern}"`, description: 'Search pattern' },
        { type: 'argument', value: '.', description: 'Start directory' },
        { type: 'flag', value: '--include="*.ts"', description: 'Search TypeScript files' },
        { type: 'flag', value: '--include="*.js"', description: 'Search JavaScript files' },
      ],
      syntax: command,
      isValid: true,
      validationErrors: [],
    };
  }

  /**
   * Generate sed command for text replacement
   */
  private generateSedCommand(
    search: string,
    replace: string,
    shell: ShellType
  ): GeneratedCommand {
    const command = `find . -type f -name "*.txt" -exec sed -i 's/${search}/${replace}/g' {} \\;`;

    return {
      command,
      shell,
      explanation: `Replace all occurrences of "${search}" with "${replace}" in text files`,
      parts: [
        { type: 'command', value: 'find', description: 'Find files' },
        { type: 'argument', value: '.', description: 'Start directory' },
        { type: 'flag', value: '-type f', description: 'Files only' },
        { type: 'flag', value: '-name "*.txt"', description: 'Text files' },
        { type: 'flag', value: '-exec', description: 'Execute command on each file' },
        { type: 'command', value: 'sed', description: 'Stream editor' },
        { type: 'flag', value: '-i', description: 'Edit in-place' },
        { type: 'argument', value: `'s/${search}/${replace}/g'`, description: 'Replace pattern' },
        { type: 'argument', value: '{}', description: 'File placeholder' },
        { type: 'argument', value: '\\;', description: 'End exec' },
      ],
      syntax: command,
      isValid: true,
      validationErrors: [],
    };
  }

  /**
   * Generate ls command
   */
  private generateLsCommand(shell: ShellType): GeneratedCommand {
    const command = 'ls -la';

    return {
      command,
      shell,
      explanation: 'List all files with details (long format, show hidden)',
      parts: [
        { type: 'command', value: 'ls', description: 'List directory contents' },
        { type: 'flag', value: '-l', description: 'Long format' },
        { type: 'flag', value: '-a', description: 'Show hidden files' },
      ],
      syntax: command,
      isValid: true,
      validationErrors: [],
    };
  }

  /**
   * Generate disk usage command
   */
  private generateDiskUsageCommand(shell: ShellType): GeneratedCommand {
    const command = 'df -h';

    return {
      command,
      shell,
      explanation: 'Show disk usage in human-readable format',
      parts: [
        { type: 'command', value: 'df', description: 'Report file system disk space usage' },
        { type: 'flag', value: '-h', description: 'Human-readable sizes' },
      ],
      syntax: command,
      isValid: true,
      validationErrors: [],
    };
  }

  /**
   * Generate ps command
   */
  private generatePsCommand(shell: ShellType): GeneratedCommand {
    const command = 'ps aux | grep -v grep';

    return {
      command,
      shell,
      explanation: 'Show all running processes',
      parts: [
        { type: 'command', value: 'ps', description: 'Report a snapshot of current processes' },
        { type: 'flag', value: 'aux', description: 'All processes with user and full details' },
        { type: 'pipe', value: '|' },
        { type: 'command', value: 'grep', description: 'Filter output' },
        { type: 'flag', value: '-v grep', description: 'Exclude grep itself' },
      ],
      syntax: command,
      isValid: true,
      validationErrors: [],
    };
  }

  /**
   * Generate kill command
   */
  private generateKillCommand(pid: string, shell: ShellType): GeneratedCommand {
    const command = `kill ${pid}`;

    return {
      command,
      shell,
      explanation: `Terminate process ${pid}`,
      parts: [
        { type: 'command', value: 'kill', description: 'Send a signal to a process' },
        { type: 'argument', value: pid, description: 'Process ID to terminate' },
      ],
      syntax: command,
      isValid: true,
      validationErrors: [],
    };
  }

  /**
   * Generate netstat command
   */
  private generateNetstatCommand(shell: ShellType): GeneratedCommand {
    const command = 'netstat -tulpn';

    return {
      command,
      shell,
      explanation: 'Show listening TCP/UDP ports',
      parts: [
        { type: 'command', value: 'netstat', description: 'Network statistics' },
        { type: 'flag', value: '-t', description: 'TCP connections' },
        { type: 'flag', value: '-u', description: 'UDP connections' },
        { type: 'flag', value: '-l', description: 'Listening sockets only' },
        { type: 'flag', value: '-p', description: 'Show PID/Program name' },
        { type: 'flag', value: '-n', description: 'Numerical addresses' },
      ],
      syntax: command,
      isValid: true,
      validationErrors: [],
    };
  }

  /**
   * Generate git command
   */
  private generateGitCommand(subcommand: string, shell: ShellType): GeneratedCommand {
    const commands: Record<string, string> = {
      status: 'git status',
      log: 'git log --oneline -10',
      branch: 'git branch -a',
      checkout: 'git checkout -b',
      commit: 'git commit -m ""',
      push: 'git push origin HEAD',
      pull: 'git pull origin HEAD',
      merge: 'git merge --no-ff',
    };

    const command = commands[subcommand] || `git ${subcommand}`;

    return {
      command,
      shell,
      explanation: `Execute git ${subcommand} command`,
      parts: [{ type: 'command', value: command }],
      syntax: command,
      isValid: true,
      validationErrors: [],
    };
  }

  /**
   * Generate package manager command
   */
  private generatePackageCommand(
    packageManager: string,
    shell: ShellType
  ): GeneratedCommand {
    const normalized = packageManager.toLowerCase();
    let command = 'npm install';

    if (normalized.includes('yarn')) command = 'yarn install';
    else if (normalized.includes('pip')) command = 'pip install -r requirements.txt';
    else if (normalized.includes('apt')) command = 'sudo apt update && sudo apt install';

    return {
      command,
      shell,
      explanation: `Run ${normalized} install command`,
      parts: [{ type: 'command', value: command }],
      syntax: command,
      isValid: true,
      validationErrors: [],
    };
  }

  /**
   * Generate help command
   */
  private generateHelpCommand(shell: ShellType): GeneratedCommand {
    const command = 'echo "Could not understand. Try: find files, search for text, list files, etc."';

    return {
      command,
      shell,
      explanation: 'Could not parse command - please try again with different wording',
      parts: [],
      syntax: command,
      isValid: false,
      validationErrors: ['No matching command pattern found'],
    };
  }
}

/**
 * Singleton instance
 */
export const commandGenerator = new CommandGenerator();
