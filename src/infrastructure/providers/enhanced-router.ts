/**
 * VIBE-CLI v0.0.2 - Enhanced Provider Router
 * Multi-provider LLM routing with circuit breaker, rate limiting, and streaming support
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { ProviderConfig, ProviderResponse } from '../adapters/types.js';
import { PROVIDER_REGISTRY, getProviderById, getProviderByModel } from '../../providers/registry.js';
import { CircuitBreaker } from '../../utils/circuit-breaker.js';
import { RateLimiter } from '../../utils/rate-limiter.js';
import { createLogger } from '../../utils/pino-logger.js';

const logger = createLogger('EnhancedProviderRouter');

interface UserConfig {
    provider?: string;
    model?: string;
    apiKeys?: Record<string, string>;
}

export interface RouterConfig {
    defaultProvider: string;
    fallbackOrder: string[];
    rateLimitWindow: number;
    rateLimitMax: number;
    circuitBreakerThreshold: number;
    circuitBreakerTimeout: number;
}

export interface StreamingConfig {
    enabled: boolean;
    chunkSize: number;
    timeout: number;
}

export interface CostMetrics {
    totalTokens: number;
    totalCost: number;
    byProvider: Record<string, { tokens: number; cost: number; requests: number }>;
}

export class VibeEnhancedProviderRouter {
    private providers: Map<string, ProviderConfig>;
    private defaultProvider: string = 'minimax';
    private currentProvider: string = 'minimax';
    private currentModel: string = 'MiniMax-M2.1';
    private userConfig: UserConfig = {};
    private configDir: string;
    private usageHistory: Array<{ timestamp: Date; tokens: number; cost: number }> = [];

    // Circuit breakers and rate limiters per provider
    private circuitBreakers: Map<string, CircuitBreaker> = new Map();
    private rateLimiters: Map<string, RateLimiter> = new Map();

    // Configuration
    private routerConfig: RouterConfig;
    private streamingConfig: StreamingConfig;

    constructor(routerConfig?: Partial<RouterConfig>, streamingConfig?: Partial<StreamingConfig>) {
        this.providers = new Map();
        this.configDir = path.join(os.homedir(), '.vibe');

        // Default configuration with overrides
        this.routerConfig = {
            defaultProvider: routerConfig?.defaultProvider || 'minimax',
            fallbackOrder: routerConfig?.fallbackOrder || ['minimax', 'openai', 'anthropic'],
            rateLimitWindow: routerConfig?.rateLimitWindow || 60000,
            rateLimitMax: routerConfig?.rateLimitMax || 100,
            circuitBreakerThreshold: routerConfig?.circuitBreakerThreshold || 5,
            circuitBreakerTimeout: routerConfig?.circuitBreakerTimeout || 30000
        };

        this.streamingConfig = {
            enabled: streamingConfig?.enabled ?? true,
            chunkSize: streamingConfig?.chunkSize || 100,
            timeout: streamingConfig?.timeout || 30000
        };

        this.initializeProviders();
        this.loadUserConfig();
        this.initializeCircuitBreakers();
        this.initializeRateLimiters();
    }

    private initializeProviders(): void {
        for (const provider of PROVIDER_REGISTRY) {
            this.providers.set(provider.id, {
                id: provider.id,
                name: provider.name,
                baseUrl: provider.baseUrl,
                apiKeyEnv: provider.apiKeyEnv,
                defaultModel: provider.defaultModel,
                requiresApiKey: provider.requiresApiKey,
            });
        }
    }

    private loadUserConfig(): void {
        const configPath = path.join(this.configDir, 'config.json');
        if (fs.existsSync(configPath)) {
            try {
                this.userConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                if (this.userConfig.provider) {
                    this.currentProvider = this.userConfig.provider;
                }
                if (this.userConfig.model) {
                    this.currentModel = this.userConfig.model;
                }
            } catch {
                // Ignore config errors
            }
        }
    }

    private initializeCircuitBreakers(): void {
        for (const providerId of this.providers.keys()) {
            this.circuitBreakers.set(providerId, new CircuitBreaker({
                failureThreshold: this.routerConfig.circuitBreakerThreshold,
                resetTimeout: this.routerConfig.circuitBreakerTimeout
            }));
        }
    }

    private initializeRateLimiters(): void {
        for (const providerId of this.providers.keys()) {
            this.rateLimiters.set(providerId, new RateLimiter({
                windowMs: this.routerConfig.rateLimitWindow,
                maxRequests: this.routerConfig.rateLimitMax
            }));
        }
    }

    /**
     * Chat completion with automatic fallback and circuit breaker
     */
    async chat(
        messages: Array<{ role: string; content: string }>,
        options?: { model?: string; temperature?: number; maxTokens?: number }
    ): Promise<ProviderResponse> {
        return this.chatWithFallback(messages, options);
    }

    /**
     * Chat with fallback support - tries providers in order until one succeeds
     */
    async chatWithFallback(
        messages: Array<{ role: string; content: string }>,
        options?: { model?: string; temperature?: number; maxTokens?: number }
    ): Promise<ProviderResponse> {
        const providers = this.routerConfig.fallbackOrder.length > 0
            ? this.routerConfig.fallbackOrder
            : [this.routerConfig.defaultProvider];

        let lastError: Error | null = null;

        for (const providerId of providers) {
            const breaker = this.circuitBreakers.get(providerId);
            const limiter = this.rateLimiters.get(providerId);

            if (breaker?.isOpen()) {
                console.warn(`Circuit breaker open for ${providerId}, skipping`);
                continue;
            }

            if (limiter?.isRateLimited()) {
                console.warn(`Rate limited for ${providerId}, skipping`);
                continue;
            }

            try {
                limiter?.recordRequest();
                const response = await this.executeChat(providerId, messages, options);
                breaker?.recordSuccess();

                this.trackUsage(response);
                return response;
            } catch (error) {
                lastError = error as Error;
                this.circuitBreakers.get(providerId)?.recordFailure();
                console.error(`Provider ${providerId} failed:`, error);
            }
        }

        throw new Error(`All providers failed. Last error: ${lastError?.message}`);
    }

    /**
     * Streaming chat with fallback
     */
    async *streamChat(
        messages: Array<{ role: string; content: string }>,
        options?: { model?: string; temperature?: number }
    ): AsyncGenerator<string> {
        const providers = this.routerConfig.fallbackOrder.length > 0
            ? this.routerConfig.fallbackOrder
            : [this.routerConfig.defaultProvider];

        for (const providerId of providers) {
            try {
                const stream = this.getStreamingClient(providerId);
                if (stream) {
                    for await (const chunk of stream.stream(messages, options)) {
                        yield chunk;
                    }
                    return;
                }
            } catch (error) {
                console.error(`Streaming failed for ${providerId}:`, error);
            }
        }

        throw new Error('All streaming providers failed');
    }

    /**
     * Get streaming client for a provider
     */
    private getStreamingClient(providerId: string): { stream: (messages: Array<{ role: string; content: string }>, options?: { model?: string; temperature?: number }) => AsyncGenerator<string> } | null {
        const provider = this.providers.get(providerId);
        if (!provider) return null;

        switch (providerId) {
            case 'openai':
                return { stream: (m, o) => this.streamOpenAI(m, o) };
            case 'anthropic':
                return { stream: (m, o) => this.streamAnthropic(m, o) };
            default:
                return null;
        }
    }

    /**
     * OpenAI streaming
     */
    private async *streamOpenAI(
        messages: Array<{ role: string; content: string }>,
        options?: { model?: string; temperature?: number }
    ): AsyncGenerator<string> {
        const apiKey = this.getApiKey('openai');
        if (!apiKey) throw new Error('OpenAI API key not set');

        const model = options?.model || 'gpt-4o';
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                messages,
                temperature: options?.temperature ?? 0.7,
                stream: true,
            }),
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') return;

                    try {
                        const chunk = JSON.parse(data);
                        const content = chunk.choices?.[0]?.delta?.content;
                        if (content) yield content;
                    } catch {
                        // Ignore parse errors
                    }
                }
            }
        }
    }

    /**
     * Anthropic streaming
     */
    private async *streamAnthropic(
        messages: Array<{ role: string; content: string }>,
        options?: { model?: string; temperature?: number }
    ): AsyncGenerator<string> {
        const apiKey = this.getApiKey('anthropic');
        if (!apiKey) throw new Error('Anthropic API key not set');

        const model = options?.model || 'claude-sonnet-4-20250514';
        const systemMessage = messages.find(m => m.role === 'system');
        const userMessages = messages.filter(m => m.role !== 'system');

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model,
                messages: userMessages,
                system: systemMessage?.content,
                temperature: options?.temperature ?? 0.7,
                stream: true,
            }),
        });

        if (!response.ok) {
            throw new Error(`Anthropic API error: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') return;

                    try {
                        const chunk = JSON.parse(data);
                        const content = chunk.delta?.text;
                        if (content) yield content;
                    } catch {
                        // Ignore parse errors
                    }
                }
            }
        }
    }

    /**
     * Execute chat with a specific provider
     */
    private async executeChat(
        providerId: string,
        messages: Array<{ role: string; content: string }>,
        options?: { model?: string; temperature?: number; maxTokens?: number }
    ): Promise<ProviderResponse> {
        switch (providerId) {
            case 'minimax':
                return this.callMiniMax(messages, options?.model || this.currentModel);
            case 'openai':
                return this.callOpenAI(messages, options);
            case 'anthropic':
                return this.callAnthropic(messages, options);
            case 'google':
                return this.callGoogle(messages, options);
            case 'ollama':
                return this.callOllama(messages, options);
            default:
                return this.callOpenAICompatible(providerId, messages, options);
        }
    }

    private async callMiniMax(
        messages: Array<{ role: string; content: string }>,
        model: string
    ): Promise<ProviderResponse> {
        const apiKey = this.getApiKey('minimax');
        if (!apiKey) throw new Error('MiniMax API key not set');

        const response = await fetch('https://api.minimax.io/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                messages,
                extra_body: { reasoning_split: true },
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`MiniMax API error: ${error}`);
        }

        const data = await response.json();
        const choice = data.choices?.[0]?.message;

        return {
            content: choice?.content || '',
            usage: {
                promptTokens: data.usage?.prompt_tokens || 0,
                completionTokens: data.usage?.completion_tokens || 0,
                totalTokens: data.usage?.total_tokens || 0,
            },
            model,
            provider: 'minimax',
        };
    }

    private async callOpenAI(
        messages: Array<{ role: string; content: string }>,
        options?: { model?: string; temperature?: number; maxTokens?: number }
    ): Promise<ProviderResponse> {
        const apiKey = this.getApiKey('openai');
        if (!apiKey) throw new Error('OpenAI API key not set');

        const model = options?.model || 'gpt-4o';
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                messages,
                temperature: options?.temperature ?? 0.7,
                max_tokens: options?.maxTokens ?? 4096,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenAI API error: ${error}`);
        }

        const data = await response.json();
        return {
            content: data.choices?.[0]?.message?.content || '',
            usage: {
                promptTokens: data.usage?.prompt_tokens || 0,
                completionTokens: data.usage?.completion_tokens || 0,
                totalTokens: data.usage?.total_tokens || 0,
            },
            model,
            provider: 'openai',
        };
    }

    private async callAnthropic(
        messages: Array<{ role: string; content: string }>,
        options?: { model?: string; temperature?: number; maxTokens?: number }
    ): Promise<ProviderResponse> {
        const apiKey = this.getApiKey('anthropic');
        if (!apiKey) throw new Error('Anthropic API key not set');

        const model = options?.model || 'claude-sonnet-4-20250514';
        const systemMessage = messages.find(m => m.role === 'system');
        const userMessages = messages.filter(m => m.role !== 'system');

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model,
                messages: userMessages,
                system: systemMessage?.content,
                temperature: options?.temperature ?? 0.7,
                max_tokens: options?.maxTokens ?? 4096,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Anthropic API error: ${error}`);
        }

        const data = await response.json();
        return {
            content: data.content?.[0]?.text || '',
            usage: {
                promptTokens: data.usage?.input_tokens || 0,
                completionTokens: data.usage?.output_tokens || 0,
                totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
            },
            model,
            provider: 'anthropic',
        };
    }

    private async callGoogle(
        messages: Array<{ role: string; content: string }>,
        options?: { model?: string; temperature?: number; maxTokens?: number }
    ): Promise<ProviderResponse> {
        const apiKey = this.getApiKey('google');
        if (!apiKey) throw new Error('Google API key not set');

        const model = options?.model || 'gemini-2.0-flash';
        const lastMessage = messages[messages.length - 1];

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: lastMessage?.content }] }],
                    generationConfig: {
                        temperature: options?.temperature ?? 0.7,
                        maxOutputTokens: options?.maxTokens ?? 4096,
                    },
                }),
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Google API error: ${error}`);
        }

        const data = await response.json();
        return {
            content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            model,
            provider: 'google',
        };
    }

    private async callOllama(
        messages: Array<{ role: string; content: string }>,
        options?: { model?: string; temperature?: number; maxTokens?: number }
    ): Promise<ProviderResponse> {
        const config = this.providers.get('ollama');
        const baseUrl = config?.baseUrl || 'http://localhost:11434/v1';
        const model = options?.model || 'llama3.2';

        const response = await fetch(`${baseUrl}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages,
                stream: false,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Ollama API error: ${error}`);
        }

        const data = await response.json();
        return {
            content: data.message?.content || '',
            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            model,
            provider: 'ollama',
        };
    }

    private async callOpenAICompatible(
        providerId: string,
        messages: Array<{ role: string; content: string }>,
        options?: { model?: string; temperature?: number; maxTokens?: number }
    ): Promise<ProviderResponse> {
        const config = this.providers.get(providerId);
        const apiKey = this.getApiKey(providerId);

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

        if (providerId === 'openrouter') {
            headers['HTTP-Referer'] = 'https://vibe.dev';
            headers['X-Title'] = 'VIBE CLI';
        }

        const model = options?.model || config?.defaultModel || 'gpt-4o';
        const baseUrl = config?.baseUrl || `https://${providerId}.api.example.com/v1`;

        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ model, messages }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`${providerId} API error: ${error}`);
        }

        const data = await response.json();
        return {
            content: data.choices?.[0]?.message?.content || '',
            usage: {
                promptTokens: data.usage?.prompt_tokens || 0,
                completionTokens: data.usage?.completion_tokens || 0,
                totalTokens: data.usage?.total_tokens || 0,
            },
            model,
            provider: providerId,
        };
    }

    /**
     * Track usage and calculate cost
     */
    private trackUsage(response: ProviderResponse): void {
        const costPerMillion: Record<string, { input: number; output: number }> = {
            'gpt-4o': { input: 5.00, output: 15.00 },
            'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
            'gemini-2.0-flash': { input: 0.10, output: 0.40 },
            'MiniMax-M2.1': { input: 0.10, output: 0.20 }
        };

        const rates = costPerMillion[response.model];
        if (!rates) return;

        const usage = response.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
        const cost =
            (usage.promptTokens / 1_000_000 * rates.input) +
            (usage.completionTokens / 1_000_000 * rates.output);

        this.usageHistory.push({
            timestamp: new Date(),
            tokens: usage.totalTokens,
            cost
        });
    }

    /**
     * Get usage metrics
     */
    getUsage(): CostMetrics {
        const byProvider: Record<string, { tokens: number; cost: number; requests: number }> = {};

        let totalTokens = 0;
        let totalCost = 0;

        for (const entry of this.usageHistory) {
            totalTokens += entry.tokens;
            totalCost += entry.cost;
        }

        return { totalTokens, totalCost, byProvider };
    }

    /**
     * Get circuit breaker status
     */
    getCircuitBreakerStatus(): Record<string, { state: string; failures: number }> {
        const status: Record<string, { state: string; failures: number }> = {};

        for (const [id, breaker] of this.circuitBreakers) {
            const metrics = breaker.getMetrics();
            status[id] = {
                state: metrics.state,
                failures: metrics.failures
            };
        }

        return status;
    }

    /**
     * Get rate limiter status
     */
    getRateLimiterStatus(): Record<string, { remaining: number; limit: number; isLimited: boolean }> {
        const status: Record<string, { remaining: number; limit: number; isLimited: boolean }> = {};

        for (const [id, limiter] of this.rateLimiters) {
            const metrics = limiter.getMetrics();
            status[id] = {
                remaining: metrics.remaining,
                limit: metrics.limit,
                isLimited: metrics.isLimited
            };
        }

        return status;
    }

    /**
     * Reset circuit breaker for a provider
     */
    resetCircuitBreaker(providerId: string): void {
        const breaker = this.circuitBreakers.get(providerId);
        breaker?.reset();
    }

    private getApiKey(provider: string): string | undefined {
        if (this.userConfig.apiKeys?.[provider]) {
            return this.userConfig.apiKeys[provider];
        }
        const config = this.providers.get(provider);
        if (config?.apiKeyEnv) {
            return process.env[config.apiKeyEnv];
        }
        return undefined;
    }

    getProviderIds(): string[] {
        return Array.from(this.providers.keys());
    }
}

export const enhancedProviderRouter = new VibeEnhancedProviderRouter();
