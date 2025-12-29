/**
 * Provider Registry - Built-in provider definitions
 */

import { LLMProvider } from './types';

export const BUILTIN_PROVIDERS: Record<string, LLMProvider> = {
  // Cloud Direct
  openai: {
    id: 'openai',
    name: 'OpenAI',
    type: 'cloud',
    sdk: 'openai-compatible',
    baseURL: 'https://api.openai.com/v1',
    env: ['OPENAI_API_KEY']
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    type: 'cloud',
    sdk: 'native',
    baseURL: 'https://api.anthropic.com/v1',
    env: ['ANTHROPIC_API_KEY']
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    type: 'cloud',
    sdk: 'openai-compatible',
    baseURL: 'https://api.deepseek.com/v1',
    env: ['DEEPSEEK_API_KEY']
  },
  xai: {
    id: 'xai',
    name: 'xAI',
    type: 'cloud',
    sdk: 'openai-compatible',
    baseURL: 'https://api.x.ai/v1',
    env: ['XAI_API_KEY']
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    type: 'cloud',
    sdk: 'openai-compatible',
    baseURL: 'https://api.groq.com/openai/v1',
    env: ['GROQ_API_KEY']
  },
  together: {
    id: 'together',
    name: 'Together AI',
    type: 'cloud',
    sdk: 'openai-compatible',
    baseURL: 'https://api.together.xyz/v1',
    env: ['TOGETHER_API_KEY']
  },
  fireworks: {
    id: 'fireworks',
    name: 'Fireworks',
    type: 'cloud',
    sdk: 'openai-compatible',
    baseURL: 'https://api.fireworks.ai/inference/v1',
    env: ['FIREWORKS_API_KEY']
  },
  cerebras: {
    id: 'cerebras',
    name: 'Cerebras',
    type: 'cloud',
    sdk: 'openai-compatible',
    baseURL: 'https://api.cerebras.ai/v1',
    env: ['CEREBRAS_API_KEY']
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral',
    type: 'cloud',
    sdk: 'openai-compatible',
    baseURL: 'https://api.mistral.ai/v1',
    env: ['MISTRAL_API_KEY']
  },
  moonshot: {
    id: 'moonshot',
    name: 'Moonshot',
    type: 'cloud',
    sdk: 'openai-compatible',
    baseURL: 'https://api.moonshot.cn/v1',
    env: ['MOONSHOT_API_KEY']
  },
  minimax: {
    id: 'minimax',
    name: 'MiniMax',
    type: 'cloud',
    sdk: 'openai-compatible',
    baseURL: 'https://api.minimax.chat/v1',
    env: ['MINIMAX_API_KEY']
  },

  // Gateways
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    type: 'gateway',
    sdk: 'openai-compatible',
    baseURL: 'https://openrouter.ai/api/v1',
    env: ['OPENROUTER_API_KEY']
  },
  megallm: {
    id: 'megallm',
    name: 'MegaLLM',
    type: 'gateway',
    sdk: 'openai-compatible',
    baseURL: 'https://ai.megallm.io/v1',
    env: ['MEGALLM_API_KEY']
  },
  agentrouter: {
    id: 'agentrouter',
    name: 'AgentRouter',
    type: 'gateway',
    sdk: 'openai-compatible',
    baseURL: 'https://agentrouter.org/v1',
    env: ['AGENTROUTER_API_KEY']
  },
  routeway: {
    id: 'routeway',
    name: 'Routeway',
    type: 'gateway',
    sdk: 'openai-compatible',
    baseURL: 'https://api.routeway.ai/v1',
    env: ['ROUTEWAY_API_KEY']
  },

  // Local Runtimes
  ollama: {
    id: 'ollama',
    name: 'Ollama',
    type: 'local',
    sdk: 'openai-compatible',
    baseURL: 'http://localhost:11434/v1',
    env: []
  },
  lmstudio: {
    id: 'lmstudio',
    name: 'LM Studio',
    type: 'local',
    sdk: 'openai-compatible',
    baseURL: 'http://localhost:1234/v1',
    env: []
  },
  llamacpp: {
    id: 'llamacpp',
    name: 'llama.cpp',
    type: 'local',
    sdk: 'openai-compatible',
    baseURL: 'http://localhost:8080/v1',
    env: []
  }
};

export class ProviderRegistry {
  private providers: Map<string, LLMProvider> = new Map();

  constructor() {
    Object.entries(BUILTIN_PROVIDERS).forEach(([id, provider]) => {
      this.providers.set(id, provider);
    });
  }

  get(id: string): LLMProvider | undefined {
    return this.providers.get(id.toLowerCase());
  }

  register(provider: LLMProvider): void {
    this.providers.set(provider.id.toLowerCase(), provider);
  }

  list(): LLMProvider[] {
    return Array.from(this.providers.values());
  }

  listByType(type: LLMProvider['type']): LLMProvider[] {
    return this.list().filter(p => p.type === type);
  }

  has(id: string): boolean {
    return this.providers.has(id.toLowerCase());
  }

  getEnvKey(providerId: string): string | undefined {
    return this.get(providerId)?.env?.[0];
  }
}

export const providerRegistry = new ProviderRegistry();
