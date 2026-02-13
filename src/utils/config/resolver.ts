/**
 * VIBE-CLI v0.0.2 - Hierarchical Configuration Resolver
 *
 * Implements global + project-level config resolution with:
 * - Hierarchical config merging (global > project > env > CLI args)
 * - Environment variable overrides (VIBE_*)
 * - Schema validation (manual, no external dependencies)
 * - Secure secrets handling
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ============================================================================
// Configuration Types
// ============================================================================

export type ThemeName = 'dark' | 'light' | 'solarized' | 'high-contrast' | 'nord';
export type VerbosityLevel = 'silent' | 'normal' | 'verbose' | 'debug';

export interface VibeConfigProvider {
  id: string;
  model: string;
  apiKey?: string;
}

export interface VibeConfigUI {
  theme: ThemeName;
  verbosity: VerbosityLevel;
  showTimestamps: boolean;
  colorOutput: boolean;
  compactMode: boolean;
  emojiEnabled: boolean;
  animationEnabled: boolean;
}

export interface VibeConfigProject {
  root: string;
  excludePatterns: string[];
  includePatterns: string[];
  maxFileSize: number;
}

export interface VibeConfigAgent {
  autoApprove: boolean;
  requireApprovalForDestructive: boolean;
  maxTokens: number;
  temperature: number;
  planningMode: boolean;
}

export interface VibeConfigMCP {
  enabled: boolean;
  servers: Record<string, {
    command: string;
    args: string[];
    env?: Record<string, string>;
  }>;
}

export interface VibeConfigTelemetry {
  enabled: boolean;
  sendErrors: boolean;
  sendUsage: boolean;
}

export interface VibeConfigCache {
  enabled: boolean;
  directory: string;
  maxAgeDays: number;
  embeddingCache: boolean;
}

export interface VibeConfigSecurity {
  maskSecrets: boolean;
  redactionPatterns: string[];
  allowedHosts: string[];
}

export interface VibeConfigExperimental {
  enabled: boolean;
  flags: Record<string, boolean>;
}

export interface VibeConfig {
  provider: VibeConfigProvider;
  ui: VibeConfigUI;
  project: VibeConfigProject;
  agent: VibeConfigAgent;
  mcp: VibeConfigMCP;
  telemetry: VibeConfigTelemetry;
  cache: VibeConfigCache;
  security: VibeConfigSecurity;
  experimental: VibeConfigExperimental;
}

// ============================================================================
// Default configuration
// ============================================================================

export const DEFAULT_CONFIG: VibeConfig = {
  provider: {
    id: '',
    model: '',
  },
  ui: {
    theme: 'dark',
    verbosity: 'normal',
    showTimestamps: false,
    colorOutput: true,
    compactMode: false,
    emojiEnabled: true,
    animationEnabled: true,
  },
  project: {
    root: process.cwd(),
    excludePatterns: [
      'node_modules/**',
      '.git/**',
      'dist/**',
      'build/**',
      '*.log',
      '.vibe/**',
    ],
    includePatterns: ['**/*.ts', '**/*.js', '**/*.json', '**/*.md'],
    maxFileSize: 1024 * 1024, // 1MB
  },
  agent: {
    autoApprove: false,
    requireApprovalForDestructive: true,
    maxTokens: 8192,
    temperature: 0.7,
    planningMode: false,
  },
  mcp: {
    enabled: true,
    servers: {},
  },
  telemetry: {
    enabled: false,
    sendErrors: true,
    sendUsage: false,
  },
  cache: {
    enabled: true,
    directory: path.join(os.homedir(), '.vibe', 'cache'),
    maxAgeDays: 30,
    embeddingCache: true,
  },
  security: {
    maskSecrets: true,
    redactionPatterns: [
      '(api_?key["\']?\\s*[:=]\\s*["\']?)([a-zA-Z0-9_-]{20,})',
      '(secret["\']?\\s*[:=]\\s*["\']?)([a-zA-Z0-9_!@#$%^&*]{8,})',
      '(token["\']?\\s*[:=]\\s*["\']?)(eyJ[a-zA-Z0-9_-]*\\.[a-zA-Z0-9_-]*\\.[a-zA-Z0-9_-]*)',
      '(password["\']?\\s*[:=]\\s*["\']?)([^"\'\\s]{8,})',
    ],
    allowedHosts: ['api.openai.com', 'api.anthropic.com', 'api.google.com'],
  },
  experimental: {
    enabled: false,
    flags: {},
  },
};

// ============================================================================
// Interfaces
// ============================================================================

export interface ConfigResolutionOptions {
  /** Project root directory */
  projectRoot?: string;
  /** CLI args to override config */
  cliArgs?: Record<string, unknown>;
  /** Skip validation */
  skipValidation?: boolean;
}

