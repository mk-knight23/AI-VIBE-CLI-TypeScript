/**
 * VIBE-CLI v12 - Configuration Loader
 * Load and validate configuration from .env files and environment variables
 */
export interface ConfigSchema {
    [key: string]: {
        type: 'string' | 'number' | 'boolean';
        required?: boolean;
        default?: any;
        description?: string;
        envVar?: string;
    };
}
export interface ConfigLoaderOptions {
    schema?: ConfigSchema;
    envFilePath?: string;
    envFileName?: string;
    allowMissing?: boolean;
    prefix?: string;
}
export interface LoadResult<T = Record<string, any>> {
    config: T;
    errors: string[];
    warnings: string[];
}
export declare class ConfigLoader<T extends Record<string, any> = Record<string, any>> {
    private schema;
    private envFilePath;
    private envFileName;
    private allowMissing;
    private prefix;
    constructor(options?: ConfigLoaderOptions);
    /**
     * Load configuration from environment and .env file
     */
    load(userConfig?: Partial<T>): LoadResult<T>;
    /**
     * Load environment variables from .env file
     */
    private loadEnvFile;
    /**
     * Apply schema validation and defaults
     */
    private applySchema;
    /**
     * Get a specific configuration value
     */
    get<K extends keyof T>(key: K): T[K] | undefined;
    /**
     * Set an environment variable
     */
    set(key: string, value: string): void;
    /**
     * Check if a configuration key is set
     */
    has(key: string): boolean;
    /**
     * Validate loaded configuration
     */
    validate(config: T): {
        valid: boolean;
        errors: string[];
    };
}
/**
 * Common VIBE configuration schema
 */
export declare const VIBE_CONFIG_SCHEMA: ConfigSchema;
/**
 * Create a VIBE configuration loader
 */
export declare function createConfigLoader(options?: Partial<ConfigLoaderOptions>): ConfigLoader;
//# sourceMappingURL=config.loader.d.ts.map