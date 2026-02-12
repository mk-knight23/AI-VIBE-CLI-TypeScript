import axios from 'axios';
import { LLMProvider, ProviderOptions, ProviderResponse, ProviderError } from './types.js';
import { configManager } from '../config/config-system.js';

export class OpenAIProvider implements LLMProvider {
    public id = 'openai';
    public name = 'OpenAI GPT';
    private apiKey: string | undefined;

    constructor() {
        this.apiKey = configManager.getEnv('OPENAI_API_KEY');
    }

    async generateCompletion(prompt: string, options?: ProviderOptions): Promise<ProviderResponse> {
        if (!this.apiKey) {
            throw new ProviderError(this.id, 'API key not found');
        }

        try {
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: options?.model || 'gpt-4o',
                    messages: [
                        ...(options?.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: options?.maxTokens,
                    temperature: options?.temperature || 0.7,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            return {
                content: response.data.choices[0].message.content,
                usage: {
                    promptTokens: response.data.usage.prompt_tokens,
                    completionTokens: response.data.usage.completion_tokens,
                    totalTokens: response.data.usage.total_tokens,
                },
                model: response.data.model,
            };
        } catch (error: any) {
            const status = error.response?.status;
            const isRetryable = status === 429 || status >= 500;
            throw new ProviderError(this.id, error.message, isRetryable);
        }
    }
    public async *generateStream(prompt: string, options?: ProviderOptions): AsyncGenerator<string> {
        if (!this.apiKey) {
            throw new ProviderError(this.id, 'API key not found');
        }

        try {
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: options?.model || 'gpt-4o',
                    messages: [
                        ...(options?.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
                        { role: 'user', content: prompt }
                    ],
                    stream: true,
                    max_tokens: options?.maxTokens,
                    temperature: options?.temperature || 0.7,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    responseType: 'stream',
                }
            );

            for await (const chunk of response.data) {
                const lines = chunk.toString().split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();
                        if (data === '[DONE]') break;
                        try {
                            const json = JSON.parse(data);
                            const content = json.choices[0]?.delta?.content || '';
                            if (content) yield content;
                        } catch (e) {
                            // Ignore
                        }
                    }
                }
            }
        } catch (error: any) {
            throw new ProviderError(this.id, `Stream Error: ${error.message}`, false);
        }
    }
}
