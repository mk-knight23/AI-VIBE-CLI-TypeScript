export interface AgentTask {
  task: string;
  context: Record<string, unknown>;
  approvalMode: 'auto' | 'prompt' | 'never';
  maxSteps?: number;
  checkpoint?: boolean;
}

export interface AgentResult {
  success: boolean;
  output: string;
  error?: string;
  steps: AgentStep[];
  artifacts?: string[];
}

export interface AgentStep {
  id: string;
  phase: AgentPhase;
  action: string;
  result: string;
  approved?: boolean;
  timestamp: Date;
  duration: number;
}

export type AgentPhase = 'plan' | 'propose' | 'approve' | 'execute' | 'verify' | 'explain' | 'debug' | 'refactor' | 'learn' | 'context';

export interface VibeAgent {
  name: string;
  description: string;
  phases: AgentPhase[];
  execute(task: AgentTask, context: any): Promise<AgentResult>;
}

export interface ExecutionPlan {
  steps: PlanStep[];
  tools: string[];
  estimatedRisk: 'low' | 'medium' | 'high' | 'critical';
}

export interface PlanStep {
  description: string;
  tool: string;
  args: Record<string, unknown>;
  reason: string;
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode?: number;
  duration: number;
  filesChanged?: string[];
}
