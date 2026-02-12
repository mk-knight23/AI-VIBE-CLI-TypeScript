import axios from 'axios';
import { LLMProvider, ProviderOptions, ProviderResponse, ProviderError } from './types.js';
import { configManager } from '../config/config-system.js';

export class MinimaxProvider implements LLMProvider {
    public id = 'minimax';
    public name = 'MiniMax';

    private get apiKey(): string {
        const key = configManager.getEnv('MINIMAX_API_KEY');
        if (!key) throw new ProviderError(this.id, 'MINIMAX_API_KEY not found in environment', false);
        return key;
    }

    public async generateCompletion(prompt: string, options?: ProviderOptions): Promise<ProviderResponse> {
        try {
            const response = await axios.post(
                'https://api.minimax.io/v1/chat/completions',
                {
                    model: options?.model || 'MiniMax-M2.1',
                    messages: [
                        { role: 'system', content: options?.systemPrompt || 'You are a helpful assistant.' },
                        { role: 'user', content: prompt }
                    ],
                    extra_body: {
                        reasoning_split: true
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const result = response.data;
            if (!result.choices || result.choices.length === 0) {
                throw new Error('No completion returned from Minimax');
            }

            return {
                content: result.choices[0].message.content,
                model: result.model,
                usage: {
                    promptTokens: result.usage?.prompt_tokens || 0,
                    completionTokens: result.usage?.completion_tokens || 0,
                    totalTokens: result.usage?.total_tokens || 0
                }
            };
        } catch (error: any) {
            const status = error.response?.status;
            const message = error.response?.data?.error || error.message;
            throw new ProviderError(this.id, `API Error: ${status} - ${JSON.stringify(message)}`, status === 429 || status >= 500);
        }
    }
    public async *generateStream(prompt: string, options?: ProviderOptions): AsyncGenerator<string> {
        try {
            const response = await axios.post(
                'https://api.minimax.io/v1/chat/completions',
                {
                    model: options?.model || 'MiniMax-M2.1',
                    messages: [
                        { role: 'system', content: options?.systemPrompt || 'You are a helpful assistant.' },
                        { role: 'user', content: prompt }
                    ],
                    stream: true,
                    extra_body: {
                        reasoning_split: true
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    responseType: 'stream'
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
                            // Ignore incomplete JSON
                        }
                    }
                }
            }
        } catch (error: any) {
            throw new ProviderError(this.id, `Stream Error: ${error.message}`, false);
        }
    }
}
