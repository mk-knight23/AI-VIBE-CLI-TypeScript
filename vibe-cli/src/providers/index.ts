import { ModelDefinition } from '../ai/model-router';
import { ThinkingRequest } from '../ai/extended-thinking';

export interface Provider {
  name: string;
  baseUrl: string;
  defaultKey?: string;
  getApiKey: () => Promise<string>;
  fetchModels: () => Promise<any[]>;
  chat: (messages: any[], model: string, options?: any) => Promise<any>;
  
  // NEW: Extended AI capabilities
  getAvailableModels?: () => Promise<ModelDefinition[]>;
  supportsExtendedThinking?: (model: string) => boolean;
  supportsWebSearch?: (model: string) => boolean;
  executeOrchestration?: (request: OrchestrationRequest) => Promise<OrchestrationResult>;
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  contextLength: number;
  isFree: boolean;
  pricing?: {
    prompt: number;
    completion: number;
  };
}

// NEW: Provider response with orchestration support
export interface ProviderResponse {
  message: string;
  toolCalls?: { tool: string; args: unknown }[];
  orchestrationCode?: string;  // Python or TypeScript code
  mode?: 'streaming' | 'orchestration';  // Execution mode
  thinking?: string;  // Extended thinking trace
}

// NEW: Orchestration interfaces
export interface OrchestrationRequest {
  code: string;  // Python or TypeScript
  availableTools: ToolDefinition[];
  context: ProjectContext;
  maxExecutionTime: number;
}

export interface OrchestrationResult {
  success: boolean;
  output: string;
  executionTime: number;
  error?: string;
  artifacts?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface ProjectContext {
  workingDir: string;
  files?: string[];
  dependencies?: string[];
  framework?: string;
  language?: string;
}

// API keys should be set via environment variables only
// DO NOT hardcode keys - use OPENROUTER_API_KEY, MEGALLM_API_KEY, etc.
export const DEFAULT_KEYS = {
  openrouter: process.env.OPENROUTER_API_KEY || '',
  megallm: process.env.MEGALLM_API_KEY || '',
  agentrouter: process.env.AGENTROUTER_API_KEY || '',
  routeway: process.env.ROUTEWAY_API_KEY || ''
};

export const PROVIDERS = {
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    envKey: 'OPENROUTER_API_KEY'
  },
  megallm: {
    name: 'MegaLLM',
    baseUrl: 'https://ai.megallm.io/v1',
    envKey: 'MEGALLM_API_KEY'
  },
  agentrouter: {
    name: 'AgentRouter',
    baseUrl: 'https://agentrouter.org/v1',
    envKey: 'AGENTROUTER_API_KEY'
  },
  routeway: {
    name: 'Routeway',
    baseUrl: 'https://api.routeway.ai/v1',
    envKey: 'ROUTEWAY_API_KEY'
  }
};

export function isFreeModel(model: any): boolean {
  if (model?.is_free) return true;
  const pricing = model?.pricing || model?.top_provider?.pricing;
  if (!pricing) return false;
  
  const values = [
    pricing.prompt,
    pricing.completion,
    pricing.input,
    pricing.output
  ].filter(v => v !== undefined && v !== null);
  
  return values.length > 0 && values.every(v => Number(v) === 0);
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    return await fetch(url, { ...fetchOptions, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

export * from './openrouter';
export * from './megallm';
export * from './agentrouter';
export * from './routeway';
export * from './registry';
