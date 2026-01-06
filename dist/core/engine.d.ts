/**
 * VIBE-CLI v12 - Core Engine
 * Main orchestrator for the CLI
 */
import { ModuleLoader } from './module.loader';
import { VibeProviderRouter } from '../providers/router';
import { VibeMemoryManager } from '../memory';
import type { VibeSession } from '../types';
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
export declare class VibeCoreEngine {
    private moduleLoader;
    private provider;
    private memory;
    private configManager;
    private session;
    private cli;
    private initialized;
    private modulesLoaded;
    constructor(config?: EngineConfig);
    /**
     * Initialize the engine
     */
    initialize(): Promise<boolean>;
    /**
     * Start interactive mode
     */
    startInteractiveMode(): Promise<void>;
    /**
     * Get engine status
     */
    getStatus(): EngineStatus;
    /**
     * Get provider
     */
    getProvider(): VibeProviderRouter;
    /**
     * Get memory
     */
    getMemory(): VibeMemoryManager;
    /**
     * Get module loader
     */
    getModuleLoader(): ModuleLoader;
    /**
     * Get session
     */
    getSession(): VibeSession | null;
    /**
     * Execute a module by name
     */
    executeModule(moduleName: string, params: Record<string, any>): Promise<{
        success: boolean;
        data?: any;
        error?: string;
    }>;
    /**
     * Execute a command through the orchestrator
     */
    executeCommand(input: string): Promise<{
        success: boolean;
        result?: any;
        error?: string;
    }>;
    /**
     * Check if initialized
     */
    isInitialized(): boolean;
    /**
     * Shutdown engine
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=engine.d.ts.map