"use strict";
/**
 * VIBE-CLI v12 - Provider Router
 * Universal interface for AI providers (OpenAI, Anthropic, Google, xAI, Ollama)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.VibeProviderRouter = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const registry_1 = require("./registry");
class VibeProviderRouter {
    providers;
    defaultProvider = 'minimax';
    currentProvider = 'minimax';
    currentModel = 'MiniMax-M2.1';
    userConfig = {};
    configDir;
    constructor() {
        this.providers = new Map();
        this.configDir = path.join(os.homedir(), '.vibe');
        this.initializeProviders();
        this.loadUserConfig();
    }
    initializeProviders() {
        for (const provider of registry_1.PROVIDER_REGISTRY) {
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
    loadUserConfig() {
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
            }
            catch {
                // Ignore config errors
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
    getApiKey(provider) {
        // First check user config
        if (this.userConfig.apiKeys?.[provider]) {
            return this.userConfig.apiKeys[provider];
        }
        // Then check environment
        const config = this.providers.get(provider);
        if (config?.apiKeyEnv) {
            return process.env[config.apiKeyEnv];
        }
        return undefined;
    }
    /**
     * Chat completion - implements IProviderRouter
     */
    async chat(messages, options) {
        const provider = this.currentProvider;
        const model = options?.model || this.currentModel;
        const config = this.providers.get(provider);
        if (!config) {
            throw new Error(`Provider ${provider} not configured`);
        }
        const apiKey = this.getApiKey(provider);
        // If no API key, return helpful message
        if (!apiKey && config.requiresApiKey) {
            return {
                content: `[${provider}] API key not configured. Run 'vibe config' to set up your API key.`,
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                model,
                provider,
            };
        }
        try {
            switch (provider) {
                case 'minimax':
                    return await this.callMiniMax(messages, model, apiKey);
                case 'openai':
                    return await this.callOpenAI(messages, model, options);
                case 'anthropic':
                    return await this.callAnthropic(messages, model, options);
                case 'google':
                    return await this.callGoogle(messages, model, options);
                case 'ollama':
                    return await this.callOllama(messages, model, options);
                default:
                    // For other providers (OpenRouter, etc.), try OpenAI-compatible API
                    return await this.callOpenAICompatible(messages, model, config.baseUrl, apiKey, provider);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                content: `[${provider}] Error: ${errorMessage}`,
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                model,
                provider,
            };
        }
    }
    /**
     * MiniMax API call - OpenAI-compatible with reasoning support
     */
    async callMiniMax(messages, model, apiKey) {
        if (!apiKey)
            throw new Error('MiniMax API key not set');
        const response = await fetch('https://api.minimax.io/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                messages,
                extra_body: {
                    reasoning_split: true,
                },
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
    async callOpenAI(messages, model, options) {
        const apiKey = this.getApiKey('openai');
        if (!apiKey)
            throw new Error('OpenAI API key not set');
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
    async callAnthropic(messages, model, options) {
        const apiKey = this.getApiKey('anthropic');
        if (!apiKey)
            throw new Error('Anthropic API key not set');
        // Convert messages to Anthropic format
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
    async callGoogle(messages, model, options) {
        const apiKey = this.getApiKey('google');
        if (!apiKey)
            throw new Error('Google API key not set');
        const lastMessage = messages[messages.length - 1];
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: lastMessage?.content }] }],
                generationConfig: {
                    temperature: options?.temperature ?? 0.7,
                    maxOutputTokens: options?.maxTokens ?? 4096,
                },
            }),
        });
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
    async callOllama(messages, model, _options) {
        const config = this.providers.get('ollama');
        const baseUrl = config?.baseUrl || 'http://localhost:11434/v1';
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
    async callOpenAICompatible(messages, model, baseUrl, apiKey, provider) {
        // OpenRouter requires specific headers
        const headers = {
            'Content-Type': 'application/json',
        };
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }
        // OpenRouter specific headers
        if (provider === 'openrouter') {
            headers['HTTP-Referer'] = 'https://vibe.dev';
            headers['X-Title'] = 'VIBE CLI';
        }
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model,
                messages,
            }),
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API error: ${error}`);
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
            provider: this.currentProvider,
        };
    }
    /**
     * Complete a prompt - implements IProviderRouter
     */
    async complete(prompt) {
        const messages = [{ role: 'user', content: prompt }];
        return this.chat(messages);
    }
    /**
     * Stream chat completion
     */
    async *streamChat(messages, options) {
        const provider = this.currentProvider;
        const model = options?.model || this.currentModel;
        const apiKey = this.getApiKey(provider);
        switch (provider) {
            case 'openai':
                yield* this.streamOpenAI(messages, model, apiKey, options?.temperature);
                break;
            case 'anthropic':
                yield* this.streamAnthropic(messages, model, apiKey, options?.temperature);
                break;
            default:
                // Non-streaming fallback
                const response = await this.chat(messages, options);
                yield response.content;
        }
    }
    async *streamOpenAI(messages, model, apiKey, temperature) {
        if (!apiKey)
            throw new Error('OpenAI API key not set');
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                messages,
                temperature: temperature ?? 0.7,
                stream: true,
            }),
        });
        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
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
                        if (content)
                            yield content;
                    }
                    catch {
                        // Ignore parse errors
                    }
                }
            }
        }
    }
    async *streamAnthropic(messages, model, apiKey, temperature) {
        if (!apiKey)
            throw new Error('Anthropic API key not set');
        const systemMessage = messages.find(m => m.role === 'system');
        const userMessages = messages.filter(m => m.role !== 'system');
        const response = await fetch('https://api.anthropic.com/v1/messages', {
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
                system: systemMessage?.content,
                temperature: temperature ?? 0.7,
                stream: true,
            }),
        });
        if (!response.ok) {
            throw new Error(`Anthropic API error: ${response.statusText}`);
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
                        if (parsed.type === 'content_block_delta' && parsed.delta.type === 'text_delta') {
                            yield parsed.delta.text;
                        }
                    }
                    catch {
                        // Ignore parse errors
                    }
                }
            }
        }
    }
    /**
     * Select model for task - implements IProviderRouter
     */
    selectModel(task) {
        const taskLower = task.toLowerCase();
        // Check for specific model requests
        if (taskLower.includes('sonnet'))
            return 'claude-sonnet-4-20250514';
        if (taskLower.includes('opus') || taskLower.includes('best'))
            return 'claude-opus-4-20250514';
        if (taskLower.includes('haiku'))
            return 'claude-haiku-3-20250514';
        if (taskLower.includes('gpt-4o'))
            return 'gpt-4o';
        if (taskLower.includes('mini') || taskLower.includes('fast'))
            return 'gpt-4o-mini';
        if (taskLower.includes('o1') || taskLower.includes('reason'))
            return 'o1';
        if (taskLower.includes('gemini'))
            return 'gemini-1.5-flash';
        if (taskLower.includes('llama'))
            return 'llama3.1';
        if (taskLower.includes('ollama') || taskLower.includes('local'))
            return 'llama3.1';
        // Task-based selection
        if (taskLower.includes('reason') || taskLower.includes('think') || taskLower.includes('plan')) {
            return 'o1';
        }
        if (taskLower.includes('code') || taskLower.includes('function') || taskLower.includes('编程')) {
            return 'claude-opus-4-20250514';
        }
        if (taskLower.includes('fast') || taskLower.includes('simple')) {
            return 'gpt-4o-mini';
        }
        return this.providers.get(this.currentProvider)?.defaultModel || 'gpt-4o';
    }
    /**
     * Get provider status
     */
    getStatus() {
        const config = this.providers.get(this.currentProvider);
        const providersList = this.listProviders();
        return {
            provider: this.currentProvider,
            model: this.currentModel,
            available: providersList.length,
            configured: providersList.filter(p => p.configured).length,
        };
    }
    /**
     * Get available providers
     */
    getAvailableProviders() {
        return Array.from(this.providers.keys());
    }
    /**
     * Check if a provider is configured
     */
    isProviderConfigured(provider) {
        const config = this.providers.get(provider);
        if (!config)
            return false;
        // Check user config first
        if (this.userConfig.apiKeys?.[provider]) {
            return true;
        }
        // Check if API key is available in environment
        if (config.requiresApiKey) {
            const apiKey = process.env[config.apiKeyEnv];
            return !!apiKey;
        }
        return true; // Local providers like Ollama don't need API keys
    }
    /**
     * Set current provider
     */
    setProvider(provider) {
        // Handle "use X" style input
        const normalized = provider.toLowerCase().replace(/\s+/g, '');
        // Map common names to provider IDs
        const providerMap = {
            'openai': 'openai',
            'anthropic': 'anthropic',
            'claude': 'anthropic',
            'google': 'google',
            'gemini': 'google',
            'xai': 'xai',
            'grok': 'xai',
            'mistral': 'mistral',
            'ollama': 'ollama',
            'local': 'ollama',
            'bedrock': 'bedrock',
            'aws': 'bedrock',
            'groq': 'groq',
            'deepseek': 'deepseek',
            'qwen': 'qwen',
            'together': 'together',
            'huggingface': 'huggingface',
            'hf': 'huggingface',
            'openrouter': 'openrouter',
            'or': 'openrouter',
        };
        const providerId = providerMap[normalized] || provider;
        if (this.providers.has(providerId)) {
            this.currentProvider = providerId;
            this.currentModel = this.providers.get(providerId).defaultModel;
            this.userConfig.provider = providerId;
            this.userConfig.model = this.currentModel;
            this.saveUserConfig();
            return true;
        }
        return false;
    }
    /**
     * Set current model
     */
    setModel(model) {
        // Check if it's a model ID in any provider
        const providerInfo = (0, registry_1.getProviderByModel)(model);
        if (providerInfo) {
            this.currentProvider = providerInfo.id;
            this.currentModel = model;
            this.userConfig.provider = providerInfo.id;
            this.userConfig.model = model;
            this.saveUserConfig();
            return true;
        }
        // Check if it's a model ID in current provider
        for (const m of registry_1.PROVIDER_REGISTRY) {
            if (m.id === this.currentProvider) {
                const modelExists = m.models?.some(mm => mm.id === model || mm.id.includes(model));
                if (modelExists) {
                    this.currentModel = model;
                    this.userConfig.model = model;
                    this.saveUserConfig();
                    return true;
                }
            }
        }
        return false;
    }
    /**
     * Get provider info
     */
    getProvider(provider) {
        return this.providers.get(provider);
    }
    /**
     * Get current provider info
     */
    getCurrentProvider() {
        return this.providers.get(this.currentProvider);
    }
    /**
     * Get current model
     */
    getCurrentModel() {
        return this.currentModel;
    }
    /**
     * List all providers
     */
    listProviders() {
        const providers = [];
        for (const [id, config] of this.providers) {
            const providerInfo = (0, registry_1.getProviderById)(id);
            providers.push({
                id,
                name: config.name,
                configured: this.isProviderConfigured(id),
                model: config.defaultModel,
                freeTier: providerInfo?.models.some(m => m.freeTier) || false,
            });
        }
        return providers;
    }
    /**
     * Set API key for a provider
     */
    setApiKey(provider, apiKey) {
        if (!this.providers.has(provider))
            return false;
        if (!this.userConfig.apiKeys) {
            this.userConfig.apiKeys = {};
        }
        this.userConfig.apiKeys[provider] = apiKey;
        this.saveUserConfig();
        return true;
    }
    /**
     * Get configuration directory
     */
    getConfigDir() {
        return this.configDir;
    }
    // ============================================================================
    // FALLBACK CHAIN: Free → Paid → Local
    // ============================================================================
    /**
     * Get all free tier models across providers
     */
    getFreeTierModels() {
        const freeModels = [];
        for (const [providerId, config] of this.providers) {
            const providerInfo = (0, registry_1.getProviderById)(providerId);
            if (!providerInfo)
                continue;
            for (const model of providerInfo.models) {
                if (model.freeTier) {
                    freeModels.push({
                        provider: providerId,
                        model: model.id,
                        name: `${providerInfo.name} ${model.name}`,
                    });
                }
            }
        }
        return freeModels;
    }
    /**
     * Get all configured (paid) providers
     */
    getConfiguredProviders() {
        const configured = [];
        for (const [providerId, config] of this.providers) {
            if (this.isProviderConfigured(providerId)) {
                configured.push(providerId);
            }
        }
        return configured;
    }
    /**
     * Get local providers (no API key required)
     */
    getLocalProviders() {
        const local = [];
        for (const [providerId, config] of this.providers) {
            if (!config.requiresApiKey) {
                local.push(providerId);
            }
        }
        return local;
    }
    /**
     * Try providers in fallback order: free → paid → local
     * Returns the first working provider response or an error
     */
    async chatWithFallback(messages, options) {
        // 1. Try free tier first
        const freeModels = this.getFreeTierModels();
        for (const fm of freeModels) {
            const apiKey = this.getApiKey(fm.provider);
            if (apiKey || !this.providers.get(fm.provider)?.requiresApiKey) {
                try {
                    const result = await this.chat(messages, { ...options, model: fm.model });
                    if (!result.content.includes('Error') && !result.content.includes('error')) {
                        return result;
                    }
                }
                catch {
                    // Continue to next provider
                }
            }
        }
        // 2. Try configured (paid) providers
        const configured = this.getConfiguredProviders();
        for (const providerId of configured) {
            if (this.providers.get(providerId)?.requiresApiKey) {
                try {
                    const result = await this.chat(messages, options);
                    if (!result.content.includes('Error') && !result.content.includes('error')) {
                        return result;
                    }
                }
                catch {
                    // Continue to next provider
                }
            }
        }
        // 3. Try local providers (Ollama, etc.)
        const local = this.getLocalProviders();
        for (const providerId of local) {
            try {
                const result = await this.chat(messages, options);
                if (!result.content.includes('Error') && !result.content.includes('error')) {
                    return result;
                }
            }
            catch {
                // Continue to next provider
            }
        }
        // All providers failed
        return {
            content: '[VIBE] All providers failed. Please configure an API key or start a local provider like Ollama.',
            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            model: options?.model || 'unknown',
            provider: 'none',
        };
    }
}
exports.VibeProviderRouter = VibeProviderRouter;
//# sourceMappingURL=router.js.map