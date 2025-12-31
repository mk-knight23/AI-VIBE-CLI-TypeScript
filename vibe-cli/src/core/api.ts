/**
 * API Client Module (Simplified)
 * 
 * Thin wrapper around UniversalAI for backward compatibility.
 * All AI requests go through the universal runtime.
 * 
 * @module core/api
 */

import { UniversalAI, AIRequest, AIResponse, Task } from './universal-ai';

/**
 * Configuration options for chat requests
 */
export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  tools?: any[];
}

/**
 * Unified API client - delegates to UniversalAI
 */
export class ApiClient {
  
  /**
   * Send chat request
   */
  async chat(messages: any[], model: string, options: ChatOptions = {}): Promise<any> {
    if (!messages || messages.length === 0) {
      throw new Error('Messages array cannot be empty');
    }

    // Determine task from model name or default to chat
    const task = this.inferTask(model);
    
    const response = await UniversalAI.run({
      task,
      messages,
      stream: options.stream,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      tools: options.tools
    });
    
    // Return in legacy format for compatibility
    return {
      choices: [{
        message: {
          content: response.content,
          tool_calls: response.toolCalls
        }
      }],
      model: response.model,
      usage: response.usage ? {
        prompt_tokens: response.usage.promptTokens,
        completion_tokens: response.usage.completionTokens,
        total_tokens: response.usage.totalTokens
      } : undefined
    };
  }
  
  /**
   * Fetch available models
   */
  async fetchModels(): Promise<any[]> {
    return UniversalAI.getModels().map(m => ({
      id: m.id,
      name: m.id,
      task: m.task,
      free: m.free
    }));
  }
  
  /**
   * Check if configured
   */
  isConfigured(): boolean {
    return UniversalAI.isConfigured();
  }
  
  /**
   * Infer task from model name (for backward compatibility)
   */
  private inferTask(model: string): Task {
    const lower = model.toLowerCase();
    if (lower.includes('code') || lower.includes('coder')) return 'code';
    if (lower.includes('debug')) return 'debug';
    if (lower.includes('agent') || lower.includes('r1')) return 'agent';
    if (lower.includes('vision') || lower.includes('vl')) return 'vision';
    return 'chat';
  }
  
  // Legacy methods - no-op for compatibility
  setProvider(_: string): void {}
  getProvider(): string { return 'universal'; }
}

// Export types for compatibility
export type ProviderType = string;
export type Capability = 'chat' | 'tools' | 'vision' | 'thinking' | 'streaming';

export function getProviderHealth(): any[] {
  return [{ provider: 'universal', healthy: UniversalAI.isConfigured(), rateLimited: false }];
}
