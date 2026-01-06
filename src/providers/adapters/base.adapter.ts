/**
 * VIBE CLI - Provider Adapter Base Interface
 *
 * Abstract base class for all LLM provider adapters.
 * Provides unified interface for chat, streaming, and completion.
 *
 * Version: 13.0.0
 */

import type { ChatMessage } from '../../types.js';

// ============================================================================
// TYPES
// ============================================================================

export interface ModelInfo {
  id: string;
  name: string;
  contextWindow: number;
  maxOutput: number;
  capabilities: ('completion' | 'reasoning' | 'vision' | 'function-calling')[];
  freeTier: boolean;
  tier: 'fast' | 'balanced' | 'reasoning' | 'max';
}

export interface ProviderOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface StreamCallback {
  (chunk: string, delta?: boolean): void;
}

export interface ProviderResponse {
  content: string;
  reasoning?: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost?: number;
  };
  model: string;
  provider: string;
  latencyMs: number;
}

export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKeyEnv: string;
  defaultModel: string;
  requiresApiKey: boolean;
}

// ============================================================================
// BASE ADAPTER
// ============================================================================

export abstract class BaseProviderAdapter {
  protected config: ProviderConfig;
  protected models: ModelInfo[];

  constructor(config: ProviderConfig, models: ModelInfo[]) {
    this.config = config;
    this.models = models;
  }

  /**
   * Get provider configuration
   */
  getConfig(): ProviderConfig {
    return this.config;
  }

  /**
   * Get available models
   */
  getModels(): ModelInfo[] {
    return this.models;
  }

  /**
   * Get default model
   */
  getDefaultModel(): string {
    return this.config.defaultModel;
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    if (!this.config.requiresApiKey) return true;
    return !!this.getApiKey();
  }

  /**
   * Get API key from environment or config
   */
  protected getApiKey(): string | undefined {
    return process.env[this.config.apiKeyEnv];
  }

  /**
   * Abstract: Chat completion
   */
  abstract chat(
    messages: ChatMessage[],
    options?: ProviderOptions
  ): Promise<ProviderResponse>;

  /**
   * Abstract: Streaming chat completion
   */
  abstract streamChat(
    messages: ChatMessage[],
    callback: StreamCallback,
    options?: ProviderOptions
  ): AsyncGenerator<void, void, unknown>;

  /**
   * Abstract: Simple completion
   */
  abstract complete(
    prompt: string,
    options?: ProviderOptions
  ): Promise<ProviderResponse>;

  /**
   * Abstract: Check provider availability
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Abstract: Get API endpoint for a model
   */
  protected abstract getEndpoint(model: string): string;

  /**
   * Abstract: Get request headers
   */
  protected abstract getHeaders(): Record<string, string>;

  /**
   * Abstract: Transform messages to provider format
   */
  protected abstract transformMessages(
    messages: ChatMessage[]
  ): unknown;

  /**
   * Abstract: Parse response (receives raw response, model, and latency)
   */
  protected abstract parseResponse(
    response: unknown,
    model: string,
    latencyMs: number
  ): ProviderResponse;

  /**
   * Find model info by ID
   */
  protected getModelInfo(modelId: string): ModelInfo | undefined {
    return this.models.find(m => m.id === modelId);
  }

  /**
   * Validate model is available
   */
  protected validateModel(model: string): void {
    const modelInfo = this.getModelInfo(model);
    if (!modelInfo) {
      throw new Error(`Model ${model} not available for ${this.config.name}`);
    }
  }
}

// ============================================================================
// PROVIDER STATUS
// ============================================================================

export interface ProviderStatus {
  id: string;
  name: string;
  configured: boolean;
  available: boolean;
  models: number;
  defaultModel: string;
  latencyMs?: number;
}

// ============================================================================
// ROUTING HELPERS
// ============================================================================

export function selectModelForTask(
  task: string,
  models: ModelInfo[]
): ModelInfo {
  const taskLower = task.toLowerCase();

  // Task-based model selection
  if (taskLower.includes('reason') || taskLower.includes('think') || taskLower.includes('plan')) {
    const reasoning = models.find(m => m.capabilities.includes('reasoning') && m.tier === 'reasoning');
    if (reasoning) return reasoning;
  }

  if (taskLower.includes('fast') || taskLower.includes('simple') || taskLower.includes('quick')) {
    const fast = models.find(m => m.tier === 'fast' && m.freeTier);
    if (fast) return fast;
    const fastAny = models.find(m => m.tier === 'fast');
    if (fastAny) return fastAny;
  }

  if (taskLower.includes('code') || taskLower.includes('function') || taskLower.includes('编程')) {
    const balanced = models.find(m => m.tier === 'balanced');
    if (balanced) return balanced;
  }

  // Default to balanced model
  const balanced = models.find(m => m.tier === 'balanced');
  if (balanced) return balanced;

  return models[0];
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class ProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    public model: string,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class AuthenticationError extends ProviderError {
  constructor(provider: string, model: string) {
    super(
      `Authentication failed for ${provider}. Check your API key.`,
      provider,
      model,
      401,
      false
    );
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends ProviderError {
  constructor(provider: string, model: string, retryAfter?: number) {
    super(
      `Rate limit exceeded for ${provider}.${retryAfter ? ` Retry after ${retryAfter}s.` : ''}`,
      provider,
      model,
      429,
      true
    );
    this.name = 'RateLimitError';
  }
}

export class ModelNotFoundError extends ProviderError {
  constructor(provider: string, model: string) {
    super(
      `Model ${model} not available for ${provider}`,
      provider,
      model,
      404,
      false
    );
    this.name = 'ModelNotFoundError';
  }
}
