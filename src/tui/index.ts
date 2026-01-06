/**
 * VIBE-CLI v13 - Interactive CLI Engine (Agent Mode)
 *
 * ENFORCES EXECUTION OVER EXPLANATION
 * - Mode system: agent/code/ask/debug
 * - Execution stages with animations
 * - File tree output, not code dumps
 * - Proper error handling
 * - Approval gates for risky operations
 * - Sandbox execution with checkpoint support
 */

import * as child_process from 'child_process';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { VibeProviderRouter } from '../providers/router.js';
import { VibeMemoryManager } from '../memory/index.js';
import { VibeConfigManager } from '../config.js';
import { getSystemPrompt, MODE_PROMPTS } from '../cli/system-prompt.js';
import { rl, prompt } from '../cli/ui.js';
import { approvalManager } from '../approvals/index.js';
import { toolRegistry, sandbox, diffEditor, checkpointSystem } from '../tools/index.js';

// ============================================================================
// TYPES
// ============================================================================

type CLIMode = 'agent' | 'code' | 'ask' | 'debug';

interface ExecutionStage {
  name: string;
  icon: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  message?: string;
}

interface ExecutionResult {
  success: boolean;
  filesCreated?: string[];
  filesModified?: string[];
  commandsRun?: string[];
  error?: string;
  summary?: string;
}

// ============================================================================
// CLI ENGINE
// ============================================================================

export class CLIEngine {
  private running = true;
  private history: string[] = [];
  private historyFile: string;
  private configManager: VibeConfigManager;
  private currentMode: CLIMode = 'agent';

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

