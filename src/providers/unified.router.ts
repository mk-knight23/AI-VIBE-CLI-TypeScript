/**
 * VIBE CLI - Unified Provider Router
 *
 * Central router for all LLM providers with:
 * - Adapter-based architecture
 * - Automatic fallback chain (free → paid → local)
 * - Cost tracking
 * - Provider health monitoring
 * - Task-based model selection
 *
 * Version: 0.0.2
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  BaseProviderAdapter,
  ProviderOptions,
  StreamCallback,
  selectModelForTask,
  ProviderError,
} from "./adapters/base.adapter.js";
import {
  OpenAIAdapter,
  AzureOpenAIAdapter,
} from "./adapters/openai.adapter.js";
import {
  AnthropicAdapter,
  BedrockAnthropicAdapter,
} from "./adapters/anthropic.adapter.js";
import { GoogleAdapter } from "./adapters/google.adapter.js";
import { OpenRouterAdapter } from "./adapters/openrouter.adapter.js";
import { OllamaAdapter, LMStudioAdapter } from "./adapters/ollama.adapter.js";
import {
  PROVIDER_REGISTRY,
  getProviderById,
  getProviderByModel,
} from "./registry.js";
import type {
  ChatMessage,
  ModelInfo,
  ProviderConfig,
  ProviderResponse,
} from "../types.js";

// ============================================================================
// TYPES
// ============================================================================

export interface UserConfig {
  provider?: string;
  model?: string;
  apiKeys?: Record<string, string>;
}

export interface RouterConfig {
  defaultProvider?: string;
  fallbackChain?: FallbackStrategy;
  enableCostTracking?: boolean;
  maxRetries?: number;
}

export type FallbackStrategy =
  | "free-first" // Try free models first
  | "paid-first" // Try paid (better quality) first
  | "local-first" // Try local models first
  | "speed-first" // Try fastest models first
  | "quality-first" // Try best models first
  | "balanced"; // Mix of speed and quality

export interface RouterStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: number;
  totalCost: number;
  averageLatencyMs: number;
}

// ============================================================================
// UNIFIED ROUTER
// ============================================================================

export class UnifiedProviderRouter {
  private adapters: Map<string, BaseProviderAdapter> = new Map();
  private defaultProvider: string = "anthropic";
  private defaultModel: string = "claude-sonnet-4-20250514";
  private userConfig: UserConfig = {};
  private configDir: string;
  private stats: RouterStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalTokens: 0,
    totalCost: 0,
    averageLatencyMs: 0,
  };
  private fallbackStrategy: FallbackStrategy = "balanced";
  private maxRetries: number = 2;

  constructor(config?: RouterConfig) {
    this.configDir = path.join(os.homedir(), ".vibe");
    this.defaultProvider = config?.defaultProvider || this.defaultProvider;
    this.fallbackStrategy = config?.fallbackChain || "balanced";
    this.maxRetries = config?.maxRetries || 2;

    this.initializeAdapters();
    this.loadUserConfig();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Get an adapter by ID, instantiating it lazily if needed
   */
  getAdapter(id: string): BaseProviderAdapter | undefined {
    if (!this.adapters.has(id)) {
      this.instantiateAdapter(id);
    }
    return this.getAdapter(id);
  }

  /**
   * Instantiate an adapter by ID
   */
  private instantiateAdapter(id: string): void {
    switch (id) {
      case "openai":
        this.registerAdapter(id, new OpenAIAdapter());
        break;
      case "azure":
        this.registerAdapter(id, new AzureOpenAIAdapter());
        break;
      case "anthropic":
        this.registerAdapter(id, new AnthropicAdapter());
        break;
      case "bedrock":
        this.registerAdapter(id, new BedrockAnthropicAdapter());
        break;
      case "google":
        this.registerAdapter(id, new GoogleAdapter());
        break;
      case "openrouter":
        this.registerAdapter(id, new OpenRouterAdapter());
        break;
      case "ollama":
        this.registerAdapter(id, new OllamaAdapter());
        break;
      case "lmstudio":
        this.registerAdapter(id, new LMStudioAdapter());
        break;
    }
  }

  /**
   * Register a provider adapter
   */
  private registerAdapter(id: string, adapter: BaseProviderAdapter): void {
    this.adapters.set(id, adapter);
  }

  /**
   * Register all provider IDs for discovery
   */
  private initializeAdapters(): void {
    // Only pre-register the IDs, don't instantiate yet (P2-035)
    const providerIds = [
      "openai",
      "azure",
      "anthropic",
      "bedrock",
      "google",
      "openrouter",
      "ollama",
      "lmstudio",
    ];

    // We can't really list providers without instantiating them if we need their metadata
    // But for lazy loading, we'll instantiate only when needed for actual chat/stream
  }

  /**
   * List all available providers
   */
  listProviders(): Array<{
    id: string;
    name: string;
    configured: boolean;
    available: boolean;
    models: number;
    defaultModel: string;
    freeTier: boolean;
  }> {
    return PROVIDER_REGISTRY.map((config) => {
      // Check if instantiated to get more accurate info, otherwise use registry
      const adapter = this.adapters.get(config.id);
      const isConfigured = adapter
        ? adapter.isConfigured()
        : this.checkApiKeyEnv(config.apiKeyEnv, config.requiresApiKey);

      return {
        id: config.id,
        name: config.name,
        configured: isConfigured,
        available: true,
        models: config.models.length,
        defaultModel: config.defaultModel,
        freeTier: config.models.some((m) => m.freeTier),
      };
    });
  }

  /**
   * Check if API key exists in environment
   * Uses constant-time comparison for validation when needed
   */
  private checkApiKeyEnv(envVar: string, required: boolean): boolean {
    if (!required) return true;
    const apiKey = process.env[envVar];

    // Use secure comparison if we have an expected value to validate against
    // For presence check, we just verify the key exists and is not empty
    // (constant-time comparison is only needed when comparing against an expected value)
    if (!apiKey) return false;

    // Check that the key is not just whitespace and meets minimum length
    return apiKey.trim().length > 0;
  }

  // ============================================================================
  // CHAT API
  // ============================================================================

  /**
   * Chat completion with automatic provider selection
   */
  async chat(
    messages: ChatMessage[],
    options?: ProviderOptions,
  ): Promise<ProviderResponse> {
    const providerId =
      options?.model?.split("/")[0] ||
      this.userConfig.provider ||
      this.defaultProvider;
    const model = options?.model || this.userConfig.model;

    const adapter = this.getAdapter(providerId);
    if (!adapter) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    // Try with primary provider
    try {
      const response = await adapter.chat(messages, { ...options, model });
      this.recordSuccess(response);
      return response;
    } catch (error) {
      if (!(error instanceof ProviderError) || !error.retryable) {
        throw error;
      }

      // Try fallback providers
      return this.chatWithFallback(messages, options, providerId);
    }
  }

  /**
   * Chat with fallback chain
   */
  async chatWithFallback(
    messages: ChatMessage[],
    options: ProviderOptions | undefined,
    excludeProvider: string,
  ): Promise<ProviderResponse> {
    const fallbackProviders = this.getFallbackOrder(excludeProvider);

    let lastError: Error | null = null;

    for (const providerId of fallbackProviders) {
      const adapter = this.getAdapter(providerId);
      if (!adapter || !adapter.isConfigured()) continue;

      for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
        try {
          const response = await adapter.chat(messages, {
            ...options,
            model: options?.model || adapter.getDefaultModel(),
          });
          this.recordSuccess(response);
          return response;
        } catch (error) {
          if (error instanceof ProviderError && error.retryable) {
            lastError = error;
            continue;
          }
          lastError = error instanceof Error ? error : new Error(String(error));
          break;
        }
      }
    }

    throw lastError || new Error("All providers failed");
  }

  /**
   * Streaming chat completion
   */
  async *streamChat(
    messages: ChatMessage[],
    callback: StreamCallback,
    options?: ProviderOptions,
  ): AsyncGenerator<void> {
    const providerId = this.userConfig.provider || this.defaultProvider;
    const adapter = this.getAdapter(providerId);

    if (!adapter) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    yield* adapter.streamChat(messages, callback, options);
  }

  /**
   * Simple completion
   */
  async complete(
    prompt: string,
    options?: ProviderOptions,
  ): Promise<ProviderResponse> {
    return this.chat([{ role: "user", content: prompt }], options);
  }

  // ============================================================================
  // MODEL SELECTION
  // ============================================================================

  /**
   * Select model for a task
   */
  selectModelForTask(task: string): string {
    const adapter = this.getAdapter(this.defaultProvider);
    if (!adapter) return this.defaultModel;

    const modelInfo = selectModelForTask(task, adapter.getModels());
    return modelInfo?.id || this.defaultModel;
  }

  /**
   * Set current provider
   */
  setProvider(provider: string): boolean {
    const normalized = provider.toLowerCase().replace(/\s+/g, "");

    // Map common names
    const providerMap: Record<string, string> = {
      openai: "openai",
      anthropic: "anthropic",
      claude: "anthropic",
      google: "google",
      gemini: "google",
      ollama: "ollama",
      local: "ollama",
      openrouter: "openrouter",
      or: "openrouter",
      bedrock: "bedrock",
      aws: "bedrock",
      azure: "azure",
    };

    const providerId = providerMap[normalized] || provider;

    if (this.isKnownProvider(providerId)) {
      this.userConfig.provider = providerId;
      this.userConfig.model = this.getAdapter(providerId)!.getDefaultModel();
      this.saveUserConfig();
      return true;
    }
    return false;
  }

  private isKnownProvider(id: string): boolean {
    return PROVIDER_REGISTRY.some((p) => p.id === id);
  }

  /**
   * Set current model
   */
  setModel(model: string): boolean {
    // Find which provider has this model
    for (const [providerId, adapter] of this.adapters) {
      const modelInfo = adapter.getModels().find((m) => m.id === model);
      if (modelInfo) {
        this.userConfig.provider = providerId;
        this.userConfig.model = model;
        this.saveUserConfig();
        return true;
      }
    }
    return false;
  }

  /**
   * Get current provider info
   */
  getCurrentProvider(): { id: string; name: string; model: string } | null {
    const adapter = this.getAdapter(
      this.userConfig.provider || this.defaultProvider,
    );
    if (!adapter) return null;

    const config = adapter.getConfig();
    return {
      id: config.id,
      name: config.name,
      model: this.userConfig.model || config.defaultModel,
    };
  }

  // ============================================================================
  // FALLBACK ORDER
  // ============================================================================

  /**
   * Get fallback order based on strategy
   */
  private getFallbackOrder(exclude: string): string[] {
    const providers = Array.from(this.adapters.keys()).filter(
      (p) => p !== exclude,
    );

    switch (this.fallbackStrategy) {
      case "free-first":
        return this.sortByFreeTier(providers);

      case "local-first":
        return this.sortByLocal(providers);

      case "speed-first":
        return this.sortBySpeed(providers);

      case "quality-first":
        return this.sortByQuality(providers);

      case "paid-first":
        return this.sortByPaid(providers);

      case "balanced":
      default:
        return this.sortByBalanced(providers);
    }
  }

  private sortByFreeTier(providers: string[]): string[] {
    return providers.sort((a, b) => {
      const aFree = this.getAdapter(a)!
        .getModels()
        .some((m) => m.freeTier);
      const bFree = this.getAdapter(b)!
        .getModels()
        .some((m) => m.freeTier);
      return bFree ? 1 : -1;
    });
  }

  private sortByLocal(providers: string[]): string[] {
    return providers.sort((a, b) => {
      const aLocal = !this.getAdapter(a)!.getConfig().requiresApiKey;
      const bLocal = !this.getAdapter(b)!.getConfig().requiresApiKey;
      return bLocal ? 1 : -1;
    });
  }

  private sortBySpeed(providers: string[]): string[] {
    return providers.sort((a, b) => {
      const aFast = this.getAdapter(a)!
        .getModels()
        .some((m) => m.tier === "fast");
      const bFast = this.getAdapter(b)!
        .getModels()
        .some((m) => m.tier === "fast");
      return bFast ? 1 : -1;
    });
  }

  private sortByQuality(providers: string[]): string[] {
    return providers.sort((a, b) => {
      const aMax = this.getAdapter(a)!
        .getModels()
        .some((m) => m.tier === "max");
      const bMax = this.getAdapter(b)!
        .getModels()
        .some((m) => m.tier === "max");
      return bMax ? 1 : -1;
    });
  }

  private sortByPaid(providers: string[]): string[] {
    return providers.sort((a, b) => {
      const aPaid = this.getAdapter(a)!.getConfig().requiresApiKey;
      const bPaid = this.getAdapter(b)!.getConfig().requiresApiKey;
      return bPaid ? 1 : -1;
    });
  }

  private sortByBalanced(providers: string[]): string[] {
    // Prefer configured providers, then balanced tier
    return providers.sort((a, b) => {
      const aAdapter = this.getAdapter(a)!;
      const bAdapter = this.getAdapter(b)!;

      // Prefer configured
      const aConfigured = aAdapter.isConfigured();
      const bConfigured = bAdapter.isConfigured();
      if (aConfigured !== bConfigured) return aConfigured ? -1 : 1;

      // Prefer balanced tier
      const aBalanced = aAdapter.getModels().some((m) => m.tier === "balanced");
      const bBalanced = bAdapter.getModels().some((m) => m.tier === "balanced");
      if (aBalanced !== bBalanced) return aBalanced ? -1 : 1;

      return 0;
    });
  }

  // ============================================================================
  // CONFIG MANAGEMENT
  // ============================================================================

  private loadUserConfig(): void {
    const configPath = path.join(this.configDir, "config.json");
    if (fs.existsSync(configPath)) {
      try {
        this.userConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      } catch {
        // Ignore corrupt config
      }
    }
  }

  private saveUserConfig(): void {
    const configPath = path.join(this.configDir, "config.json");
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(this.userConfig, null, 2));
  }

  /**
   * Set API key for a provider
   */
  setApiKey(provider: string, apiKey: string): boolean {
    if (!this.isKnownProvider(provider)) return false;

    if (!this.userConfig.apiKeys) {
      this.userConfig.apiKeys = {};
    }
    this.userConfig.apiKeys[provider] = apiKey;
    this.saveUserConfig();
    return true;
  }

  /**
   * Check if provider is configured
   */
  isProviderConfigured(provider: string): boolean {
    const adapter = this.getAdapter(provider);
    if (!adapter) return false;

    // Check user config first
    if (this.userConfig.apiKeys?.[provider]) {
      return true;
    }

    // Check if API key is available
    const config = adapter.getConfig();
    if (config.requiresApiKey) {
      return !!process.env[config.apiKeyEnv];
    }

    return true; // Local providers
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  private recordSuccess(response: ProviderResponse): void {
    this.stats.totalRequests++;
    this.stats.successfulRequests++;
    this.stats.totalTokens += response.usage.totalTokens;
    this.stats.totalCost += response.usage.cost || 0;

    // Update average latency
    const totalLatency =
      this.stats.averageLatencyMs * (this.stats.successfulRequests - 1);
    this.stats.averageLatencyMs =
      (totalLatency + (response.latencyMs || 0)) /
      this.stats.successfulRequests;
  }

  private recordFailure(): void {
    this.stats.totalRequests++;
    this.stats.failedRequests++;
  }

  /**
   * Get router statistics
   */
  getStats(): RouterStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      averageLatencyMs: 0,
    };
  }

  // ============================================================================
  // FREE TIER HELPERS
  // ============================================================================

  /**
   * Get all free tier models across providers
   */
  getFreeTierModels(): Array<{ provider: string; model: ModelInfo }> {
    const freeModels: Array<{ provider: string; model: ModelInfo }> = [];

    for (const provider of PROVIDER_REGISTRY) {
      for (const model of provider.models) {
        if (model.freeTier) {
          freeModels.push({ provider: provider.id, model });
        }
      }
    }

    return freeModels;
  }

  /**
   * Get local providers (no API key required)
   */
  getLocalProviders(): string[] {
    return PROVIDER_REGISTRY.filter((p) => !p.requiresApiKey).map((p) => p.id);
  }

  /**
   * Get configured providers (have API keys)
   */
  getConfiguredProviders(): string[] {
    return PROVIDER_REGISTRY.filter((p) => this.isProviderConfigured(p.id)).map(
      (p) => p.id,
    );
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const unifiedRouter = new UnifiedProviderRouter();
