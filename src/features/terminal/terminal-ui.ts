/**
 * VIBE-CLI v0.0.2 - Terminal UI
 * Interactive command preview with syntax highlighting
 */

import * as readline from 'readline';
import * as child_process from 'child_process';
import chalk from 'chalk';
import { CommandGenerator, GeneratedCommand, CommandGenerationOptions } from './command-generator.js';

/**
 * UI options
 */
export interface TerminalUIOptions {
  copyToClipboard?: boolean;
  executeImmediately?: boolean;
  showExplanation?: boolean;
  syntaxHighlight?: boolean;
}

/**
 * Terminal UI for command generation
 */
export class TerminalUI {
  private commandGenerator: CommandGenerator;

  constructor() {
    this.commandGenerator = new CommandGenerator();
  }

  /**
   * Generate and display command
   */
  async processInput(
    input: string,
    options: TerminalUIOptions = {}
  ): Promise<{
    command: GeneratedCommand;
    executed?: boolean;
    copied?: boolean;
  }> {
    const {
      copyToClipboard = false,
      executeImmediately = false,
      showExplanation = true,
      syntaxHighlight = true,
    } = options;

    // Generate command
    const generated = await this.commandGenerator.generate(input);

    // Display command
    this.displayCommand(generated, { showExplanation, syntaxHighlight });

    let executed = false;
    let copied = false;

    // Copy to clipboard if requested
    if (copyToClipboard) {
      copied = await this.copyToClipboard(generated.command);
    }

    // Execute if requested
    if (executeImmediately) {
      executed = await this.executeCommand(generated.command);
    }

    return { command: generated, executed, copied };
  }

  /**
   * Display generated command
   */
  displayCommand(
    command: GeneratedCommand,
    options: { showExplanation?: boolean; syntaxHighlight?: boolean } = {}
  ): void {
    const { showExplanation = true, syntaxHighlight = true } = options;

    console.log(chalk.cyan('\n🔧 Generated Command:\n'));

    if (syntaxHighlight) {
      this.displaySyntaxHighlighted(command);
    } else {
      console.log(chalk.white(command.command));
    }

    // Validation status
    if (command.isValid) {
      console.log(chalk.green('  ✓ Syntax valid'));
    } else {
      console.log(chalk.red('  ✗ Syntax invalid'));
      for (const error of command.validationErrors) {
        console.log(chalk.red(`    - ${error}`));
      }
    }

    // Show explanation
    if (showExplanation && command.parts.length > 0) {
      console.log(chalk.cyan('\n📖 Explanation:'));
      for (const part of command.parts) {
        const prefix = this.getPartPrefix(part.type);
        const description = part.description || '';
        console.log(`  ${prefix} ${part.value} ${description ? ` - ${description}` : ''}`);
      }
    }

    console.log('');
  }

  /**
   * Display command with syntax highlighting
   */
  private displaySyntaxHighlighted(command: GeneratedCommand): void {
    const parts = this.splitCommandWithQuotes(command.command);

    for (const part of parts) {
      let colored: string;

      if (part.startsWith('-')) {
        colored = chalk.cyan(part);
      } else if (part.startsWith('$')) {
        colored = chalk.magenta(part);
      } else if (part === '|' || part === '>' || part === '<' || part === '&&' || part === ';') {
        colored = chalk.yellow(part);
      } else if (part.startsWith('"') || part.startsWith("'")) {
        colored = chalk.green(part);
      } else {
        colored = chalk.white(part);
      }

      process.stdout.write(colored + ' ');
    }
    console.log('\n');
  }

