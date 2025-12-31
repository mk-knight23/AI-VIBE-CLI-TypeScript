/**
 * Universal AI Runtime
 * Single entry point for ALL AI requests in VIBE CLI
 * No provider-specific logic - config-driven only
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// ============================================
// TYPES
// ============================================

export type Task = 'chat' | 'code' | 'debug' | 'agent' | 'vision';

export interface AIRequest {
  task: Task;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  tools?: any[];
}

export interface AIResponse {
  content: string;
  model: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  toolCalls?: any[];
}

interface ModelConfig {
  id: string;
  task: Task;
  free: boolean;
}

interface ProviderConfig {
  id: string;
  base_url: string;
  auth: { type: 'bearer' | 'none'; env?: string };
  priority: number;
  models: ModelConfig[];
}

interface RuntimeConfig {
  mode: 'free-first' | 'paid-first' | 'any';
  timeout_ms: number;
  retry: number;
  fallback: boolean;
}

interface AIConfig {
  runtime: RuntimeConfig;
  providers: ProviderConfig[];
}

// ============================================
// CONFIG LOADING
// ============================================

let cachedConfig: AIConfig | null = null;

function loadConfig(): AIConfig {
  if (cachedConfig) return cachedConfig;
  
  const configPaths = [
    join(process.cwd(), 'vibe.config.ai.json'),
    join(__dirname, '../../vibe.config.ai.json'),
    join(__dirname, '../../../vibe.config.ai.json')
  ];
  
  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      const raw = readFileSync(configPath, 'utf-8');
      cachedConfig = JSON.parse(raw);
      return cachedConfig!;
    }
  }
  
  // Default minimal config
  cachedConfig = {
    runtime: { mode: 'free-first', timeout_ms: 45000, retry: 2, fallback: true },
    providers: [{
      id: 'openrouter',
      base_url: 'https://openrouter.ai/api/v1',
      auth: { type: 'bearer', env: 'OPENROUTER_API_KEY' },
      priority: 1,
      models: [
        { id: 'z-ai/glm-4.5-air:free', task: 'chat', free: true },
        { id: 'qwen/qwen3-coder:free', task: 'code', free: true },
        { id: 'deepseek/deepseek-r1-0528:free', task: 'agent', free: true },
        { id: 'deepseek/deepseek-r1-0528:free', task: 'debug', free: true }
      ]
    }]
  };
  return cachedConfig;
}

// ============================================
// MODEL RESOLUTION
// ============================================

interface ResolvedModel {
  provider: ProviderConfig;
  model: ModelConfig;
}

function resolveModel(task: Task, preferFree: boolean): ResolvedModel[] {
  const config = loadConfig();
  const candidates: ResolvedModel[] = [];
  
  // Sort providers by priority
  const sortedProviders = [...config.providers].sort((a, b) => a.priority - b.priority);
  
  for (const provider of sortedProviders) {
    const taskModels = provider.models.filter(m => m.task === task);
    for (const model of taskModels) {
      candidates.push({ provider, model });
    }
  }
  
  // Sort: free first if preferFree, then by provider priority
  if (preferFree) {
    candidates.sort((a, b) => {
      if (a.model.free && !b.model.free) return -1;
      if (!a.model.free && b.model.free) return 1;
      return a.provider.priority - b.provider.priority;
    });
  }
  
  return candidates;
}

// ============================================
// API CALL
// ============================================

function getApiKey(provider: ProviderConfig): string | undefined {
  if (provider.auth.type === 'none') return undefined;
  if (provider.auth.env) return process.env[provider.auth.env];
  return undefined;
}

async function callProvider(
  provider: ProviderConfig,
  model: string,
  request: AIRequest
): Promise<AIResponse> {
  const apiKey = getApiKey(provider);
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  
  // OpenRouter-specific headers
  if (provider.id === 'openrouter') {
    headers['HTTP-Referer'] = 'https://vibe-cli.dev';
    headers['X-Title'] = 'VIBE CLI';
  }
  
  const body: any = {
    model,
    messages: request.messages,
    temperature: request.temperature ?? 0.7,
    max_tokens: request.maxTokens ?? 4096,
    stream: request.stream ?? false
  };
  
  if (request.tools?.length) {
    body.tools = request.tools;
  }
  
  const url = `${provider.base_url}/chat/completions`;
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), loadConfig().runtime.timeout_ms);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 200)}`);
    }
    
    if (request.stream) {
      return handleStream(response, model);
    }
    
    const data = await response.json();
    return parseResponse(data, model);
  } finally {
    clearTimeout(timeout);
  }
}

function parseResponse(data: any, model: string): AIResponse {
  const choice = data.choices?.[0];
  return {
    content: choice?.message?.content || '',
    model: data.model || model,
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens || 0,
      completionTokens: data.usage.completion_tokens || 0,
      totalTokens: data.usage.total_tokens || 0
    } : undefined,
    toolCalls: choice?.message?.tool_calls
  };
}

async function handleStream(response: Response, model: string): Promise<AIResponse> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');
  
  const decoder = new TextDecoder();
  let content = '';
  let toolCalls: any[] = [];
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
    
    for (const line of lines) {
      const data = line.slice(6);
      if (data === '[DONE]') continue;
      
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta;
        if (delta?.content) {
          content += delta.content;
          process.stdout.write(delta.content);
        }
        if (delta?.tool_calls) {
          toolCalls.push(...delta.tool_calls);
        }
      } catch {}
    }
  }
  
  return { content, model, toolCalls: toolCalls.length ? toolCalls : undefined };
}

// ============================================
// MAIN ENTRY POINT
// ============================================

export class UniversalAI {
  /**
   * Run an AI request - the ONLY way to call AI in VIBE CLI
   */
  static async run(request: AIRequest): Promise<AIResponse> {
    const config = loadConfig();
    const preferFree = config.runtime.mode === 'free-first';
    const candidates = resolveModel(request.task, preferFree);
    
    if (candidates.length === 0) {
      throw new Error(`No model configured for task: ${request.task}`);
    }
    
    let lastError: Error = new Error('No providers available');
    const maxRetries = config.runtime.retry;
    
    for (const { provider, model } of candidates) {
      // Skip if no API key required but missing
      if (provider.auth.type === 'bearer' && !getApiKey(provider)) {
        continue;
      }
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await callProvider(provider, model.id, request);
        } catch (error: any) {
          lastError = error;
          
          // Don't retry on auth errors
          if (error.message.includes('401') || error.message.includes('403')) {
            break;
          }
          
          // Wait before retry
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          }
        }
      }
      
      // If fallback disabled, stop after first provider
      if (!config.runtime.fallback) break;
    }
    
    throw new Error('AI request failed. Please check your configuration.');
  }
  
  /**
   * Simple chat helper
   */
  static async chat(prompt: string, options?: Partial<AIRequest>): Promise<string> {
    const response = await this.run({
      task: 'chat',
      messages: [{ role: 'user', content: prompt }],
      ...options
    });
    return response.content;
  }
  
  /**
   * Code generation helper
   */
  static async code(prompt: string, options?: Partial<AIRequest>): Promise<string> {
    const response = await this.run({
      task: 'code',
      messages: [{ role: 'user', content: prompt }],
      ...options
    });
    return response.content;
  }
  
  /**
   * Agent/planning helper
   */
  static async agent(prompt: string, systemPrompt?: string, options?: Partial<AIRequest>): Promise<AIResponse> {
    const messages: AIRequest['messages'] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });
    
    return this.run({ task: 'agent', messages, ...options });
  }
  
  /**
   * Get available models for a task
   */
  static getModels(task?: Task): Array<{ id: string; task: Task; free: boolean; provider: string }> {
    const config = loadConfig();
    const models: Array<{ id: string; task: Task; free: boolean; provider: string }> = [];
    
    for (const provider of config.providers) {
      for (const model of provider.models) {
        if (!task || model.task === task) {
          models.push({ ...model, provider: provider.id });
        }
      }
    }
    
    return models;
  }
  
  /**
   * Check if any provider is configured
   */
  static isConfigured(): boolean {
    const config = loadConfig();
    return config.providers.some(p => {
      if (p.auth.type === 'none') return true;
      if (p.auth.env) return !!process.env[p.auth.env];
      return false;
    });
  }
  
  /**
   * Reload config (for testing)
   */
  static reloadConfig(): void {
    cachedConfig = null;
  }
}

// Default export for convenience
export default UniversalAI;
