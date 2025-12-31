/**
 * Agent System Types - Core type definitions for the agent architecture
 */

export type OutputFormat = 'markdown' | 'json' | 'table' | 'csv' | 'yaml';

export interface AgentDefinition {
  name: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  outputs: OutputFormat[];
  canDelegate: string[];
  memoryScope: 'session' | 'project' | 'global';
  timeout: number;
  priority: number;
}

export interface AgentContext {
  sessionId: string;
  projectPath: string;
  memory: Record<string, unknown>;
  parentAgent?: string;
}

export interface AgentInput {
  task: string;
  context?: AgentContext;
  params?: Record<string, unknown>;
}

export interface AgentOutput {
  type: OutputFormat;
  data: unknown;
  metadata: {
    agent: string;
    timestamp: string;
    duration: number;
    tokensUsed?: number;
    delegatedTo?: string[];
  };
}

export interface AgentStep {
  thought: string;
  action: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  timestamp: number;
}

export interface AgentExecution {
  agentName: string;
  input: AgentInput;
  steps: AgentStep[];
  output?: AgentOutput;
  status: 'running' | 'completed' | 'failed' | 'delegated';
  startTime: number;
  endTime?: number;
}
