/**
 * VIBE-CLI v12 - Module Loader
 * Loads and manages VIBE modules
 */
import { BaseModule } from '../modules/base.module';
export interface ModuleLoadResult {
    name: string;
    module: BaseModule | null;
    error?: string;
    loaded: boolean;
}
export declare class ModuleLoader {
    private modules;
    private modulesDir;
    private loadedCount;
    private failedCount;
    constructor(modulesDir?: string);
    /**
     * Load all modules from the modules directory
     */
    loadAll(): Promise<Map<string, BaseModule>>;
    /**
     * Load a single module
     */
    private loadModule;
    /**
     * Log module skip
     */
    private logSkip;
    /**
     * Get a specific module by name
     */
    getModule(name: string): BaseModule | undefined;
    /**
     * Check if a module is loaded
     */
    hasModule(name: string): boolean;
    /**
     * List all loaded modules
     */
    listModules(): Array<{
        name: string;
        version: string;
        description: string;
    }>;
    /**
     * Get all modules as a map
     */
    getAllModules(): Map<string, BaseModule>;
    /**
     * Get module names
     */
    getModuleNames(): string[];
    /**
     * Get load statistics
     */
    getStats(): {
        total: number;
        loaded: number;
        failed: number;
    };
    /**
     * Execute a module by name
     */
    execute(name: string, params: Record<string, any>): Promise<{
        success: boolean;
        data?: any;
        error?: string;
    }>;
    /**
     * Unload all modules (for testing)
     */
    unloadAll(): void;
}
//# sourceMappingURL=module.loader.d.ts.map