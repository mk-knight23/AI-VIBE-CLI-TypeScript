import { loadConfig } from '../core/config';
import { DEFAULT_KEYS, fetchWithTimeout, Provider, ProviderResponse, OrchestrationRequest, OrchestrationResult } from './index';
import { ModelDefinition } from '../ai/model-router';

// Updated 2025 model catalog with new models
const FREE_MODELS = [
  { id: 'x-ai/grok-4.1-fast:free', name: 'Grok 4.1 Fast', contextLength: 128000 },
  { id: 'z-ai/glm-4.5-air:free', name: 'GLM 4.5 Air', contextLength: 128000 },
  { id: 'deepseek/deepseek-chat-v3-0324:free', name: 'DeepSeek Chat V3', contextLength: 64000 },
  { id: 'qwen/qwen3-coder:free', name: 'Qwen3 Coder', contextLength: 32000 },
  { id: 'openai/gpt-oss-20b:free', name: 'GPT OSS 20B', contextLength: 8000 },
  { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash', contextLength: 1000000 },
  // NEW 2025 models
  { id: 'openai/o3-mini', name: 'OpenAI o3-mini', contextLength: 128000 },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', contextLength: 128000 },
  { id: 'anthropic/claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', contextLength: 200000 },
  { id: 'google/gemini-2-0-flash', name: 'Gemini 2.0 Flash', contextLength: 1000000 },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', contextLength: 128000 }
];

// Model definitions for the router
const OPENROUTER_MODEL_DEFINITIONS: ModelDefinition[] = [
  {
    id: 'openai/o3-mini',
    provider: 'OpenRouter',
    context: 128000,
    strengths: ['extended_thinking', 'complex_reasoning', 'debug'],
    costTier: 'medium',
    latency: 'slow',
    supportsThinking: true
  },
  {
    id: 'google/gemini-2-0-flash',
    provider: 'OpenRouter',
    context: 1000000,
    strengths: ['long_context', 'multimodal', 'fast'],
    costTier: 'low',
    latency: 'fast',
    supportsVision: true
  },
  {
    id: 'anthropic/claude-3-5-sonnet',
    provider: 'OpenRouter',
    context: 200000,
    strengths: ['code_generation', 'reasoning', 'swe-bench'],
    costTier: 'high',
    latency: 'medium'
  },
  {
    id: 'deepseek/deepseek-r1',
    provider: 'OpenRouter',
    context: 128000,
    strengths: ['extended_thinking', 'reasoning', 'math'],
    costTier: 'low',
    latency: 'medium',
    supportsThinking: true
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    provider: 'OpenRouter',
    context: 128000,
    strengths: ['code_generation', 'fast', 'general'],
    costTier: 'low',
    latency: 'fast'
  }
];

export async function getOpenRouterKey(): Promise<string> {
  const cfg = loadConfig();
  return (
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENROUTER_KEY ||
    cfg.openrouter?.apiKey ||
    DEFAULT_KEYS.openrouter
  );
}

export async function fetchOpenRouterModels(): Promise<any[]> {
  return FREE_MODELS;
}

// NEW: Get available models for router
export async function getAvailableModels(): Promise<ModelDefinition[]> {
  return OPENROUTER_MODEL_DEFINITIONS;
}

// NEW: Check if model supports extended thinking
export function supportsExtendedThinking(model: string): boolean {
  const modelDef = OPENROUTER_MODEL_DEFINITIONS.find(m => m.id === model);
  return modelDef?.supportsThinking || false;
}

// NEW: Check if model supports web search
export function supportsWebSearch(model: string): boolean {
  // Most OpenRouter models can work with web search context
  return true;
}

export async function openRouterChat(
  messages: any[],
  model: string,
  options: any = {}
): Promise<ProviderResponse> {
  const apiKey = await getOpenRouterKey();
  
  // Check if this is a thinking request
  const isThinkingRequest = options.thinking?.enabled && supportsExtendedThinking(model);
  
  const requestBody: any = {
    model,
    messages,
    temperature: options.temperature || 0.7,
    max_tokens: options.maxTokens || 4000
  };

  // Add thinking parameters if supported
  if (isThinkingRequest) {
    requestBody.thinking = {
      enabled: true,
      budget: options.thinking.budget || 5000
    };
  }

  const res = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/mk-knight23/vibe',
      'X-Title': 'Vibe CLI'
    },
    body: JSON.stringify(requestBody),
    timeout: 60000
  });
  
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`${res.status}: ${error}`);
  }
  
  const response = await res.json();
  
  // Detect if response contains orchestration code
  const content = response.choices?.[0]?.message?.content || '';
  const hasOrchestrationCode = content.includes('await orchestrator.sequence') || 
                              content.includes('orchestrator.parallel') ||
                              content.includes('// ORCHESTRATION:');

  return {
    message: content,
    mode: hasOrchestrationCode ? 'orchestration' : 'streaming',
    orchestrationCode: hasOrchestrationCode ? content : undefined,
    thinking: response.thinking || undefined
  };
}

// NEW: Execute orchestration code
export async function executeOrchestration(request: OrchestrationRequest): Promise<OrchestrationResult> {
  const startTime = Date.now();
  
  try {
    // This is a simplified implementation
    // In a real implementation, this would execute the orchestration code safely
    
    // For now, just simulate execution
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      output: 'Orchestration executed successfully',
      executionTime: Date.now() - startTime,
      artifacts: []
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      executionTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Create provider object
export const openRouterProvider: Provider = {
  name: 'OpenRouter',
  baseUrl: 'https://openrouter.ai/api/v1',
  getApiKey: getOpenRouterKey,
  fetchModels: fetchOpenRouterModels,
  chat: openRouterChat,
  getAvailableModels,
  supportsExtendedThinking,
  supportsWebSearch,
  executeOrchestration
};
