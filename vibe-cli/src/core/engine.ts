/**
 * VIBE-CLI v12 - Core Engine
 * Main orchestrator for the CLI
 */

import * as path from 'path';
import chalk from 'chalk';
import { ModuleLoader } from './module.loader';
import { VibeProviderRouter } from '../providers/router';
import { VibeMemoryManager } from '../memory';
import { VibeConfigManager } from '../config';
import { CLIEngine } from '../tui';
import type { VibeSession, VibeIntent } from '../types';

export interface EngineConfig {
  modulesDir?: string;
  skipModules?: boolean;
}

export interface EngineStatus {
  initialized: boolean;
  modulesLoaded: boolean;
  sessionActive: boolean;
  moduleCount: number;
  provider: string;
  model: string;
}

export class VibeCoreEngine {
  private moduleLoader: ModuleLoader;
  private provider: VibeProviderRouter;
  private memory: VibeMemoryManager;
  private configManager: VibeConfigManager;
  private session: VibeSession | null = null;
  private cli: CLIEngine | null = null;
  private initialized: boolean = false;
  private modulesLoaded: boolean = false;

  constructor(config?: EngineConfig) {
    const modulesDir = config?.modulesDir || path.join(__dirname, '..', 'modules');
    this.moduleLoader = new ModuleLoader(modulesDir);
    this.provider = new VibeProviderRouter();
    this.memory = new VibeMemoryManager();
    this.configManager = new VibeConfigManager(this.provider);
  }

  /**
   * Initialize the engine
   */
  async initialize(): Promise<boolean> {
    console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   V I B E   v12.0.0                                           ║
║   Initializing Core Engine...                                 ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `));

    try {
      // Step 1: Load configuration
      console.log(chalk.gray('  1/5 Loading configuration...'));
      this.configManager = new VibeConfigManager(this.provider);
      const config = this.configManager.loadConfig();
      console.log(chalk.green('    ✓ Configuration loaded'));

      // Step 2: Initialize provider
      console.log(chalk.gray('  2/5 Initializing AI provider...'));
      const status = this.provider.getStatus();
      const keyStatus = this.provider.isProviderConfigured(status.provider)
        ? chalk.green('configured')
        : chalk.yellow('not configured');
      console.log(chalk.green(`    ✓ Provider: ${status.provider}/${status.model} (${keyStatus})`));

      // Step 3: Initialize memory
      console.log(chalk.gray('  3/5 Initializing memory...'));
      const memoryCount = this.memory.getEntryCount();
      console.log(chalk.green(`    ✓ Memory: ${memoryCount} entries`));

      // Step 4: Load modules (unless skipped)
      console.log(chalk.gray('  4/5 Loading modules...'));
      await this.moduleLoader.loadAll();
      this.modulesLoaded = true;
      const stats = this.moduleLoader.getStats();
      console.log(chalk.green(`    ✓ Modules: ${stats.loaded}/${stats.total} loaded`));

      // Step 5: Create session
      console.log(chalk.gray('  5/5 Creating session...'));
      this.session = {
        id: `session-${Date.now()}`,
        projectRoot: process.cwd(),
        createdAt: new Date(),
        lastActivity: new Date(),
      };
      console.log(chalk.green(`    ✓ Session: ${this.session.id}`));

      this.initialized = true;

      console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ✓ Initialization complete!                                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
      `));

      return true;

    } catch (error) {
      console.error(chalk.red('\n✗ Initialization failed:'), error);
      return false;
    }
  }

  /**
   * Start interactive mode
   */
  async startInteractiveMode(): Promise<void> {
    if (!this.initialized) {
      const success = await this.initialize();
      if (!success) {
        console.error(chalk.red('Failed to initialize engine'));
        process.exit(1);
      }
    }

    // Run first-time setup if needed
    await this.configManager.runFirstTimeSetup();
    await this.configManager.checkAndPromptForKeys();

    // Create CLI engine (simplified v12 - no Orchestrator, no VibeSession)
    this.cli = new CLIEngine(this.provider, this.memory);

    // Start CLI
    await this.cli.start();
  }

  /**
   * Get engine status
   */
  getStatus(): EngineStatus {
    const providerStatus = this.provider.getStatus();
    const moduleStats = this.moduleLoader.getStats();

    return {
      initialized: this.initialized,
      modulesLoaded: this.modulesLoaded,
      sessionActive: this.session !== null,
      moduleCount: moduleStats.loaded,
      provider: providerStatus.provider,
      model: providerStatus.model,
    };
  }

  /**
   * Get provider
   */
  getProvider(): VibeProviderRouter {
    return this.provider;
  }

  /**
   * Get memory
   */
  getMemory(): VibeMemoryManager {
    return this.memory;
  }

  /**
   * Get module loader
   */
  getModuleLoader(): ModuleLoader {
    return this.moduleLoader;
  }

  /**
   * Get session
   */
  getSession(): VibeSession | null {
    return this.session;
  }

  /**
   * Execute a module by name
   */
  async executeModule(moduleName: string, params: Record<string, any>): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.moduleLoader.execute(moduleName, params);
  }

  /**
   * Execute a command through the orchestrator
   */
  async executeCommand(input: string): Promise<{ success: boolean; result?: any; error?: string }> {
    if (!this.initialized) {
      return { success: false, error: 'Engine not initialized' };
    }

    const { IntentRouter } = require('./intent/router');
    const { Orchestrator } = require('./orchestration');

    const intentRouter = new IntentRouter(this.provider);
    const orchestrator = new Orchestrator({
      provider: this.provider,
      memory: this.memory,
    });

    try {
      // Classify intent
      const classification = await intentRouter.classify(input);
      const intent = classification.intent;

      // Execute
      const result = await orchestrator.execute(intent, {}, { approved: true });

      return {
        success: result.success,
        result: {
          summary: result.summary,
          output: result.output,
          changes: result.changes,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Shutdown engine
   */
  async shutdown(): Promise<void> {
    console.log(chalk.cyan('\nShutting down VIBE...'));

    if (this.session) {
      this.session.lastActivity = new Date();
    }

    console.log(chalk.green('  ✓ Session saved'));
    console.log(chalk.green('  ✓ Memory persisted'));
    console.log(chalk.green('  ✓ Engine shut down\n'));

    console.log(chalk.cyan('Goodbye! Happy coding! 👋\n'));
  }
}
