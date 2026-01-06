/**
 * VIBE-CLI v12 - Interactive CLI Engine
 *
 * SINGLE SOURCE OF TRUTH = LLM RESPONSE
 * - Internal commands handled without AI
 * - Real AI response or real error
 * - No fake planner, no fake success
 */

import * as child_process from 'child_process';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { VibeProviderRouter } from '../providers/router';
import { VibeMemoryManager } from '../memory';
import { VibeConfigManager } from '../config';
import { VIBE_SYSTEM_PROMPT } from '../cli/system-prompt';
import { rl, prompt } from '../cli/ui';

export class CLIEngine {
  private running = true;
  private history: string[] = [];
  private historyFile: string;
  private configManager: VibeConfigManager;

  constructor(
    private provider: VibeProviderRouter,
    private memory: VibeMemoryManager
  ) {
    this.configManager = new VibeConfigManager(provider);
    this.historyFile = path.join(process.cwd(), '.vibe_history');
    this.loadHistory();
  }

  // ============================================================================
  // MAIN ENTRY POINT
  // ============================================================================

  async start(): Promise<void> {
    this.displayWelcome();
    await this.configManager.runFirstTimeSetup();

    // Infinite REPL loop - NEVER exits unless /exit
    while (this.running) {
      try {
        const input = await prompt('vibe > ');
        await this.handleInput(input);
      } catch (error) {
        // Never let errors escape - keep REPL alive
        console.log(chalk.red('\nAn error occurred. Try again.\n'));
      }
    }
  }

  // ============================================================================
  // INPUT HANDLER - SINGLE SOURCE OF TRUTH
  // ============================================================================

  private async handleInput(input: string): Promise<void> {
    const trimmed = input.trim();
    if (!trimmed) return;

    // Save to history
    this.history.push(trimmed);
    this.saveHistory();

    // ========================================
    // INTERNAL COMMANDS - NO AI
    // ========================================
    if (trimmed.startsWith('/')) {
      await this.handleInternalCommand(trimmed);
      return;
    }

    // ========================================
    // EXIT COMMANDS
    // ========================================
    const lower = trimmed.toLowerCase();
    if (lower === 'exit' || lower === 'quit') {
      console.log(chalk.cyan('\nGoodbye! Happy coding! 👋\n'));
      this.running = false;
      return;
    }

    // ========================================
    // PROVIDER/MODEL SWITCHING
    // ========================================
    if (this.handleProviderModelSwitching(trimmed, lower)) {
      return;
    }

    // ========================================
    // AI CALL - REAL RESPONSE OR REAL ERROR
    // ========================================
    await this.callAI(trimmed);
  }

  // ============================================================================
  // INTERNAL COMMANDS - NO AI
  // ============================================================================

  private async handleInternalCommand(input: string): Promise<void> {
    const cmd = input.toLowerCase().split(/\s+/)[0];
    const args = input.slice(cmd.length).trim();

    switch (cmd) {
      case '/exit':
      case '/quit':
        console.log(chalk.cyan('\nGoodbye! Happy coding! 👋\n'));
        this.running = false;
        break;

      case '/help':
        this.showHelp();
        break;

      case '/config':
        await this.configManager.configureProvider();
        break;

      case '/status':
        this.showStatus();
        break;

      case '/providers':
        this.showProviders();
        break;

      case '/clear':
        console.clear();
        this.displayWelcome();
        break;

      case '/model':
        if (args) {
          this.provider.setModel(args);
          console.log(chalk.green(`\n✓ Model set to ${this.provider.getCurrentModel()}\n`));
        } else {
          console.log(chalk.cyan(`\nCurrent model: ${this.provider.getCurrentModel()}\n`));
        }
        break;

      case '/use':
        if (args) {
          const success = this.provider.setProvider(args);
          if (success) {
            console.log(chalk.green(`\n✓ Switched to ${this.provider.getCurrentProvider()?.name}\n`));
          } else {
            console.log(chalk.red(`\nUnknown provider: ${args}\n`));
          }
        } else {
          console.log(chalk.cyan(`\nCurrent provider: ${this.provider.getCurrentProvider()?.name}\n`));
        }
        break;

      case '/memory':
        const memories = this.memory.getAll();
        if (memories.length === 0) {
          console.log(chalk.cyan('\nNo memories stored.\n'));
        } else {
          console.log(chalk.cyan('\nStored memories:\n'));
          memories.forEach((m: any, i: number) => {
            console.log(`  ${i + 1}. ${m.key}: ${m.value}`);
          });
          console.log('');
        }
        break;

      case '/modules':
        this.showModules();
        break;

      case '/models':
        this.showModels();
        break;

      case '/tools':
        this.showTools();
        break;

      default:
        console.log(chalk.yellow(`\nUnknown command: ${cmd}\n`));
        this.showHelp();
    }
  }

