/**
 * VIBE CLI v0.0.1 - Configuration Loader
 *
 * Handles loading, validation, and management of VIBE CLI configuration.
 * Supports .vibe/config.json and environment variable overrides.
 *
 * Version: 0.0.1
 */
import type { VibeConfig } from '../core-types/index.js';
/** Default configuration path in user's home directory */
export declare const DEFAULT_CONFIG_DIR: string;
/** Project-level config path */
export declare const PROJECT_CONFIG_PATH: string;
export declare class ConfigLoader {
    private configDir;
    private projectConfigPath;
    private userConfigPath;
    private config;
    constructor(options?: {
        projectRoot?: string;
        configDir?: string;
    });
    /**
     * Load configuration from file(s)
     */
    load(): VibeConfig;
    /**
     * Get current configuration
     */
    get(): VibeConfig;
    /**
     * Save configuration to file
     */
    save(configPath?: string): void;
    /**
     * Update specific configuration section
     */
    updateSection<K extends keyof VibeConfig>(section: K, value: VibeConfig[K]): void;
    /**
     * Get configuration for a specific section
     */
    getSection<K extends keyof VibeConfig>(section: K): VibeConfig[K];
    /**
     * Reset configuration to defaults
     */
    reset(): void;
    /**
     * Get the configuration directory
     */
    getConfigDir(): string;
    /**
     * Get the project configuration path
     */
    getProjectConfigPath(): string;
    /**
     * Check if configuration exists
     */
    configExists(): boolean;
    /**
     * Create default configuration file
     */
    createDefaultConfig(): void;
    /**
     * Load configuration from a file path
     */
    private loadFromFile;
    /**
     * Merge configuration from source into target
     */
    private mergeConfig;
    /**
     * Apply environment variable overrides
     */
    private applyEnvOverrides;
    /**
     * Deep clone an object
     */
    private deepClone;
}
export declare function getConfigLoader(options?: {
    projectRoot?: string;
    configDir?: string;
}): ConfigLoader;
export declare function loadConfig(): VibeConfig;
export declare function saveConfig(config: VibeConfig, path?: string): void;
//# sourceMappingURL=config.loader.d.ts.map