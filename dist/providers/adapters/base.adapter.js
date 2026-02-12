/**
 * VIBE CLI - Provider Adapter Base Interface
 *
 * Abstract base class for all LLM provider adapters.
 * Provides unified interface for chat, streaming, and completion.
 *
 * Version: 0.0.1
 */
// ============================================================================
// BASE ADAPTER
// ============================================================================
export class BaseProviderAdapter {
    config;
    models;
    constructor(config, models) {
        this.config = config;
        this.models = models;
    }
    /**
     * Get provider configuration
     */
    getConfig() {
        return this.config;
    }
    /**
     * Get available models
     */
    getModels() {
        return this.models;
    }
    /**
     * Get default model
     */
    getDefaultModel() {
        return this.config.defaultModel;
    }
    /**
     * Check if API key is configured
     */
    isConfigured() {
        if (!this.config.requiresApiKey)
            return true;
        return !!this.getApiKey();
    }
    /**
     * Get API key from environment or config
     */
    getApiKey() {
        return process.env[this.config.apiKeyEnv];
    }
    /**
     * Find model info by ID
     */
    getModelInfo(modelId) {
        return this.models.find(m => m.id === modelId);
    }
    /**
     * Validate model is available
     */
    validateModel(model) {
        const modelInfo = this.getModelInfo(model);
        if (!modelInfo) {
            throw new Error(`Model ${model} not available for ${this.config.name}`);
        }
    }
}
// ============================================================================
// ROUTING HELPERS
// ============================================================================
export function selectModelForTask(task, models) {
    const taskLower = task.toLowerCase();
    // Task-based model selection
    if (taskLower.includes('reason') || taskLower.includes('think') || taskLower.includes('plan')) {
        const reasoning = models.find(m => m.capabilities.includes('reasoning') && m.tier === 'reasoning');
        if (reasoning)
            return reasoning;
    }
    if (taskLower.includes('fast') || taskLower.includes('simple') || taskLower.includes('quick')) {
        const fast = models.find(m => m.tier === 'fast' && m.freeTier);
        if (fast)
            return fast;
        const fastAny = models.find(m => m.tier === 'fast');
        if (fastAny)
            return fastAny;
    }
    if (taskLower.includes('code') || taskLower.includes('function') || taskLower.includes('编程')) {
        const balanced = models.find(m => m.tier === 'balanced');
        if (balanced)
            return balanced;
    }
    // Default to balanced model
    const balanced = models.find(m => m.tier === 'balanced');
    if (balanced)
        return balanced;
    return models[0];
}
// ============================================================================
// ERROR TYPES
// ============================================================================
export class ProviderError extends Error {
    provider;
    model;
    statusCode;
    retryable;
    constructor(message, provider, model, statusCode, retryable = false) {
        super(message);
        this.provider = provider;
        this.model = model;
        this.statusCode = statusCode;
        this.retryable = retryable;
        this.name = 'ProviderError';
    }
}
export class AuthenticationError extends ProviderError {
    constructor(provider, model) {
        super(`Authentication failed for ${provider}. Check your API key.`, provider, model, 401, false);
        this.name = 'AuthenticationError';
    }
}
export class RateLimitError extends ProviderError {
    constructor(provider, model, retryAfter) {
        super(`Rate limit exceeded for ${provider}.${retryAfter ? ` Retry after ${retryAfter}s.` : ''}`, provider, model, 429, true);
        this.name = 'RateLimitError';
    }
}
export class ModelNotFoundError extends ProviderError {
    constructor(provider, model) {
        super(`Model ${model} not available for ${provider}`, provider, model, 404, false);
        this.name = 'ModelNotFoundError';
    }
}
//# sourceMappingURL=base.adapter.js.map