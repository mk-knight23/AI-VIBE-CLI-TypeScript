"use strict";
/**
 * VIBE-CLI v12 - COMPLETION Primitive
 *
 * Handles LLM completion requests with provider routing.
 * Selects best model per task type (completion, planning, refactoring, reasoning).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompletionPrimitive = void 0;
exports.completeText = completeText;
/**
 * COMPLETION Primitive - Handles all LLM completions
 */
class CompletionPrimitive {
    provider;
    constructor(provider) {
        this.provider = provider;
    }
    /**
     * Complete a prompt with optimal model selection
     */
    async complete(prompt, options = {}) {
        const startTime = Date.now();
        // Select best model for task type
        const modelTier = options.modelTier || 'balanced';
        const messages = this.buildMessages(prompt, options.systemPrompt);
        const response = await this.provider.chat(messages);
        return {
            content: response.content,
            usage: response.usage,
            model: response.model,
            provider: response.provider,
            latency: Date.now() - startTime,
        };
    }
    /**
     * Complete with streaming support
     */
    async *completeStream(prompt, options = {}) {
        const messages = this.buildMessages(prompt, options.systemPrompt);
        // For streaming, we'd call a stream method on the provider
        // This is a placeholder for the streaming implementation
        const response = await this.complete(prompt, options);
        // Yield chunks (in real implementation, this would be actual streaming)
        const chunks = response.content.split(/(?=[\s\S])/);
        for (const chunk of chunks) {
            yield chunk;
        }
    }
    /**
     * Get the best model for a specific tier
     */
    getModelForTier(tier) {
        const models = {
            fast: 'gpt-4o-mini', // Fast, cheap for simple tasks
            balanced: 'gpt-4o', // Good balance of speed and capability
            reasoning: 'claude-sonnet-4-20250514', // Best for complex reasoning
            max: 'gpt-4o', // Maximum capability
        };
        return models[tier || 'balanced'];
    }
    /**
     * Build messages array for the API
     */
    buildMessages(prompt, systemPrompt) {
        const messages = [];
        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }
        messages.push({ role: 'user', content: prompt });
        return messages;
    }
    /**
     * Get available models and their capabilities
     */
    getAvailableModels() {
        return [
            { id: 'gpt-4o-mini', tier: 'fast', capabilities: ['completion', 'simple-coding'] },
            { id: 'gpt-4o', tier: 'balanced', capabilities: ['completion', 'coding', 'reasoning'] },
            { id: 'claude-sonnet-4-20250514', tier: 'reasoning', capabilities: ['completion', 'coding', 'reasoning', 'analysis'] },
            { id: 'gemini-1.5-flash', tier: 'balanced', capabilities: ['completion', 'coding', 'multimodal'] },
            { id: 'grok-2', tier: 'balanced', capabilities: ['completion', 'coding', 'reasoning'] },
        ];
    }
    /**
     * Estimate cost for a completion
     */
    estimateCost(tokens, tier = 'balanced') {
        const costsPer1kTokens = {
            fast: 0.001, // ~$1 per million tokens
            balanced: 0.01, // ~$10 per million tokens
            reasoning: 0.03, // ~$30 per million tokens
            max: 0.06, // ~$60 per million tokens
        };
        const costPer1k = costsPer1kTokens[tier || 'balanced'];
        return (tokens / 1000) * costPer1k;
    }
}
exports.CompletionPrimitive = CompletionPrimitive;
/**
 * Simple text completion without provider routing
 */
async function completeText(prompt, _apiKey) {
    // Placeholder for simple completion without full provider routing
    // In production, this would call OpenAI or another provider directly
    return `[COMPLETION] Response to: ${prompt.slice(0, 50)}...`;
}
//# sourceMappingURL=completion.js.map