/**
 * Provider Registry - Config-driven, extensible provider system
 * Supports 75+ providers via OpenAI-compatible endpoints
 */

export type ProviderType = 'openai-compatible' | 'anthropic' | 'bedrock' | 'vertex' | 'ollama' | 'custom';
export type Capability = 'chat' | 'tools' | 'vision' | 'thinking' | 'streaming';

export interface ProviderConfig {
  name: string;
  type: ProviderType;
  baseUrl: string;
  apiKeyEnv: string;
  capabilities?: Capability[];
  headers?: Record<string, string>;
  rateLimit?: number; // requests per minute
}

// Built-in providers (backward compatible with existing)
export const PROVIDER_REGISTRY: Record<string, ProviderConfig> = {
  // Existing providers (preserved)
  openrouter: {
    name: 'OpenRouter',
    type: 'openai-compatible',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    capabilities: ['chat', 'tools', 'vision', 'streaming'],
  },
  megallm: {
    name: 'MegaLLM',
    type: 'openai-compatible',
    baseUrl: 'https://ai.megallm.io/v1',
    apiKeyEnv: 'MEGALLM_API_KEY',
    capabilities: ['chat', 'tools', 'streaming'],
  },
  agentrouter: {
    name: 'AgentRouter',
    type: 'openai-compatible',
    baseUrl: 'https://agentrouter.org/v1',
    apiKeyEnv: 'AGENTROUTER_API_KEY',
    capabilities: ['chat', 'tools', 'streaming'],
  },
  routeway: {
    name: 'Routeway',
    type: 'openai-compatible',
    baseUrl: 'https://api.routeway.ai/v1',
    apiKeyEnv: 'ROUTEWAY_API_KEY',
    capabilities: ['chat', 'tools', 'streaming'],
  },
  // New providers
  openai: {
    name: 'OpenAI',
    type: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
    capabilities: ['chat', 'tools', 'vision', 'thinking', 'streaming'],
  },
  anthropic: {
    name: 'Anthropic',
    type: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    capabilities: ['chat', 'tools', 'vision', 'thinking', 'streaming'],
  },
  google: {
    name: 'Google AI',
    type: 'openai-compatible',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKeyEnv: 'GOOGLE_API_KEY',
    capabilities: ['chat', 'tools', 'vision', 'streaming'],
  },
  deepseek: {
    name: 'DeepSeek',
    type: 'openai-compatible',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    capabilities: ['chat', 'tools', 'thinking', 'streaming'],
  },
  groq: {
    name: 'Groq',
    type: 'openai-compatible',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKeyEnv: 'GROQ_API_KEY',
    capabilities: ['chat', 'tools', 'streaming'],
    rateLimit: 30,
  },
  together: {
    name: 'Together AI',
    type: 'openai-compatible',
    baseUrl: 'https://api.together.xyz/v1',
    apiKeyEnv: 'TOGETHER_API_KEY',
    capabilities: ['chat', 'tools', 'streaming'],
  },
  fireworks: {
    name: 'Fireworks AI',
    type: 'openai-compatible',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    apiKeyEnv: 'FIREWORKS_API_KEY',
    capabilities: ['chat', 'tools', 'streaming'],
  },
  mistral: {
    name: 'Mistral AI',
    type: 'openai-compatible',
    baseUrl: 'https://api.mistral.ai/v1',
    apiKeyEnv: 'MISTRAL_API_KEY',
    capabilities: ['chat', 'tools', 'streaming'],
  },
  xai: {
    name: 'xAI',
    type: 'openai-compatible',
    baseUrl: 'https://api.x.ai/v1',
    apiKeyEnv: 'XAI_API_KEY',
    capabilities: ['chat', 'tools', 'streaming'],
  },
  perplexity: {
    name: 'Perplexity',
    type: 'openai-compatible',
    baseUrl: 'https://api.perplexity.ai',
    apiKeyEnv: 'PERPLEXITY_API_KEY',
    capabilities: ['chat', 'streaming'],
  },
  ollama: {
    name: 'Ollama',
    type: 'ollama',
    baseUrl: 'http://localhost:11434',
    apiKeyEnv: '',
    capabilities: ['chat', 'tools', 'streaming'],
  },
  lmstudio: {
    name: 'LM Studio',
    type: 'openai-compatible',
    baseUrl: 'http://localhost:1234/v1',
    apiKeyEnv: '',
    capabilities: ['chat', 'tools', 'streaming'],
  },
  // Enterprise
  'azure-openai': {
    name: 'Azure OpenAI',
    type: 'openai-compatible',
    baseUrl: '', // Set via AZURE_OPENAI_ENDPOINT
    apiKeyEnv: 'AZURE_OPENAI_API_KEY',
    capabilities: ['chat', 'tools', 'vision', 'streaming'],
  },
  bedrock: {
    name: 'AWS Bedrock',
    type: 'bedrock',
    baseUrl: '',
    apiKeyEnv: 'AWS_PROFILE',
    capabilities: ['chat', 'tools', 'streaming'],
  },
  vertex: {
    name: 'Google Vertex AI',
    type: 'vertex',
    baseUrl: '',
    apiKeyEnv: 'GOOGLE_APPLICATION_CREDENTIALS',
    capabilities: ['chat', 'tools', 'vision', 'streaming'],
  },
};

// Custom provider storage
let customProviders: Record<string, ProviderConfig> = {};

export function getProvider(name: string): ProviderConfig | undefined {
  return customProviders[name] || PROVIDER_REGISTRY[name];
}

export function listProviders(): string[] {
  return [...Object.keys(PROVIDER_REGISTRY), ...Object.keys(customProviders)];
}

export function listConfiguredProviders(): string[] {
  return listProviders().filter(name => {
    const p = getProvider(name);
    if (!p) return false;
    if (!p.apiKeyEnv) return true; // Local providers (ollama, lmstudio)
    return !!process.env[p.apiKeyEnv];
  });
}

export function registerProvider(name: string, config: ProviderConfig): void {
  customProviders[name] = config;
}

export function hasCapability(provider: string, cap: Capability): boolean {
  const p = getProvider(provider);
  return p?.capabilities?.includes(cap) ?? false;
}

export function getApiKey(provider: string): string {
  const p = getProvider(provider);
  if (!p?.apiKeyEnv) return '';
  return process.env[p.apiKeyEnv] || '';
}

export function getBaseUrl(provider: string): string {
  const p = getProvider(provider);
  if (!p) return '';
  // Handle Azure special case
  if (provider === 'azure-openai') {
    return process.env.AZURE_OPENAI_ENDPOINT || p.baseUrl;
  }
  return p.baseUrl;
}
