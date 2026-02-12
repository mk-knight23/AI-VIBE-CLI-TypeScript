import { LLMProvider, ProviderOptions, ProviderResponse, ProviderError } from './types.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';
import { MinimaxProvider } from './minimax.js';
import { configManager } from '../config/config-system.js';
import { createLogger } from '../../utils/pino-logger.js';

const logger = createLogger('ProviderRouter');

export class ProviderRouter {
    private providers: Map<string, LLMProvider> = new Map();

    constructor() {
        this.registerProvider(new MinimaxProvider());
        this.registerProvider(new AnthropicProvider());
        this.registerProvider(new OpenAIProvider());
    }

    public registerProvider(provider: LLMProvider): void {
        this.providers.set(provider.id, provider);
    }

    public async completion(prompt: string, options?: ProviderOptions): Promise<ProviderResponse> {
        const config = configManager.getConfig();
        const fallbackOrder = config.model.fallbackOrder;

        let lastError: Error | null = null;

        for (const providerId of fallbackOrder) {
            const provider = this.providers.get(providerId);
            if (!provider) continue;

            try {
                logger.debug(`Attempting completion with ${providerId}...`);
                return await provider.generateCompletion(prompt, options);
            } catch (error: any) {
                lastError = error;
                logger.warn(`Provider ${providerId} failed: ${error.message}`);
                if (error instanceof ProviderError && !error.retryable) {
                    // If not retryable, move to next provider immediately
                    continue;
                }
                // If retryable, we could implement a small retry loop here, 
                // but for now we'll just fall back to the next provider.
            }
        }

        throw new Error(`All providers failed. Last error: ${lastError?.message}`);
    }

    public async *stream(prompt: string, options?: ProviderOptions): AsyncGenerator<string> {
        const config = configManager.getConfig();
        const fallbackOrder = config.model.fallbackOrder;

        let lastError: Error | null = null;

        for (const providerId of fallbackOrder) {
            const provider = this.providers.get(providerId);
            if (!provider || !provider.generateStream) continue;

            try {
                logger.debug(`Attempting stream with ${providerId}...`);
                const stream = provider.generateStream(prompt, options);
                for await (const chunk of stream) {
                    yield chunk;
                }
                return; // Success
            } catch (error: any) {
                lastError = error;
                logger.warn(`Provider ${providerId} stream failed: ${error.message}`);
                // Move to next provider
            }
        }

        throw new Error(`All providers failed for streaming. Last error: ${lastError?.message}`);
    }
}

export const providerRouter = new ProviderRouter();
