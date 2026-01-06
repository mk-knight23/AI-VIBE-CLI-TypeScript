/**
 * VIBE-CLI v12 - Configuration Loader
 * Load and validate configuration from .env files and environment variables
 */

import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

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

export class ConfigLoader<T extends Record<string, any> = Record<string, any>> {
  private schema: ConfigSchema;
  private envFilePath: string;
  private envFileName: string;
  private allowMissing: boolean;
  private prefix: string;

  constructor(options: ConfigLoaderOptions = {}) {
    this.schema = options.schema ?? {};
    this.envFilePath = options.envFilePath ?? process.cwd();
    this.envFileName = options.envFileName ?? '.env';
    this.allowMissing = options.allowMissing ?? false;
    this.prefix = options.prefix ?? 'VIBE_';
  }

  /**
   * Load configuration from environment and .env file
   */
  load(userConfig?: Partial<T>): LoadResult<T> {
    const result: LoadResult<T> = {
      config: {} as T,
      errors: [],
      warnings: [],
    };

    // Load .env file
    this.loadEnvFile(result);

    // Apply schema defaults and validate
    this.applySchema(result);

    // Override with user config
    if (userConfig) {
      Object.assign(result.config, userConfig);
    }

    return result;
  }

  /**
   * Load environment variables from .env file
   */
  private loadEnvFile(result: LoadResult<T>): void {
    const envPath = path.join(this.envFilePath, this.envFileName);

    if (fs.existsSync(envPath)) {
      try {
        const parsed = dotenv.config({ path: envPath });
        if (parsed.error) {
          result.warnings.push(`Failed to parse .env file: ${parsed.error.message}`);
        }
      } catch (error) {
        result.warnings.push(`Error reading .env file: ${error}`);
      }
    } else if (!this.allowMissing) {
      result.warnings.push(`.env file not found at ${envPath}`);
    }
  }

  /**
   * Apply schema validation and defaults
   */
  private applySchema(result: LoadResult<T>): void {
    for (const [key, schema] of Object.entries(this.schema)) {
      const envVar = schema.envVar || `${this.prefix}${key.toUpperCase()}`;
      let value: any = process.env[envVar];

      // Convert type
      if (value !== undefined) {
        switch (schema.type) {
          case 'number':
            value = parseFloat(value);
            if (isNaN(value)) {
              result.errors.push(`Invalid number for ${key}: ${process.env[envVar]}`);
              continue;
            }
            break;
          case 'boolean':
            value = value.toLowerCase() === 'true' || value.toLowerCase() === '1';
            break;
        }
      }

      // Check required
      if (value === undefined && schema.required) {
        if (schema.default !== undefined) {
          value = schema.default;
        } else {
          result.errors.push(`Missing required configuration: ${key} (env: ${envVar})`);
          continue;
        }
      }

      // Use default if not set
      if (value === undefined && schema.default !== undefined) {
        value = schema.default;
      }

      // Set the value
      (result.config as any)[key] = value;
    }
  }

  /**
   * Get a specific configuration value
   */
  get<K extends keyof T>(key: K): T[K] | undefined {
    const envVar = this.schema[key as string]?.envVar || `${this.prefix}${String(key).toUpperCase()}`;
    return process.env[envVar] as any;
  }

  /**
   * Set an environment variable
   */
  set(key: string, value: string): void {
    process.env[key] = value;
  }

  /**
   * Check if a configuration key is set
   */
  has(key: string): boolean {
    const envVar = this.schema[key]?.envVar || `${this.prefix}${key.toUpperCase()}`;
    return process.env[envVar] !== undefined;
  }

  /**
   * Validate loaded configuration
   */
  validate(config: T): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [key, schema] of Object.entries(this.schema)) {
      if (schema.required && config[key as keyof T] === undefined) {
        errors.push(`Missing required configuration: ${key}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Common VIBE configuration schema
 */
export const VIBE_CONFIG_SCHEMA: ConfigSchema = {
  PROVIDER: {
    type: 'string',
    required: false,
    default: 'openrouter',
    envVar: 'VIBE_PROVIDER',
    description: 'AI provider to use',
  },
  MODEL: {
    type: 'string',
    required: false,
    default: 'anthropic/claude-sonnet-4-20250514',
    envVar: 'VIBE_MODEL',
    description: 'Model to use for AI responses',
  },
  OPENAI_API_KEY: {
    type: 'string',
    required: false,
    envVar: 'OPENAI_API_KEY',
    description: 'OpenAI API key',
  },
  ANTHROPIC_API_KEY: {
    type: 'string',
    required: false,
    envVar: 'ANTHROPIC_API_KEY',
    description: 'Anthropic API key',
  },
  GOOGLE_API_KEY: {
    type: 'string',
    required: false,
    envVar: 'GOOGLE_API_KEY',
    description: 'Google API key',
  },
  OPENROUTER_API_KEY: {
    type: 'string',
    required: false,
    envVar: 'OPENROUTER_API_KEY',
    description: 'OpenRouter API key',
  },
  DEBUG: {
    type: 'boolean',
    required: false,
    default: false,
    envVar: 'DEBUG',
    description: 'Enable debug mode',
  },
  SKIP_API_CONFIG: {
    type: 'boolean',
    required: false,
    default: false,
    envVar: 'SKIP_API_CONFIG',
    description: 'Skip API configuration prompts',
  },
};

/**
 * Create a VIBE configuration loader
 */
export function createConfigLoader(options?: Partial<ConfigLoaderOptions>): ConfigLoader {
  return new ConfigLoader({
    schema: VIBE_CONFIG_SCHEMA,
    ...options,
  });
}
