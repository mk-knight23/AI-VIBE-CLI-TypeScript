/**
 * API Client Module
 * 
 * Provides a unified interface for interacting with multiple AI providers.
 * Supports OpenRouter, MegaLLM, AgentRouter, and Routeway with automatic
 * provider switching, fallback, retry, and rate limiting.
 * 
 * @module core/api
 */

import {
  openRouterChat,
  megaLLMChat,
  agentRouterChat,
  routewayChat,
  fetchOpenRouterModels,
  fetchMegaLLMModels,
  fetchAgentRouterModels,
  fetchRoutewayModels
} from '../providers';
import { withTimeout, withRetry, TIMEOUTS } from '../utils/timeout';

/** Supported AI provider types */
export type ProviderType = 'openrouter' | 'megallm' | 'agentrouter' | 'routeway';

/** Provider capabilities */
export type Capability = 'chat' | 'tools' | 'vision' | 'thinking' | 'streaming';

// Fallback order when primary provider fails
const FALLBACK_ORDER: ProviderType[] = ['megallm', 'openrouter', 'agentrouter', 'routeway'];

// Rate limit tracking per provider
const rateLimitState: Map<string, { count: number; resetAt: number }> = new Map();

/**
 * Configuration options for chat requests
 */
export interface ChatOptions {
  /** Controls randomness in responses (0.0 - 2.0) */
  temperature?: number;
  /** Maximum tokens to generate in response */
  maxTokens?: number;
  /** Enable streaming responses */
  stream?: boolean;
  /** Available tools for function calling */
  tools?: any[];
  /** Disable fallback to other providers */
  noFallback?: boolean;
  /** Required capabilities for provider selection */
  requiredCapabilities?: Capability[];
}

/**
 * Provider health status
 */
export interface ProviderHealth {
  provider: string;
  healthy: boolean;
  lastError?: string;
  lastSuccess?: number;
  rateLimited: boolean;
  requestsRemaining?: number;
}

// Track provider health
const providerHealth: Map<string, ProviderHealth> = new Map();

/**
 * Check if provider is rate limited
 */
function isRateLimited(provider: string): boolean {
  const state = rateLimitState.get(provider);
  if (!state) return false;
  
  // Default rate limits per provider
  const limits: Record<string, number> = {
    groq: 30,
    openrouter: 60,
    megallm: 60,
    agentrouter: 60,
    routeway: 60
  };
  const limit = limits[provider] || 60;
  
  if (Date.now() > state.resetAt) {
    rateLimitState.set(provider, { count: 0, resetAt: Date.now() + 60000 });
    return false;
  }
  
  return state.count >= limit;
}

/**
 * Record a request for rate limiting
 */
function recordRequest(provider: string): void {
  const state = rateLimitState.get(provider) || { count: 0, resetAt: Date.now() + 60000 };
  state.count++;
  rateLimitState.set(provider, state);
}

/**
 * Update provider health status
 */
function updateHealth(provider: string, success: boolean, error?: string): void {
  const current = providerHealth.get(provider) || {
    provider,
    healthy: true,
    rateLimited: false
  };
  
  current.healthy = success;
  current.rateLimited = isRateLimited(provider);
  if (success) {
    current.lastSuccess = Date.now();
    current.lastError = undefined;
  } else {
    current.lastError = error;
  }
  
  providerHealth.set(provider, current);
}

/**
 * Get health status for all providers
 */
export function getProviderHealth(): ProviderHealth[] {
  return FALLBACK_ORDER.map(p => providerHealth.get(p) || {
    provider: p,
    healthy: true,
    rateLimited: isRateLimited(p)
  });
}

/**
 * Unified API client for multi-provider AI interactions
 */
export class ApiClient {
  private provider: ProviderType;
  
  constructor(provider: ProviderType = 'megallm') {
    this.provider = provider;
  }
  
