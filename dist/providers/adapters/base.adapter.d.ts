/**
 * VIBE CLI - Provider Adapter Base Interface
 *
 * Abstract base class for all LLM provider adapters.
 * Provides unified interface for chat, streaming, and completion.
 *
 * Version: 13.0.0
 */
import type { ChatMessage } from '../../types.js';
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
export declare abstract class BaseProviderAdapter {
    protected config: ProviderConfig;
    protected models: ModelInfo[];
    constructor(config: ProviderConfig, models: ModelInfo[]);
    /**
     * Get provider configuration
     */
    getConfig(): ProviderConfig;
    /**
     * Get available models
     */
    getModels(): ModelInfo[];
    /**
     * Get default model
     */
    getDefaultModel(): string;
    /**
     * Check if API key is configured
     */
    isConfigured(): boolean;
    /**
     * Get API key from environment or config
     */
    protected getApiKey(): string | undefined;
    /**
     * Abstract: Chat completion
     */
    abstract chat(messages: ChatMessage[], options?: ProviderOptions): Promise<ProviderResponse>;
    /**
     * Abstract: Streaming chat completion
     */
    abstract streamChat(messages: ChatMessage[], callback: StreamCallback, options?: ProviderOptions): AsyncGenerator<void, void, unknown>;
    /**
     * Abstract: Simple completion
     */
    abstract complete(prompt: string, options?: ProviderOptions): Promise<ProviderResponse>;
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
    protected abstract transformMessages(messages: ChatMessage[]): unknown;
    /**
     * Abstract: Parse response (receives raw response, model, and latency)
     */
    protected abstract parseResponse(response: unknown, model: string, latencyMs: number): ProviderResponse;
    /**
     * Find model info by ID
     */
    protected getModelInfo(modelId: string): ModelInfo | undefined;
    /**
     * Validate model is available
     */
    protected validateModel(model: string): void;
}
export interface ProviderStatus {
    id: string;
    name: string;
    configured: boolean;
    available: boolean;
    models: number;
    defaultModel: string;
    latencyMs?: number;
}
export declare function selectModelForTask(task: string, models: ModelInfo[]): ModelInfo;
export declare class ProviderError extends Error {
    provider: string;
    model: string;
    statusCode?: number | undefined;
    retryable: boolean;
    constructor(message: string, provider: string, model: string, statusCode?: number | undefined, retryable?: boolean);
}
export declare class AuthenticationError extends ProviderError {
    constructor(provider: string, model: string);
}
export declare class RateLimitError extends ProviderError {
    constructor(provider: string, model: string, retryAfter?: number);
}
export declare class ModelNotFoundError extends ProviderError {
    constructor(provider: string, model: string);
}
//# sourceMappingURL=base.adapter.d.ts.map