/**
 * VIBE CLI v12 - Provider Registry
 *
 * Unified provider router supporting 20+ LLM providers.
 * Each provider is configured with:
 * - API endpoint
 * - Available models
 * - Capabilities (completion, reasoning, etc.)
 * - Free tier availability
 *
 * Version: 12.0.0
 */
import type { ProviderResponse } from '../types.js';
export interface ModelInfo {
    id: string;
    name: string;
    contextWindow: number;
    maxOutput: number;
    capabilities: ('completion' | 'reasoning' | 'vision' | 'function-calling')[];
    freeTier: boolean;
    tier: 'fast' | 'balanced' | 'reasoning' | 'max';
}
export interface ProviderInfo {
    id: string;
    name: string;
    baseUrl: string;
    apiKeyEnv: string;
    models: ModelInfo[];
    defaultModel: string;
    requiresApiKey: boolean;
}
export interface ProviderCapability {
    complete(prompt: string, options?: ProviderOptions): Promise<ProviderResponse>;
    chat(messages: Array<{
        role: string;
        content: string;
    }>, options?: ProviderOptions): Promise<ProviderResponse>;
    stream(prompt: string, callback: (chunk: string) => void, options?: ProviderOptions): Promise<void>;
}
export declare const PROVIDER_REGISTRY: ProviderInfo[];
export declare function getProviderById(id: string): ProviderInfo | undefined;
export declare function getProviderByModel(modelId: string): ProviderInfo | undefined;
export declare function getModelsByTier(tier: 'fast' | 'balanced' | 'reasoning' | 'max'): Array<{
    provider: string;
    model: ModelInfo;
}>;
export declare function getFreeTierModels(): Array<{
    provider: string;
    model: ModelInfo;
}>;
export declare function listProviders(): Array<{
    id: string;
    name: string;
    requiresApiKey: boolean;
}>;
export interface ProviderOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
}
//# sourceMappingURL=registry.d.ts.map