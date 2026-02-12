/**
 * VIBE-CLI v0.0.1 - Core Engine
 * Main orchestrator for the CLI
 */
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import { ModuleLoader } from './module.loader.js';
import { VibeProviderRouter } from '../providers/router.js';
import { VibeMemoryManager } from '../memory/index.js';
import { VibeConfigManager } from '../config.js';
import { CLIEngine } from '../tui/index.js';
import { VibeAgentExecutor } from '../agents/index.js';
export class VibeCoreEngine {
    moduleLoader;
    provider;
    memory;
    configManager;
    agentExecutor = null;
    session = null;
    cli = null;
    initialized = false;
    modulesLoaded = false;
    VERSION = '0.0.1';
    constructor(config) {
        const __dirname = dirname(fileURLToPath(import.meta.url));
        const modulesDir = config?.modulesDir || path.join(__dirname, '..', 'modules');
        this.moduleLoader = new ModuleLoader(modulesDir);
        this.provider = new VibeProviderRouter();
        this.memory = new VibeMemoryManager();
        this.configManager = new VibeConfigManager(this.provider);
    }
    /**
     * Initialize the engine
     */
    async initialize() {
        console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   V I B E   v${this.VERSION}                                        ║
║   Initializing Core Engine...                                 ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `));
        try {
            // Step 1: Load configuration
            console.log(chalk.gray('  1/6 Loading configuration...'));
            this.configManager = new VibeConfigManager(this.provider);
            this.configManager.loadConfig();
            console.log(chalk.green('    ✓ Configuration loaded'));
            // Step 2: Initialize provider
            console.log(chalk.gray('  2/6 Initializing AI provider...'));
            const status = this.provider.getStatus();
            const keyStatus = this.provider.isProviderConfigured(status.provider)
                ? chalk.green('configured')
                : chalk.yellow('not configured');
            console.log(chalk.green(`    ✓ Provider: ${status.provider}/${status.model} (${keyStatus})`));
            // Step 3: Initialize memory
            console.log(chalk.gray('  3/6 Initializing memory...'));
            const memoryCount = this.memory.getEntryCount();
            console.log(chalk.green(`    ✓ Memory: ${memoryCount} entries`));
            // Step 4: Load modules (unless skipped)
            console.log(chalk.gray('  4/6 Loading modules...'));
            await this.moduleLoader.loadAll();
            this.modulesLoaded = true;
            const stats = this.moduleLoader.getStats();
            console.log(chalk.green(`    ✓ Modules: ${stats.loaded}/${stats.total} loaded`));
            // Step 5: Initialize Agent System
            console.log(chalk.gray('  5/6 Initializing agent system...'));
            this.agentExecutor = new VibeAgentExecutor(this.provider, this.memory);
            console.log(chalk.green(`    ✓ Agent System: v0.0.1 ready`));
            // Step 6: Create session
            console.log(chalk.gray('  6/6 Creating session...'));
            this.session = this.loadOrCreateSession();
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
        }
        catch (error) {
            console.error(chalk.red('\n✗ Initialization failed:'), error);
            return false;
        }
    }
    /**
     * Load or create a session
     */
    loadOrCreateSession() {
        const sessionDir = path.join(process.cwd(), '.vibe');
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }
        const sessionFile = path.join(sessionDir, 'session.json');
        if (fs.existsSync(sessionFile)) {
            try {
                const data = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
                return {
                    ...data,
                    lastActivity: new Date(),
                };
            }
            catch (e) {
                // Fallback to new session
            }
        }
        const session = {
            id: `session-${Date.now()}`,
            projectRoot: process.cwd(),
            createdAt: new Date(),
            lastActivity: new Date(),
        };
        this.saveSession(session);
        return session;
    }
    /**
     * Save session
     */
    saveSession(session) {
        const sessionDir = path.join(process.cwd(), '.vibe');
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }
        fs.writeFileSync(path.join(sessionDir, 'session.json'), JSON.stringify(session, null, 2));
    }
    /**
     * Start interactive mode
     */
    async startInteractiveMode() {
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
        // Create CLI engine
        this.cli = new CLIEngine(this.provider, this.memory);
        // Start CLI
        await this.cli.start();
    }
    /**
     * Get engine status
     */
    getStatus() {
        const providerStatus = this.provider.getStatus();
        const moduleStats = this.moduleLoader.getStats();
        return {
            initialized: this.initialized,
            modulesLoaded: this.modulesLoaded,
            sessionActive: this.session !== null,
            moduleCount: moduleStats.loaded,
            provider: providerStatus.provider,
            model: providerStatus.model,
            version: this.VERSION,
        };
    }
    /**
     * Execute a command through the agent pipeline
     */
    async executeCommand(input) {
        if (!this.initialized || !this.agentExecutor) {
            return { success: false, error: 'Engine not initialized' };
        }
        try {
            const result = await this.agentExecutor.executePipeline({
                task: input,
                context: {},
                approvalMode: 'prompt',
            });
            return {
                success: result.success,
                result: {
                    output: result.output,
                    artifacts: result.artifacts,
                    steps: result.steps,
                },
                error: result.error,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Get provider
     */
    getProvider() {
        return this.provider;
    }
    /**
     * Get memory
     */
    getMemory() {
        return this.memory;
    }
    /**
     * Get agent executor
     */
    getAgentExecutor() {
        return this.agentExecutor;
    }
    /**
     * Shutdown engine
     */
    async shutdown() {
        console.log(chalk.cyan('\nShutting down VIBE...'));
        if (this.session) {
            this.session.lastActivity = new Date();
            this.saveSession(this.session);
        }
        console.log(chalk.green('  ✓ Session saved'));
        console.log(chalk.green('  ✓ Memory persisted'));
        console.log(chalk.green('  ✓ Engine shut down\n'));
        console.log(chalk.cyan('Goodbye! Happy coding! 👋\n'));
    }
}
//# sourceMappingURL=engine.js.map