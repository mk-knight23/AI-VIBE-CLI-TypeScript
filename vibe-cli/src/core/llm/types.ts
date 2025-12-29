/**
 * Core LLM types - Provider-agnostic definitions
 */

export type ProviderType = 'cloud' | 'local' | 'gateway';
export type SDKType = 'openai-compatible' | 'native';
export type CostTier = 'low' | 'medium' | 'high';
export type SpeedTier = 'slow' | 'medium' | 'fast';

export interface ModelCapabilities {
  tools: boolean;
  vision: boolean;
  reasoning: boolean;
  streaming: boolean;
}

export interface ModelConfig {
  context: number;
  output?: number;
  supports: ModelCapabilities;
  cost: CostTier;
  speed: SpeedTier;
  priority?: number;
  local?: boolean;
}

export interface LLMProvider {
  id: string;
  name: string;
  type: ProviderType;
  sdk: SDKType;
  baseURL?: string;
  env?: string[];
  headers?: Record<string, string>;
  models?: Record<string, ModelConfig>;
}

export interface ProviderCredentials {
  apiKey?: string;
  baseURL?: string;
  headers?: Record<string, string>;
}

export interface RoutingRule {
  code?: string[];
  chat?: string[];
  cheap?: string[];
  reasoning?: string[];
  vision?: string[];
}

export interface LLMConfig {
  $schema?: string;
  provider: Record<string, {
    baseURL?: string;
    models?: Record<string, Partial<ModelConfig>>;
  }>;
  model: string;
  routing?: RoutingRule;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

export interface ChatOptions {
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  tools?: any[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

export interface ChatResponse {
  message: string;
  toolCalls?: { id: string; name: string; arguments: any }[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  model?: string;
  finishReason?: string;
}
