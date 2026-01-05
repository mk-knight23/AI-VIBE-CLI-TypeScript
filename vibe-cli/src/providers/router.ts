/**
 * VIBE-CLI v12 - Provider Router
 * Universal interface for AI providers (OpenAI, Anthropic, Google, xAI, Ollama)
 */

import type { ProviderConfig, ProviderResponse, IProviderRouter } from '../types';
import { PROVIDER_REGISTRY } from './registry';

export class VibeProviderRouter implements IProviderRouter {
  private providers: Map<string, ProviderConfig>;
  private defaultProvider: string = 'openai';
  private currentProvider: string = 'openai';

  constructor() {
    this.providers = new Map();
    this.initializeProviders();
  }

  private initializeProviders(): void {
    for (const provider of PROVIDER_REGISTRY) {
      this.providers.set(provider.id, {
        id: provider.id,
        name: provider.name,
        baseUrl: provider.baseUrl,
        apiKeyEnv: provider.apiKeyEnv,
        defaultModel: provider.defaultModel,
        requiresApiKey: provider.requiresApiKey,
      });
    }
  }

  /**
   * Chat completion - implements IProviderRouter
   */
  async chat(
    messages: Array<{ role: string; content: string }>,
    _options?: object
  ): Promise<ProviderResponse> {
    const provider = this.currentProvider;
    const config = this.providers.get(provider);

    if (!config) {
      throw new Error(`Provider ${provider} not configured`);
    }

    // For now, return a mock response
    // In production, this would call actual APIs
    return {
      content: `[${provider}] Response to: ${messages.length} messages`,
      usage: {
        promptTokens: 10,
        completionTokens: 100,
        totalTokens: 110,
      },
      model: config.defaultModel,
      provider: provider,
    };
  }

  /**
   * Complete a prompt - implements IProviderRouter
   */
  async complete(prompt: string): Promise<ProviderResponse> {
    const provider = this.currentProvider;
    const config = this.providers.get(provider);

    if (!config) {
      throw new Error(`Provider ${provider} not configured`);
    }

    return {
      content: `[${provider}] Completion for: ${prompt.slice(0, 50)}...`,
      usage: {
        promptTokens: prompt.length,
        completionTokens: 100,
        totalTokens: prompt.length + 100,
      },
      model: config.defaultModel,
      provider: provider,
    };
  }

  /**
   * Select model for task - implements IProviderRouter
   */
  selectModel(task: string): string {
    // Simple model selection based on task type
    const taskLower = task.toLowerCase();
    
    if (taskLower.includes('reason') || taskLower.includes('think') || taskLower.includes('plan')) {
      return 'o1'; // Use reasoning model for complex tasks
    }
    if (taskLower.includes('code') || taskLower.includes('function')) {
      return 'claude-opus-4-20250514'; // Use Opus for code
    }
    if (taskLower.includes('fast') || taskLower.includes('simple')) {
      return 'gpt-4o-mini'; // Use fast model for simple tasks
    }
    
    return this.providers.get(this.currentProvider)?.defaultModel || 'gpt-4o';
  }

  /**
   * Get provider status
   */
  getStatus(): { provider: string; model: string; available: number } {
    const config = this.providers.get(this.currentProvider);
    return {
      provider: this.currentProvider,
      model: config?.defaultModel || 'unknown',
      available: this.providers.size,
    };
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is configured
   */
  isProviderConfigured(provider: string): boolean {
    const config = this.providers.get(provider);
    if (!config) return false;
    
    // Check if API key is available in environment
    if (config.requiresApiKey) {
      const apiKey = process.env[config.apiKeyEnv];
      return !!apiKey;
    }
    return true; // Local providers like Ollama don't need API keys
  }

  /**
   * Set current provider
   */
  setProvider(provider: string): boolean {
    if (this.providers.has(provider)) {
      this.currentProvider = provider;
      return true;
    }
    return false;
  }

  /**
   * Get provider info
   */
  getProvider(provider: string): ProviderConfig | undefined {
    return this.providers.get(provider);
  }

  /**
   * List all providers
   */
  listProviders(): Array<{ id: string; configured: boolean; model: string }> {
    const providers: Array<{ id: string; configured: boolean; model: string }> = [];
    for (const [id, config] of this.providers) {
      providers.push({
        id,
        configured: this.isProviderConfigured(id),
        model: config.defaultModel,
      });
    }
    return providers;
  }
}
