/**
 * VIBE-CLI v12 - Provider Router
 * Universal interface for AI providers (OpenAI, Anthropic, Google, xAI, Ollama)
 */
import type { ProviderConfig, ProviderResponse, IProviderRouter } from '../types';
export declare class VibeProviderRouter implements IProviderRouter {
    private providers;
    private defaultProvider;
    private currentProvider;
    private currentModel;
    private userConfig;
    private configDir;
    constructor();
    private initializeProviders;
    private loadUserConfig;
    private saveUserConfig;
    private getApiKey;
    /**
     * Chat completion - implements IProviderRouter
     */
    chat(messages: Array<{
        role: string;
        content: string;
    }>, options?: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
    }): Promise<ProviderResponse>;
    /**
     * MiniMax API call - OpenAI-compatible with reasoning support
     */
    private callMiniMax;
    private callOpenAI;
    private callAnthropic;
    private callGoogle;
    private callOllama;
    private callOpenAICompatible;
    /**
     * Complete a prompt - implements IProviderRouter
     */
    complete(prompt: string): Promise<ProviderResponse>;
    /**
     * Stream chat completion
     */
    streamChat(messages: Array<{
        role: string;
        content: string;
    }>, options?: {
        model?: string;
        temperature?: number;
    }): AsyncGenerator<string>;
    private streamOpenAI;
    private streamAnthropic;
    /**
     * Select model for task - implements IProviderRouter
     */
    selectModel(task: string): string;
    /**
     * Get provider status
     */
    getStatus(): {
        provider: string;
        model: string;
        available: number;
        configured: number;
    };
    /**
     * Get available providers
     */
    getAvailableProviders(): string[];
    /**
     * Check if a provider is configured
     */
    isProviderConfigured(provider: string): boolean;
    /**
     * Set current provider
     */
    setProvider(provider: string): boolean;
    /**
     * Set current model
     */
    setModel(model: string): boolean;
    /**
     * Get provider info
     */
    getProvider(provider: string): ProviderConfig | undefined;
    /**
     * Get current provider info
     */
    getCurrentProvider(): ProviderConfig | undefined;
    /**
     * Get current model
     */
    getCurrentModel(): string;
    /**
     * List all providers
     */
    listProviders(): Array<{
        id: string;
        name: string;
        configured: boolean;
        model: string;
        freeTier: boolean;
    }>;
    /**
     * Set API key for a provider
     */
    setApiKey(provider: string, apiKey: string): boolean;
    /**
     * Get configuration directory
     */
    getConfigDir(): string;
    /**
     * Get all free tier models across providers
     */
    getFreeTierModels(): Array<{
        provider: string;
        model: string;
        name: string;
    }>;
    /**
     * Get all configured (paid) providers
     */
    getConfiguredProviders(): string[];
    /**
     * Get local providers (no API key required)
     */
    getLocalProviders(): string[];
    /**
     * Try providers in fallback order: free → paid → local
     * Returns the first working provider response or an error
     */
    chatWithFallback(messages: Array<{
        role: string;
        content: string;
    }>, options?: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
    }): Promise<ProviderResponse>;
}
//# sourceMappingURL=router.d.ts.map