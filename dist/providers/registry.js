"use strict";
/**
 * VIBE CLI v12 - Provider Registry
 *
 * Unified provider router supporting 20+ LLM providers.
 * Each provider is configured with:
 * - API endpoint
 * - Available models
 * - Capabilities (completion, reasoning, etc.)
 * - Free tier availability
 *
 * Version: 12.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROVIDER_REGISTRY = void 0;
exports.getProviderById = getProviderById;
exports.getProviderByModel = getProviderByModel;
exports.getModelsByTier = getModelsByTier;
exports.getFreeTierModels = getFreeTierModels;
exports.listProviders = listProviders;
// ============================================================================
// PROVIDER REGISTRY
// ============================================================================
exports.PROVIDER_REGISTRY = [
    // === MINIMAX (DEFAULT) ===
    {
        id: 'minimax',
        name: 'MiniMax',
        baseUrl: 'https://api.minimax.io/v1',
        apiKeyEnv: 'MINIMAX_API_KEY',
        models: [
            { id: 'MiniMax-M2.1', name: 'MiniMax-M2.1', contextWindow: 200000, maxOutput: 16384, capabilities: ['completion', 'reasoning', 'function-calling'], freeTier: false, tier: 'balanced' },
            { id: 'MiniMax-M2.0', name: 'MiniMax-M2.0', contextWindow: 200000, maxOutput: 8192, capabilities: ['completion', 'reasoning'], freeTier: false, tier: 'balanced' },
            { id: 'MiniMax-M1', name: 'MiniMax-M1', contextWindow: 128000, maxOutput: 4096, capabilities: ['completion'], freeTier: false, tier: 'fast' },
        ],
        defaultModel: 'MiniMax-M2.1',
        requiresApiKey: true,
    },
    // === OPENAI ===
    {
        id: 'openai',
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        apiKeyEnv: 'OPENAI_API_KEY',
        models: [
            { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000, maxOutput: 16384, capabilities: ['completion', 'vision', 'function-calling'], freeTier: false, tier: 'balanced' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000, maxOutput: 16384, capabilities: ['completion'], freeTier: false, tier: 'fast' },
            { id: 'o1', name: 'o1', contextWindow: 200000, maxOutput: 100000, capabilities: ['reasoning'], freeTier: false, tier: 'max' },
            { id: 'o1-mini', name: 'o1 Mini', contextWindow: 128000, maxOutput: 65536, capabilities: ['reasoning'], freeTier: false, tier: 'reasoning' },
        ],
        defaultModel: 'gpt-4o',
        requiresApiKey: true,
    },
    // === ANTHROPIC ===
    {
        id: 'anthropic',
        name: 'Anthropic',
        baseUrl: 'https://api.anthropic.com/v1',
        apiKeyEnv: 'ANTHROPIC_API_KEY',
        models: [
            { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', contextWindow: 200000, maxOutput: 8192, capabilities: ['completion', 'reasoning', 'vision'], freeTier: false, tier: 'balanced' },
            { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', contextWindow: 200000, maxOutput: 8192, capabilities: ['completion', 'reasoning'], freeTier: false, tier: 'max' },
            { id: 'claude-haiku-3-20250514', name: 'Claude Haiku 3', contextWindow: 200000, maxOutput: 8192, capabilities: ['completion'], freeTier: false, tier: 'fast' },
        ],
        defaultModel: 'claude-sonnet-4-20250514',
        requiresApiKey: true,
    },
    // === GOOGLE (GEMINI) ===
    {
        id: 'google',
        name: 'Google',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        apiKeyEnv: 'GOOGLE_API_KEY',
        models: [
            { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', contextWindow: 1000000, maxOutput: 8192, capabilities: ['completion', 'vision'], freeTier: true, tier: 'fast' },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', contextWindow: 2000000, maxOutput: 8192, capabilities: ['completion', 'reasoning', 'vision'], freeTier: true, tier: 'balanced' },
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', contextWindow: 1000000, maxOutput: 8192, capabilities: ['completion', 'vision'], freeTier: true, tier: 'fast' },
        ],
        defaultModel: 'gemini-1.5-flash',
        requiresApiKey: true,
    },
    // === XAI (GROK) ===
    {
        id: 'xai',
        name: 'xAI (Grok)',
        baseUrl: 'https://api.x.ai/v1',
        apiKeyEnv: 'XAI_API_KEY',
        models: [
            { id: 'grok-2', name: 'Grok 2', contextWindow: 131072, maxOutput: 8192, capabilities: ['completion', 'reasoning'], freeTier: false, tier: 'balanced' },
            { id: 'grok-2-latest', name: 'Grok 2 Latest', contextWindow: 131072, maxOutput: 8192, capabilities: ['completion', 'reasoning'], freeTier: false, tier: 'balanced' },
        ],
        defaultModel: 'grok-2',
        requiresApiKey: true,
    },
    // === MISTRAL ===
    {
        id: 'mistral',
        name: 'Mistral AI',
        baseUrl: 'https://api.mistral.ai/v1',
        apiKeyEnv: 'MISTRAL_API_KEY',
        models: [
            { id: 'mistral-large-latest', name: 'Mistral Large', contextWindow: 128000, maxOutput: 32768, capabilities: ['completion', 'reasoning'], freeTier: false, tier: 'balanced' },
            { id: 'mistral-small-latest', name: 'Mistral Small', contextWindow: 128000, maxOutput: 32768, capabilities: ['completion'], freeTier: false, tier: 'fast' },
            { id: 'open-mistral-7b', name: 'Mistral 7B', contextWindow: 32768, maxOutput: 8192, capabilities: ['completion'], freeTier: false, tier: 'fast' },
            { id: 'open-mixtral-8x7b', name: 'Mixtral 8x7B', contextWindow: 32768, maxOutput: 8192, capabilities: ['completion'], freeTier: false, tier: 'balanced' },
        ],
        defaultModel: 'mistral-small-latest',
        requiresApiKey: true,
    },
    // === COHERE ===
    {
        id: 'cohere',
        name: 'Cohere',
        baseUrl: 'https://api.cohere.ai/v1',
        apiKeyEnv: 'COHERE_API_KEY',
        models: [
            { id: 'command-r-plus', name: 'Command R+', contextWindow: 128000, maxOutput: 4096, capabilities: ['completion', 'reasoning'], freeTier: false, tier: 'balanced' },
            { id: 'command-r', name: 'Command R', contextWindow: 128000, maxOutput: 4096, capabilities: ['completion', 'reasoning'], freeTier: false, tier: 'fast' },
            { id: 'command', name: 'Command', contextWindow: 4096, maxOutput: 4096, capabilities: ['completion'], freeTier: false, tier: 'fast' },
        ],
        defaultModel: 'command-r',
        requiresApiKey: true,
    },
    // === AI21 ===
    {
        id: 'ai21',
        name: 'AI21 Labs',
        baseUrl: 'https://api.ai21.com/studio/v1',
        apiKeyEnv: 'AI21_API_KEY',
        models: [
            { id: 'jamba-1-5-large', name: 'Jamba 1.5 Large', contextWindow: 256000, maxOutput: 8192, capabilities: ['completion', 'reasoning'], freeTier: false, tier: 'balanced' },
            { id: 'jamba-1-5-mini', name: 'Jamba 1.5 Mini', contextWindow: 256000, maxOutput: 8192, capabilities: ['completion'], freeTier: false, tier: 'fast' },
        ],
        defaultModel: 'jamba-1.5-mini',
        requiresApiKey: true,
    },
    // === PERPLEXITY ===
    {
        id: 'perplexity',
        name: 'Perplexity',
        baseUrl: 'https://api.perplexity.ai/chat/completions',
        apiKeyEnv: 'PERPLEXITY_API_KEY',
        models: [
            { id: 'sonar-pro', name: 'Sonar Pro', contextWindow: 16384, maxOutput: 8192, capabilities: ['completion'], freeTier: false, tier: 'balanced' },
            { id: 'sonar', name: 'Sonar', contextWindow: 16384, maxOutput: 8192, capabilities: ['completion'], freeTier: false, tier: 'fast' },
        ],
        defaultModel: 'sonar',
        requiresApiKey: true,
    },
    // === DEEPSEEK ===
    {
        id: 'deepseek',
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1',
        apiKeyEnv: 'DEEPSEEK_API_KEY',
        models: [
            { id: 'deepseek-chat', name: 'DeepSeek Chat', contextWindow: 128000, maxOutput: 4096, capabilities: ['completion', 'reasoning'], freeTier: false, tier: 'fast' },
            { id: 'deepseek-coder', name: 'DeepSeek Coder', contextWindow: 128000, maxOutput: 4096, capabilities: ['completion'], freeTier: false, tier: 'fast' },
        ],
        defaultModel: 'deepseek-chat',
        requiresApiKey: true,
    },
    // === QWEN (ALIBABA) ===
    {
        id: 'qwen',
        name: 'Qwen (Alibaba)',
        baseUrl: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        apiKeyEnv: 'DASHSCOPE_API_KEY',
        models: [
            { id: 'qwen-plus', name: 'Qwen Plus', contextWindow: 131072, maxOutput: 8192, capabilities: ['completion', 'reasoning'], freeTier: false, tier: 'balanced' },
            { id: 'qwen-turbo', name: 'Qwen Turbo', contextWindow: 131072, maxOutput: 8192, capabilities: ['completion'], freeTier: false, tier: 'fast' },
            { id: 'qwen-max', name: 'Qwen Max', contextWindow: 16384, maxOutput: 8192, capabilities: ['completion', 'reasoning'], freeTier: false, tier: 'max' },
        ],
        defaultModel: 'qwen-plus',
        requiresApiKey: true,
    },
    // === META (LLAMA) ===
    {
        id: 'meta',
        name: 'Meta (Llama)',
        baseUrl: 'https://api.together.xyz/v1',
        apiKeyEnv: 'TOGETHER_API_KEY',
        models: [
            { id: 'Meta-Llama-3.1-405B-Instruct', name: 'Llama 3.1 405B', contextWindow: 131072, maxOutput: 8192, capabilities: ['completion', 'reasoning'], freeTier: false, tier: 'max' },
            { id: 'Meta-Llama-3.1-70B-Instruct', name: 'Llama 3.1 70B', contextWindow: 131072, maxOutput: 4096, capabilities: ['completion'], freeTier: false, tier: 'balanced' },
            { id: 'Meta-Llama-3.1-8B-Instruct', name: 'Llama 3.1 8B', contextWindow: 131072, maxOutput: 2048, capabilities: ['completion'], freeTier: false, tier: 'fast' },
        ],
        defaultModel: 'Meta-Llama-3.1-70B-Instruct',
        requiresApiKey: true,
    },
    // === TOGETHER ===
    {
        id: 'together',
        name: 'Together AI',
        baseUrl: 'https://api.together.xyz/v1',
        apiKeyEnv: 'TOGETHER_API_KEY',
        models: [
            { id: 'togethercomputer/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', contextWindow: 131072, maxOutput: 8192, capabilities: ['completion', 'reasoning'], freeTier: false, tier: 'balanced' },
            { id: 'togethercomputer/Qwen-72B', name: 'Qwen 72B', contextWindow: 32768, maxOutput: 4096, capabilities: ['completion'], freeTier: false, tier: 'balanced' },
        ],
        defaultModel: 'togethercomputer/llama-3.3-70b-instruct',
        requiresApiKey: true,
    },
    // === GROQ ===
    {
        id: 'groq',
        name: 'Groq',
        baseUrl: 'https://api.groq.com/v1',
        apiKeyEnv: 'GROQ_API_KEY',
        models: [
            { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', contextWindow: 131072, maxOutput: 8192, capabilities: ['completion'], freeTier: false, tier: 'fast' },
            { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', contextWindow: 32768, maxOutput: 8192, capabilities: ['completion'], freeTier: false, tier: 'fast' },
            { id: 'gemma-7b-it', name: 'Gemma 7B', contextWindow: 8192, maxOutput: 4096, capabilities: ['completion'], freeTier: false, tier: 'fast' },
        ],
        defaultModel: 'llama-3.3-70b-versatile',
        requiresApiKey: true,
    },
    // === FIREWORKS ===
    {
        id: 'fireworks',
        name: 'Fireworks AI',
        baseUrl: 'https://api.fireworks.ai/inference/v1',
        apiKeyEnv: 'FIREWORKS_API_KEY',
        models: [
            { id: 'accounts/fireworks/models/llama-v3p1-405b-instruct', name: 'Llama 3.1 405B', contextWindow: 131072, maxOutput: 8192, capabilities: ['completion', 'reasoning'], freeTier: false, tier: 'max' },
            { id: 'accounts/fireworks/models/llama-v3p1-70b-instruct', name: 'Llama 3.1 70B', contextWindow: 131072, maxOutput: 4096, capabilities: ['completion'], freeTier: false, tier: 'balanced' },
        ],
        defaultModel: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
        requiresApiKey: true,
    },
    // === AZURE OPENAI ===
    {
        id: 'azure',
        name: 'Azure OpenAI',
        baseUrl: '', // Set per deployment
        apiKeyEnv: 'AZURE_OPENAI_API_KEY',
        models: [
            { id: 'gpt-4o', name: 'GPT-4o (Azure)', contextWindow: 128000, maxOutput: 16384, capabilities: ['completion', 'vision', 'function-calling'], freeTier: false, tier: 'balanced' },
            { id: 'gpt-4', name: 'GPT-4 (Azure)', contextWindow: 8192, maxOutput: 4096, capabilities: ['completion', 'reasoning'], freeTier: false, tier: 'max' },
        ],
        defaultModel: 'gpt-4o',
        requiresApiKey: true,
    },
    // === AWS BEDROCK ===
    {
        id: 'bedrock',
        name: 'AWS Bedrock',
        baseUrl: '', // AWS SDK handles this
        apiKeyEnv: 'AWS_ACCESS_KEY_ID',
        models: [
            { id: 'anthropic.claude-sonnet-4-20250514-v1:0', name: 'Claude Sonnet 4 (Bedrock)', contextWindow: 200000, maxOutput: 8192, capabilities: ['completion', 'reasoning', 'vision'], freeTier: false, tier: 'balanced' },
            { id: 'anthropic.claude-opus-4-20250514-v1:0', name: 'Claude Opus 4 (Bedrock)', contextWindow: 200000, maxOutput: 8192, capabilities: ['completion', 'reasoning'], freeTier: false, tier: 'max' },
            { id: 'amazon.titan-text-express-v1', name: 'Titan Text Express', contextWindow: 8192, maxOutput: 4096, capabilities: ['completion'], freeTier: false, tier: 'fast' },
        ],
        defaultModel: 'anthropic.claude-sonnet-4-20250514-v1:0',
        requiresApiKey: true,
    },
    // === HUGGINGFACE ===
    {
        id: 'huggingface',
        name: 'HuggingFace Inference',
        baseUrl: 'https://api-inference.huggingface.co/models',
        apiKeyEnv: 'HF_TOKEN',
        models: [
            { id: 'meta-llama/Meta-Llama-3.1-405B-Instruct', name: 'Llama 3.1 405B', contextWindow: 131072, maxOutput: 4096, capabilities: ['completion', 'reasoning'], freeTier: true, tier: 'max' },
            { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct', name: 'Llama 3.1 70B', contextWindow: 131072, maxOutput: 2048, capabilities: ['completion'], freeTier: true, tier: 'balanced' },
            { id: 'mistralai/Mistral-7B-Instruct-v0.2', name: 'Mistral 7B', contextWindow: 32768, maxOutput: 2048, capabilities: ['completion'], freeTier: true, tier: 'fast' },
        ],
        defaultModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
        requiresApiKey: true,
    },
    // === OLLAMA (LOCAL) ===
    {
        id: 'ollama',
        name: 'Ollama (Local)',
        baseUrl: 'http://localhost:11434/v1',
        apiKeyEnv: '', // No API key needed for local
        models: [
            { id: 'llama3.1', name: 'Llama 3.1', contextWindow: 131072, maxOutput: 8192, capabilities: ['completion', 'reasoning'], freeTier: true, tier: 'balanced' },
            { id: 'llama3', name: 'Llama 3', contextWindow: 8192, maxOutput: 4096, capabilities: ['completion'], freeTier: true, tier: 'fast' },
            { id: 'codellama', name: 'Code Llama', contextWindow: 16384, maxOutput: 4096, capabilities: ['completion'], freeTier: true, tier: 'fast' },
            { id: 'mistral', name: 'Mistral', contextWindow: 32768, maxOutput: 8192, capabilities: ['completion'], freeTier: true, tier: 'fast' },
            { id: 'qwen2.5-coder', name: 'Qwen 2.5 Coder', contextWindow: 32768, maxOutput: 8192, capabilities: ['completion'], freeTier: true, tier: 'fast' },
        ],
        defaultModel: 'llama3.1',
        requiresApiKey: false,
    },
    // === OPENROUTER ===
    {
        id: 'openrouter',
        name: 'OpenRouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKeyEnv: 'OPENROUTER_API_KEY',
        models: [
            { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4 (OR)', contextWindow: 200000, maxOutput: 8192, capabilities: ['completion', 'reasoning'], freeTier: false, tier: 'balanced' },
            { id: 'openai/gpt-4o', name: 'GPT-4o (OR)', contextWindow: 128000, maxOutput: 16384, capabilities: ['completion', 'vision'], freeTier: false, tier: 'balanced' },
            { id: 'google/gemini-1.5-flash', name: 'Gemini 1.5 Flash (OR)', contextWindow: 1000000, maxOutput: 8192, capabilities: ['completion', 'vision'], freeTier: true, tier: 'fast' },
        ],
        defaultModel: 'anthropic/claude-sonnet-4',
        requiresApiKey: true,
    },
];
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function getProviderById(id) {
    return exports.PROVIDER_REGISTRY.find(p => p.id === id);
}
function getProviderByModel(modelId) {
    return exports.PROVIDER_REGISTRY.find(p => p.models.some(m => m.id === modelId));
}
function getModelsByTier(tier) {
    const result = [];
    for (const provider of exports.PROVIDER_REGISTRY) {
        for (const model of provider.models) {
            if (model.tier === tier) {
                result.push({ provider: provider.id, model });
            }
        }
    }
    return result;
}
function getFreeTierModels() {
    return getModelsByTier('fast').filter(m => m.model.freeTier);
}
function listProviders() {
    return exports.PROVIDER_REGISTRY.map(p => ({
        id: p.id,
        name: p.name,
        requiresApiKey: p.requiresApiKey,
    }));
}
//# sourceMappingURL=registry.js.map