export interface ConfigSource {
  /** Source type */
  type: 'global' | 'project' | 'env' | 'cli';
  /** Source path (if applicable) */
  path?: string;
  /** Configuration values */
  config: Partial<VibeConfig>;
}

// Valid value lists
const VALID_THEMES: ThemeName[] = ['dark', 'light', 'solarized', 'high-contrast', 'nord'];
const VALID_VERBOSITY: VerbosityLevel[] = ['silent', 'normal', 'verbose', 'debug'];

// ============================================================================
// Configuration Resolver
// ============================================================================

export class ConfigResolver {
  private readonly globalConfigPath: string;
  private readonly projectConfigName = '.vibe/config.json';

  constructor() {
    this.globalConfigPath = path.join(os.homedir(), '.vibe', 'config.json');
  }

  /**
   * Resolve configuration from all sources
   *
   * Precedence (highest to lowest):
   * 1. CLI arguments (--config-* flags)
   * 2. Environment variables (VIBE_*)
   * 3. Project configuration (.vibe/config.json)
   * 4. Global configuration (~/.vibe/config.json)
   * 5. Defaults
   */
  resolve(options: ConfigResolutionOptions = {}): { config: VibeConfig; sources: ConfigSource[] } {
    const projectRoot = options.projectRoot || process.cwd();
    const sources: ConfigSource[] = [];

    // 1. Load global config
    const globalConfig = this.loadGlobalConfig();
    sources.push({
      type: 'global',
      path: this.globalConfigPath,
      config: globalConfig,
    });

    // 2. Load project config
    const projectConfigPath = path.join(projectRoot, this.projectConfigName);
    const projectConfig = this.loadProjectConfig(projectConfigPath);
    if (Object.keys(projectConfig).length > 0) {
      sources.push({
        type: 'project',
        path: projectConfigPath,
        config: projectConfig,
      });
    }

    // 3. Load environment variables
    const envConfig = this.loadEnvConfig() as Partial<VibeConfig>;
    sources.push({
      type: 'env',
      config: envConfig,
    });

    // 4. CLI arguments
    const cliConfig = options.cliArgs || {};
    sources.push({
      type: 'cli',
      config: cliConfig,
    });

    // Merge all configs (later sources override earlier)
    const merged = this.mergeConfigs([
      DEFAULT_CONFIG,
      globalConfig,
      projectConfig,
      envConfig,
      cliConfig,
    ]);

    // Validate if not skipped
    if (!options.skipValidation) {
      const errors = this.validate(merged);
      if (errors.length > 0) {
        throw new ConfigurationError('Configuration validation failed', errors);
      }
    }

    return { config: merged as VibeConfig, sources };
  }