  /**
   * Split command while preserving quoted strings
   */
  private splitCommandWithQuotes(command: string): string[] {
    const parts: string[] = [];
    let current = '';
    let inQuote: string | null = null;

    for (const char of command) {
      if ((char === '"' || char === "'") && !inQuote) {
        inQuote = char;
        current += char;
      } else if (char === inQuote) {
        inQuote = null;
        current += char;
      } else if (char === ' ' && !inQuote) {
        if (current) {
          parts.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current) {
      parts.push(current);
    }

    return parts;
  }

  /**
   * Get prefix for command part type
   */
  private getPartPrefix(type: string): string {
    switch (type) {
      case 'command':
        return chalk.blue('◆');
      case 'flag':
        return chalk.cyan('◇');
      case 'argument':
        return chalk.white('○');
      case 'pipe':
        return chalk.yellow('│');
      case 'redirect':
        return chalk.yellow('▶');
      default:
        return chalk.gray('·');
    }
  }

  /**
   * Copy command to clipboard
   */
  async copyToClipboard(command: string): Promise<boolean> {
    try {
      const platform = process.platform;

      if (platform === 'darwin') {
        child_process.execSync(`echo '${command}' | pbcopy`);
      } else if (platform === 'linux') {
        child_process.execSync(`echo '${command}' | xclip -selection clipboard`);
      } else if (platform === 'win32') {
        child_process.execSync(`echo ${command} | clip`);
      }

      console.log(chalk.green('\n✓ Copied to clipboard'));
      return true;
    } catch {
      console.log(chalk.yellow('\n⚠ Could not copy to clipboard'));
      console.log(chalk.gray(`   Command: ${command}`));
      return false;
    }
  }

  /**
   * Execute command
   */
  async executeCommand(command: string): Promise<boolean> {
    try {
      console.log(chalk.cyan('\n⚡ Executing...\n'));

      const result = child_process.execSync(command, {
        encoding: 'utf-8',
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024,
      });

      console.log(result);
      console.log(chalk.green('\n✓ Command executed successfully'));
      return true;
    } catch (error: any) {
      console.log(chalk.red('\n✗ Command failed'));
      if (error.stdout) {
        console.log(chalk.gray('Output:'));
        console.log(error.stdout);
      }
      if (error.stderr) {
        console.log(chalk.red('Error:'));
        console.log(error.stderr);
      }
      return false;
    }
  }

  /**
   * Show interactive prompt
   */
  async interactivePrompt(): Promise<void> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const askQuestion = (question: string): Promise<string> => {
      return new Promise((resolve) => {
        rl.question(question, (answer) => {
          resolve(answer);
        });
      });
    };

    console.log(chalk.cyan('\n🔧 Terminal Command Generator'));
    console.log(chalk.gray('═'.repeat(40)));
    console.log(chalk.gray('Describe what you want to do, for example:'));
    console.log(chalk.white('  • "find all TypeScript files"'));
    console.log(chalk.white('  • "search for function_name in js files"'));
    console.log(chalk.white('  • "list all modified files"'));
    console.log(chalk.white('  • "replace foo with bar in txt files"'));
    console.log(chalk.gray('═'.repeat(40)));

    try {
      while (true) {
        const input = await askQuestion(chalk.cyan('\n> '));

        if (!input.trim()) {
          continue;
        }

        if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
          console.log(chalk.gray('Goodbye!'));
          break;
        }

        const result = await this.processInput(input, {
          copyToClipboard: true,
          showExplanation: true,
        });

        // Ask if user wants to execute
        if (result.command.isValid) {
          const execute = await askQuestion(
            chalk.yellow('Execute? (y/n/e for explanation): ')
          );

          if (execute.toLowerCase() === 'y') {
            await this.executeCommand(result.command.command);
          } else if (execute.toLowerCase() === 'e') {
            const explanation = this.commandGenerator.explain(result.command.command);
            console.log(chalk.cyan('\n📖 Explanation:'));
            console.log(explanation);
          }
        }
      }
    } finally {
      rl.close();
    }
  }

  /**
   * Get help text
   */
  getHelpText(): string {
    return `
${chalk.bold('Terminal Command Generator')}

${chalk.bold('Usage:')} vibe cmd "<description>"

${chalk.bold('Examples:')}
  vibe cmd "find all TypeScript files"
  vibe cmd "search for 'TODO' in js files"
  vibe cmd "list all modified files" --execute
  vibe cmd "replace foo with bar in txt files" --clipboard

${chalk.bold('Options:')}
  --shell <bash|zsh|fish|powershell>  Target shell (default: auto-detect)
  --explain                            Show detailed explanation
  --execute                            Execute the command
  --clipboard                          Copy to clipboard

${chalk.bold('Patterns:')}
  • find all <type> files
  • search for "<text>" in <type> files
  • list all modified files
  • replace "<old>" with "<new>" in <type> files
  • check disk usage
  • show all processes
  • kill process <pid>
`;
  }
}

/**
 * Singleton instance
 */
export const terminalUI = new TerminalUI();
