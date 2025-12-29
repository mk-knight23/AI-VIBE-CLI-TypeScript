/**
 * Model Registry - Capability-aware model catalog
 */

import { ModelConfig, CostTier, SpeedTier } from './types';

export interface RegisteredModel {
  id: string;
  provider: string;
  config: ModelConfig;
}

const DEFAULT_CAPABILITIES = { tools: true, vision: false, reasoning: false, streaming: true };

// Built-in model catalog with capabilities
const BUILTIN_MODELS: Record<string, RegisteredModel> = {
  // OpenAI
  'openai/gpt-4o': {
    id: 'gpt-4o', provider: 'openai',
    config: { context: 128000, output: 16384, supports: { ...DEFAULT_CAPABILITIES, vision: true }, cost: 'high', speed: 'medium' }
  },
  'openai/gpt-4o-mini': {
    id: 'gpt-4o-mini', provider: 'openai',
    config: { context: 128000, output: 16384, supports: { ...DEFAULT_CAPABILITIES, vision: true }, cost: 'low', speed: 'fast' }
  },
  'openai/o3-mini': {
    id: 'o3-mini', provider: 'openai',
    config: { context: 128000, output: 65536, supports: { ...DEFAULT_CAPABILITIES, reasoning: true }, cost: 'medium', speed: 'slow' }
  },

  // Anthropic
  'anthropic/claude-sonnet-4': {
    id: 'claude-sonnet-4', provider: 'anthropic',
    config: { context: 200000, output: 64000, supports: { ...DEFAULT_CAPABILITIES, vision: true }, cost: 'high', speed: 'medium' }
  },
  'anthropic/claude-3.5-sonnet': {
    id: 'claude-3-5-sonnet-20241022', provider: 'anthropic',
    config: { context: 200000, output: 8192, supports: { ...DEFAULT_CAPABILITIES, vision: true }, cost: 'medium', speed: 'medium' }
  },
  'anthropic/claude-3-haiku': {
    id: 'claude-3-haiku-20240307', provider: 'anthropic',
    config: { context: 200000, output: 4096, supports: DEFAULT_CAPABILITIES, cost: 'low', speed: 'fast' }
  },

  // DeepSeek
  'deepseek/deepseek-chat': {
    id: 'deepseek-chat', provider: 'deepseek',
    config: { context: 64000, supports: DEFAULT_CAPABILITIES, cost: 'low', speed: 'fast' }
  },
  'deepseek/deepseek-reasoner': {
    id: 'deepseek-reasoner', provider: 'deepseek',
    config: { context: 64000, supports: { ...DEFAULT_CAPABILITIES, reasoning: true }, cost: 'low', speed: 'slow' }
  },

  // Groq
  'groq/llama-3.3-70b': {
    id: 'llama-3.3-70b-versatile', provider: 'groq',
    config: { context: 128000, supports: DEFAULT_CAPABILITIES, cost: 'low', speed: 'fast' }
  },
  'groq/llama-3.1-8b': {
    id: 'llama-3.1-8b-instant', provider: 'groq',
    config: { context: 128000, supports: DEFAULT_CAPABILITIES, cost: 'low', speed: 'fast' }
  },

  // Google (via OpenRouter)
  'google/gemini-2.0-flash': {
    id: 'google/gemini-2.0-flash-001', provider: 'openrouter',
    config: { context: 1000000, supports: { ...DEFAULT_CAPABILITIES, vision: true }, cost: 'low', speed: 'fast' }
  },
  'google/gemini-1.5-pro': {
    id: 'google/gemini-pro-1.5', provider: 'openrouter',
    config: { context: 2000000, supports: { ...DEFAULT_CAPABILITIES, vision: true }, cost: 'medium', speed: 'medium' }
  },

  // Qwen
  'qwen/qwen-2.5-coder-32b': {
    id: 'qwen/qwen-2.5-coder-32b-instruct', provider: 'openrouter',
    config: { context: 32000, supports: DEFAULT_CAPABILITIES, cost: 'low', speed: 'fast' }
  },

  // Moonshot
  'moonshot/kimi-k2': {
    id: 'moonshotai/kimi-k2', provider: 'openrouter',
    config: { context: 128000, supports: DEFAULT_CAPABILITIES, cost: 'medium', speed: 'medium' }
  },

  // Local models (Ollama defaults)
  'ollama/llama3.3': {
    id: 'llama3.3', provider: 'ollama',
    config: { context: 128000, supports: DEFAULT_CAPABILITIES, cost: 'low', speed: 'medium', local: true }
  },
  'ollama/qwen2.5-coder': {
    id: 'qwen2.5-coder', provider: 'ollama',
    config: { context: 32000, supports: DEFAULT_CAPABILITIES, cost: 'low', speed: 'fast', local: true }
  },
  'ollama/deepseek-r1': {
    id: 'deepseek-r1', provider: 'ollama',
    config: { context: 64000, supports: { ...DEFAULT_CAPABILITIES, reasoning: true }, cost: 'low', speed: 'slow', local: true }
  }
};

export class ModelRegistry {
  private models: Map<string, RegisteredModel> = new Map();

  constructor() {
    Object.entries(BUILTIN_MODELS).forEach(([key, model]) => {
      this.models.set(key, model);
    });
  }

  get(fullId: string): RegisteredModel | undefined {
    return this.models.get(fullId);
  }

  register(fullId: string, model: RegisteredModel): void {
    this.models.set(fullId, model);
  }

  list(): RegisteredModel[] {
    return Array.from(this.models.values());
  }

  listByProvider(provider: string): RegisteredModel[] {
    return this.list().filter(m => m.provider === provider);
  }

  listByCost(cost: CostTier): RegisteredModel[] {
    return this.list().filter(m => m.config.cost === cost);
  }

  listBySpeed(speed: SpeedTier): RegisteredModel[] {
    return this.list().filter(m => m.config.speed === speed);
  }

  listWithCapability(cap: keyof ModelConfig['supports']): RegisteredModel[] {
    return this.list().filter(m => m.config.supports[cap]);
  }

  listLocal(): RegisteredModel[] {
    return this.list().filter(m => m.config.local);
  }

  parseModelId(modelString: string): { provider: string; model: string } | null {
    const parts = modelString.split('/');
    if (parts.length >= 2) {
      return { provider: parts[0], model: parts.slice(1).join('/') };
    }
    // Try to find in registry
    for (const [key, reg] of this.models) {
      if (key.endsWith('/' + modelString) || reg.id === modelString) {
        return { provider: reg.provider, model: reg.id };
      }
    }
    return null;
  }

  has(fullId: string): boolean {
    return this.models.has(fullId);
  }
}

export const modelRegistry = new ModelRegistry();