  private showHelp(): void {
    console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║  Commands                                                     ║
╠═══════════════════════════════════════════════════════════════╣
║  /help        Show this help                                  ║
║  /config      Configure AI provider                           ║
║  /status      Show current configuration                      ║
║  /providers   List available providers                        ║
║  /use <name>  Switch provider (e.g., /use anthropic)          ║
║  /model <id>  Switch model                                    ║
║  /modules     List all modules                                ║
║  /models      List available models                           ║
║  /tools       List all AI tools                               ║
║  /memory      Show stored memories                            ║
║  /clear       Clear screen                                    ║
║  /exit        Exit VIBE                                       ║
╠═══════════════════════════════════════════════════════════════╣
║  Just type naturally - I'll understand and help you build.    ║
╚═══════════════════════════════════════════════════════════════╝
    `));
  }

  private showModules(): void {
    const modules = [
      { name: 'code-assistant', desc: 'Generate, complete, explain, refactor code' },
      { name: 'testing', desc: 'Generate and run tests' },
      { name: 'debugging', desc: 'Debug and fix errors' },
      { name: 'planning', desc: 'Plan and architect solutions' },
      { name: 'code-search', desc: 'Search code and dependencies' },
      { name: 'security', desc: 'Security scanning and audits' },
      { name: 'deployment', desc: 'Build and deploy applications' },
      { name: 'git-operations', desc: 'Git commands and workflows' },
      { name: 'documentation', desc: 'Generate docs and READMEs' },
      { name: 'collaboration', desc: 'Team collaboration features' },
      { name: 'infrastructure', desc: 'Infra management (K8s, Terraform)' },
      { name: 'web-generation', desc: 'Generate web components/apps' },
      { name: 'search-tools', desc: 'Web search and research' },
      { name: 'automation', desc: 'Workflow automation' },
    ];

    console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║  14 Core Modules                                              ║
╠═══════════════════════════════════════════════════════════════╣
${modules.map(m => `║  ${m.name.padEnd(18)} ${m.desc}`).join('\n')}
╠═══════════════════════════════════════════════════════════════╣
║  Just describe what you want - I'll route to the right module ║
╚═══════════════════════════════════════════════════════════════╝
    `));
  }

  private showModels(): void {
    const models = [
      { name: 'Claude Opus 4', provider: 'Anthropic', desc: 'Best for complex coding tasks' },
      { name: 'Claude Sonnet 4', provider: 'Anthropic', desc: 'Balanced performance' },
      { name: 'GPT-4o', provider: 'OpenAI', desc: 'General purpose' },
      { name: 'GPT-4o-mini', provider: 'OpenAI', desc: 'Fast and cheap' },
      { name: 'Gemini 1.5 Flash', provider: 'Google', desc: 'Free tier available' },
      { name: 'Llama 3.1', provider: 'Ollama', desc: 'Local/offline' },
    ];

    console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║  Available Models                                             ║
╠═══════════════════════════════════════════════════════════════╣
${models.map(m => `║  ${m.name.padEnd(20)} ${m.provider.padEnd(12)} ${m.desc}`).join('\n')}
╠═══════════════════════════════════════════════════════════════╣
║  Use /use <provider> or /model <name> to switch              ║
╚═══════════════════════════════════════════════════════════════╝
    `));
  }

  private showTools(): void {
    const tools = [
      { category: 'Code Assistant', tools: 'Copilot, Cursor, Claude Code, Tabnine, Continue' },
      { category: 'Testing', tools: 'CodiumAI, GitHub Copilot, Qodo' },
      { category: 'Debugging', tools: 'TraceRoot, Phind, Blinky' },
      { category: 'Planning', tools: 'Pandex, Devin, Poolside' },
      { category: 'Code Search', tools: 'Sourcegraph Cody, Phind, Wizi' },
      { category: 'Security', tools: 'Pixee, Amazon Q, TraceRoot' },
      { category: 'Deployment', tools: 'Claude Code, Devin, GitHub' },
      { category: 'Web Generation', tools: 'Bolt.new, v0, Lovable' },
    ];

    console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║  AI Tools (67+ integrated)                                    ║
╠═══════════════════════════════════════════════════════════════╣
${tools.map(t => `║  ${t.category.padEnd(16)} ${t.tools}`).join('\n')}
╠═══════════════════════════════════════════════════════════════╣
║  VIBE routes to the best tool for your task                   ║
╚═══════════════════════════════════════════════════════════════╝
    `));
  }

  private showStatus(): void {
    const status = this.provider.getStatus();
    console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║  Status                                                        ║
╠═══════════════════════════════════════════════════════════════╣
║  Provider: ${chalk.white(status.provider.padEnd(50))}║
║  Model:    ${chalk.white(status.model.padEnd(50))}║
║  Configured: ${status.configured}/${status.available} providers                           ║
╚═══════════════════════════════════════════════════════════════╝
    `));
  }

  private showProviders(): void {
    const providers = this.provider.listProviders();
    console.log(chalk.cyan('\nAvailable providers:\n'));
    providers.forEach((p) => {
      const status = p.configured ? chalk.green('✓') : p.freeTier ? chalk.gray('○') : chalk.red('✗');
      const name = p.freeTier ? `${p.name} (free)` : p.name;
      console.log(`  ${status} ${name.padEnd(20)} ${p.model}`);
    });
    console.log('');
  }

  // ============================================================================
  // PROVIDER/MODEL SWITCHING
  // ============================================================================

  private handleProviderModelSwitching(input: string, lower: string): boolean {
    // Free tier
    if (/use\s+(free|free\s*tier|free\s*model)/i.test(lower)) {
      const providers = this.provider.listProviders();
      const freeProvider = providers.find(p => p.freeTier);
      if (freeProvider) {
        this.provider.setProvider(freeProvider.id);
        console.log(chalk.green(`\n✓ Switched to ${freeProvider.name} (free tier)\n`));
      } else {
        console.log(chalk.yellow('\n⚠ No free tier providers available.\n'));
      }
      return true;
    }

    // Provider switching
    const providerMap: Record<string, string> = {
      'anthropic': 'anthropic', 'claude': 'anthropic',
      'openai': 'openai', 'gpt': 'openai',
      'google': 'google', 'gemini': 'google',
      'ollama': 'ollama', 'local': 'ollama', 'offline': 'ollama',
      'deepseek': 'deepseek',
      'groq': 'groq',
      'mistral': 'mistral',
      'xai': 'xai', 'grok': 'xai',
      'huggingface': 'huggingface',
      'openrouter': 'openrouter',
    };

    for (const [kw, providerId] of Object.entries(providerMap)) {
      if (lower.includes(kw)) {
        const success = this.provider.setProvider(providerId);
        if (success) {
          console.log(chalk.green(`\n✓ Switched to ${this.provider.getCurrentProvider()?.name}\n`));
        }
        return true;
      }
    }

    // Model switching
    const modelMap: Record<string, string> = {
      'sonnet': 'claude-sonnet-4-20250514',
      'opus': 'claude-opus-4-20250514',
      'haiku': 'claude-haiku-3-20250514',
      'gpt-4o': 'gpt-4o',
      'mini': 'gpt-4o-mini', 'fast model': 'gpt-4o-mini',
      'gemini flash': 'gemini-1.5-flash',
      'llama': 'llama3.1',
    };

    for (const [kw, modelId] of Object.entries(modelMap)) {
      if (lower.includes(kw)) {
        const success = this.provider.setModel(modelId);
        if (success) {
          console.log(chalk.green(`\n✓ Model set to ${this.provider.getCurrentModel()}\n`));
        }
        return true;
      }
    }

    return false;
  }

  // ============================================================================
  // AI CALL - REAL RESPONSE OR REAL ERROR
  // ============================================================================

  private async callAI(input: string): Promise<void> {
    const status = this.provider.getStatus();

    // Check if provider is configured
    if (!this.provider.isProviderConfigured(status.provider)) {
      const freeModels = this.provider.getFreeTierModels();
      const localProviders = this.provider.getLocalProviders();

      console.log(chalk.yellow(`
⚠️  AI provider "${status.provider}" is not configured.

To use VIBE:
• Run ${chalk.cyan('/config')} to set up an API key
• Or use a free provider: ${freeModels.map(f => f.name).join(', ') || 'None available'}
• Or use a local provider: ${localProviders.join(', ') || 'None available'}
      `));
      return;
    }

    // Build messages
    const messages = [
      { role: 'system', content: VIBE_SYSTEM_PROMPT },
      { role: 'user', content: input },
    ];

    // Call AI with fallback
    let response;
    try {
      response = await this.provider.chat(messages);
    } catch (error) {
      // Try fallback providers
      response = await this.tryFallbackProviders(messages);
    }

    // Check for error in response
    if (this.isErrorResponse(response)) {
      this.showAIError(response, status.provider);
      return;
    }

    // Show AI response
    if (response.content && response.content.trim()) {
      console.log('');
      console.log(chalk.white(response.content));
      console.log('');
    }
  }

  private async tryFallbackProviders(
    messages: Array<{ role: string; content: string }>
  ): Promise<any> {
    const freeModels = this.provider.getFreeTierModels();
    const localProviders = this.provider.getLocalProviders();

    // Try free models first
    for (const fm of freeModels) {
      try {
        const result = await this.provider.chat(messages, { model: fm.model });
        if (!this.isErrorResponse(result)) {
          return result;
        }
      } catch {
        // Continue to next
      }
    }

    // Try local providers
    for (const lp of localProviders) {
      try {
        const result = await this.provider.chat(messages);
        if (!this.isErrorResponse(result)) {
          return result;
        }
      } catch {
        // Continue to next
      }
    }

    // Return error response
    return {
      content: '',
      error: 'All providers failed',
      provider: 'none',
    };
  }

  private isErrorResponse(response: any): boolean {
    if (!response) return true;
    if (response.provider === 'none') return true;
    if (response.content?.includes('[Error]') || response.content?.includes('Error:')) return true;
    if (response.content?.includes('401') || response.content?.includes('authentication')) return true;
    if (response.content?.includes('API key') && response.content?.includes('not configured')) return true;
    return false;
  }

  private showAIError(response: any, currentProvider: string): void {
    const freeModels = this.provider.getFreeTierModels();
    const localProviders = this.provider.getLocalProviders();

    console.log(chalk.red(`
⚠️  I couldn't reach the AI model.

Reason: ${response.content || response.error || 'Unknown error'}

What you can do:
• Run ${chalk.cyan('/config')} to set up or reconfigure an API key
${freeModels.length > 0 ? `• Try a free provider: ${freeModels.map(f => f.name).join(', ')}` : ''}
${localProviders.length > 0 ? `• Use a local provider: ${localProviders.join(', ')}` : ''}
• Check your network connection

Current provider: ${currentProvider}
    `));
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private loadHistory(): void {
    try {
      if (fs.existsSync(this.historyFile)) {
        const content = fs.readFileSync(this.historyFile, 'utf-8');
        this.history = content.split('\n').filter(line => line.trim());
      }
    } catch {
      // Ignore errors
    }
  }

  private saveHistory(): void {
    try {
      const configDir = path.dirname(this.historyFile);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      fs.writeFileSync(this.historyFile, this.history.slice(-1000).join('\n'));
    } catch {
      // Ignore errors
    }
  }

  private displayWelcome(): void {
    console.log(chalk.cyan(`
╔═════════════════════════════════════════════════════════════╗
║                                                             ║
║   ${chalk.white.bold('V I B E')}  ${chalk.green('v12.0.0')}                                    ║
║   ${chalk.gray('AI-Powered Development Environment')}                       ║
║                                                             ║
║   ${chalk.white("I'm your AI development teammate.")}                       ║
║   ${chalk.gray("Type naturally - I'll understand.")}                         ║
║                                                             ║
╚═════════════════════════════════════════════════════════════╝

Type ${chalk.cyan('/help')} for commands or just tell me what you want to build.
    `));
  }
}
