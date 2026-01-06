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
 * Version: 13.0.0
 */
import { BaseProviderAdapter, ModelInfo, ProviderOptions, ProviderResponse, StreamCallback } from './adapters/base.adapter.js';
import type { ChatMessage } from '../types.js';
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
export type FallbackStrategy = 'free-first' | 'paid-first' | 'local-first' | 'speed-first' | 'quality-first' | 'balanced';
export interface RouterStats {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalTokens: number;
    totalCost: number;
    averageLatencyMs: number;
}
export declare class UnifiedProviderRouter {
    private adapters;
    private defaultProvider;
    private defaultModel;
    private userConfig;
    private configDir;
    private stats;
    private fallbackStrategy;
    private maxRetries;
    constructor(config?: RouterConfig);
    /**
     * Register all provider adapters
     */
    private initializeAdapters;
    /**
     * Register a provider adapter
     */
    registerAdapter(id: string, adapter: BaseProviderAdapter): void;
    /**
     * Get an adapter by ID
     */
    getAdapter(id: string): BaseProviderAdapter | undefined;
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
    }>;
    /**
     * Chat completion with automatic provider selection
     */
    chat(messages: ChatMessage[], options?: ProviderOptions): Promise<ProviderResponse>;
    /**
     * Chat with fallback chain
     */
    chatWithFallback(messages: ChatMessage[], options: ProviderOptions | undefined, excludeProvider: string): Promise<ProviderResponse>;
    /**
     * Streaming chat completion
     */
    streamChat(messages: ChatMessage[], callback: StreamCallback, options?: ProviderOptions): AsyncGenerator<void>;
    /**
     * Simple completion
     */
    complete(prompt: string, options?: ProviderOptions): Promise<ProviderResponse>;
    /**
     * Select model for a task
     */
    selectModelForTask(task: string): string;
    /**
     * Set current provider
     */
    setProvider(provider: string): boolean;
    /**
     * Set current model
     */
    setModel(model: string): boolean;
    /**
     * Get current provider info
     */
    getCurrentProvider(): {
        id: string;
        name: string;
        model: string;
    } | null;
    /**
     * Get fallback order based on strategy
     */
    private getFallbackOrder;
    private sortByFreeTier;
    private sortByLocal;
    private sortBySpeed;
    private sortByQuality;
    private sortByPaid;
    private sortByBalanced;
    private loadUserConfig;
    private saveUserConfig;
    /**
     * Set API key for a provider
     */
    setApiKey(provider: string, apiKey: string): boolean;
    /**
     * Check if provider is configured
     */
    isProviderConfigured(provider: string): boolean;
    private recordSuccess;
    private recordFailure;
    /**
     * Get router statistics
     */
    getStats(): RouterStats;
    /**
     * Reset statistics
     */
    resetStats(): void;
    /**
     * Get all free tier models across providers
     */
    getFreeTierModels(): Array<{
        provider: string;
        model: ModelInfo;
    }>;
    /**
     * Get local providers (no API key required)
     */
    getLocalProviders(): string[];
    /**
     * Get configured providers (have API keys)
     */
    getConfiguredProviders(): string[];
}
export declare const unifiedRouter: UnifiedProviderRouter;
//# sourceMappingURL=unified.router.d.ts.map