/**
 * Free Models - Built-in free tier models via VIBE Cloud
 */

import { RegisteredModel } from './llm/model-registry';

// Free models available without API keys
export const FREE_MODELS: RegisteredModel[] = [
  {
    id: 'vibe/gemini-flash',
    provider: 'vibe-cloud',
    config: {
      context: 128000,
      supports: { tools: true, vision: true, reasoning: false, streaming: true },
      cost: 'low',
      speed: 'fast'
    }
  },
  {
    id: 'vibe/llama-3.3',
    provider: 'vibe-cloud',
    config: {
      context: 128000,
      supports: { tools: true, vision: false, reasoning: false, streaming: true },
      cost: 'low',
      speed: 'fast'
    }
  },
  {
    id: 'vibe/deepseek-v3',
    provider: 'vibe-cloud',
    config: {
      context: 64000,
      supports: { tools: true, vision: false, reasoning: false, streaming: true },
      cost: 'low',
      speed: 'fast'
    }
  },
  {
    id: 'vibe/qwen-coder',
    provider: 'vibe-cloud',
    config: {
      context: 32000,
      supports: { tools: true, vision: false, reasoning: false, streaming: true },
      cost: 'low',
      speed: 'fast'
    }
  }
];

// VIBE Cloud provider config
export const VIBE_CLOUD_PROVIDER = {
  id: 'vibe-cloud',
  name: 'VIBE Cloud (Free)',
  type: 'gateway' as const,
  sdk: 'openai-compatible' as const,
  baseURL: 'https://api.vibe-ai.dev/v1',
  env: [] // No API key needed for free tier
};

export function isFreeModel(modelId: string): boolean {
  return FREE_MODELS.some(m => m.id === modelId || modelId.startsWith('vibe/'));
}

export function getFreeTierLimits() {
  return {
    requestsPerDay: 100,
    tokensPerRequest: 8000,
    modelsAvailable: FREE_MODELS.length
  };
}
