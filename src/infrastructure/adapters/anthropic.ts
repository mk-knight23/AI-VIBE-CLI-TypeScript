import axios from 'axios';
import { LLMProvider, ProviderOptions, ProviderResponse, ProviderError } from './types.js';
import { configManager } from '../config/config-system.js';

export class AnthropicProvider implements LLMProvider {
    public id = 'anthropic';
    public name = 'Anthropic Claude';
    private apiKey: string | undefined;

    constructor() {
        this.apiKey = configManager.getEnv('ANTHROPIC_API_KEY');
    }

    async generateCompletion(prompt: string, options?: ProviderOptions): Promise<ProviderResponse> {
        if (!this.apiKey) {
            throw new ProviderError(this.id, 'API key not found');
        }

        try {
            const response = await axios.post(
                'https://api.anthropic.com/v1/messages',
                {
                    model: options?.model || 'claude-3-5-sonnet-20240620',
                    max_tokens: options?.maxTokens || 4096,
                    messages: [{ role: 'user', content: prompt }],
                    system: options?.systemPrompt,
                    temperature: options?.temperature || 0.7,
                },
                {
                    headers: {
                        'x-api-key': this.apiKey,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json',
                    },
                }
            );

            return {
                content: response.data.content[0].text,
                usage: {
                    promptTokens: response.data.usage.input_tokens,
                    completionTokens: response.data.usage.output_tokens,
                    totalTokens: response.data.usage.input_tokens + response.data.usage.output_tokens,
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
                'https://api.anthropic.com/v1/messages',
                {
                    model: options?.model || 'claude-3-5-sonnet-20240620',
                    max_tokens: options?.maxTokens || 4096,
                    messages: [{ role: 'user', content: prompt }],
                    system: options?.systemPrompt,
                    temperature: options?.temperature || 0.7,
                    stream: true,
                },
                {
                    headers: {
                        'x-api-key': this.apiKey,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json',
                    },
                    responseType: 'stream',
                }
            );

            for await (const chunk of response.data) {
                const lines = chunk.toString().split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();
                        try {
                            const json = JSON.parse(data);
                            if (json.type === 'content_block_delta' && json.delta?.text) {
                                yield json.delta.text;
                            }
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
