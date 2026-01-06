/**
 * VIBE-CLI v12 - COMPLETION Primitive
 *
 * Handles LLM completion requests with provider routing.
 * Selects best model per task type (completion, planning, refactoring, reasoning).
 */
import type { IProviderRouter } from '../types';
export interface CompletionOptions {
    modelTier?: 'fast' | 'balanced' | 'reasoning' | 'max';
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
}
export interface CompletionResult {
    content: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    model: string;
    provider?: string;
    latency: number;
}
/**
 * COMPLETION Primitive - Handles all LLM completions
 */
export declare class CompletionPrimitive {
    private provider;
    constructor(provider: IProviderRouter);
    /**
     * Complete a prompt with optimal model selection
     */
    complete(prompt: string, options?: CompletionOptions): Promise<CompletionResult>;
    /**
     * Complete with streaming support
     */
    completeStream(prompt: string, options?: CompletionOptions): AsyncGenerator<string, void, unknown>;
    /**
     * Get the best model for a specific tier
     */
    private getModelForTier;
    /**
     * Build messages array for the API
     */
    private buildMessages;
    /**
     * Get available models and their capabilities
     */
    getAvailableModels(): Array<{
        id: string;
        tier: string;
        capabilities: string[];
    }>;
    /**
     * Estimate cost for a completion
     */
    estimateCost(tokens: number, tier?: CompletionOptions['modelTier']): number;
}
/**
 * Simple text completion without provider routing
 */
export declare function completeText(prompt: string, _apiKey?: string): Promise<string>;
//# sourceMappingURL=completion.d.ts.map