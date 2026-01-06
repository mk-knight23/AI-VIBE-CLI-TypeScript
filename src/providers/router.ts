/**
 * VIBE-CLI v12 - Provider Router
 * Universal interface for AI providers (OpenAI, Anthropic, Google, xAI, Ollama)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { ProviderConfig, ProviderResponse, IProviderRouter } from '../types';
import { PROVIDER_REGISTRY, getProviderById, getProviderByModel } from './registry';

interface UserConfig {
  provider?: string;
  model?: string;
  apiKeys?: Record<string, string>;
}

export class VibeProviderRouter implements IProviderRouter {
  private providers: Map<string, ProviderConfig>;
  private defaultProvider: string = 'minimax';
  private currentProvider: string = 'minimax';
  private currentModel: string = 'MiniMax-M2.1';
  private userConfig: UserConfig = {};
  private configDir: string;

  constructor() {
    this.providers = new Map();
    this.configDir = path.join(os.homedir(), '.vibe');
    this.initializeProviders();
    this.loadUserConfig();
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

  private saveUserConfig(): void {
    const configPath = path.join(this.configDir, 'config.json');
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(this.userConfig, null, 2));
  }

  private getApiKey(provider: string): string | undefined {
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
  async chat(
    messages: Array<{ role: string; content: string }>,
    options?: { model?: string; temperature?: number; maxTokens?: number }
  ): Promise<ProviderResponse> {
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
    } catch (error) {
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
  private async callMiniMax(
    messages: Array<{ role: string; content: string }>,
    model: string,
    apiKey?: string
  ): Promise<ProviderResponse> {
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

  private async callOpenAI(
    messages: Array<{ role: string; content: string }>,
    model: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<ProviderResponse> {
    const apiKey = this.getApiKey('openai');
    if (!apiKey) throw new Error('OpenAI API key not set');

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
    model: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<ProviderResponse> {
    const apiKey = this.getApiKey('anthropic');
    if (!apiKey) throw new Error('Anthropic API key not set');

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

  private async callGoogle(
    messages: Array<{ role: string; content: string }>,
    model: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<ProviderResponse> {
    const apiKey = this.getApiKey('google');
    if (!apiKey) throw new Error('Google API key not set');

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
    model: string,
    _options?: { temperature?: number; maxTokens?: number }
  ): Promise<ProviderResponse> {
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

  private async callOpenAICompatible(
    messages: Array<{ role: string; content: string }>,
    model: string,
    baseUrl: string,
    apiKey?: string,
    provider?: string
  ): Promise<ProviderResponse> {
    // OpenRouter requires specific headers
    const headers: Record<string, string> = {
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
  async complete(prompt: string): Promise<ProviderResponse> {
    const messages = [{ role: 'user', content: prompt }];
    return this.chat(messages);
  }

  /**
   * Stream chat completion
   */
  async *streamChat(
    messages: Array<{ role: string; content: string }>,
    options?: { model?: string; temperature?: number }
  ): AsyncGenerator<string> {
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

  private async *streamOpenAI(
    messages: Array<{ role: string; content: string }>,
    model: string,
    apiKey?: string,
    temperature?: number
  ): AsyncGenerator<string> {
    if (!apiKey) throw new Error('OpenAI API key not set');

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
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  }

  private async *streamAnthropic(
    messages: Array<{ role: string; content: string }>,
    model: string,
    apiKey?: string,
    temperature?: number
  ): AsyncGenerator<string> {
    if (!apiKey) throw new Error('Anthropic API key not set');

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
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta.type === 'text_delta') {
              yield parsed.delta.text;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  }

  /**
   * Select model for task - implements IProviderRouter
   */
  selectModel(task: string): string {
    const taskLower = task.toLowerCase();

    // Check for specific model requests
    if (taskLower.includes('sonnet')) return 'claude-sonnet-4-20250514';
    if (taskLower.includes('opus') || taskLower.includes('best')) return 'claude-opus-4-20250514';
    if (taskLower.includes('haiku')) return 'claude-haiku-3-20250514';
    if (taskLower.includes('gpt-4o')) return 'gpt-4o';
    if (taskLower.includes('mini') || taskLower.includes('fast')) return 'gpt-4o-mini';
    if (taskLower.includes('o1') || taskLower.includes('reason')) return 'o1';
    if (taskLower.includes('gemini')) return 'gemini-1.5-flash';
    if (taskLower.includes('llama')) return 'llama3.1';
    if (taskLower.includes('ollama') || taskLower.includes('local')) return 'llama3.1';

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
  getStatus(): { provider: string; model: string; available: number; configured: number } {
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
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is configured
   */
  isProviderConfigured(provider: string): boolean {
    const config = this.providers.get(provider);
    if (!config) return false;

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
  setProvider(provider: string): boolean {
    // Handle "use X" style input
    const normalized = provider.toLowerCase().replace(/\s+/g, '');

    // Map common names to provider IDs
    const providerMap: Record<string, string> = {
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
      this.currentModel = this.providers.get(providerId)!.defaultModel;
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
  setModel(model: string): boolean {
    // Check if it's a model ID in any provider
    const providerInfo = getProviderByModel(model);
    if (providerInfo) {
      this.currentProvider = providerInfo.id;
      this.currentModel = model;
      this.userConfig.provider = providerInfo.id;
      this.userConfig.model = model;
      this.saveUserConfig();
      return true;
    }

    // Check if it's a model ID in current provider
    for (const m of PROVIDER_REGISTRY) {
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
  getProvider(provider: string): ProviderConfig | undefined {
    return this.providers.get(provider);
  }

  /**
   * Get current provider info
   */
  getCurrentProvider(): ProviderConfig | undefined {
    return this.providers.get(this.currentProvider);
  }

  /**
   * Get current model
   */
  getCurrentModel(): string {
    return this.currentModel;
  }

  /**
   * List all providers
   */
  listProviders(): Array<{ id: string; name: string; configured: boolean; model: string; freeTier: boolean }> {
    const providers: Array<{ id: string; name: string; configured: boolean; model: string; freeTier: boolean }> = [];
    for (const [id, config] of this.providers) {
      const providerInfo = getProviderById(id);
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
  setApiKey(provider: string, apiKey: string): boolean {
    if (!this.providers.has(provider)) return false;

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
  getConfigDir(): string {
    return this.configDir;
  }

  // ============================================================================
  // FALLBACK CHAIN: Free → Paid → Local
  // ============================================================================

  /**
   * Get all free tier models across providers
   */
  getFreeTierModels(): Array<{ provider: string; model: string; name: string }> {
    const freeModels: Array<{ provider: string; model: string; name: string }> = [];

    for (const [providerId, config] of this.providers) {
      const providerInfo = getProviderById(providerId);
      if (!providerInfo) continue;

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
  getConfiguredProviders(): string[] {
    const configured: string[] = [];
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
  getLocalProviders(): string[] {
    const local: string[] = [];
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
  async chatWithFallback(
    messages: Array<{ role: string; content: string }>,
    options?: { model?: string; temperature?: number; maxTokens?: number }
  ): Promise<ProviderResponse> {
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
        } catch {
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
        } catch {
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
      } catch {
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
