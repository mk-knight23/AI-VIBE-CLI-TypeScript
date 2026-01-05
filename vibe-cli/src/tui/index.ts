/**
 * VIBE-CLI v12 - Interactive CLI Engine
 * Read-Eval-Print Loop and command handling
 */

import * as readline from 'readline';
import chalk from 'chalk';
import { IntentRouter, IntentClassificationResult } from '../intent/router';
import { VibeProviderRouter } from '../providers/router';
import { VibeMemoryManager } from '../memory';
import { Orchestrator } from '../orchestration';
import type { VibeSession, VibeIntent, ProjectContext } from '../types';

interface VibeContext {
  intent: VibeIntent;
  project: ProjectContext;
  memory: VibeMemoryManager;
  session: VibeSession;
  timestamp: Date;
}

export class CLIEngine {
  private rl: readline.Interface;
  private running = true;
  private history: string[] = [];

  constructor(
    private provider: VibeProviderRouter,
    private memory: VibeMemoryManager,
    private orchestrator: Orchestrator,
    private session: VibeSession
  ) {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async start(): Promise<void> {
    this.displayWelcome();
    
    while (this.running) {
      try {
        const input = await this.prompt('vibe > ');
        
        if (!input.trim()) continue;
        
        this.history.push(input);
        
        if (this.isExit(input)) {
          this.displayGoodbye();
          break;
        }
        
        if (this.isHelp(input)) {
          this.displayHelp();
          continue;
        }
        
        await this.processInput(input);
        
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
      }
    }
    
    this.rl.close();
  }

  private displayWelcome(): void {
    console.log(chalk.cyan(`
╔═════════════════════════════════════════════════════════════╗
║                                                             ║
║   ${chalk.white.bold('V I B E')}  ${chalk.green('v12.0.0')}                                    ║
║   ${chalk.gray('AI-Powered Development Environment')}                       ║
║                                                             ║
║   ${chalk.white("Type naturally. I'll understand.")}                          ║
║   Type "help" for available commands                        ║
║                                                             ║
╚═════════════════════════════════════════════════════════════╝
    `));
  }

  private displayGoodbye(): void {
    console.log(chalk.cyan('\nGoodbye! Happy coding! 👋\n'));
  }

  private displayHelp(): void {
    console.log(chalk.cyan(`
╔═════════════════════════════════════════════════════════════╗
║  ${chalk.white('HELP')}                                                    ║
╠═════════════════════════════════════════════════════════════╣
║                                                             ║
║  ${chalk.white('Examples:')})                                                 ║
║    • ${chalk.green('build a REST API with authentication')}                 ║
║    • ${chalk.green('fix the failing tests in auth.ts')}                     ║
║    • ${chalk.green('why is the login flow broken?')}                       ║
║    • ${chalk.green('deploy this project to gcp')}                          ║
║    • ${chalk.green('refactor the data layer')}                             ║
║    • ${chalk.green('generate a dashboard UI')}                             ║
║    • ${chalk.green('remember that we use PostgreSQL')}                     ║
║    • ${chalk.green('run the full test suite')}                             ║
║    • ${chalk.green('scan for security vulnerabilities')}                   ║
║    • ${chalk.green('plan feature: payment processing')}                    ║
║                                                             ║
║  ${chalk.white('Meta-commands:')})                                             ║
║    • ${chalk.green('help')}      - Show this help                          ║
║    • ${chalk.green('history')}   - Show command history                   ║
║    • ${chalk.green('clear')}     - Clear screen                           ║
║    • ${chalk.green('exit')}      - Exit VIBE                              ║
║                                                             ║
╚═════════════════════════════════════════════════════════════╝
    `));
  }

  private async processInput(input: string): Promise<void> {
    const intentRouter = new IntentRouter(this.provider);
    
    // Classify intent
    const spinner = require('ora')({
      text: chalk.gray('Understanding...'),
      spinner: 'dots',
    }).start();
    
    const result: IntentClassificationResult = await intentRouter.classify(input);
    spinner.stop();
    
    // Handle clarification if needed
    if (result.needsClarification && result.suggestedOptions) {
      console.log(chalk.yellow('\nI\'m not sure what you mean. Did you mean:\n'));
      result.suggestedOptions.forEach((opt, i) => {
        console.log(`  ${chalk.white(String(i + 1))}. ${opt.label} - ${opt.description}`);
      });
      return;
    }
    
    const intent = result.intent;
    
    // Build context
    const context: VibeContext = {
      intent,
      project: {
        root: process.cwd(),
        language: 'typescript',
        files: 0,
        tests: 0,
      },
      memory: this.memory,
      session: this.session,
      timestamp: new Date(),
    };
    
    // Create and show plan
    const plan = this.orchestrator.createPlan(intent, context);
    
    console.log(chalk.cyan('\n─── Plan ───\n'));
    
    if (plan.steps && plan.steps.length > 0) {
      plan.steps.forEach((step: any, i: number) => {
        const icon = step.risk === 'high' || step.risk === 'critical' ? '⚠️' : step.risk === 'medium' ? '○' : '●';
        console.log(`  ${chalk.white(String(i + 1))}. ${icon} ${step.description}`);
      });
      
      if (plan.risks && plan.risks.length > 0) {
        console.log(chalk.yellow('\n  Risks:'));
        plan.risks.forEach((risk: string) => {
          console.log(`    • ${risk}`);
        });
      }
    } else {
      console.log(`  ${chalk.white('1.')} ${chalk.cyan('Execute:')} ${intent.query}`);
    }
    
    // Get confirmation
    const confirm = await this.confirm('\nProceed?');
    
    if (!confirm) {
      console.log(chalk.yellow('\nAction cancelled.\n'));
      return;
    }
    
    // Execute
    const execResult = await this.orchestrator.execute(intent, context, { approved: true });
    
    // Display result
    console.log(chalk.cyan('\n─── Result ───\n'));
    
    if (execResult.success) {
      console.log(chalk.green('✓'), execResult.summary || 'Done');
    } else {
      console.log(chalk.red('✗'), execResult.error || 'Something went wrong');
    }
    
    console.log('');
    
    // Update memory if needed
    if (intent.shouldRemember) {
      this.memory.add({
        type: 'action',
        content: input,
        tags: [intent.category],
        confidence: intent.confidence,
        source: 'session',
      });
    }
  }

  private prompt(message: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(message, (answer) => {
        resolve(answer);
      });
    });
  }

  private confirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.rl.question(chalk.cyan(message) + ' (y/n) ', (answer) => {
        resolve(answer.toLowerCase().startsWith('y'));
      });
    });
  }

  private isExit(input: string): boolean {
    const cmd = input.toLowerCase().trim();
    return ['exit', 'quit', 'q', 'bye'].includes(cmd);
  }

  private isHelp(input: string): boolean {
    const cmd = input.toLowerCase().trim();
    return ['help', '?', '--help', '-h'].includes(cmd);
  }
}

export class PromptBuilder {
  buildSystemPrompt(context: string): string {
    return `You are VIBE, an AI-powered development assistant.

Your capabilities:
- Code generation, refactoring, and explanation
- Debugging and error analysis
- Test generation and execution
- Planning and task breakdown
- Security scanning
- Deployment assistance
- Git operations
- Documentation generation

Context:
${context}

Always be helpful, accurate, and concise. Ask for clarification when needed.`;
  }

  buildModulePrompt(moduleName: string, task: string): string {
    return `You are operating in ${moduleName} mode.

Task: ${task}

Provide a clear, actionable response.`;
  }
}

export class REPL {
  private history: string[] = [];
  
  addToHistory(input: string): void {
    this.history.push(input);
  }
  
  getHistory(): string[] {
    return [...this.history];
  }
  
  clearHistory(): void {
    this.history = [];
  }
}