  /**
   * Load global configuration
   */
  private loadGlobalConfig(): Partial<VibeConfig> {
    if (!fs.existsSync(this.globalConfigPath)) {
      return {};
    }

    try {
      const content = fs.readFileSync(this.globalConfigPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  /**
   * Load project configuration
   */
  private loadProjectConfig(projectPath: string): Partial<VibeConfig> {
    if (!fs.existsSync(projectPath)) {
      return {};
    }

    try {
      const content = fs.readFileSync(projectPath, 'utf-8');
      const config = JSON.parse(content);

      // Handle legacy config format
      if (config.vibe && typeof config.vibe === 'object') {
        return config.vibe;
      }

      return config;
    } catch {
      return {};
    }
  }

  /**
   * Load configuration from environment variables
   */
  private loadEnvConfig(): Record<string, unknown> {
    const config: Record<string, unknown> = {};

    // Provider settings
    if (process.env.VIBE_PROVIDER || process.env.VIBE_MODEL || process.env.VIBE_API_KEY) {
      config.provider = {
        id: process.env.VIBE_PROVIDER || '',
        model: process.env.VIBE_MODEL || '',
        apiKey: process.env.VIBE_API_KEY,
      };
    }

    // UI settings - build up ui object
    const uiSettings: Record<string, unknown> = {};
    if (process.env.VIBE_THEME && VALID_THEMES.includes(process.env.VIBE_THEME as ThemeName)) {
      uiSettings.theme = process.env.VIBE_THEME;
    }
    if (process.env.VIBE_VERBOSITY && VALID_VERBOSITY.includes(process.env.VIBE_VERBOSITY as VerbosityLevel)) {
      uiSettings.verbosity = process.env.VIBE_VERBOSITY;
    }
    if (process.env.VIBE_NO_COLOR) {
      uiSettings.colorOutput = false;
    }
    if (process.env.VIBE_NO_EMOJI) {
      uiSettings.emojiEnabled = false;
    }
    if (Object.keys(uiSettings).length > 0) {
      config.ui = uiSettings;
    }

    // Agent settings - build up agent object
    const agentSettings: Record<string, unknown> = {};
    if (process.env.VIBE_AUTO_APPROVE) {
      agentSettings.autoApprove = process.env.VIBE_AUTO_APPROVE === 'true';
    }
    if (process.env.VIBE_MAX_TOKENS) {
      const tokens = parseInt(process.env.VIBE_MAX_TOKENS, 10);
      if (!isNaN(tokens)) {
        agentSettings.maxTokens = tokens;
      }
    }
    if (process.env.VIBE_TEMPERATURE) {
      const temp = parseFloat(process.env.VIBE_TEMPERATURE);
      if (!isNaN(temp)) {
        agentSettings.temperature = temp;
      }
    }
    if (Object.keys(agentSettings).length > 0) {
      config.agent = agentSettings;
    }

    // Cache settings - build up cache object
    const cacheSettings: Record<string, unknown> = {};
    if (process.env.VIBE_CACHE_DIR) {
      cacheSettings.directory = process.env.VIBE_CACHE_DIR;
    }
    if (process.env.VIBE_CACHE_ENABLED) {
      cacheSettings.enabled = process.env.VIBE_CACHE_ENABLED === 'true';
    }
    if (Object.keys(cacheSettings).length > 0) {
      config.cache = cacheSettings;
    }

    // Telemetry
    if (process.env.VIBE_TELEMETRY) {
      config.telemetry = {
        enabled: process.env.VIBE_TELEMETRY === 'true',
        sendErrors: true,
        sendUsage: false,
      };
    }

    // Experimental
    if (process.env.VIBE_EXPERIMENTAL) {
      config.experimental = {
        enabled: process.env.VIBE_EXPERIMENTAL === 'true',
        flags: {},
      };
    }

    return config;
  }

  /**
   * Merge multiple configuration objects
   * Later objects override earlier ones (deep merge)
   */
  private mergeConfigs(configs: Partial<VibeConfig>[]): Partial<VibeConfig> {
    const result: Partial<VibeConfig> = {};

    for (const config of configs) {
      if (!config || Object.keys(config).length === 0) {
        continue;
      }

      // Merge provider
      if (config.provider) {
        result.provider = { ...result.provider, ...config.provider };
      }

      // Merge UI
      if (config.ui) {
        result.ui = { ...result.ui, ...config.ui };
      }

      // Merge project
      if (config.project) {
        result.project = { ...result.project, ...config.project };
      }

      // Merge agent
      if (config.agent) {
        result.agent = { ...result.agent, ...config.agent };
      }

      // Merge MCP
      if (config.mcp) {
        result.mcp = { ...result.mcp, ...config.mcp };
        if (config.mcp.servers) {
          result.mcp = {
            ...result.mcp,
            servers: { ...result.mcp?.servers, ...config.mcp.servers },
          };
        }
      }

      // Merge telemetry
      if (config.telemetry) {
        result.telemetry = { ...result.telemetry, ...config.telemetry };
      }

      // Merge cache
      if (config.cache) {
        result.cache = { ...result.cache, ...config.cache };
      }

      // Merge security
      if (config.security) {
        result.security = { ...result.security, ...config.security };
        if (config.security.redactionPatterns) {
          result.security = {
            ...result.security,
            redactionPatterns: [
              ...(result.security?.redactionPatterns || []),
              ...config.security.redactionPatterns,
            ],
          };
        }
        if (config.security.allowedHosts) {
          result.security = {
            ...result.security,
            allowedHosts: [
              ...(result.security?.allowedHosts || []),
              ...config.security.allowedHosts,
            ],
          };
        }
      }

      // Merge experimental
      if (config.experimental) {
        result.experimental = { ...result.experimental, ...config.experimental };
        if (config.experimental.flags) {
          result.experimental = {
            ...result.experimental,
            flags: { ...result.experimental?.flags, ...config.experimental.flags },
          };
        }
      }
    }

    return result;
  }

  /**
   * Validate configuration (manual validation, no external deps)
   */
  validate(config: Partial<VibeConfig>): string[] {
    const errors: string[] = [];

    // Validate provider
    if (config.provider) {
      if (config.provider.id && typeof config.provider.id !== 'string') {
        errors.push('provider.id must be a string');
      }
      if (config.provider.model && typeof config.provider.model !== 'string') {
        errors.push('provider.model must be a string');
      }
    }

    // Validate ui
    if (config.ui) {
      if (config.ui.theme && !VALID_THEMES.includes(config.ui.theme)) {
        errors.push(`ui.theme must be one of: ${VALID_THEMES.join(', ')}`);
      }
      if (config.ui.verbosity && !VALID_VERBOSITY.includes(config.ui.verbosity)) {
        errors.push(`ui.verbosity must be one of: ${VALID_VERBOSITY.join(', ')}`);
      }
      if (config.ui.showTimestamps && typeof config.ui.showTimestamps !== 'boolean') {
        errors.push('ui.showTimestamps must be a boolean');
      }
      if (config.ui.colorOutput && typeof config.ui.colorOutput !== 'boolean') {
        errors.push('ui.colorOutput must be a boolean');
      }
      if (config.ui.compactMode && typeof config.ui.compactMode !== 'boolean') {
        errors.push('ui.compactMode must be a boolean');
      }
      if (config.ui.emojiEnabled && typeof config.ui.emojiEnabled !== 'boolean') {
        errors.push('ui.emojiEnabled must be a boolean');
      }
      if (config.ui.animationEnabled && typeof config.ui.animationEnabled !== 'boolean') {
        errors.push('ui.animationEnabled must be a boolean');
      }
    }

    // Validate project
    if (config.project) {
      if (config.project.root && typeof config.project.root !== 'string') {
        errors.push('project.root must be a string');
      }
      if (config.project.excludePatterns && !Array.isArray(config.project.excludePatterns)) {
        errors.push('project.excludePatterns must be an array');
      }
      if (config.project.includePatterns && !Array.isArray(config.project.includePatterns)) {
        errors.push('project.includePatterns must be an array');
      }
      if (config.project.maxFileSize && typeof config.project.maxFileSize !== 'number') {
        errors.push('project.maxFileSize must be a number');
      }
    }

    // Validate agent
    if (config.agent) {
      if (config.agent.autoApprove && typeof config.agent.autoApprove !== 'boolean') {
        errors.push('agent.autoApprove must be a boolean');
      }
      if (config.agent.requireApprovalForDestructive && typeof config.agent.requireApprovalForDestructive !== 'boolean') {
        errors.push('agent.requireApprovalForDestructive must be a boolean');
      }
      if (config.agent.maxTokens && typeof config.agent.maxTokens !== 'number') {
        errors.push('agent.maxTokens must be a number');
      }
      if (config.agent.temperature && typeof config.agent.temperature !== 'number') {
        errors.push('agent.temperature must be a number');
      }
      if (config.agent.planningMode && typeof config.agent.planningMode !== 'boolean') {
        errors.push('agent.planningMode must be a boolean');
      }
    }

    // Validate mcp
    if (config.mcp) {
      if (config.mcp.enabled && typeof config.mcp.enabled !== 'boolean') {
        errors.push('mcp.enabled must be a boolean');
      }
    }

    // Validate telemetry
    if (config.telemetry) {
      if (config.telemetry.enabled && typeof config.telemetry.enabled !== 'boolean') {
        errors.push('telemetry.enabled must be a boolean');
      }
      if (config.telemetry.sendErrors && typeof config.telemetry.sendErrors !== 'boolean') {
        errors.push('telemetry.sendErrors must be a boolean');
      }
      if (config.telemetry.sendUsage && typeof config.telemetry.sendUsage !== 'boolean') {
        errors.push('telemetry.sendUsage must be a boolean');
      }
    }

    // Validate cache
    if (config.cache) {
      if (config.cache.enabled && typeof config.cache.enabled !== 'boolean') {
        errors.push('cache.enabled must be a boolean');
      }
      if (config.cache.directory && typeof config.cache.directory !== 'string') {
        errors.push('cache.directory must be a string');
      }
      if (config.cache.maxAgeDays && typeof config.cache.maxAgeDays !== 'number') {
        errors.push('cache.maxAgeDays must be a number');
      }
      if (config.cache.embeddingCache && typeof config.cache.embeddingCache !== 'boolean') {
        errors.push('cache.embeddingCache must be a boolean');
      }
    }

    // Validate security
    if (config.security) {
      if (config.security.maskSecrets && typeof config.security.maskSecrets !== 'boolean') {
        errors.push('security.maskSecrets must be a boolean');
      }
      if (config.security.redactionPatterns && !Array.isArray(config.security.redactionPatterns)) {
        errors.push('security.redactionPatterns must be an array');
      }
      if (config.security.allowedHosts && !Array.isArray(config.security.allowedHosts)) {
        errors.push('security.allowedHosts must be an array');
      }
    }

    // Validate experimental
    if (config.experimental) {
      if (config.experimental.enabled && typeof config.experimental.enabled !== 'boolean') {
        errors.push('experimental.enabled must be a boolean');
      }
    }

    return errors;
  }

  /**
   * Get configuration file path for a given level
   */
  getConfigPath(level: 'global' | 'project', projectRoot?: string): string {
    if (level === 'global') {
      return this.globalConfigPath;
    }
    return path.join(projectRoot || process.cwd(), this.projectConfigName);
  }

  /**
   * Save configuration to a file
   */
  saveConfig(config: Partial<VibeConfig>, level: 'global' | 'project', projectRoot?: string): void {
    const configPath = this.getConfigPath(level, projectRoot);
    const dir = path.dirname(configPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Wrap in vibe key for project configs
    const toSave = level === 'project' ? { vibe: config } : config;
    fs.writeFileSync(configPath, JSON.stringify(toSave, null, 2));
  }

  /**
   * Create default configuration files
   */
  createDefaultConfigs(): { global: string; project: string } {
    // Create global config
    const globalDir = path.dirname(this.globalConfigPath);
    if (!fs.existsSync(globalDir)) {
      fs.mkdirSync(globalDir, { recursive: true });
    }

    // Create project config template
    const projectRoot = process.cwd();
    const projectDir = path.join(projectRoot, '.vibe');
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    const projectConfigPath = path.join(projectDir, 'config.json');
    const projectConfig = {
      vibe: {
        description: 'VIBE-CLI project configuration',
        project: {
          excludePatterns: [
            'node_modules/**',
            '.git/**',
            'dist/**',
            'build/**',
            '*.log',
          ],
        },
      },
    };

    fs.writeFileSync(this.globalConfigPath, JSON.stringify({}, null, 2));
    fs.writeFileSync(projectConfigPath, JSON.stringify(projectConfig, null, 2));

    return {
      global: this.globalConfigPath,
      project: projectConfigPath,
    };
  }

  /**
   * Get environment variable help text
   */
  getEnvHelp(): string {
    return `
${'='.repeat(60)}
Environment Variables
${'='.repeat(60)}

Provider Settings:
  VIBE_PROVIDER          AI provider ID (e.g., openai, anthropic)
  VIBE_MODEL             Model to use (e.g., gpt-4, claude-3-opus)
  VIBE_API_KEY           API key for the provider

UI Settings:
  VIBE_THEME             UI theme (dark, light, solarized, high-contrast, nord)
  VIBE_VERBOSITY         Output verbosity (silent, normal, verbose, debug)
  VIBE_NO_COLOR          Disable colors (set to any value)
  VIBE_NO_EMOJI          Disable emojis (set to any value)

Agent Settings:
  VIBE_AUTO_APPROVE      Auto-approve safe operations (true/false)
  VIBE_MAX_TOKENS        Maximum tokens per request
  VIBE_TEMPERATURE       Model temperature (0.0-1.0)

Cache Settings:
  VIBE_CACHE_DIR         Cache directory path
  VIBE_CACHE_ENABLED     Enable caching (true/false)

Telemetry:
  VIBE_TELEMETRY         Enable opt-in telemetry (true/false)

Experimental:
  VIBE_EXPERIMENTAL      Enable experimental features (true/false)

${'='.repeat(60)}
`;
  }
}

// ============================================================================
// Custom Errors
// ============================================================================

export class ConfigurationError extends Error {
  public readonly errors: string[];

  constructor(message: string, errors: string[] = []) {
    super(message);
    this.name = 'ConfigurationError';
    this.errors = errors;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const configResolver = new ConfigResolver();
