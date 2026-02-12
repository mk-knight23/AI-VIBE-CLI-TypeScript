/**
 * VIBE CLI v0.0.1 - Configuration Loader
 *
 * Handles loading, validation, and management of VIBE CLI configuration.
 * Supports .vibe/config.json and environment variable overrides.
 *
 * Version: 0.0.1
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
// ============================================================================
// Constants
// ============================================================================
const CONFIG_FILE_NAME = 'config.json';
const VIBE_DIR = '.vibe';
/** Default configuration path in user's home directory */
export const DEFAULT_CONFIG_DIR = path.join(os.homedir(), VIBE_DIR);
/** Project-level config path */
export const PROJECT_CONFIG_PATH = path.join(process.cwd(), VIBE_DIR, CONFIG_FILE_NAME);
// ============================================================================
// Default Configuration
// ============================================================================
const DEFAULT_MODEL_CONFIG = {
    default: 'claude-sonnet-4',
    fallback: ['gpt-4o', 'gemini-1.5-pro'],
    costOptimization: true,
    taskRouting: {
        'quick-review': 'claude-haiku',
        'complex-analysis': 'claude-opus',
        'code-completion': 'claude-sonnet-4',
        'code-generation': 'gpt-4o',
        'documentation': 'gemini-1.5-pro',
    },
};
const DEFAULT_AGENT_CONFIG = {
    enabled: ['planner', 'executor', 'reviewer', 'debugger', 'refactor', 'learning', 'context'],
    maxSteps: 50,
    checkpointOnStart: true,
    autoApproveLowRisk: true,
};
const DEFAULT_UI_CONFIG = {
    theme: 'dark',
    verbosity: 'normal',
    emojiEnabled: true,
    compactMode: false,
    showTimestamps: false,
    animations: {
        spinners: true,
        progressBars: true,
    },
};
const DEFAULT_TELEMETRY_CONFIG = {
    enabled: false,
    anonymize: true,
    retentionDays: 30,
    features: {
        commandUsage: true,
        performance: true,
        errors: true,
        featureUsage: true,
    },
};
const DEFAULT_SECURITY_CONFIG = {
    requireApprovalForHighRisk: true,
    blockedPatterns: ['**/secrets/**', '**/.env*', '**/credentials*'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    dangerousCommands: ['rm -rf', 'sudo', 'chmod 777', '> /dev/null'],
    sandbox: {
        enabled: false,
        allowedOperations: ['read', 'write', 'list'],
        deniedOperations: ['execute', 'network'],
    },
};
const DEFAULT_PLUGIN_CONFIG = {
    enabled: [],
    autoUpdate: true,
    pluginDir: path.join(os.homedir(), VIBE_DIR, 'plugins'),
};
const DEFAULT_POLICY_CONFIG = {
    enabled: false,
    rules: [],
    defaultAction: 'prompt',
};
const DEFAULT_CONFIG = {
    version: '0.0.1',
    models: DEFAULT_MODEL_CONFIG,
    agentSettings: DEFAULT_AGENT_CONFIG,
    ui: DEFAULT_UI_CONFIG,
    telemetry: DEFAULT_TELEMETRY_CONFIG,
    security: DEFAULT_SECURITY_CONFIG,
    plugins: DEFAULT_PLUGIN_CONFIG,
    policies: DEFAULT_POLICY_CONFIG,
};
// ============================================================================
// Configuration Loader Class
// ============================================================================
export class ConfigLoader {
    configDir;
    projectConfigPath;
    userConfigPath;
    config = null;
    constructor(options = {}) {
        this.projectConfigPath = options.projectRoot
            ? path.join(options.projectRoot, VIBE_DIR, CONFIG_FILE_NAME)
            : PROJECT_CONFIG_PATH;
        this.configDir = options.configDir || DEFAULT_CONFIG_DIR;
        this.userConfigPath = path.join(this.configDir, CONFIG_FILE_NAME);
    }
    // ============================================================================
    // Public Methods
    // ============================================================================
    /**
     * Load configuration from file(s)
     */
    load() {
        if (this.config) {
            return this.config;
        }
        // Start with default config
        this.config = this.deepClone(DEFAULT_CONFIG);
        // Load user config (highest priority)
        this.loadFromFile(this.userConfigPath);
        // Load project config (overrides user config)
        this.loadFromFile(this.projectConfigPath);
        // Apply environment variable overrides
        this.applyEnvOverrides();
        return this.config;
    }
    /**
     * Get current configuration
     */
    get() {
        if (!this.config) {
            return this.load();
        }
        return this.config;
    }
    /**
     * Save configuration to file
     */
    save(configPath) {
        const targetPath = configPath || this.userConfigPath;
        const dir = path.dirname(targetPath);
        // Ensure directory exists
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(targetPath, JSON.stringify(this.config, null, 2));
    }
    /**
     * Update specific configuration section
     */
    updateSection(section, value) {
        if (!this.config) {
            this.load();
        }
        this.config[section] = value;
    }
    /**
     * Get configuration for a specific section
     */
    getSection(section) {
        const config = this.get();
        return config[section];
    }
    /**
     * Reset configuration to defaults
     */
    reset() {
        this.config = this.deepClone(DEFAULT_CONFIG);
    }
    /**
     * Get the configuration directory
     */
    getConfigDir() {
        return this.configDir;
    }
    /**
     * Get the project configuration path
     */
    getProjectConfigPath() {
        return this.projectConfigPath;
    }
    /**
     * Check if configuration exists
     */
    configExists() {
        return fs.existsSync(this.userConfigPath) || fs.existsSync(this.projectConfigPath);
    }
    /**
     * Create default configuration file
     */
    createDefaultConfig() {
        this.load();
        this.save(this.userConfigPath);
    }
    // ============================================================================
    // Private Methods
    // ============================================================================
    /**
     * Load configuration from a file path
     */
    loadFromFile(filePath) {
        if (!fs.existsSync(filePath)) {
            return;
        }
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const fileConfig = JSON.parse(content);
            // Merge file config into current config
            this.mergeConfig(fileConfig);
        }
        catch (error) {
            console.warn(`Warning: Failed to load config from ${filePath}:`, error);
        }
    }
    /**
     * Merge configuration from source into target
     */
    mergeConfig(source) {
        if (!this.config) {
            this.config = {};
        }
        // Merge top-level properties
        if ('version' in source && source.version) {
            this.config.version = source.version;
        }
        // Merge models
        if (source.models) {
            this.config.models = { ...this.config.models, ...source.models };
        }
        // Merge agents
        if (source.agentSettings) {
            this.config.agentSettings = { ...this.config.agentSettings, ...source.agentSettings };
        }
        // Merge UI
        if (source.ui) {
            this.config.ui = { ...this.config.ui, ...source.ui };
        }
        // Merge telemetry
        if (source.telemetry) {
            this.config.telemetry = { ...this.config.telemetry, ...source.telemetry };
        }
        // Merge security
        if (source.security) {
            this.config.security = { ...this.config.security, ...source.security };
        }
        // Merge plugins
        if (source.plugins) {
            this.config.plugins = { ...this.config.plugins, ...source.plugins };
        }
        // Merge policies
        if (source.policies) {
            this.config.policies = { ...this.config.policies, ...source.policies };
        }
    }
    /**
     * Apply environment variable overrides
     */
    applyEnvOverrides() {
        if (!this.config)
            return;
        // Model configuration overrides
        if (process.env.VIBE_DEFAULT_MODEL) {
            this.config.models.default = process.env.VIBE_DEFAULT_MODEL;
        }
        if (process.env.VIBE_API_KEY_ANTHROPIC) {
            this.config.models.apiKeys = this.config.models.apiKeys || {};
            this.config.models.apiKeys.anthropic = process.env.VIBE_API_KEY_ANTHROPIC;
        }
        if (process.env.VIBE_API_KEY_OPENAI) {
            this.config.models.apiKeys = this.config.models.apiKeys || {};
            this.config.models.apiKeys.openai = process.env.VIBE_API_KEY_OPENAI;
        }
        if (process.env.VIBE_API_KEY_GOOGLE) {
            this.config.models.apiKeys = this.config.models.apiKeys || {};
            this.config.models.apiKeys.google = process.env.VIBE_API_KEY_GOOGLE;
        }
        // UI configuration overrides
        if (process.env.VIBE_THEME) {
            const validThemes = ['dark', 'light', 'solarized', 'nord', 'high-contrast'];
            if (validThemes.includes(process.env.VIBE_THEME)) {
                this.config.ui.theme = process.env.VIBE_THEME;
            }
        }
        if (process.env.VIBE_VERBOSITY) {
            const validVerbosity = ['silent', 'normal', 'verbose', 'debug'];
            if (validVerbosity.includes(process.env.VIBE_VERBOSITY)) {
                this.config.ui.verbosity = process.env.VIBE_VERBOSITY;
            }
        }
        if (process.env.VIBE_NO_EMOJI) {
            this.config.ui.emojiEnabled = false;
        }
        // Telemetry overrides
        if (process.env.VIBE_TELEMETRY !== undefined) {
            this.config.telemetry.enabled = process.env.VIBE_TELEMETRY === '1' || process.env.VIBE_TELEMETRY === 'true';
        }
        // Security overrides
        if (process.env.VIBE_SANDBOX) {
            this.config.security.sandbox.enabled = process.env.VIBE_SANDBOX === '1' || process.env.VIBE_SANDBOX === 'true';
        }
    }
    /**
     * Deep clone an object
     */
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
}
// ============================================================================
// Singleton Instance
// ============================================================================
let configLoaderInstance = null;
export function getConfigLoader(options) {
    if (!configLoaderInstance || options) {
        configLoaderInstance = new ConfigLoader(options);
    }
    return configLoaderInstance;
}
export function loadConfig() {
    return getConfigLoader().load();
}
export function saveConfig(config, path) {
    const loader = getConfigLoader();
    const currentConfig = loader.get();
    currentConfig.models = config.models;
    currentConfig.agentSettings = config.agentSettings;
    currentConfig.ui = config.ui;
    currentConfig.telemetry = config.telemetry;
    currentConfig.security = config.security;
    currentConfig.plugins = config.plugins;
    currentConfig.policies = config.policies;
    loader.save(path);
}
//# sourceMappingURL=config.loader.js.map