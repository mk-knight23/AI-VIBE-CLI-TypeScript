/**
 * VIBE CLI - MiniMax Provider Adapter
 *
 * Implementation of MiniMax API (OpenAI-compatible)
 *
 * Version: 0.0.1
 */

import {
    OpenAIAdapter,
} from './openai.adapter.js';

import type { ModelInfo, ProviderConfig } from './base.adapter.js';

const MINIMAX_MODELS: ModelInfo[] = [
    {
        id: 'MiniMax-M2.1',
        name: 'MiniMax-M2.1',
        contextWindow: 200000,
        maxOutput: 16384,
        capabilities: ['completion', 'reasoning', 'function-calling'],
        freeTier: false,
        tier: 'balanced',
    },
    {
        id: 'MiniMax-M2.0',
        name: 'MiniMax-M2.0',
        contextWindow: 200000,
        maxOutput: 8192,
        capabilities: ['completion', 'reasoning'],
        freeTier: false,
        tier: 'balanced',
    },
    {
        id: 'MiniMax-M1',
        name: 'MiniMax-M1',
        contextWindow: 128000,
        maxOutput: 4096,
        capabilities: ['completion'],
        freeTier: false,
        tier: 'fast',
    },
];

const MINIMAX_CONFIG: ProviderConfig = {
    id: 'minimax',
    name: 'MiniMax',
    baseUrl: 'https://api.minimax.io/v1',
    apiKeyEnv: 'MINIMAX_API_KEY',
    defaultModel: 'MiniMax-M2.1',
    requiresApiKey: true,
};

export class MiniMaxAdapter extends OpenAIAdapter {
    constructor() {
        super();
        // Override the super class constructor properties
        // We can't use 'this' before 'super()' but we can re-assign after
        // Actually, it's better to pass these to super() if OpenAIAdapter supported it
        // But OpenAIAdapter's constructor is hardcoded. 
        // Let's manually override the properties.
        (this as any).config = MINIMAX_CONFIG;
        (this as any).models = MINIMAX_MODELS;
        (this as any).baseUrl = MINIMAX_CONFIG.baseUrl;
    }
}