    // Infinite REPL loop
    while (this.running) {
      try {
        const input = await prompt(chalk.cyan('vibe') + this.getModeIndicator() + ' > ');
        await this.handleInput(input);
      } catch (error) {
        console.log(chalk.red('\nAn error occurred. Try again.\n'));
      }
    }
  }

  // ============================================================================
  // INPUT HANDLER
  // ============================================================================

  private async handleInput(input: string): Promise<void> {
    const trimmed = input.trim();
    if (!trimmed) return;

    // Save to history
    this.history.push(trimmed);
    this.saveHistory();

    // Internal commands
    if (trimmed.startsWith('/')) {
      await this.handleInternalCommand(trimmed);
      return;
    }

    // Exit commands
    const lower = trimmed.toLowerCase();
    if (lower === 'exit' || lower === 'quit') {
      console.log(chalk.cyan('\n👋 Goodbye! Happy coding!\n'));
      this.running = false;
      return;
    }

    // Provider/model switching
    if (this.handleProviderModelSwitching(trimmed, lower)) {
      return;
    }

    // Mode switching
    if (this.handleModeSwitching(trimmed, lower)) {
      return;
    }

    // AI call with mode-specific prompt
    await this.callAI(trimmed);
  }

  // ============================================================================
  // INTERNAL COMMANDS
  // ============================================================================

  private async handleInternalCommand(input: string): Promise<void> {
    const cmd = input.toLowerCase().split(/\s+/)[0];
    const args = input.slice(cmd.length).trim();

    switch (cmd) {
      case '/exit':
      case '/quit':
        console.log(chalk.cyan('\n👋 Goodbye! Happy coding!\n'));
        this.running = false;
        break;

      case '/help':
        this.showHelp();
        break;

      case '/mode':
        this.handleModeCommand(args);
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
        this.handleModelCommand(args);
        break;

      case '/use':
        this.handleUseCommand(args);
        break;

      case '/memory':
        this.showMemory();
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

      case '/approve':
        this.showPendingApprovals();
        break;

      case '/sandbox':
        this.toggleSandbox(args);
        break;

      case '/checkpoint':
        this.createCheckpoint(args);
        break;

      case '/undo':
        this.undoLastChange(args);
        break;

      case '/risk':
        this.showRiskLevels();
        break;

      case '/autoapprove':
        this.toggleAutoApprove(args);
        break;

      default:
        console.log(chalk.yellow(`\nUnknown command: ${cmd}\n`));
        this.showHelp();
    }
  }

  // ============================================================================
  // MODE SYSTEM
  // ============================================================================

  private handleModeCommand(args: string): void {
    const modes: CLIMode[] = ['agent', 'code', 'ask', 'debug'];

    if (!args) {
      console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║  Current Mode: ${chalk.white(this.currentMode.toUpperCase())}
╠═══════════════════════════════════════════════════════════════╣
║  Available Modes:                                             ║
║    /mode agent   - Full execution (default)                   ║
║    /mode code    - Code-focused, can show code                ║
║    /mode ask     - Q&A, no side effects                       ║
║    /mode debug   - Debugging focused                          ║
╚═══════════════════════════════════════════════════════════════╝
      `));
      return;
    }

    const mode = args.toLowerCase() as CLIMode;
    if (modes.includes(mode)) {
      this.currentMode = mode;
      console.log(chalk.green(`\n✓ Switched to ${mode.toUpperCase()} mode\n`));
      this.showModeDescription(mode);
    } else {
      console.log(chalk.red(`\nUnknown mode: ${args}\n`));
    }
  }

  private showModeDescription(mode: CLIMode): void {
    const descriptions: Record<CLIMode, string> = {
      agent: 'Creating files and running commands is MANDATORY.',
      code: 'Creating files preferred, but can show code when asked.',
      ask: 'Focus on answering questions. No automatic execution.',
      debug: 'Read and analyze code first. Offer fixes.',
    };

    console.log(chalk.gray(`  ${descriptions[mode]}\n`));
  }

  private handleModeSwitching(input: string, lower: string): boolean {
    // Quick mode switches
    const modePatterns: Record<string, CLIMode> = {
      'mode agent': 'agent',
      'mode code': 'code',
      'mode ask': 'ask',
      'mode debug': 'debug',
    };

    for (const [pattern, mode] of Object.entries(modePatterns)) {
      if (lower === pattern || lower.startsWith(pattern + ' ')) {
        this.currentMode = mode;
        console.log(chalk.green(`\n✓ ${mode.toUpperCase()} mode\n`));
        this.showModeDescription(mode);
        return true;
      }
    }

    return false;
  }

  private getModeIndicator(): string {
    const indicators: Record<CLIMode, string> = {
      agent: chalk.gray(' [agent]'),
      code: chalk.gray(' [code]'),
      ask: chalk.gray(' [ask]'),
      debug: chalk.gray(' [debug]'),
    };
    return indicators[this.currentMode];
  }

  // ============================================================================
  // PROVIDER/MODEL COMMANDS
  // ============================================================================

  private handleModelCommand(args: string): void {
    if (args) {
      const success = this.provider.setModel(args);
      if (success) {
        console.log(chalk.green(`\n✓ Model set to ${this.provider.getCurrentModel()}\n`));
      } else {
        console.log(chalk.red(`\nUnknown model: ${args}\n`));
      }
    } else {
      console.log(chalk.cyan(`\nCurrent model: ${this.provider.getCurrentModel()}\n`));
    }
  }

  private handleUseCommand(args: string): void {
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
  }

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

    // Provider keywords
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

    // Model keywords
    const modelMap: Record<string, string> = {
      'sonnet': 'claude-sonnet-4-20250514',
      'opus': 'claude-opus-4-20250514',
      'haiku': 'claude-haiku-3-20250514',
      'gpt-4o': 'gpt-4o',
      'mini': 'gpt-4o-mini',
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
  // AI CALL WITH EXECUTION PIPELINE
  // ============================================================================

  private async callAI(input: string): Promise<void> {
    const status = this.provider.getStatus();

    // Check provider configuration
    if (!this.provider.isProviderConfigured(status.provider)) {
      this.showProviderNotConfigured();
      return;
    }

    // Show execution stage
    this.showThinkingAnimation();

    // Build mode-specific system prompt
    const systemPrompt = getSystemPrompt({
      mode: this.currentMode,
      projectContext: this.getProjectContext(),
    });

    // Build messages
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: input },
    ];

    // Call AI
    let response;
    try {
      response = await this.provider.chat(messages);
    } catch (error) {
      response = await this.tryFallbackProviders(messages);
    }

    // Clear thinking animation
    this.clearThinkingAnimation();

    // Handle error
    if (this.isErrorResponse(response)) {
      this.showAIError(response, status.provider);
      return;
    }

    // Process and display response based on mode
    this.displayResponse(response.content, input);
  }

  private displayResponse(content: string, input: string): void {
    // Check if this is an execution response (contains file creation indicators)
    const hasFileCreation = /📁|Created:|✅.*files? created/i.test(content);
    const hasCommandExecution = /⚡|Running:|✅.*(installed|completed|finished)/i.test(content);

    if (hasFileCreation || hasCommandExecution) {
      // This is an execution response - show file tree or summary
      this.displayExecutionResult(content);
    } else if (this.currentMode === 'ask') {
      // Ask mode - show normal response
      console.log('');
      console.log(chalk.white(content));
      console.log('');
    } else {
      // Check if it looks like a code dump
      const codeBlockCount = (content.match(/```/g) || []).length;
      if (codeBlockCount >= 2) {
        // This looks like a code dump - warn user
        console.log(chalk.yellow(`
⚠️  This response contains code but files may not have been created.

If you want files created, try:
• "Create a [name] component"
• "Build a [type] app"
• "Generate a [project]"

Files are created automatically in agent mode.
        `));
        console.log(chalk.white(content.slice(0, 500) + '...'));
        console.log('');
      } else {
        // Normal response
        console.log('');
        console.log(chalk.white(content));
        console.log('');
      }
    }
  }

  private displayExecutionResult(content: string): void {
    console.log('');

    // Extract and display file tree if present
    const treeMatch = content.match(/([a-zA-Z0-9-_]+\/?[a-zA-Z0-9-_]*\n(?:├──|└──|   ).*)+/);
    if (treeMatch) {
      console.log(chalk.cyan(treeMatch[0]));
    } else {
      // Just show the content
      console.log(chalk.white(content));
    }

    console.log('');
  }

  // ============================================================================
  // EXECUTION STAGES & ANIMATIONS
  // ============================================================================

  private showThinkingAnimation(): void {
    const frames = ['🧠', '🤔', '💭', '🧠'];
    let frameIndex = 0;

    console.log(chalk.cyan('\n🧠 Thinking'));

    const interval = setInterval(() => {
      process.stdout.write(`\r${frames[frameIndex % frames.length]}  `);
      frameIndex++;
    }, 400);

    // Store interval for cleanup
    (this as any).thinkingInterval = interval;
  }

  private clearThinkingAnimation(): void {
    const interval = (this as any).thinkingInterval;
    if (interval) {
      clearInterval(interval);
      (this as any).thinkingInterval = null;
    }
    process.stdout.write('\r' + ' '.repeat(10) + '\r');
  }

  private showExecutionStages(stages: ExecutionStage[]): void {
    console.log(chalk.cyan('\n⚡ Executing\n'));

    for (const stage of stages) {
      let line = '  ';
      switch (stage.status) {
        case 'pending':
          line += chalk.gray('○');
          break;
        case 'running':
          line += chalk.yellow('◐');
          break;
        case 'completed':
          line += chalk.green('✓');
          break;
        case 'failed':
          line += chalk.red('✗');
          break;
      }
      line += ` ${stage.icon} ${stage.name}`;
      if (stage.message) {
        line += chalk.gray(` — ${stage.message}`);
      }
      console.log(line);
    }
    console.log('');
  }

  // ============================================================================
  // UI HELPERS
  // ============================================================================

  private displayWelcome(): void {
    console.log(chalk.cyan(`
╔═════════════════════════════════════════════════════════════╗
║                                                             ║
║   ${chalk.white.bold('V I B E')}  ${chalk.green('v13.0.0')}                                    ║
║   ${chalk.gray('AI-Powered Development Environment')}                       ║
║                                                             ║
║   ${chalk.white("I'm your AI development teammate.")}                       ║
║   ${chalk.gray("Type naturally - I'll execute, not just chat.")}            ║
║                                                             ║
╚═════════════════════════════════════════════════════════════╝

Type ${chalk.cyan('/help')} for commands or just tell me what you want to build.

${chalk.gray('New in v13:')} ${chalk.white('/sandbox')} ${chalk.gray('|')} ${chalk.white('/checkpoint')} ${chalk.gray('|')} ${chalk.white('/approve')}
${chalk.gray('Modes:')} ${chalk.white('/mode agent')} ${chalk.gray('|')} ${chalk.white('/mode code')} ${chalk.gray('|')} ${chalk.white('/mode ask')} ${chalk.gray('|')} ${chalk.white('/mode debug')}
    `));
  }

  private showHelp(): void {
    console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════════════╗
║  Commands                                                          ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Core:                                                             ║
║    /help        Show this help                                       ║
║    /mode        Set mode (agent/code/ask/debug)                      ║
║    /config      Configure AI provider                                ║
║    /status      Show current configuration                           ║
║    /clear       Clear screen                                         ║
║    /exit        Exit VIBE                                            ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Providers & Models:                                               ║
║    /providers   List available providers                             ║
║    /use <name>  Switch provider                                      ║
║    /models      List available models                                ║
║    /model <id>  Switch model                                         ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Modules & Tools:                                                  ║
║    /modules     List all modules                                     ║
║    /tools       List available tools                                 ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Safety & Recovery:                                                ║
║    /approve     Show pending approvals                               ║
║    /sandbox     Toggle sandbox mode                                  ║
║    /checkpoint  Create a checkpoint for undo                         ║
║    /undo        Restore last checkpoint                              ║
║    /risk        Show risk levels & approval rules                    ║
║    /autoapprove Configure auto-approve settings                      ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Memory:                                                           ║
║    /memory      Show stored memories                                 ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Modes:                                                            ║
║    /mode agent  - Execute actions (default)                          ║
║    /mode code   - Can show code                                      ║
║    /mode ask    - Q&A mode, no execution                             ║
║    /mode debug  - Debugging focused                                  ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Just describe what you want - I'll create it for you.               ║
╚═══════════════════════════════════════════════════════════════════════╝
    `));
  }

  private showStatus(): void {
    const status = this.provider.getStatus();
    console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════════════╗
║  Status                                                             ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Provider: ${chalk.white(status.provider.padEnd(50))}║
║  Model:    ${chalk.white(status.model.padEnd(50))}║
║  Mode:     ${chalk.white(this.currentMode.padEnd(50))}║
║  Configured: ${status.configured}/${status.available} providers                              ║
╚═══════════════════════════════════════════════════════════════════════╝
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

  private showModules(): void {
    const modules = [
      { name: 'code-assistant', desc: 'Generate, complete, explain, refactor code' },
      { name: 'testing', desc: 'Generate and run tests' },
      { name: 'debugging', desc: 'Debug and fix errors' },
      { name: 'planning', desc: 'Plan and architect solutions' },
      { name: 'web-generation', desc: 'Generate web components/apps' },
      { name: 'security', desc: 'Security scanning and audits' },
      { name: 'deployment', desc: 'Build and deploy applications' },
    ];

    console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════════════╗
║  Core Modules                                                       ║
╠═══════════════════════════════════════════════════════════════════════╣
${modules.map(m => `║  ${m.name.padEnd(18)} ${m.desc}`).join('\n')}
╚═══════════════════════════════════════════════════════════════════════╝
    `));
  }

  private showModels(): void {
    const models = [
      { name: 'Claude Opus 4', provider: 'Anthropic', desc: 'Best for complex tasks' },
      { name: 'Claude Sonnet 4', provider: 'Anthropic', desc: 'Balanced performance' },
      { name: 'GPT-4o', provider: 'OpenAI', desc: 'General purpose' },
      { name: 'GPT-4o-mini', provider: 'OpenAI', desc: 'Fast and cheap' },
      { name: 'Gemini 1.5 Flash', provider: 'Google', desc: 'Free tier' },
      { name: 'Llama 3.1', provider: 'Ollama', desc: 'Local/offline' },
    ];

    console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════════════╗
║  Available Models                                                    ║
╠═══════════════════════════════════════════════════════════════════════╣
${models.map(m => `║  ${m.name.padEnd(20)} ${m.provider.padEnd(12)} ${m.desc}`).join('\n')}
╚═══════════════════════════════════════════════════════════════════════╝
    `));
  }

  private showTools(): void {
    const tools = toolRegistry.list();
    console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════════════╗
║  Tools (VIBE uses these to execute your requests)                    ║
╠═══════════════════════════════════════════════════════════════════════╣
║  File Operations:                                                    ║
${tools.filter((t: any) => t.category === 'filesystem').map(t => `║    ${t.name.padEnd(18)} ${t.description}`).join('\n')}
╠═══════════════════════════════════════════════════════════════════════╣
║  Shell Operations:                                                   ║
${tools.filter((t: any) => t.category === 'shell').map(t => `║    ${t.name.padEnd(18)} ${t.description}`).join('\n')}
╠═══════════════════════════════════════════════════════════════════════╣
║  Git Operations:                                                     ║
${tools.filter((t: any) => t.category === 'git').map(t => `║    ${t.name.padEnd(18)} ${t.description}`).join('\n')}
╠═══════════════════════════════════════════════════════════════════════╣
║  Code Operations:                                                    ║
${tools.filter((t: any) => t.category === 'code').map(t => `║    ${t.name.padEnd(18)} ${t.description}`).join('\n')}
╚═══════════════════════════════════════════════════════════════════════╝
    `));
  }

  // ============================================================================
  // APPROVAL & SANDBOX COMMANDS
  // ============================================================================

  private showPendingApprovals(): void {
    const pending = approvalManager.listPending();
    if (pending.length === 0) {
      console.log(chalk.green('\nNo pending approvals.\n'));
    } else {
      console.log(chalk.cyan('\nPending Approvals:\n'));
      for (const p of pending) {
        console.log(`  [${p.risk.toUpperCase()}] ${p.description}`);
        console.log(chalk.gray(`     Type: ${p.type}, Requested: ${p.requestedAt.toLocaleString()}\n`));
      }
    }

    const status = approvalManager.getStatus();
    console.log(chalk.gray(`
Summary: ${status.approved} approved, ${status.denied} denied, ${status.pending} pending, ${status.autoApproved} auto-approved
    `));
  }

  private toggleSandbox(args: string): void {
    if (!args) {
      const status = sandbox.getStatus();
      console.log(chalk.cyan(`
Sandbox Status:
  Enabled: ${status.enabled ? chalk.green('YES') : chalk.red('NO')}
  Max CPU: ${status.config.maxCpuTime}s
  Max Memory: ${status.config.maxMemory}MB
  Max File Size: ${status.config.maxFileSize}MB
      `));
      return;
    }

    if (args === 'on' || args === 'enable' || args === 'true') {
      sandbox.setEnabled(true);
      console.log(chalk.green('\nSandbox enabled.\n'));
    } else if (args === 'off' || args === 'disable' || args === 'false') {
      sandbox.setEnabled(false);
      console.log(chalk.yellow('\nSandbox disabled. Commands will run unsandboxed.\n'));
    } else {
      console.log(chalk.yellow('\nUsage: /sandbox [on|off]\n'));
    }
  }

  private createCheckpoint(args: string): void {
    const description = args || 'Manual checkpoint';
    const checkpoints = checkpointSystem.list();
    const checkpointId = checkpointSystem.createSync('manual', description);

    if (checkpointId) {
      console.log(chalk.green(`\nCheckpoint created: ${checkpointId}\n`));
      console.log(chalk.gray(`Total checkpoints: ${checkpoints.length + 1}\n`));
    } else {
      console.log(chalk.red('\nFailed to create checkpoint.\n'));
    }
  }

  private undoLastChange(args: string): void {
    const checkpoints = checkpointSystem.list();
    if (checkpoints.length === 0) {
      console.log(chalk.yellow('\nNo checkpoints available to undo.\n'));
      return;
    }

    // Try specific checkpoint or use most recent
    let checkpointId = args || checkpoints[checkpoints.length - 1]?.id;

    if (!checkpointId) {
      console.log(chalk.yellow('\nNo checkpoint specified and no checkpoints available.\n'));
      return;
    }

    const success = checkpointSystem.restoreSync(checkpointId);
    if (success) {
      console.log(chalk.green(`\nChanges restored from checkpoint: ${checkpointId}\n`));
    } else {
      console.log(chalk.red(`\nFailed to restore checkpoint: ${checkpointId}\n`));
    }
  }

  private showRiskLevels(): void {
    console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════════════╗
║  Risk Levels & Approval Requirements                                 ║
╠════════════════════════════════════════════╦══════════════════════════╣
║  Level     │ Auto-Approve │ Requires Confirm │ Example Operations     ║
╠════════════════════════════════════════════╬══════════════════════════╣
║  LOW       │ Yes          │ No               │ file.read, file.glob   ║
║  MEDIUM    │ Configurable │ Optional         │ file.write, git status ║
║  HIGH      │ No           │ Yes              │ shell.exec, git commit ║
║  CRITICAL  │ No           │ Always           │ file.delete, rollback  ║
╚════════════════════════════════════════════╩══════════════════════════╝

Use /approve to view pending approvals.
Use /autoapprove [low|medium|high|off] to configure.
    `));
  }

  private toggleAutoApprove(args: string): void {
    const levels = ['low', 'medium', 'high', 'off'];

    if (!args || !levels.includes(args.toLowerCase())) {
      const status = approvalManager.getStatus();
      console.log(chalk.cyan(`
Auto-Approve Settings:
  Current: ${status.preferences.autoApproveLowRisk ? 'LOW' : 'MEDIUM'}
  Use /autoapprove [low|medium|high|off] to configure
      `));
      return;
    }

    if (args === 'off') {
      approvalManager.setAutoApprove(false);
      console.log(chalk.yellow('\nAuto-approve disabled. All operations require approval.\n'));
    } else {
      approvalManager.setAutoApprove(true);
      console.log(chalk.green(`\nAuto-approve enabled for ${args.toUpperCase()} risk operations.\n`));
    }
  }

  private showMemory(): void {
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
  }

  private showProviderNotConfigured(): void {
    const freeModels = this.provider.getFreeTierModels();
    const localProviders = this.provider.getLocalProviders();

    console.log(chalk.yellow(`
⚠️  AI provider not configured.

To use VIBE:
• Run ${chalk.cyan('/config')} to set up an API key
• Or use a free provider: ${freeModels.map(f => f.name).join(', ') || 'None'}
• Or use local: ${localProviders.join(', ') || 'None'}
    `));
  }

  private showAIError(response: any, currentProvider: string): void {
    const freeModels = this.provider.getFreeTierModels();
    const localProviders = this.provider.getLocalProviders();

    console.log(chalk.red(`
❌ AI Error

Reason: ${response.content || response.error || 'Unknown error'}

What to do:
• Run ${chalk.cyan('/config')} to configure
• Try a free provider: ${freeModels.map(f => f.name).join(', ') || 'None'}
• Use local provider: ${localProviders.join(', ') || 'None'}
• Check your network connection

Provider: ${currentProvider}
    `));
  }

  private isErrorResponse(response: any): boolean {
    if (!response) return true;
    if (response.provider === 'none') return true;
    if (response.content?.includes('[Error]') || response.content?.includes('Error:')) return true;
    if (response.content?.includes('401') || response.content?.includes('authentication')) return true;
    return false;
  }

  private getProjectContext(): string {
    // Get basic project info
    const pkgPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        return `Project: ${pkg.name || 'Unnamed'}\nType: ${pkg.type || 'module'}`;
      } catch {
        // Ignore
      }
    }
    return '';
  }

  private async tryFallbackProviders(
    messages: Array<{ role: string; content: string }>
  ): Promise<any> {
    const freeModels = this.provider.getFreeTierModels();
    const localProviders = this.provider.getLocalProviders();

    // Try free models
    for (const fm of freeModels) {
      try {
        const result = await this.provider.chat(messages, { model: fm.model });
        if (!this.isErrorResponse(result)) {
          return result;
        }
      } catch {
        // Continue
      }
    }

    // Try local
    for (const lp of localProviders) {
      try {
        const result = await this.provider.chat(messages);
        if (!this.isErrorResponse(result)) {
          return result;
        }
      } catch {
        // Continue
      }
    }

    return {
      content: '',
      error: 'All providers failed',
      provider: 'none',
    };
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
      // Ignore
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
      // Ignore
    }
  }
}
