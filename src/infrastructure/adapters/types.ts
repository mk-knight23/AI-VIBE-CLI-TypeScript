export interface ProviderResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider?: string;
}

export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKeyEnv: string;
  defaultModel: string;
  requiresApiKey: boolean;
  model?: string;
  apiKey?: string;
  freeTier?: boolean;
}

export interface ProviderOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stop?: string[];
  systemPrompt?: string;
}

export interface LLMProvider {
  id: string;
  name: string;
  generateCompletion(prompt: string, options?: ProviderOptions): Promise<ProviderResponse>;
  generateStream?(prompt: string, options?: ProviderOptions): AsyncGenerator<string>;
}

export class ProviderError extends Error {
  constructor(public provider: string, message: string, public retryable: boolean = false) {
    super(`[${provider}] ${message}`);
    this.name = 'ProviderError';
  }
}
