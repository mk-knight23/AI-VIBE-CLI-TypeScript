/**
 * Workflow Types - Definitions for workflow execution
 */

export interface WorkflowStep {
  id?: string;
  agent: string;
  input?: string | Record<string, unknown>;
  output?: string;
  template?: string;
  rules?: string;
  condition?: string;
  onError?: 'stop' | 'continue' | 'retry';
  maxRetries?: number;
  // New: approval checkpoint
  requiresApproval?: boolean;
  approvalMessage?: string;
  // New: parallel execution
  parallel?: WorkflowStep[];
  // New: timeout override
  timeout?: number;
}

export interface WorkflowDefinition {
  name: string;
  description?: string;
  steps: WorkflowStep[];
  inputs?: Record<string, { type: string; required?: boolean; default?: unknown }>;
  outputs?: string[];
  // New: global settings
  settings?: {
    maxParallel?: number;
    defaultTimeout?: number;
    autoApprove?: boolean;
  };
}

export interface WorkflowContext {
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  variables: Record<string, unknown>;
  currentStep: number;
  errors: Array<{ step: number; error: string }>;
  // New: checkpoint state
  checkpoints: Array<{ step: number; approved: boolean; timestamp: number }>;
}

export interface WorkflowResult {
  success: boolean;
  outputs: Record<string, unknown>;
  steps: Array<{
    step: number;
    agent: string;
    status: 'completed' | 'failed' | 'skipped' | 'pending-approval' | 'denied';
    duration: number;
    output?: unknown;
    error?: string;
    // New: parallel results
    parallelResults?: Array<{ agent: string; status: string; output?: unknown }>;
  }>;
  duration: number;
}
