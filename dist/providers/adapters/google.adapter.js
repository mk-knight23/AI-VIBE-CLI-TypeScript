"use strict";
/**
 * VIBE CLI - Google/Gemini Provider Adapter
 *
 * Full implementation of Google Generative AI API including:
 * - Gemini models (1.5 Flash, 1.5 Pro, 2.0)
 * - Streaming responses
 * - Vision/multimodal support
 * - Free tier support
 *
 * Version: 13.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleAdapter = exports.GoogleAdapter = void 0;
const base_adapter_js_1 = require("./base.adapter.js");
// ============================================================================
// MODEL DEFINITIONS
// ============================================================================
const GOOGLE_MODELS = [
    {
        id: 'gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash',
        contextWindow: 1000000,
        maxOutput: 8192,
        capabilities: ['completion', 'vision'],
        freeTier: true,
        tier: 'fast',
    },
    {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        contextWindow: 2000000,
        maxOutput: 8192,
        capabilities: ['completion', 'reasoning', 'vision'],
        freeTier: true,
        tier: 'balanced',
    },
    {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        contextWindow: 1000000,
        maxOutput: 8192,
        capabilities: ['completion', 'vision'],
        freeTier: true,
        tier: 'fast',
    },
    {
        id: 'gemini-1.0-pro',
        name: 'Gemini 1.0 Pro',
        contextWindow: 32768,
        maxOutput: 2048,
        capabilities: ['completion'],
        freeTier: true,
        tier: 'fast',
    },
];
const GOOGLE_CONFIG = {
    id: 'google',
    name: 'Google (Gemini)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyEnv: 'GOOGLE_API_KEY',
    defaultModel: 'gemini-1.5-flash',
    requiresApiKey: true,
};
// ============================================================================
// GOOGLE ADAPTER
// ============================================================================
class GoogleAdapter extends base_adapter_js_1.BaseProviderAdapter {
    baseUrl;
    constructor() {
        super(GOOGLE_CONFIG, GOOGLE_MODELS);
        this.baseUrl = GOOGLE_CONFIG.baseUrl;
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
        const lastMessage = messages[messages.length - 1];
        const history = messages.slice(0, -1);
        try {
            const response = await fetch(`${this.baseUrl}/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: this.buildContents(history, lastMessage),
                    generationConfig: {
                        temperature: options?.temperature ?? 0.7,
                        maxOutputTokens: options?.maxTokens,
                    },
                    safetySettings: this.getSafetySettings(),
                }),
            });
            if (response.status === 401) {
                throw new base_adapter_js_1.AuthenticationError(this.config.id, model);
            }
            if (response.status === 429) {
                throw new base_adapter_js_1.RateLimitError(this.config.id, model);
            }
            if (!response.ok) {
                const error = await response.text();
                throw new base_adapter_js_1.ProviderError(`Google API error: ${error}`, this.config.id, model, response.status, response.status >= 500);
            }
            const data = await response.json();
            return this.parseResponse(data, model, Date.now() - startTime);
        }
        catch (error) {
            if (error instanceof base_adapter_js_1.ProviderError)
                throw error;
            throw new base_adapter_js_1.ProviderError(`Google request failed: ${error instanceof Error ? error.message : 'Unknown error'}`, this.config.id, model, undefined, true);
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
        const lastMessage = messages[messages.length - 1];
        const history = messages.slice(0, -1);
        const response = await fetch(`${this.baseUrl}/models/${model}:streamGenerateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: this.buildContents(history, lastMessage),
                generationConfig: {
                    temperature: options?.temperature ?? 0.7,
                    maxOutputTokens: options?.maxTokens,
                },
            }),
        });
        if (!response.ok) {
            throw new base_adapter_js_1.ProviderError(`Google streaming failed: ${response.statusText}`, this.config.id, model, response.status);
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
            // Google streaming format: data: {...}\n\n
            const parts = buffer.split('\n\n');
            buffer = parts.pop() || '';
            for (const part of parts) {
                if (part.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(part.slice(6));
                        const content = this.extractStreamContent(data);
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
        return `${this.baseUrl}/models/${model}:generateContent`;
    }
    /**
     * Get request headers
     */
    getHeaders() {
        const apiKey = this.getApiKey();
        return {
            'Content-Type': 'application/json',
        };
    }
    /**
     * Transform messages to Google format
     */
    transformMessages(messages) {
        return this.buildContents(messages.slice(0, -1), messages[messages.length - 1]);
    }
    /**
     * Build contents array for Google API
     */
    buildContents(history, lastMessage) {
        const contents = [];
        // Add history
        for (const msg of history) {
            contents.push({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }],
            });
        }
        // Add last message
        contents.push({
            role: lastMessage.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: lastMessage.content }],
        });
        return contents;
    }
    /**
     * Get safety settings for content generation
     */
    getSafetySettings() {
        return [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ];
    }
    /**
     * Extract content from streaming response
     */
    extractStreamContent(data) {
        const response = data;
        return response.candidates?.[0]?.content?.parts?.[0]?.text || null;
    }
    /**
     * Parse Google response
     */
    parseResponse(data, model, latencyMs) {
        const response = data;
        const candidate = response.candidates?.[0];
        const textPart = candidate?.content?.parts?.[0];
        const usage = response.usageMetadata;
        // Google doesn't provide pricing - free tier available
        return {
            content: textPart?.text || '',
            usage: {
                promptTokens: usage?.promptTokenCount || 0,
                completionTokens: usage?.candidatesTokenCount || 0,
                totalTokens: usage?.totalTokenCount || 0,
                cost: 0, // Free tier
            },
            model,
            provider: this.config.id,
            latencyMs,
        };
    }
}
exports.GoogleAdapter = GoogleAdapter;
// ============================================================================
// EXPORTS
// ============================================================================
exports.googleAdapter = new GoogleAdapter();
//# sourceMappingURL=google.adapter.js.map