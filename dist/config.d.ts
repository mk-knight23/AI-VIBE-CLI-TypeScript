/**
 * VIBE-CLI v12 - Configuration & BYOK (Bring Your Own Key) Manager
 * Handles API key input, secure storage, and provider configuration
 */
import { VibeProviderRouter } from './providers/router';
interface StoredConfig {
    provider?: string;
    model?: string;
    apiKeys?: Record<string, string>;
    autoApprove?: boolean;
}
export declare class VibeConfigManager {
    private configDir;
    private configPath;
    private provider;
    constructor(provider: VibeProviderRouter);
    /**
     * Run first-time setup if no config exists
     */
    runFirstTimeSetup(): Promise<boolean>;
    /**
     * Check for missing API keys - now non-blocking
     */
    checkAndPromptForKeys(): Promise<void>;
    /**
     * Configure a provider interactively with searchable selection
     */
    configureProvider(): Promise<void>;
    /**
     * Configure a specific provider by ID
     * NOTE: We save the key first and test on first real request (Cursor/Claude Code style)
     */
    private configureProviderById;
    /**
     * Configure a specific provider by name
     * NOTE: We save the key first and test on first real request
     */
    configureProviderByName(providerName: string): Promise<boolean>;
    /**
     * Test if an API key works
     */
    private testProviderKey;
    /**
     * Get the API key URL for a provider
     */
    private getProviderKeyUrl;
    /**
     * Display current configuration status
     */
    displayConfigStatus(): void;
    /**
     * Load configuration from disk
     */
    loadConfig(): StoredConfig;
    /**
     * Save configuration to disk
     */
    saveConfig(config: StoredConfig): void;
}
export {};
//# sourceMappingURL=config.d.ts.map