  setProvider(provider: ProviderType): void {
    const validProviders: ProviderType[] = ['openrouter', 'megallm', 'agentrouter', 'routeway'];
    if (!validProviders.includes(provider)) {
      throw new Error(`Invalid provider: ${provider}. Must be one of: ${validProviders.join(', ')}`);
    }
    this.provider = provider;
  }
  
  getProvider(): ProviderType {
    return this.provider;
  }
  
  async fetchModels(): Promise<any[]> {
    try {
      switch (this.provider) {
        case 'openrouter':
          return await fetchOpenRouterModels();
        case 'megallm':
          return await fetchMegaLLMModels();
        case 'agentrouter':
          return await fetchAgentRouterModels();
        case 'routeway':
          return await fetchRoutewayModels();
        default:
          throw new Error(`Unknown provider: ${this.provider}`);
      }
    } catch (error: any) {
      throw new Error(`Failed to fetch models from ${this.provider}: ${error.message}`);
    }
  }
  
  /**
   * Send chat request with timeout, retry, rate limiting, and provider fallback
   */
  async chat(messages: any[], model: string, options: ChatOptions = {}): Promise<any> {
    if (!messages || messages.length === 0) {
      throw new Error('Messages array cannot be empty');
    }
    if (!model || model.trim() === '') {
      throw new Error('Model identifier is required');
    }

    // Build provider list with fallback
    let providers: ProviderType[];
    if (options.noFallback) {
      providers = [this.provider];
    } else {
      providers = [this.provider, ...FALLBACK_ORDER.filter(p => p !== this.provider)];
    }

    // Filter by required capabilities (simplified - all legacy providers support tools/streaming)
    if (options.requiredCapabilities?.length) {
      const capabilityMap: Record<string, Capability[]> = {
        openrouter: ['chat', 'tools', 'vision', 'streaming'],
        megallm: ['chat', 'tools', 'streaming'],
        agentrouter: ['chat', 'tools', 'streaming'],
        routeway: ['chat', 'tools', 'streaming']
      };
      providers = providers.filter(p => 
        options.requiredCapabilities!.every(cap => capabilityMap[p]?.includes(cap))
      );
    }

    // Filter out rate-limited providers (move to end)
    const available = providers.filter(p => !isRateLimited(p));
    const limited = providers.filter(p => isRateLimited(p));
    providers = [...available, ...limited];

    if (providers.length === 0) {
      throw new Error('No providers available with required capabilities');
    }

    let lastError: Error = new Error('Unknown error');

    for (const provider of providers) {
      // Skip if rate limited and we have other options
      if (isRateLimited(provider) && providers.indexOf(provider) < providers.length - 1) {
        continue;
      }

      try {
        recordRequest(provider);
        
        const result = await withTimeout(
          withRetry(() => this.callProvider(provider, messages, model, options), {
            maxRetries: 2,
            delayMs: 1000,
            onRetry: (attempt, err) => {
              // Check for rate limit errors
              if (err.message.includes('429') || err.message.toLowerCase().includes('rate limit')) {
                const state = rateLimitState.get(provider) || { count: 0, resetAt: 0 };
                state.count = 999; // Force rate limit
                state.resetAt = Date.now() + 60000;
                rateLimitState.set(provider, state);
              }
            }
          }),
          TIMEOUTS.API_CALL,
          `${provider} API call`
        );
        
        updateHealth(provider, true);
        return result;
      } catch (error: any) {
        lastError = error;
        updateHealth(provider, false, error.message);
        // Continue to next provider
      }
    }

    throw new Error(`All providers failed. Last error: ${lastError.message}`);
  }

  private async callProvider(provider: ProviderType, messages: any[], model: string, options: ChatOptions): Promise<any> {
    switch (provider) {
      case 'openrouter':
        return await openRouterChat(messages, model, options);
      case 'megallm':
        return await megaLLMChat(messages, model, options);
      case 'agentrouter':
        return await agentRouterChat(messages, model, options);
      case 'routeway':
        return await routewayChat(messages, model, options);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
}

export const defaultClient = new ApiClient();
