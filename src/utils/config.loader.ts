/**
 * VIBE CLI v0.0.2 - Configuration Loader
 *
 * Handles loading, validation, and management of VIBE CLI configuration.
 * Supports .vibe/config.json and environment variable overrides.
 *
 * Version: 0.0.1
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { VibeConfig, ModelConfig, AgentSettingsConfig, UIConfig, TelemetryConfig, SecurityConfig, PluginConfig, PolicyConfig } from '../core-types/index.js';

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

const DEFAULT_MODEL_CONFIG: ModelConfig = {
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

const DEFAULT_AGENT_CONFIG: AgentSettingsConfig = {
  enabled: ['planner', 'executor', 'reviewer', 'debugger', 'refactor', 'learning', 'context'],
  maxSteps: 50,
  checkpointOnStart: true,
  autoApproveLowRisk: true,
};

const DEFAULT_UI_CONFIG: UIConfig = {
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

const DEFAULT_TELEMETRY_CONFIG: TelemetryConfig = {
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

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
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

const DEFAULT_PLUGIN_CONFIG: PluginConfig = {
  enabled: [],
  autoUpdate: true,
  pluginDir: path.join(os.homedir(), VIBE_DIR, 'plugins'),
};

const DEFAULT_POLICY_CONFIG: PolicyConfig = {
  enabled: false,
  rules: [],
  defaultAction: 'prompt',
};

const DEFAULT_CONFIG: VibeConfig = {
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
  private configDir: string;
  private projectConfigPath: string;
  private userConfigPath: string;
  private config: VibeConfig | null = null;

  constructor(options: { projectRoot?: string; configDir?: string } = {}) {
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
  load(): VibeConfig {
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
  get(): VibeConfig {
    if (!this.config) {
      return this.load();
    }
    return this.config;
  }

  /**
   * Save configuration to file
   */
  save(configPath?: string): void {
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
  updateSection<K extends keyof VibeConfig>(section: K, value: VibeConfig[K]): void {
    if (!this.config) {
      this.load();
    }
    (this.config as unknown as Record<string, unknown>)[section] = value;
  }

  /**
   * Get configuration for a specific section
   */
  getSection<K extends keyof VibeConfig>(section: K): VibeConfig[K] {
    const config = this.get();
    return config[section];
  }

  /**
   * Reset configuration to defaults
   */
  reset(): void {
    this.config = this.deepClone(DEFAULT_CONFIG);
  }

  /**
   * Get the configuration directory
   */
  getConfigDir(): string {
    return this.configDir;
  }

  /**
   * Get the project configuration path
   */
  getProjectConfigPath(): string {
    return this.projectConfigPath;
  }

  /**
   * Check if configuration exists
   */
  configExists(): boolean {
    return fs.existsSync(this.userConfigPath) || fs.existsSync(this.projectConfigPath);
  }

  /**
   * Create default configuration file
   */
  createDefaultConfig(): void {
    this.load();
    this.save(this.userConfigPath);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Load configuration from a file path
   */
  private loadFromFile(filePath: string): void {
    if (!fs.existsSync(filePath)) {
      return;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const fileConfig = JSON.parse(content) as Partial<VibeConfig>;
      
      // Merge file config into current config
      this.mergeConfig(fileConfig);
    } catch (error) {
      console.warn(`Warning: Failed to load config from ${filePath}:`, error);
    }
  }

  /**
   * Merge configuration from source into target
   */
  private mergeConfig(source: Partial<VibeConfig>): void {
    if (!this.config) {
      this.config = {} as VibeConfig;
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
  private applyEnvOverrides(): void {
    if (!this.config) return;

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
      const validThemes: UIConfig['theme'][] = ['dark', 'light', 'solarized', 'nord', 'high-contrast'];
      if (validThemes.includes(process.env.VIBE_THEME as UIConfig['theme'])) {
        this.config.ui.theme = process.env.VIBE_THEME as UIConfig['theme'];
      }
    }

    if (process.env.VIBE_VERBOSITY) {
      const validVerbosity: UIConfig['verbosity'][] = ['silent', 'normal', 'verbose', 'debug'];
      if (validVerbosity.includes(process.env.VIBE_VERBOSITY as UIConfig['verbosity'])) {
        this.config.ui.verbosity = process.env.VIBE_VERBOSITY as UIConfig['verbosity'];
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
  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj)) as T;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let configLoaderInstance: ConfigLoader | null = null;

export function getConfigLoader(options?: { projectRoot?: string; configDir?: string }): ConfigLoader {
  if (!configLoaderInstance || options) {
    configLoaderInstance = new ConfigLoader(options);
  }
  return configLoaderInstance;
}

export function loadConfig(): VibeConfig {
  return getConfigLoader().load();
}

export function saveConfig(config: VibeConfig, path?: string): void {
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
