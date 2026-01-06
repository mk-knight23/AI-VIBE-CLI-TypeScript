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

import {
  BaseProviderAdapter,
  ModelInfo,
  ProviderConfig,
  ProviderOptions,
  ProviderResponse,
  StreamCallback,
  AuthenticationError,
  RateLimitError,
  ProviderError,
} from './base.adapter.js';

import type { ChatMessage } from '../../types.js';

// ============================================================================
// MODEL DEFINITIONS
// ============================================================================

const GOOGLE_MODELS: ModelInfo[] = [
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

const GOOGLE_CONFIG: ProviderConfig = {
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

export class GoogleAdapter extends BaseProviderAdapter {
  private baseUrl: string;

  constructor() {
    super(GOOGLE_CONFIG, GOOGLE_MODELS);
    this.baseUrl = GOOGLE_CONFIG.baseUrl;
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
    const apiKey = this.getApiKey();

    if (!apiKey) {
      throw new AuthenticationError(this.config.id, model);
    }

    this.validateModel(model);

    const lastMessage = messages[messages.length - 1];
    const history = messages.slice(0, -1);

    try {
      const response = await fetch(
        `${this.baseUrl}/models/${model}:generateContent?key=${apiKey}`,
        {
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
        }
      );

      if (response.status === 401) {
        throw new AuthenticationError(this.config.id, model);
      }

      if (response.status === 429) {
        throw new RateLimitError(this.config.id, model);
      }

      if (!response.ok) {
        const error = await response.text();
        throw new ProviderError(
          `Google API error: ${error}`,
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
        `Google request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
    const apiKey = this.getApiKey();

    if (!apiKey) {
      throw new AuthenticationError(this.config.id, model);
    }

    this.validateModel(model);

    const lastMessage = messages[messages.length - 1];
    const history = messages.slice(0, -1);

    const response = await fetch(
      `${this.baseUrl}/models/${model}:streamGenerateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: this.buildContents(history, lastMessage),
          generationConfig: {
            temperature: options?.temperature ?? 0.7,
            maxOutputTokens: options?.maxTokens,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new ProviderError(
        `Google streaming failed: ${response.statusText}`,
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
    if (!this.isConfigured()) return false;

    try {
      const testMessages: ChatMessage[] = [{ role: 'user', content: 'test' }];
      await this.chat(testMessages, { maxTokens: 1 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get API endpoint for a model
   */
  protected getEndpoint(model: string): string {
    return `${this.baseUrl}/models/${model}:generateContent`;
  }

  /**
   * Get request headers
   */
  protected getHeaders(): Record<string, string> {
    const apiKey = this.getApiKey();
    return {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Transform messages to Google format
   */
  protected transformMessages(messages: ChatMessage[]): unknown {
    return this.buildContents(messages.slice(0, -1), messages[messages.length - 1]);
  }

  /**
   * Build contents array for Google API
   */
  private buildContents(
    history: ChatMessage[],
    lastMessage: ChatMessage
  ): Array<{ role: string; parts: Array<{ text: string }> }> {
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

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
  private getSafetySettings(): Array<{
    category: string;
    threshold: string;
  }> {
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
  private extractStreamContent(data: unknown): string | null {
    const response = data as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    return response.candidates?.[0]?.content?.parts?.[0]?.text || null;
  }

  /**
   * Parse Google response
   */
  protected parseResponse(
    data: unknown,
    model: string,
    latencyMs: number
  ): ProviderResponse {
    const response = data as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
          role?: string;
        };
        safetyRatings?: Array<{ category: string; probability: string }>;
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    };

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

// ============================================================================
// EXPORTS
// ============================================================================

export const googleAdapter = new GoogleAdapter();
