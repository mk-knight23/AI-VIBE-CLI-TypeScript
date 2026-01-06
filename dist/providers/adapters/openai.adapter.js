"use strict";
/**
 * VIBE CLI - OpenAI Provider Adapter
 *
 * Full implementation of OpenAI API including:
 * - Chat completions
 * - Streaming responses
 * - Vision support
 * - Function calling
 *
 * Version: 13.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.azureAdapter = exports.openaiAdapter = exports.AzureOpenAIAdapter = exports.OpenAIAdapter = void 0;
const base_adapter_js_1 = require("./base.adapter.js");
// ============================================================================
// MODEL DEFINITIONS
// ============================================================================
const OPENAI_MODELS = [
    {
        id: 'gpt-4o',
        name: 'GPT-4o',
        contextWindow: 128000,
        maxOutput: 16384,
        capabilities: ['completion', 'vision', 'function-calling'],
        freeTier: false,
        tier: 'balanced',
    },
    {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        contextWindow: 128000,
        maxOutput: 16384,
        capabilities: ['completion', 'function-calling'],
        freeTier: false,
        tier: 'fast',
    },
    {
        id: 'o1',
        name: 'o1',
        contextWindow: 200000,
        maxOutput: 100000,
        capabilities: ['reasoning'],
        freeTier: false,
        tier: 'reasoning',
    },
    {
        id: 'o1-mini',
        name: 'o1 Mini',
        contextWindow: 128000,
        maxOutput: 65536,
        capabilities: ['reasoning'],
        freeTier: false,
        tier: 'reasoning',
    },
    {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        contextWindow: 128000,
        maxOutput: 4096,
        capabilities: ['completion', 'vision', 'function-calling'],
        freeTier: false,
        tier: 'max',
    },
];
const OPENAI_CONFIG = {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o',
    requiresApiKey: true,
};
// ============================================================================
// OPENAI ADAPTER
// ============================================================================
class OpenAIAdapter extends base_adapter_js_1.BaseProviderAdapter {
    baseUrl;
    constructor() {
        super(OPENAI_CONFIG, OPENAI_MODELS);
        this.baseUrl = OPENAI_CONFIG.baseUrl;
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
        const body = this.buildRequestBody(messages, model, options);
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });
            if (response.status === 401) {
                throw new base_adapter_js_1.AuthenticationError(this.config.id, model);
            }
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After');
                throw new base_adapter_js_1.RateLimitError(this.config.id, model, retryAfter ? parseInt(retryAfter) : undefined);
            }
            if (response.status === 404) {
                throw new base_adapter_js_1.ModelNotFoundError(this.config.id, model);
            }
            if (!response.ok) {
                const error = await response.text();
                throw new base_adapter_js_1.ProviderError(`OpenAI API error: ${error}`, this.config.id, model, response.status, response.status >= 500);
            }
            const data = await response.json();
            return this.parseResponse(data, model, Date.now() - startTime);
        }
        catch (error) {
            if (error instanceof base_adapter_js_1.ProviderError)
                throw error;
            throw new base_adapter_js_1.ProviderError(`OpenAI request failed: ${error instanceof Error ? error.message : 'Unknown error'}`, this.config.id, model, undefined, true);
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
        const body = {
            ...this.buildRequestBody(messages, model, options),
            stream: true,
        };
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            throw new base_adapter_js_1.ProviderError(`OpenAI streaming failed: ${response.statusText}`, this.config.id, model, response.status);
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
        };
    }
    /**
     * Transform messages to OpenAI format
     */
    transformMessages(messages) {
        return messages;
    }
    /**
     * Build request body
     */
    buildRequestBody(messages, model, options) {
        return {
            model,
            messages: this.transformMessages(messages),
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.maxTokens,
            stream: false,
        };
    }
    /**
     * Parse OpenAI response
     */
    parseResponse(data, model, latencyMs) {
        const response = data;
        const choice = response.choices?.[0]?.message;
        const usage = response.usage;
        // Calculate cost (approximate)
        const costPerToken = 0.00001; // $0.01 per 1K tokens (GPT-4o pricing)
        const estimatedCost = usage
            ? (usage.prompt_tokens + usage.completion_tokens) * costPerToken
            : undefined;
        return {
            content: choice?.content || '',
            reasoning: choice?.reasoning_content,
            usage: {
                promptTokens: usage?.prompt_tokens || 0,
                completionTokens: usage?.completion_tokens || 0,
                totalTokens: usage?.total_tokens || 0,
                cost: estimatedCost,
            },
            model,
            provider: this.config.id,
            latencyMs,
        };
    }
}
exports.OpenAIAdapter = OpenAIAdapter;
// ============================================================================
// AZURE OPENAI ADAPTER (EXTENSION)
// ============================================================================
class AzureOpenAIAdapter extends OpenAIAdapter {
    deploymentName;
    constructor() {
        super();
        this.config.id = 'azure';
        this.config.name = 'Azure OpenAI';
        this.config.apiKeyEnv = 'AZURE_OPENAI_API_KEY';
        this.baseUrl = process.env.AZURE_OPENAI_ENDPOINT || 'https://<resource>.openai.azure.com/openai/deployments';
        this.deploymentName = process.env.AZURE_DEPLOYMENT_NAME || 'gpt-4o';
    }
    getEndpoint(model) {
        return `${this.baseUrl}/${this.deploymentName}/chat/completions?api-version=2024-02-15-preview`;
    }
    getHeaders() {
        const apiKey = this.getApiKey() || '';
        return {
            'api-key': apiKey,
            'Content-Type': 'application/json',
        };
    }
}
exports.AzureOpenAIAdapter = AzureOpenAIAdapter;
// ============================================================================
// EXPORTS
// ============================================================================
exports.openaiAdapter = new OpenAIAdapter();
exports.azureAdapter = new AzureOpenAIAdapter();
//# sourceMappingURL=openai.adapter.js.map