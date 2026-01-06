/**
 * VIBE CLI - Google/Gemini Provider Adapter
 *
 * Full implementation of Google Generative AI API including:
 * - Gemini models (1.5 Flash, 1.5 Pro, 2.0)
 * - Streaming responses
 * - Vision/multimodal support
 * - Free tier support
 *
 * Version: 13.0.0
 */
import { BaseProviderAdapter, ProviderOptions, ProviderResponse, StreamCallback } from './base.adapter.js';
import type { ChatMessage } from '../../types.js';
export declare class GoogleAdapter extends BaseProviderAdapter {
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
     * Transform messages to Google format
     */
    protected transformMessages(messages: ChatMessage[]): unknown;
    /**
     * Build contents array for Google API
     */
    private buildContents;
    /**
     * Get safety settings for content generation
     */
    private getSafetySettings;
    /**
     * Extract content from streaming response
     */
    private extractStreamContent;
    /**
     * Parse Google response
     */
    protected parseResponse(data: unknown, model: string, latencyMs: number): ProviderResponse;
}
export declare const googleAdapter: GoogleAdapter;
//# sourceMappingURL=google.adapter.d.ts.map