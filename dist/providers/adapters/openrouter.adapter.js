"use strict";
/**
 * VIBE CLI - OpenRouter Provider Adapter
 *
 * OpenRouter provides access to multiple providers:
 * - Claude, GPT, Gemini via single API
 * - Free tier routing
 * - Credit tracking
 * - Provider fallback
 *
 * Version: 13.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.openRouterAdapter = exports.OpenRouterAdapter = void 0;
const base_adapter_js_1 = require("./base.adapter.js");
// ============================================================================
// MODEL DEFINITIONS
// ============================================================================
const OPENROUTER_MODELS = [
    // Anthropic via OpenRouter
    {
        id: 'anthropic/claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4 (OR)',
        contextWindow: 200000,
        maxOutput: 8192,
        capabilities: ['completion', 'reasoning'],
        freeTier: false,
        tier: 'balanced',
    },
    {
        id: 'anthropic/claude-opus-4-20250514',
        name: 'Claude Opus 4 (OR)',
        contextWindow: 200000,
        maxOutput: 8192,
        capabilities: ['completion', 'reasoning'],
        freeTier: false,
        tier: 'max',
    },
    // OpenAI via OpenRouter
    {
        id: 'openai/gpt-4o',
        name: 'GPT-4o (OR)',
        contextWindow: 128000,
        maxOutput: 16384,
        capabilities: ['completion', 'vision'],
        freeTier: false,
        tier: 'balanced',
    },
    // Google via OpenRouter
    {
        id: 'google/gemini-1.5-flash',
        name: 'Gemini 1.5 Flash (OR)',
        contextWindow: 1000000,
        maxOutput: 8192,
        capabilities: ['completion', 'vision'],
        freeTier: true,
        tier: 'fast',
    },
    // DeepSeek (budget option)
    {
        id: 'deepseek/deepseek-chat',
        name: 'DeepSeek Chat (OR)',
        contextWindow: 128000,
        maxOutput: 4096,
        capabilities: ['completion', 'reasoning'],
        freeTier: false,
        tier: 'fast',
    },
    // Qwen (budget option)
    {
        id: 'qwen/qwen-2.5-72b-instruct',
        name: 'Qwen 2.5 72B (OR)',
        contextWindow: 32768,
        maxOutput: 4096,
        capabilities: ['completion'],
        freeTier: false,
        tier: 'balanced',
    },
];
const OPENROUTER_CONFIG = {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    defaultModel: 'anthropic/claude-sonnet-4-20250514',
    requiresApiKey: true,
};
// ============================================================================
// OPENROUTER ADAPTER
// ============================================================================
class OpenRouterAdapter extends base_adapter_js_1.BaseProviderAdapter {
    baseUrl;
    constructor() {
        super(OPENROUTER_CONFIG, OPENROUTER_MODELS);
        this.baseUrl = OPENROUTER_CONFIG.baseUrl;
    }
    /**
     * Chat completion
     */
    async chat(messages, options) {
        const startTime = Date.now();
        const model = options?.model || this.config.defaultModel;
        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new base_adapter_js_1.AuthenticationError(this.config.id, model);
        }
        this.validateModel(model);
        const endpoint = `${this.baseUrl}/chat/completions`;
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://vibe.dev',
                    'X-Title': 'VIBE CLI',
                },
                body: JSON.stringify({
                    model,
                    messages: this.transformMessages(messages),
                    temperature: options?.temperature ?? 0.7,
                    max_tokens: options?.maxTokens,
                    stream: false,
                }),
            });
            if (response.status === 401) {
                throw new base_adapter_js_1.AuthenticationError(this.config.id, model);
            }
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After');
                throw new base_adapter_js_1.RateLimitError(this.config.id, model, retryAfter ? parseInt(retryAfter) : undefined);
            }
            if (!response.ok) {
                const error = await response.text();
                throw new base_adapter_js_1.ProviderError(`OpenRouter API error: ${error}`, this.config.id, model, response.status, response.status >= 500);
            }
            const data = await response.json();
            return this.parseResponse(data, model, Date.now() - startTime);
        }
        catch (error) {
            if (error instanceof base_adapter_js_1.ProviderError)
                throw error;
            throw new base_adapter_js_1.ProviderError(`OpenRouter request failed: ${error instanceof Error ? error.message : 'Unknown error'}`, this.config.id, model, undefined, true);
        }
    }
    /**
     * Streaming chat completion
     */
    async *streamChat(messages, callback, options) {
        const model = options?.model || this.config.defaultModel;
        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new base_adapter_js_1.AuthenticationError(this.config.id, model);
        }
        this.validateModel(model);
        const endpoint = `${this.baseUrl}/chat/completions`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://vibe.dev',
                'X-Title': 'VIBE CLI',
            },
            body: JSON.stringify({
                model,
                messages: this.transformMessages(messages),
                temperature: options?.temperature ?? 0.7,
                max_tokens: options?.maxTokens,
                stream: true,
            }),
        });
        if (!response.ok) {
            throw new base_adapter_js_1.ProviderError(`OpenRouter streaming failed: ${response.statusText}`, this.config.id, model, response.status);
        }
        const reader = response.body?.getReader();
        if (!reader)
            return;
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]')
                        return;
                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices?.[0]?.delta?.content;
                        if (content) {
                            callback(content, true);
                        }
                    }
                    catch {
                        // Skip parse errors
                    }
                }
            }
        }
    }
    /**
     * Simple completion
     */
    async complete(prompt, options) {
        const messages = [{ role: 'user', content: prompt }];
        return this.chat(messages, options);
    }
    /**
     * Check provider availability
     */
    async isAvailable() {
        if (!this.isConfigured())
            return false;
        try {
            const testMessages = [{ role: 'user', content: 'test' }];
            await this.chat(testMessages, { maxTokens: 1 });
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Get account info (credits, etc.)
     */
    async getAccountInfo() {
        const apiKey = this.getApiKey();
        if (!apiKey)
            return null;
        try {
            const response = await fetch('https://openrouter.ai/api/v1/auth', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
            });
            if (!response.ok)
                return null;
            const data = await response.json();
            return {
                credits: data.data?.credits || 0,
                plan: data.data?.plan,
            };
        }
        catch {
            return null;
        }
    }
    /**
     * Get free tier models
     */
    getFreeModels() {
        return this.models.filter(m => m.freeTier);
    }
    /**
     * Select best free model
     */
    selectBestFreeModel() {
        const freeModels = this.getFreeModels();
        return freeModels.find(m => m.tier === 'fast') || freeModels[0];
    }
    /**
     * Get API endpoint for a model
     */
    getEndpoint(model) {
        return `${this.baseUrl}/chat/completions`;
    }
    /**
     * Get request headers
     */
    getHeaders() {
        const apiKey = this.getApiKey();
        return {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://vibe.dev',
            'X-Title': 'VIBE CLI',
        };
    }
    /**
     * Transform messages to OpenRouter format
     */
    transformMessages(messages) {
        return messages;
    }
    /**
     * Parse OpenRouter response
     */
    parseResponse(data, model, latencyMs) {
        const response = data;
        const choice = response.choices?.[0]?.message;
        const usage = response.usage;
        // OpenRouter provides actual provider used
        const providerUsed = response.provider?.name || 'openrouter';
        return {
            content: choice?.content || '',
            reasoning: choice?.reasoning_content,
            usage: {
                promptTokens: usage?.prompt_tokens || 0,
                completionTokens: usage?.completion_tokens || 0,
                totalTokens: usage?.total_tokens || 0,
                cost: 0, // Handled by OpenRouter credits
            },
            model,
            provider: `${this.config.id}:${providerUsed}`,
            latencyMs,
        };
    }
}
exports.OpenRouterAdapter = OpenRouterAdapter;
// ============================================================================
// EXPORTS
// ============================================================================
exports.openRouterAdapter = new OpenRouterAdapter();
//# sourceMappingURL=openrouter.adapter.js.map