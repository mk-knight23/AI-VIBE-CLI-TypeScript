/**
 * Credential Store - Secure credential management
 */

import * as fs from 'fs';
import * as path from 'path';
import { ProviderCredentials } from './types';
import { maskSecrets } from '../security';

const CRED_DIR = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.vibe');
const CRED_FILE = path.join(CRED_DIR, 'credentials.json');

type StoredCredentials = Record<string, {
  apiKey?: string;
  baseURL?: string;
  headers?: Record<string, string>;
}>;

class CredentialStore {
  private cache: StoredCredentials | null = null;

  private load(): StoredCredentials {
    if (this.cache) return this.cache;
    try {
      if (fs.existsSync(CRED_FILE)) {
        this.cache = JSON.parse(fs.readFileSync(CRED_FILE, 'utf8'));
        return this.cache!;
      }
    } catch {}
    return {};
  }

  private save(creds: StoredCredentials): void {
    try {
      if (!fs.existsSync(CRED_DIR)) {
        fs.mkdirSync(CRED_DIR, { recursive: true, mode: 0o700 });
      }
      fs.writeFileSync(CRED_FILE, JSON.stringify(creds, null, 2), { mode: 0o600 });
      this.cache = creds;
    } catch (err) {
      console.error('Failed to save credentials:', err);
    }
  }

  get(providerId: string): ProviderCredentials | undefined {
    const stored = this.load()[providerId.toLowerCase()];
    if (!stored) return undefined;

    // Resolve env: references
    const apiKey = this.resolveValue(stored.apiKey);
    const baseURL = this.resolveValue(stored.baseURL);

    return { apiKey, baseURL, headers: stored.headers };
  }

  set(providerId: string, creds: ProviderCredentials): void {
    const all = this.load();
    all[providerId.toLowerCase()] = {
      apiKey: creds.apiKey,
      baseURL: creds.baseURL,
      headers: creds.headers
    };
    this.save(all);
  }

  delete(providerId: string): void {
    const all = this.load();
    delete all[providerId.toLowerCase()];
    this.save(all);
  }

  list(): string[] {
    return Object.keys(this.load());
  }

  hasCredentials(providerId: string): boolean {
    const creds = this.get(providerId);
    return !!(creds?.apiKey);
  }

  getApiKey(providerId: string): string | undefined {
    // Check env first
    const envMap: Record<string, string> = {
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      deepseek: 'DEEPSEEK_API_KEY',
      xai: 'XAI_API_KEY',
      groq: 'GROQ_API_KEY',
      together: 'TOGETHER_API_KEY',
      fireworks: 'FIREWORKS_API_KEY',
      cerebras: 'CEREBRAS_API_KEY',
      mistral: 'MISTRAL_API_KEY',
      moonshot: 'MOONSHOT_API_KEY',
      minimax: 'MINIMAX_API_KEY',
      openrouter: 'OPENROUTER_API_KEY',
      megallm: 'MEGALLM_API_KEY',
      agentrouter: 'AGENTROUTER_API_KEY',
      routeway: 'ROUTEWAY_API_KEY'
    };

    const envKey = envMap[providerId.toLowerCase()];
    if (envKey && process.env[envKey]) {
      return process.env[envKey];
    }

    return this.get(providerId)?.apiKey;
  }

  private resolveValue(value: string | undefined): string | undefined {
    if (!value) return undefined;
    if (value.startsWith('env:')) {
      return process.env[value.slice(4)] || undefined;
    }
    return value;
  }

  // For display - masks secrets
  toSafeDisplay(): Record<string, { hasKey: boolean; baseURL?: string }> {
    const all = this.load();
    const safe: Record<string, { hasKey: boolean; baseURL?: string }> = {};
    for (const [id, creds] of Object.entries(all)) {
      safe[id] = {
        hasKey: !!creds.apiKey,
        baseURL: creds.baseURL
      };
    }
    return safe;
  }
}

export const credentialStore = new CredentialStore();
