/**
 * VIBE CLI - OpenAI Provider Adapter
 *
 * Full implementation of OpenAI API including:
 * - Chat completions
 * - Streaming responses
 * - Vision support
 * - Function calling
 *
 * Version: 13.0.0
 */
import { BaseProviderAdapter, ProviderOptions, ProviderResponse, StreamCallback } from './base.adapter.js';
import type { ChatMessage } from '../../types.js';
export declare class OpenAIAdapter extends BaseProviderAdapter {
    protected baseUrl: string;
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
     * Get API endpoint for a model
     */
    protected getEndpoint(model: string): string;
    /**
     * Get request headers
     */
    protected getHeaders(): Record<string, string>;
    /**
     * Transform messages to OpenAI format
     */
    protected transformMessages(messages: ChatMessage[]): unknown;
    /**
     * Build request body
     */
    private buildRequestBody;
    /**
     * Parse OpenAI response
     */
    protected parseResponse(data: unknown, model: string, latencyMs: number): ProviderResponse;
}
export declare class AzureOpenAIAdapter extends OpenAIAdapter {
    private deploymentName;
    constructor();
    protected getEndpoint(model: string): string;
    protected getHeaders(): Record<string, string>;
}
export declare const openaiAdapter: OpenAIAdapter;
export declare const azureAdapter: AzureOpenAIAdapter;
//# sourceMappingURL=openai.adapter.d.ts.map