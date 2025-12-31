/**
 * Provider Registry (Compatibility Layer)
 * 
 * Provides backward-compatible provider info from UniversalAI config.
 */

import { UniversalAI } from '../core/universal-ai';

export interface ProviderInfo {
  id: string;
  displayName: string;
  description: string;
  requiresApiKey: boolean;
  apiKeyEnvVar: string;
  apiKeyHelp: { url: string; instruction: string };
  defaultModels: string[];
  tags: string[];
}

// Static provider metadata
const PROVIDER_META: Record<string, Partial<ProviderInfo>> = {
  openrouter: {
    displayName: 'OpenRouter',
    description: '100+ models, free tier available',
    apiKeyEnvVar: 'OPENROUTER_API_KEY',
    apiKeyHelp: { url: 'https://openrouter.ai/keys', instruction: 'Create an API key' },
    tags: ['cloud', 'multi-model']
  },
  ollama: {
    displayName: 'Ollama',
    description: 'Local models, no API key needed',
    apiKeyEnvVar: '',
    apiKeyHelp: { url: 'https://ollama.ai', instruction: 'Install Ollama locally' },
    tags: ['local', 'free']
  }
};

export function listAllProviders(): ProviderInfo[] {
  const models = UniversalAI.getModels();
  const providerIds = [...new Set(models.map(m => m.provider))];
  
  return providerIds.map(id => {
    const meta = PROVIDER_META[id] || {};
    const providerModels = models.filter(m => m.provider === id);
    
    return {
      id,
      displayName: meta.displayName || id,
      description: meta.description || '',
      requiresApiKey: id !== 'ollama',
      apiKeyEnvVar: meta.apiKeyEnvVar || `${id.toUpperCase()}_API_KEY`,
      apiKeyHelp: meta.apiKeyHelp || { url: '', instruction: '' },
      defaultModels: providerModels.slice(0, 5).map(m => m.id),
      tags: meta.tags || []
    };
  });
}

export function getProviderInfo(id: string): ProviderInfo | undefined {
  return listAllProviders().find(p => p.id === id);
}

export function hasApiKey(providerId: string): boolean {
  const provider = getProviderInfo(providerId);
  if (!provider?.requiresApiKey) return true;
  return !!process.env[provider.apiKeyEnvVar];
}

export function getConfiguredProviders(): ProviderInfo[] {
  return listAllProviders().filter(p => hasApiKey(p.id));
}

export function saveProviderApiKey(providerId: string, apiKey: string): void {
  const provider = getProviderInfo(providerId);
  if (!provider) return;
  
  // Save to config file
  const fs = require('fs');
  const path = require('path');
  const configDir = path.join(process.env.HOME || '', '.vibe');
  const configPath = path.join(configDir, 'config.json');
  
  try {
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    let config: any = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
    
    config.apiKeys = config.apiKeys || {};
    config.apiKeys[providerId] = apiKey;
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    // Also set in current process
    process.env[provider.apiKeyEnvVar] = apiKey;
  } catch {}
}

export function getProviderApiKey(providerId: string): string | undefined {
  const provider = getProviderInfo(providerId);
  if (!provider) return undefined;
  return process.env[provider.apiKeyEnvVar];
}

export async function checkProviderHealth(providerId: string): Promise<{ ok: boolean; error?: string }> {
  if (!hasApiKey(providerId)) {
    return { ok: false, error: 'API key not configured' };
  }
  return { ok: true };
}

// Legacy exports
export const ENHANCED_PROVIDERS = PROVIDER_META;
