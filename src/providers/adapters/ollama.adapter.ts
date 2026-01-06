/**
 * VIBE CLI - Ollama Provider Adapter
 *
 * Local/offline model support via Ollama:
 * - OpenAI-compatible API
 * - No API key required
 * - Streaming support
 * - Model management
 *
 * Version: 13.0.0
 */

import {
  BaseProviderAdapter,
  ModelInfo,
  ProviderConfig,
  ProviderOptions,
  ProviderResponse,
  StreamCallback,
  ProviderError,
} from './base.adapter.js';

import type { ChatMessage } from '../../types.js';

// ============================================================================
// MODEL DEFINITIONS
// ============================================================================

const OLLAMA_MODELS: ModelInfo[] = [
  {
    id: 'llama3.1',
    name: 'Llama 3.1',
    contextWindow: 131072,
    maxOutput: 8192,
    capabilities: ['completion', 'reasoning'],
    freeTier: true,
    tier: 'balanced',
  },
  {
    id: 'llama3',
    name: 'Llama 3',
    contextWindow: 8192,
    maxOutput: 4096,
    capabilities: ['completion'],
    freeTier: true,
    tier: 'fast',
  },
  {
    id: 'codellama',
    name: 'Code Llama',
    contextWindow: 16384,
    maxOutput: 4096,
    capabilities: ['completion'],
    freeTier: true,
    tier: 'fast',
  },
  {
    id: 'mistral',
    name: 'Mistral',
    contextWindow: 32768,
    maxOutput: 8192,
    capabilities: ['completion'],
    freeTier: true,
    tier: 'fast',
  },
  {
    id: 'qwen2.5-coder',
    name: 'Qwen 2.5 Coder',
    contextWindow: 32768,
    maxOutput: 8192,
    capabilities: ['completion'],
    freeTier: true,
    tier: 'fast',
  },
  {
    id: 'deepseek-coder',
    name: 'DeepSeek Coder',
    contextWindow: 32768,
    maxOutput: 8192,
    capabilities: ['completion'],
    freeTier: true,
    tier: 'fast',
  },
  {
    id: 'starcoder2',
    name: 'StarCoder 2',
    contextWindow: 16384,
    maxOutput: 4096,
    capabilities: ['completion'],
    freeTier: true,
    tier: 'fast',
  },
];

const OLLAMA_CONFIG: ProviderConfig = {
  id: 'ollama',
  name: 'Ollama (Local)',
  baseUrl: 'http://localhost:11434/v1',
  apiKeyEnv: '', // No API key for local
  defaultModel: 'llama3.1',
  requiresApiKey: false,
};

// ============================================================================
// OLLAMA ADAPTER
// ============================================================================

export class OllamaAdapter extends BaseProviderAdapter {
  protected baseUrl: string;
  private healthCheckCache: Map<string, number> = new Map();

  constructor() {
    super(OLLAMA_CONFIG, OLLAMA_MODELS);
    this.baseUrl = process.env.OLLAMA_BASE_URL || OLLAMA_CONFIG.baseUrl;
  }

  /**
   * Chat completion
   */
  async chat(
    messages: ChatMessage[],
    options?: ProviderOptions
  ): Promise<ProviderResponse> {
    const startTime = Date.now();
    const model = options?.model || this.config.defaultModel;

    this.validateModel(model);

    const endpoint = `${this.baseUrl}/chat/completions`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: this.transformMessages(messages),
          stream: false,
          options: {
            temperature: options?.temperature ?? 0.7,
            num_predict: options?.maxTokens,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new ProviderError(
          `Ollama API error: ${error}`,
          this.config.id,
          model,
          response.status,
          response.status >= 500
        );
      }

      const data = await response.json();
      return this.parseResponse(data, model, Date.now() - startTime);

    } catch (error) {
      if (error instanceof ProviderError) throw error;
      throw new ProviderError(
        `Ollama request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.config.id,
        model,
        undefined,
        true
      );
    }
  }

  /**
   * Streaming chat completion
   */
  async *streamChat(
    messages: ChatMessage[],
    callback: StreamCallback,
    options?: ProviderOptions
  ): AsyncGenerator<void> {
    const model = options?.model || this.config.defaultModel;

    this.validateModel(model);

    const endpoint = `${this.baseUrl}/chat/completions`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: this.transformMessages(messages),
        stream: true,
        options: {
          temperature: options?.temperature ?? 0.7,
          num_predict: options?.maxTokens,
        },
      }),
    });

    if (!response.ok) {
      throw new ProviderError(
        `Ollama streaming failed: ${response.statusText}`,
        this.config.id,
        model,
        response.status
      );
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
            if (content) {
              callback(content, true);
            }
          } catch {
            // Skip parse errors
          }
        }
      }
    }
  }

  /**
   * Simple completion
   */
  async complete(
    prompt: string,
    options?: ProviderOptions
  ): Promise<ProviderResponse> {
    const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
    return this.chat(messages, options);
  }

  /**
   * Check provider availability
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/version`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get available models from Ollama
   */
  async listInstalledModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) return [];

      const data = await response.json();
      return data.models?.map((m: { name: string }) => m.name.split(':')[0]) || [];
    } catch {
      return [];
    }
  }

  /**
   * Pull a model
   */
  async pullModel(model: string): Promise<{ success: boolean; progress?: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model, stream: false }),
      });

      return { success: response.ok };
    } catch {
      return { success: false };
    }
  }

  /**
   * Get API endpoint for a model
   */
  protected getEndpoint(model: string): string {
    return `${this.baseUrl}/chat/completions`;
  }

  /**
   * Get request headers
   */
  protected getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Transform messages to Ollama format
   */
  protected transformMessages(messages: ChatMessage[]): unknown {
    return messages;
  }

  /**
   * Parse Ollama response
   */
  protected parseResponse(
    data: unknown,
    model: string,
    latencyMs: number
  ): ProviderResponse {
    const response = data as {
      message?: { content?: string };
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    // Ollama doesn't always provide token usage
    const usage = response.usage || {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    };

    return {
      content: response.message?.content || '',
      usage: {
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0,
        cost: 0, // Local - no cost
      },
      model,
      provider: this.config.id,
      latencyMs,
    };
  }
}

// ============================================================================
// LM STUDIO ADAPTER (Compatibility)
// ============================================================================

export class LMStudioAdapter extends OllamaAdapter {
  constructor() {
    super();
    this.config.id = 'lmstudio';
    this.config.name = 'LM Studio (Local)';
    this.baseUrl = process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1';
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const ollamaAdapter = new OllamaAdapter();
export const lmstudioAdapter = new LMStudioAdapter();
