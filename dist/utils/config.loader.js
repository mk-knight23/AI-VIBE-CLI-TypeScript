"use strict";
/**
 * VIBE-CLI v12 - Configuration Loader
 * Load and validate configuration from .env files and environment variables
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VIBE_CONFIG_SCHEMA = exports.ConfigLoader = void 0;
exports.createConfigLoader = createConfigLoader;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
class ConfigLoader {
    schema;
    envFilePath;
    envFileName;
    allowMissing;
    prefix;
    constructor(options = {}) {
        this.schema = options.schema ?? {};
        this.envFilePath = options.envFilePath ?? process.cwd();
        this.envFileName = options.envFileName ?? '.env';
        this.allowMissing = options.allowMissing ?? false;
        this.prefix = options.prefix ?? 'VIBE_';
    }
    /**
     * Load configuration from environment and .env file
     */
    load(userConfig) {
        const result = {
            config: {},
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
    loadEnvFile(result) {
        const envPath = path.join(this.envFilePath, this.envFileName);
        if (fs.existsSync(envPath)) {
            try {
                const parsed = dotenv_1.default.config({ path: envPath });
                if (parsed.error) {
                    result.warnings.push(`Failed to parse .env file: ${parsed.error.message}`);
                }
            }
            catch (error) {
                result.warnings.push(`Error reading .env file: ${error}`);
            }
        }
        else if (!this.allowMissing) {
            result.warnings.push(`.env file not found at ${envPath}`);
        }
    }
    /**
     * Apply schema validation and defaults
     */
    applySchema(result) {
        for (const [key, schema] of Object.entries(this.schema)) {
            const envVar = schema.envVar || `${this.prefix}${key.toUpperCase()}`;
            let value = process.env[envVar];
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
                }
                else {
                    result.errors.push(`Missing required configuration: ${key} (env: ${envVar})`);
                    continue;
                }
            }
            // Use default if not set
            if (value === undefined && schema.default !== undefined) {
                value = schema.default;
            }
            // Set the value
            result.config[key] = value;
        }
    }
    /**
     * Get a specific configuration value
     */
    get(key) {
        const envVar = this.schema[key]?.envVar || `${this.prefix}${String(key).toUpperCase()}`;
        return process.env[envVar];
    }
    /**
     * Set an environment variable
     */
    set(key, value) {
        process.env[key] = value;
    }
    /**
     * Check if a configuration key is set
     */
    has(key) {
        const envVar = this.schema[key]?.envVar || `${this.prefix}${key.toUpperCase()}`;
        return process.env[envVar] !== undefined;
    }
    /**
     * Validate loaded configuration
     */
    validate(config) {
        const errors = [];
        for (const [key, schema] of Object.entries(this.schema)) {
            if (schema.required && config[key] === undefined) {
                errors.push(`Missing required configuration: ${key}`);
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
}
exports.ConfigLoader = ConfigLoader;
/**
 * Common VIBE configuration schema
 */
exports.VIBE_CONFIG_SCHEMA = {
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
function createConfigLoader(options) {
    return new ConfigLoader({
        schema: exports.VIBE_CONFIG_SCHEMA,
        ...options,
    });
}
//# sourceMappingURL=config.loader.js.map