/**
 * VIBE CLI - OpenRouter Provider Adapter
 *
 * OpenRouter provides access to multiple providers:
 * - Claude, GPT, Gemini via single API
 * - Free tier routing
 * - Credit tracking
 * - Provider fallback
 *
 * Version: 13.0.0
 */
import { BaseProviderAdapter, ModelInfo, ProviderOptions, ProviderResponse, StreamCallback } from './base.adapter.js';
import type { ChatMessage } from '../../types.js';
export declare class OpenRouterAdapter extends BaseProviderAdapter {
    private baseUrl;
    constructor();
    /**
     * Chat completion
     */
    chat(messages: ChatMessage[], options?: ProviderOptions): Promise<ProviderResponse>;
    /**
     * Streaming chat completion
     */
    streamChat(messages: ChatMessage[], callback: StreamCallback, options?: ProviderOptions): AsyncGenerator<void>;
    /**
     * Simple completion
     */
    complete(prompt: string, options?: ProviderOptions): Promise<ProviderResponse>;
    /**
     * Check provider availability
     */
    isAvailable(): Promise<boolean>;
    /**
     * Get account info (credits, etc.)
     */
    getAccountInfo(): Promise<{
        credits: number;
        plan?: string;
    } | null>;
    /**
     * Get free tier models
     */
    getFreeModels(): ModelInfo[];
    /**
     * Select best free model
     */
    selectBestFreeModel(): ModelInfo;
    /**
     * Get API endpoint for a model
     */
    protected getEndpoint(model: string): string;
    /**
     * Get request headers
     */
    protected getHeaders(): Record<string, string>;
    /**
     * Transform messages to OpenRouter format
     */
    protected transformMessages(messages: ChatMessage[]): unknown;
    /**
     * Parse OpenRouter response
     */
    protected parseResponse(data: unknown, model: string, latencyMs: number): ProviderResponse;
}
export declare const openRouterAdapter: OpenRouterAdapter;
//# sourceMappingURL=openrouter.adapter.d.ts.map