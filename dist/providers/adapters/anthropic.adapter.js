"use strict";
/**
 * VIBE CLI - Anthropic Provider Adapter
 *
 * Full implementation of Anthropic API including:
 * - Messages API (v1)
 * - Streaming responses
 * - System message handling
 * - Claude-specific features
 *
 * Version: 13.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.bedrockAdapter = exports.anthropicAdapter = exports.BedrockAnthropicAdapter = exports.AnthropicAdapter = void 0;
const base_adapter_js_1 = require("./base.adapter.js");
// ============================================================================
// MODEL DEFINITIONS
// ============================================================================
const ANTHROPIC_MODELS = [
    {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        contextWindow: 200000,
        maxOutput: 8192,
        capabilities: ['completion', 'reasoning', 'vision'],
        freeTier: false,
        tier: 'balanced',
    },
    {
        id: 'claude-opus-4-20250514',
        name: 'Claude Opus 4',
        contextWindow: 200000,
        maxOutput: 8192,
        capabilities: ['completion', 'reasoning'],
        freeTier: false,
        tier: 'max',
    },
    {
        id: 'claude-haiku-3-20250514',
        name: 'Claude Haiku 3',
        contextWindow: 200000,
        maxOutput: 8192,
        capabilities: ['completion'],
        freeTier: false,
        tier: 'fast',
    },
    {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        contextWindow: 200000,
        maxOutput: 8192,
        capabilities: ['completion', 'reasoning', 'vision'],
        freeTier: false,
        tier: 'balanced',
    },
    {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        contextWindow: 200000,
        maxOutput: 4096,
        capabilities: ['completion'],
        freeTier: false,
        tier: 'fast',
    },
];
const ANTHROPIC_CONFIG = {
    id: 'anthropic',
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-sonnet-4-20250514',
    requiresApiKey: true,
};
// ============================================================================
// ANTHROPIC ADAPTER
// ============================================================================
class AnthropicAdapter extends base_adapter_js_1.BaseProviderAdapter {
    baseUrl;
    constructor() {
        super(ANTHROPIC_CONFIG, ANTHROPIC_MODELS);
        this.baseUrl = ANTHROPIC_CONFIG.baseUrl;
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
        const { system, userMessages } = this.extractSystemMessage(messages);
        try {
            const response = await fetch(`${this.baseUrl}/messages`, {
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true',
                },
                body: JSON.stringify({
                    model,
                    messages: userMessages,
                    system,
                    temperature: options?.temperature ?? 0.7,
                    max_tokens: options?.maxTokens ?? 4096,
                }),
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
                throw new base_adapter_js_1.ProviderError(`Anthropic API error: ${error}`, this.config.id, model, response.status, response.status >= 500);
            }
            const data = await response.json();
            return this.parseResponse(data, model, Date.now() - startTime);
        }
        catch (error) {
            if (error instanceof base_adapter_js_1.ProviderError)
                throw error;
            throw new base_adapter_js_1.ProviderError(`Anthropic request failed: ${error instanceof Error ? error.message : 'Unknown error'}`, this.config.id, model, undefined, true);
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
        const { system, userMessages } = this.extractSystemMessage(messages);
        const response = await fetch(`${this.baseUrl}/messages`, {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01',
                'x-stream': 'true',
            },
            body: JSON.stringify({
                model,
                messages: userMessages,
                system,
                temperature: options?.temperature ?? 0.7,
                max_tokens: options?.maxTokens ?? 4096,
                stream: true,
            }),
        });
        if (!response.ok) {
            throw new base_adapter_js_1.ProviderError(`Anthropic streaming failed: ${response.statusText}`, this.config.id, model, response.status);
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
                    try {
                        const parsed = JSON.parse(data);
                        // Handle different event types
                        if (parsed.type === 'content_block_delta' && parsed.delta.type === 'text_delta') {
                            callback(parsed.delta.text, true);
                        }
                        else if (parsed.type === 'message_delta' && parsed.delta?.reasoning_content) {
                            callback(parsed.delta.reasoning_content, true);
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
        return `${this.baseUrl}/messages`;
    }
    /**
     * Get request headers
     */
    getHeaders() {
        const apiKey = this.getApiKey();
        return {
            'x-api-key': apiKey || '',
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
        };
    }
    /**
     * Transform messages to Anthropic format
     */
    transformMessages(messages) {
        // Remove system message - handled separately
        return messages.filter(m => m.role !== 'system').map(m => ({
            role: m.role,
            content: m.content,
        }));
    }
    /**
     * Extract system message from messages array
     */
    extractSystemMessage(messages) {
        const systemMessage = messages.find(m => m.role === 'system');
        const userMessages = messages
            .filter(m => m.role !== 'system')
            .map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
        }));
        return {
            system: systemMessage?.content,
            userMessages,
        };
    }
    /**
     * Parse Anthropic response
     */
    parseResponse(data, model, latencyMs) {
        const response = data;
        const textBlock = response.content?.find(c => c.type === 'text');
        const usage = response.usage;
        // Calculate cost (approximate Claude pricing)
        const inputCostPerToken = 0.000003; // $3 per 1M tokens
        const outputCostPerToken = 0.000015; // $15 per 1M tokens
        const estimatedCost = usage
            ? (usage.input_tokens * inputCostPerToken) + (usage.output_tokens * outputCostPerToken)
            : undefined;
        return {
            content: textBlock?.text || '',
            usage: {
                promptTokens: usage?.input_tokens || 0,
                completionTokens: usage?.output_tokens || 0,
                totalTokens: (usage?.input_tokens || 0) + (usage?.output_tokens || 0),
                cost: estimatedCost,
            },
            model,
            provider: this.config.id,
            latencyMs,
        };
    }
}
exports.AnthropicAdapter = AnthropicAdapter;
// ============================================================================
// BEDROCK ANTHROPIC ADAPTER (AWS)
// ============================================================================
class BedrockAnthropicAdapter extends AnthropicAdapter {
    constructor() {
        super();
        this.config.id = 'bedrock';
        this.config.name = 'AWS Bedrock (Anthropic)';
        this.config.apiKeyEnv = 'AWS_ACCESS_KEY_ID';
        this.config.baseUrl = ''; // AWS SDK handles this
        this.config.defaultModel = 'anthropic.claude-sonnet-4-20250514-v1:0';
        this.models = [
            {
                ...ANTHROPIC_MODELS[0],
                id: 'anthropic.claude-sonnet-4-20250514-v1:0',
                name: 'Claude Sonnet 4 (Bedrock)',
            },
            {
                ...ANTHROPIC_MODELS[1],
                id: 'anthropic.claude-opus-4-20250514-v1:0',
                name: 'Claude Opus 4 (Bedrock)',
            },
        ];
    }
    async chat(messages, options) {
        // Bedrock uses AWS SDK - simplified for demo
        // Real implementation would use @aws-sdk/client-bedrock-runtime
        throw new Error('Bedrock adapter requires AWS SDK integration');
    }
}
exports.BedrockAnthropicAdapter = BedrockAnthropicAdapter;
// ============================================================================
// EXPORTS
// ============================================================================
exports.anthropicAdapter = new AnthropicAdapter();
exports.bedrockAdapter = new BedrockAnthropicAdapter();
//# sourceMappingURL=anthropic.adapter.js.map