/**
 * VIBE-CLI v0.0.2 - Secrets Manager
 *
 * Handles secure storage and retrieval of sensitive data:
 * - Environment variable integration
 * - In-memory secure storage with masking
 * - Pattern-based secret detection
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import crypto from 'crypto';

export type SecretType = 'api-key' | 'token' | 'password' | 'credential' | 'custom';

// ============================================================================
// Types
// ============================================================================

interface Secret {
  /** Secret identifier */
  id: string;
  /** Secret name/key */
  name: string;
  /** Secret type */
  type: SecretType;
  /** Encrypted value */
  value: string;
  /** When the secret was created */
  createdAt: Date;
  /** When the secret was last used */
  lastUsed?: Date;
  /** Optional metadata */
  metadata?: Record<string, string>;
}

interface SecretsConfig {
  /** Enable secrets masking in output */
  maskEnabled: boolean;
  /** Auto-detect common secret patterns */
  autoDetect: boolean;
  /** Custom patterns for detection */
  customPatterns: string[];
  /** Storage backend */
  storage: 'memory' | 'file';
  /** File path for file storage */
  storagePath?: string;
}

interface SecretPattern {
  /** Pattern name */
  name: string;
  /** Regex pattern for detection */
  pattern: RegExp;
  /** Secret type */
  type: SecretType;
  /** Replacement template */
  replacement: string;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_SECRETS_CONFIG: SecretsConfig = {
  maskEnabled: true,
  autoDetect: true,
  customPatterns: [],
  storage: 'memory',
  storagePath: path.join(os.homedir(), '.vibe', 'secrets.json'),
};

// ============================================================================
// Secret Patterns for Auto-Detection
// ============================================================================

const BUILTIN_PATTERNS: SecretPattern[] = [
  {
    name: 'OpenAI API Key',
    pattern: /sk-[a-zA-Z0-9-]{8,}/g,
    type: 'api-key',
    replacement: 'sk-••••••••••••••••••••••••••••••••••',
  },
  {
    name: 'Anthropic API Key',
    pattern: /sk-ant-api03-[a-zA-Z0-9_-]{20,}/g,
    type: 'api-key',
    replacement: 'sk-ant-api03-••••••••••••••••••••••••••••••',
  },
  {
    name: 'JWT Token',
    pattern: /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
    type: 'token',
    replacement: 'eyJ••••••••••••••••••••••••••••••••••••',
  },
  {
    name: 'GitHub PAT',
    pattern: /(ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{8,}/g,
    type: 'token',
    replacement: 'gh•_•••••••••••••••••••••••••••••••••••••••••••••••••••••••••••',
  },
  {
    name: 'Generic API Key',
    pattern: /(api_?key|apikey|api_key)["']?\s*[:=]\s*["']?([a-zA-Z0-9_-]{20,})/gi,
    type: 'api-key',
    replacement: '$1: [REDACTED]',
  },
  {
    name: 'AWS Access Key',
    pattern: /(AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}/g,
    type: 'credential',
    replacement: '••••••••••••••••',
  },
];


// ============================================================================
// Secrets Manager
// ============================================================================

export class SecretsManager {
  private readonly config: SecretsConfig;
  private readonly secrets: Map<string, Secret> = new Map();
  private readonly patterns: SecretPattern[] = [];
  private initialized = false;

  constructor(config?: Partial<SecretsConfig>) {
    this.config = { ...DEFAULT_SECRETS_CONFIG, ...config };
    this.patterns = [...BUILTIN_PATTERNS];

    // Add custom patterns
    for (const pattern of this.config.customPatterns) {
      try {
        this.patterns.push({
          name: 'Custom Pattern',
          pattern: new RegExp(pattern, 'gi'),
          type: 'custom',
          replacement: '[REDACTED]',
        });
      } catch {
        // Skip invalid patterns
      }
    }
  }

  /**
   * Initialize the secrets manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load secrets from configured storage
    if (this.config.storage === 'file') {
      await this.loadFromFile();
    }

    // Load environment variables as secrets
    this.loadEnvSecrets();

    this.initialized = true;
  }

  /**
   * Store a secret
   */
  async setSecret(name: string, value: string, type: SecretType = 'custom'): Promise<string> {
    await this.initialize();

    const id = crypto.randomUUID();
    const secret: Secret = {
      id,
      name,
      type,
      value: this.encrypt(value),
      createdAt: new Date(),
      metadata: {},
    };

    this.secrets.set(name, secret);
    await this.persist();

    return id;
  }

  /**
   * Retrieve a secret
   */
  async getSecret(name: string): Promise<string | null> {
    await this.initialize();

    const secret = this.secrets.get(name);
    if (!secret) return null;

    // Update last used timestamp
    secret.lastUsed = new Date();

    return this.decrypt(secret.value);
  }

  /**
   * Delete a secret
   */
  async deleteSecret(name: string): Promise<boolean> {
    await this.initialize();

    const deleted = this.secrets.delete(name);
    if (deleted) {
      await this.persist();
    }

    return deleted;
  }

  /**
   * Check if a secret exists
   */
  hasSecret(name: string): boolean {
    return this.secrets.has(name);
  }

  /**
   * List all secret names
   */
  listSecrets(): string[] {
    return Array.from(this.secrets.keys());
  }

  /**
   * Mask a value if it looks like a secret
   */
  mask(value: string): string {
    if (!this.config.maskEnabled) return value;

    let masked = value;

    for (const pattern of this.patterns) {
      masked = masked.replace(pattern.pattern, pattern.replacement);
      pattern.pattern.lastIndex = 0;
    }

    return masked;
  }

  /**
   * Check if a string contains a secret pattern
   */
  containsSecret(value: string): { detected: boolean; patterns: string[] } {
    const detected: string[] = [];

    for (const pattern of this.patterns) {
      if (pattern.pattern.test(value)) {
        detected.push(pattern.name);
        pattern.pattern.lastIndex = 0;
      }
    }

    return {
      detected: detected.length > 0,
      patterns: detected,
    };
  }

  /**
   * Mask all secrets in an object
   */
  maskObject(obj: Record<string, unknown>): Record<string, unknown> {
    const masked: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        masked[key] = this.mask(value);
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = this.maskObject(value as Record<string, unknown>);
      } else {
        masked[key] = value;
      }
    }

    return masked;
  }

  /**
   * Mask secrets in error messages to prevent leakage
   */
  maskErrorMessage(message: string): string {
    return this.mask(message);
  }

  /**
   * Load secrets from environment variables
   */
  private loadEnvSecrets(): void {
    const envPrefixes = ['VIBE_', 'OPENAI_', 'ANTHROPIC_', 'GOOGLE_', 'GITHUB_'];

    for (const [key, value] of Object.entries(process.env)) {
      if (!value) continue;

      for (const prefix of envPrefixes) {
        if (key.startsWith(prefix) && (key.includes('KEY') || key.includes('TOKEN') || key.includes('SECRET'))) {
          const id = crypto.randomUUID();
          this.secrets.set(key, {
            id,
            name: key,
            type: key.toLowerCase().includes('token') ? 'token' : 'api-key',
            value: this.encrypt(value),
            createdAt: new Date(),
          });
          break;
        }
      }
    }
  }

  /**
   * Load secrets from file storage
   */
  private async loadFromFile(): Promise<void> {
    if (!this.config.storagePath) return;

    try {
      if (fs.existsSync(this.config.storagePath)) {
        const content = fs.readFileSync(this.config.storagePath, 'utf-8');
        const data = JSON.parse(content);

        for (const [name, secret] of Object.entries(data as Record<string, unknown>)) {
          const s = secret as Record<string, unknown>;
          this.secrets.set(name, {
            ...s,
            createdAt: new Date(s.creatededAt as string),
            lastUsed: s.lastUsed ? new Date(s.lastUsed as string) : undefined,
          } as Secret);
        }
      }
    } catch {
      // Ignore file loading errors
    }
  }

  /**
   * Persist secrets to storage
   */
  private async persist(): Promise<void> {
    if (this.config.storage === 'file' && this.config.storagePath) {
      try {
        const dir = path.dirname(this.config.storagePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        const data: Record<string, unknown> = {};
        for (const [name, secret] of this.secrets.entries()) {
          data[name] = secret;
        }

        fs.writeFileSync(this.config.storagePath, JSON.stringify(data, null, 2));
      } catch {
        // Ignore write errors
      }
    }
  }

  /**
   * Encrypt a value
   */
  private encrypt(value: string): string {
    const key = process.env.VIBE_SECRET_KEY || 'vibe-default-encryption-key';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key.padEnd(32).slice(0, 32)), iv);

    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt a value
   */
  private decrypt(encrypted: string): string {
    try {
      const key = process.env.VIBE_SECRET_KEY || 'vibe-default-encryption-key';
      const parts = encrypted.split(':');
      if (parts.length !== 3) return '[DECRYPTION_FAILED]';

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');

      const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key.padEnd(32).slice(0, 32)), iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(parts[2], 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch {
      return '[DECRYPTION_FAILED]';
    }
  }

  /**
   * Clear all secrets
   */
  clear(): void {
    this.secrets.clear();
  }

  /**
   * Get configuration help
   */
  getHelp(): string {
    return `
Secrets Management
==================

The secrets manager handles sensitive data like API keys and tokens.

Auto-Detected Patterns:
  - OpenAI API Key (sk-...)
  - Anthropic API Key (sk-ant-api03-...)
  - JWT Token
  - GitHub Personal Access Token
  - AWS Access Key
  - Generic API Key/Token/Password

Commands:
  vibe config show-secrets  - List stored secrets (names only)
  vibe config clear-secrets - Clear all stored secrets
  vibe doctor --secrets     - Check secrets configuration
`;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const secretsManager = new SecretsManager();
