/**
 * VIBE-CLI v12 - COMPLETION Primitive
 * 
 * Handles LLM completion requests with provider routing.
 * Selects best model per task type (completion, planning, refactoring, reasoning).
 */

import type { IProviderRouter } from '../types';
import type { ProviderResponse } from '../types';

export interface CompletionOptions {
  modelTier?: 'fast' | 'balanced' | 'reasoning' | 'max';
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface CompletionResult {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider?: string;
  latency: number;
}

/**
 * COMPLETION Primitive - Handles all LLM completions
 */
export class CompletionPrimitive {
  private provider: IProviderRouter;

  constructor(provider: IProviderRouter) {
    this.provider = provider;
  }

  /**
   * Complete a prompt with optimal model selection
   */
  async complete(
    prompt: string,
    options: CompletionOptions = {}
  ): Promise<CompletionResult> {
    const startTime = Date.now();
    
    // Select best model for task type
    const modelTier = options.modelTier || 'balanced';
    const messages = this.buildMessages(prompt, options.systemPrompt);
    
    const response = await this.provider.chat(messages);

    return {
      content: response.content,
      usage: response.usage,
      model: response.model,
      provider: response.provider,
      latency: Date.now() - startTime,
    };
  }

  /**
   * Complete with streaming support
   */
  async *completeStream(
    prompt: string,
    options: CompletionOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    const messages = this.buildMessages(prompt, options.systemPrompt);
    
    // For streaming, we'd call a stream method on the provider
    // This is a placeholder for the streaming implementation
    const response = await this.complete(prompt, options);
    
    // Yield chunks (in real implementation, this would be actual streaming)
    const chunks = response.content.split(/(?=[\s\S])/);
    for (const chunk of chunks) {
      yield chunk;
    }
  }

  /**
   * Get the best model for a specific tier
   */
  private getModelForTier(tier: CompletionOptions['modelTier']): string {
    const models: Record<string, string> = {
      fast: 'gpt-4o-mini',           // Fast, cheap for simple tasks
      balanced: 'gpt-4o',            // Good balance of speed and capability
      reasoning: 'claude-sonnet-4-20250514', // Best for complex reasoning
      max: 'gpt-4o',                 // Maximum capability
    };
    return models[tier || 'balanced'];
  }

  /**
   * Build messages array for the API
   */
  private buildMessages(prompt: string, systemPrompt?: string): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    messages.push({ role: 'user', content: prompt });
    
    return messages;
  }

  /**
   * Get available models and their capabilities
   */
  getAvailableModels(): Array<{ id: string; tier: string; capabilities: string[] }> {
    return [
      { id: 'gpt-4o-mini', tier: 'fast', capabilities: ['completion', 'simple-coding'] },
      { id: 'gpt-4o', tier: 'balanced', capabilities: ['completion', 'coding', 'reasoning'] },
      { id: 'claude-sonnet-4-20250514', tier: 'reasoning', capabilities: ['completion', 'coding', 'reasoning', 'analysis'] },
      { id: 'gemini-1.5-flash', tier: 'balanced', capabilities: ['completion', 'coding', 'multimodal'] },
      { id: 'grok-2', tier: 'balanced', capabilities: ['completion', 'coding', 'reasoning'] },
    ];
  }

  /**
   * Estimate cost for a completion
   */
  estimateCost(tokens: number, tier: CompletionOptions['modelTier'] = 'balanced'): number {
    const costsPer1kTokens: Record<string, number> = {
      fast: 0.001,      // ~$1 per million tokens
      balanced: 0.01,   // ~$10 per million tokens
      reasoning: 0.03,  // ~$30 per million tokens
      max: 0.06,        // ~$60 per million tokens
    };
    
    const costPer1k = costsPer1kTokens[tier || 'balanced'];
    return (tokens / 1000) * costPer1k;
  }
}

/**
 * Simple text completion without provider routing
 */
export async function completeText(
  prompt: string,
  _apiKey?: string
): Promise<string> {
  // Placeholder for simple completion without full provider routing
  // In production, this would call OpenAI or another provider directly
  return `[COMPLETION] Response to: ${prompt.slice(0, 50)}...`;
}
