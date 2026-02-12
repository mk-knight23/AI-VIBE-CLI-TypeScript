/**
 * VIBE CLI - Unified Provider Router
 *
 * Central router for all LLM providers with:
 * - Adapter-based architecture
 * - Automatic fallback chain (free → paid → local)
 * - Cost tracking
 * - Provider health monitoring
 * - Task-based model selection
 *
 * Version: 0.0.1
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { selectModelForTask, ProviderError, } from './adapters/base.adapter.js';
import { OpenAIAdapter, AzureOpenAIAdapter, } from './adapters/openai.adapter.js';
import { AnthropicAdapter, BedrockAnthropicAdapter, } from './adapters/anthropic.adapter.js';
import { GoogleAdapter, } from './adapters/google.adapter.js';
import { OllamaAdapter, LMStudioAdapter, } from './adapters/ollama.adapter.js';
import { OpenRouterAdapter, } from './adapters/openrouter.adapter.js';
// ============================================================================
// UNIFIED ROUTER
// ============================================================================
export class UnifiedProviderRouter {
    adapters = new Map();
    defaultProvider = 'anthropic';
    defaultModel = 'claude-sonnet-4-20250514';
    userConfig = {};
    configDir;
    stats = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        averageLatencyMs: 0,
    };
    fallbackStrategy = 'balanced';
    maxRetries = 2;
    constructor(config) {
        this.configDir = path.join(os.homedir(), '.vibe');
        this.defaultProvider = config?.defaultProvider || this.defaultProvider;
        this.fallbackStrategy = config?.fallbackChain || 'balanced';
        this.maxRetries = config?.maxRetries || 2;
        this.initializeAdapters();
        this.loadUserConfig();
    }
    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    /**
     * Register all provider adapters
     */
    initializeAdapters() {
        // Cloud providers
        this.registerAdapter('openai', new OpenAIAdapter());
        this.registerAdapter('azure', new AzureOpenAIAdapter());
        this.registerAdapter('anthropic', new AnthropicAdapter());
        this.registerAdapter('bedrock', new BedrockAnthropicAdapter());
        this.registerAdapter('google', new GoogleAdapter());
        this.registerAdapter('openrouter', new OpenRouterAdapter());
        // Local providers
        this.registerAdapter('ollama', new OllamaAdapter());
        this.registerAdapter('lmstudio', new LMStudioAdapter());
    }
    /**
     * Register a provider adapter
     */
    registerAdapter(id, adapter) {
        this.adapters.set(id, adapter);
    }
    /**
     * Get an adapter by ID
     */
    getAdapter(id) {
        return this.adapters.get(id);
    }
    /**
     * List all available providers
     */
    listProviders() {
        const providers = [];
        for (const [id, adapter] of this.adapters) {
            const config = adapter.getConfig();
            const models = adapter.getModels();
            const freeModels = models.filter(m => m.freeTier);
            providers.push({
                id,
                name: config.name,
                configured: adapter.isConfigured(),
                available: true, // Would need async check
                models: models.length,
                defaultModel: adapter.getDefaultModel(),
                freeTier: freeModels.length > 0,
            });
        }
        return providers;
    }
    // ============================================================================
    // CHAT API
    // ============================================================================
    /**
     * Chat completion with automatic provider selection
     */
    async chat(messages, options) {
        const providerId = options?.model?.split('/')[0] || this.userConfig.provider || this.defaultProvider;
        const model = options?.model || this.userConfig.model;
        const adapter = this.adapters.get(providerId);
        if (!adapter) {
            throw new Error(`Provider not found: ${providerId}`);
        }
        // Try with primary provider
        try {
            const response = await adapter.chat(messages, { ...options, model });
            this.recordSuccess(response);
            return response;
        }
        catch (error) {
            if (!(error instanceof ProviderError) || !error.retryable) {
                throw error;
            }
            // Try fallback providers
            return this.chatWithFallback(messages, options, providerId);
        }
    }
    /**
     * Chat with fallback chain
     */
    async chatWithFallback(messages, options, excludeProvider) {
        const fallbackProviders = this.getFallbackOrder(excludeProvider);
        let lastError = null;
        for (const providerId of fallbackProviders) {
            const adapter = this.adapters.get(providerId);
            if (!adapter || !adapter.isConfigured())
                continue;
            for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
                try {
                    const response = await adapter.chat(messages, {
                        ...options,
                        model: options?.model || adapter.getDefaultModel(),
                    });
                    this.recordSuccess(response);
                    return response;
                }
                catch (error) {
                    if (error instanceof ProviderError && error.retryable) {
                        lastError = error;
                        continue;
                    }
                    lastError = error instanceof Error ? error : new Error(String(error));
                    break;
                }
            }
        }
        throw lastError || new Error('All providers failed');
    }
    /**
     * Streaming chat completion
     */
    async *streamChat(messages, callback, options) {
        const providerId = this.userConfig.provider || this.defaultProvider;
        const adapter = this.adapters.get(providerId);
        if (!adapter) {
            throw new Error(`Provider not found: ${providerId}`);
        }
        yield* adapter.streamChat(messages, callback, options);
    }
    /**
     * Simple completion
     */
    async complete(prompt, options) {
        return this.chat([{ role: 'user', content: prompt }], options);
    }
    // ============================================================================
    // MODEL SELECTION
    // ============================================================================
    /**
     * Select model for a task
     */
    selectModelForTask(task) {
        const adapter = this.adapters.get(this.defaultProvider);
        if (!adapter)
            return this.defaultModel;
        const modelInfo = selectModelForTask(task, adapter.getModels());
        return modelInfo?.id || this.defaultModel;
    }
    /**
     * Set current provider
     */
    setProvider(provider) {
        const normalized = provider.toLowerCase().replace(/\s+/g, '');
        // Map common names
        const providerMap = {
            'openai': 'openai',
            'anthropic': 'anthropic',
            'claude': 'anthropic',
            'google': 'google',
            'gemini': 'google',
            'ollama': 'ollama',
            'local': 'ollama',
            'openrouter': 'openrouter',
            'or': 'openrouter',
            'bedrock': 'bedrock',
            'aws': 'bedrock',
            'azure': 'azure',
        };
        const providerId = providerMap[normalized] || provider;
        if (this.adapters.has(providerId)) {
            this.userConfig.provider = providerId;
            this.userConfig.model = this.adapters.get(providerId).getDefaultModel();
            this.saveUserConfig();
            return true;
        }
        return false;
    }
    /**
     * Set current model
     */
    setModel(model) {
        // Find which provider has this model
        for (const [providerId, adapter] of this.adapters) {
            const modelInfo = adapter.getModels().find(m => m.id === model);
            if (modelInfo) {
                this.userConfig.provider = providerId;
                this.userConfig.model = model;
                this.saveUserConfig();
                return true;
            }
        }
        return false;
    }
    /**
     * Get current provider info
     */
    getCurrentProvider() {
        const adapter = this.adapters.get(this.userConfig.provider || this.defaultProvider);
        if (!adapter)
            return null;
        const config = adapter.getConfig();
        return {
            id: config.id,
            name: config.name,
            model: this.userConfig.model || config.defaultModel,
        };
    }
    // ============================================================================
    // FALLBACK ORDER
    // ============================================================================
    /**
     * Get fallback order based on strategy
     */
    getFallbackOrder(exclude) {
        const providers = Array.from(this.adapters.keys()).filter(p => p !== exclude);
        switch (this.fallbackStrategy) {
            case 'free-first':
                return this.sortByFreeTier(providers);
            case 'local-first':
                return this.sortByLocal(providers);
            case 'speed-first':
                return this.sortBySpeed(providers);
            case 'quality-first':
                return this.sortByQuality(providers);
            case 'paid-first':
                return this.sortByPaid(providers);
            case 'balanced':
            default:
                return this.sortByBalanced(providers);
        }
    }
    sortByFreeTier(providers) {
        return providers.sort((a, b) => {
            const aFree = this.adapters.get(a).getModels().some(m => m.freeTier);
            const bFree = this.adapters.get(b).getModels().some(m => m.freeTier);
            return bFree ? 1 : -1;
        });
    }
    sortByLocal(providers) {
        return providers.sort((a, b) => {
            const aLocal = !this.adapters.get(a).getConfig().requiresApiKey;
            const bLocal = !this.adapters.get(b).getConfig().requiresApiKey;
            return bLocal ? 1 : -1;
        });
    }
    sortBySpeed(providers) {
        return providers.sort((a, b) => {
            const aFast = this.adapters.get(a).getModels().some(m => m.tier === 'fast');
            const bFast = this.adapters.get(b).getModels().some(m => m.tier === 'fast');
            return bFast ? 1 : -1;
        });
    }
    sortByQuality(providers) {
        return providers.sort((a, b) => {
            const aMax = this.adapters.get(a).getModels().some(m => m.tier === 'max');
            const bMax = this.adapters.get(b).getModels().some(m => m.tier === 'max');
            return bMax ? 1 : -1;
        });
    }
    sortByPaid(providers) {
        return providers.sort((a, b) => {
            const aPaid = this.adapters.get(a).getConfig().requiresApiKey;
            const bPaid = this.adapters.get(b).getConfig().requiresApiKey;
            return bPaid ? 1 : -1;
        });
    }
    sortByBalanced(providers) {
        // Prefer configured providers, then balanced tier
        return providers.sort((a, b) => {
            const aAdapter = this.adapters.get(a);
            const bAdapter = this.adapters.get(b);
            // Prefer configured
            const aConfigured = aAdapter.isConfigured();
            const bConfigured = bAdapter.isConfigured();
            if (aConfigured !== bConfigured)
                return aConfigured ? -1 : 1;
            // Prefer balanced tier
            const aBalanced = aAdapter.getModels().some(m => m.tier === 'balanced');
            const bBalanced = bAdapter.getModels().some(m => m.tier === 'balanced');
            if (aBalanced !== bBalanced)
                return aBalanced ? -1 : 1;
            return 0;
        });
    }
    // ============================================================================
    // CONFIG MANAGEMENT
    // ============================================================================
    loadUserConfig() {
        const configPath = path.join(this.configDir, 'config.json');
        if (fs.existsSync(configPath)) {
            try {
                this.userConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            }
            catch {
                // Ignore corrupt config
            }
        }
    }
    saveUserConfig() {
        const configPath = path.join(this.configDir, 'config.json');
        if (!fs.existsSync(this.configDir)) {
            fs.mkdirSync(this.configDir, { recursive: true });
        }
        fs.writeFileSync(configPath, JSON.stringify(this.userConfig, null, 2));
    }
    /**
     * Set API key for a provider
     */
    setApiKey(provider, apiKey) {
        if (!this.adapters.has(provider))
            return false;
        if (!this.userConfig.apiKeys) {
            this.userConfig.apiKeys = {};
        }
        this.userConfig.apiKeys[provider] = apiKey;
        this.saveUserConfig();
        return true;
    }
    /**
     * Check if provider is configured
     */
    isProviderConfigured(provider) {
        const adapter = this.adapters.get(provider);
        if (!adapter)
            return false;
        // Check user config first
        if (this.userConfig.apiKeys?.[provider]) {
            return true;
        }
        // Check if API key is available
        const config = adapter.getConfig();
        if (config.requiresApiKey) {
            return !!process.env[config.apiKeyEnv];
        }
        return true; // Local providers
    }
    // ============================================================================
    // STATISTICS
    // ============================================================================
    recordSuccess(response) {
        this.stats.totalRequests++;
        this.stats.successfulRequests++;
        this.stats.totalTokens += response.usage.totalTokens;
        this.stats.totalCost += response.usage.cost || 0;
        // Update average latency
        const totalLatency = this.stats.averageLatencyMs * (this.stats.successfulRequests - 1);
        this.stats.averageLatencyMs = (totalLatency + response.latencyMs) / this.stats.successfulRequests;
    }
    recordFailure() {
        this.stats.totalRequests++;
        this.stats.failedRequests++;
    }
    /**
     * Get router statistics
     */
    getStats() {
        return { ...this.stats };
    }
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            totalTokens: 0,
            totalCost: 0,
            averageLatencyMs: 0,
        };
    }
    // ============================================================================
    // FREE TIER HELPERS
    // ============================================================================
    /**
     * Get all free tier models across providers
     */
    getFreeTierModels() {
        const freeModels = [];
        for (const [providerId, adapter] of this.adapters) {
            for (const model of adapter.getModels()) {
                if (model.freeTier) {
                    freeModels.push({ provider: providerId, model });
                }
            }
        }
        return freeModels;
    }
    /**
     * Get local providers (no API key required)
     */
    getLocalProviders() {
        const local = [];
        for (const [providerId, adapter] of this.adapters) {
            if (!adapter.getConfig().requiresApiKey) {
                local.push(providerId);
            }
        }
        return local;
    }
    /**
     * Get configured providers (have API keys)
     */
    getConfiguredProviders() {
        const configured = [];
        for (const [providerId, adapter] of this.adapters) {
            if (this.isProviderConfigured(providerId)) {
                configured.push(providerId);
            }
        }
        return configured;
    }
}
// ============================================================================
// EXPORTS
// ============================================================================
export const unifiedRouter = new UnifiedProviderRouter();
//# sourceMappingURL=unified.router.js.map