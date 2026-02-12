/**
 * VIBE-CLI v0.0.1 - Core Engine
 * Main orchestrator for the CLI
 */
import { VibeProviderRouter } from '../providers/router.js';
import { VibeMemoryManager } from '../memory/index.js';
import { VibeAgentExecutor } from '../agents/index.js';
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
    version: string;
}
export declare class VibeCoreEngine {
    private moduleLoader;
    private provider;
    private memory;
    private configManager;
    private agentExecutor;
    private session;
    private cli;
    private initialized;
    private modulesLoaded;
    private readonly VERSION;
    constructor(config?: EngineConfig);
    /**
     * Initialize the engine
     */
    initialize(): Promise<boolean>;
    /**
     * Load or create a session
     */
    private loadOrCreateSession;
    /**
     * Save session
     */
    private saveSession;
    /**
     * Start interactive mode
     */
    startInteractiveMode(): Promise<void>;
    /**
     * Get engine status
     */
    getStatus(): EngineStatus;
    /**
     * Execute a command through the agent pipeline
     */
    executeCommand(input: string): Promise<{
        success: boolean;
        result?: any;
        error?: string;
    }>;
    /**
     * Get provider
     */
    getProvider(): VibeProviderRouter;
    /**
     * Get memory
     */
    getMemory(): VibeMemoryManager;
    /**
     * Get agent executor
     */
    getAgentExecutor(): VibeAgentExecutor | null;
    /**
     * Shutdown engine
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=engine.d.ts.map