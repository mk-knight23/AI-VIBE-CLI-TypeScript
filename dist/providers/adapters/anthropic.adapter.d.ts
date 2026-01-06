/**
 * VIBE CLI - Anthropic Provider Adapter
 *
 * Full implementation of Anthropic API including:
 * - Messages API (v1)
 * - Streaming responses
 * - System message handling
 * - Claude-specific features
 *
 * Version: 13.0.0
 */
import { BaseProviderAdapter, ProviderOptions, ProviderResponse, StreamCallback } from './base.adapter.js';
import type { ChatMessage } from '../../types.js';
export declare class AnthropicAdapter extends BaseProviderAdapter {
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
     * Get API endpoint for a model
     */
    protected getEndpoint(model: string): string;
    /**
     * Get request headers
     */
    protected getHeaders(): Record<string, string>;
    /**
     * Transform messages to Anthropic format
     */
    protected transformMessages(messages: ChatMessage[]): unknown;
    /**
     * Extract system message from messages array
     */
    private extractSystemMessage;
    /**
     * Parse Anthropic response
     */
    protected parseResponse(data: unknown, model: string, latencyMs: number): ProviderResponse;
}
export declare class BedrockAnthropicAdapter extends AnthropicAdapter {
    constructor();
    chat(messages: ChatMessage[], options?: ProviderOptions): Promise<ProviderResponse>;
}
export declare const anthropicAdapter: AnthropicAdapter;
export declare const bedrockAdapter: BedrockAnthropicAdapter;
//# sourceMappingURL=anthropic.adapter.d.ts.map