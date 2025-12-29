/**
 * LLM Client - Unified OpenAI-compatible client
 */

import { ChatMessage, ChatOptions, ChatResponse, ProviderCredentials } from './types';
import { providerRegistry } from './provider-registry';
import { credentialStore } from './credentials';
import { maskSecrets } from '../security';

export class LLMClient {
  private providerId: string;
  private baseURL: string;
  private headers: Record<string, string>;

  constructor(providerId: string, credentials?: ProviderCredentials) {
    this.providerId = providerId;
    const provider = providerRegistry.get(providerId);
    
    if (!provider) {
      throw new Error(`Unknown provider: ${providerId}`);
    }

    const creds = credentials || credentialStore.get(providerId);
    this.baseURL = creds?.baseURL || provider.baseURL || '';
    this.headers = {
      'Content-Type': 'application/json',
      ...provider.headers,
      ...creds?.headers
    };

    if (creds?.apiKey) {
      this.headers['Authorization'] = `Bearer ${creds.apiKey}`;
    }
  }

  async chat(messages: ChatMessage[], model: string, options: ChatOptions = {}): Promise<ChatResponse> {
    const body: any = {
      model,
      messages,
      ...options
    };

    if (options.stream) {
      delete body.stream;
    }

    const response = await this.fetch('/chat/completions', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error (${response.status}): ${maskSecrets(error)}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      message: choice?.message?.content || '',
      toolCalls: choice?.message?.tool_calls?.map((tc: any) => ({
        id: tc.id,
        name: tc.function?.name,
        arguments: JSON.parse(tc.function?.arguments || '{}')
      })),
      usage: data.usage,
      model: data.model,
      finishReason: choice?.finish_reason
    };
  }

  async *chatStream(messages: ChatMessage[], model: string, options: ChatOptions = {}): AsyncGenerator<string> {
    const body = {
      model,
      messages,
      stream: true,
      ...options
    };

    const response = await this.fetch('/chat/completions', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error (${response.status}): ${maskSecrets(error)}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

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
          } catch {}
        }
      }
    }
  }

  async listModels(): Promise<{ id: string; owned_by?: string }[]> {
    const response = await this.fetch('/models');
    if (!response.ok) return [];
    const data = await response.json();
    return data.data || [];
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.fetch('/models', { method: 'GET' });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async fetch(path: string, init: RequestInit = {}): Promise<Response> {
    const url = this.baseURL + path;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      return await fetch(url, {
        ...init,
        headers: this.headers,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createClient(providerId: string, credentials?: ProviderCredentials): LLMClient {
  return new LLMClient(providerId, credentials);
}
