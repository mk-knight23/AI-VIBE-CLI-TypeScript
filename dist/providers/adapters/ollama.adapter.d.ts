/**
 * VIBE CLI - Ollama Provider Adapter
 *
 * Local/offline model support via Ollama:
 * - OpenAI-compatible API
 * - No API key required
 * - Streaming support
 * - Model management
 *
 * Version: 13.0.0
 */
import { BaseProviderAdapter, ProviderOptions, ProviderResponse, StreamCallback } from './base.adapter.js';
import type { ChatMessage } from '../../types.js';
export declare class OllamaAdapter extends BaseProviderAdapter {
    protected baseUrl: string;
    private healthCheckCache;
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
     * Get available models from Ollama
     */
    listInstalledModels(): Promise<string[]>;
    /**
     * Pull a model
     */
    pullModel(model: string): Promise<{
        success: boolean;
        progress?: number;
    }>;
    /**
     * Get API endpoint for a model
     */
    protected getEndpoint(model: string): string;
    /**
     * Get request headers
     */
    protected getHeaders(): Record<string, string>;
    /**
     * Transform messages to Ollama format
     */
    protected transformMessages(messages: ChatMessage[]): unknown;
    /**
     * Parse Ollama response
     */
    protected parseResponse(data: unknown, model: string, latencyMs: number): ProviderResponse;
}
export declare class LMStudioAdapter extends OllamaAdapter {
    constructor();
}
export declare const ollamaAdapter: OllamaAdapter;
export declare const lmstudioAdapter: LMStudioAdapter;
//# sourceMappingURL=ollama.adapter.d.ts.map