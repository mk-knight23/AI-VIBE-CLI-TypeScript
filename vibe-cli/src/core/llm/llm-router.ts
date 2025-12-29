/**
 * LLM Router - Smart routing with fallbacks
 */

import { LLMClient, createClient } from './llm-client';
import { ChatMessage, ChatOptions, ChatResponse, RoutingRule, CostTier } from './types';
import { providerRegistry } from './provider-registry';
import { modelRegistry } from './model-registry';
import { credentialStore } from './credentials';

export interface RouterConfig {
  routing?: RoutingRule;
  maxRetries?: number;
  fallbackEnabled?: boolean;
}

export class LLMRouter {
  private config: RouterConfig;
  private lastError: string | null = null;

  constructor(config: RouterConfig = {}) {
    this.config = {
      maxRetries: 3,
      fallbackEnabled: true,
      ...config
    };
  }

  async chat(
    messages: ChatMessage[],
    modelString: string,
    options: ChatOptions = {}
  ): Promise<ChatResponse & { provider: string; model: string }> {
    const parsed = modelRegistry.parseModelId(modelString);
    if (!parsed) {
      throw new Error(`Cannot parse model: ${modelString}`);
    }

    const chain = this.buildFallbackChain(parsed.provider, parsed.model);
    let lastError: Error | null = null;

    for (const { provider, model } of chain) {
      try {
        const client = createClient(provider, {
          apiKey: credentialStore.getApiKey(provider)
        });
        const response = await client.chat(messages, model, options);
        return { ...response, provider, model };
      } catch (err) {
        lastError = err as Error;
        this.lastError = lastError.message;
        if (!this.config.fallbackEnabled) break;
      }
    }

    throw lastError || new Error('All providers failed');
  }

  async *chatStream(
    messages: ChatMessage[],
    modelString: string,
    options: ChatOptions = {}
  ): AsyncGenerator<string> {
    const parsed = modelRegistry.parseModelId(modelString);
    if (!parsed) {
      throw new Error(`Cannot parse model: ${modelString}`);
    }

    const client = createClient(parsed.provider, {
      apiKey: credentialStore.getApiKey(parsed.provider)
    });

    yield* client.chatStream(messages, parsed.model, options);
  }

  selectModel(task: 'code' | 'chat' | 'cheap' | 'reasoning' | 'vision'): string | null {
    const routing = this.config.routing;
    if (!routing) return null;

    const candidates = routing[task];
    if (!candidates?.length) return null;

    // Return first available model
    for (const model of candidates) {
      const parsed = modelRegistry.parseModelId(model);
      if (parsed && credentialStore.getApiKey(parsed.provider)) {
        return model;
      }
    }
    return candidates[0];
  }

  getAvailableProviders(): string[] {
    return providerRegistry.list()
      .filter(p => p.type === 'local' || credentialStore.getApiKey(p.id))
      .map(p => p.id);
  }

  getLastError(): string | null {
    return this.lastError;
  }

  private buildFallbackChain(provider: string, model: string): { provider: string; model: string }[] {
    const chain: { provider: string; model: string }[] = [{ provider, model }];

    if (!this.config.fallbackEnabled) return chain;

    // Add same-tier fallbacks
    const regModel = modelRegistry.get(`${provider}/${model}`);
    if (regModel) {
      const sameTier = modelRegistry.listByCost(regModel.config.cost)
        .filter(m => m.provider !== provider)
        .filter(m => credentialStore.getApiKey(m.provider))
        .slice(0, 2);

      for (const m of sameTier) {
        chain.push({ provider: m.provider, model: m.id });
      }
    }

    // Add cheap fallback
    const cheapFallback = modelRegistry.listByCost('low')
      .find(m => credentialStore.getApiKey(m.provider) && !chain.some(c => c.provider === m.provider));

    if (cheapFallback) {
      chain.push({ provider: cheapFallback.provider, model: cheapFallback.id });
    }

    return chain;
  }
}

export const llmRouter = new LLMRouter();
