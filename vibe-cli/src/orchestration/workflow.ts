/**
 * VIBE-CLI v12 - Workflow Automation Engine
 * Create, execute, and manage multi-step workflows
 */

import * as fs from 'fs';
import { VibeToolExecutor, ToolResult } from '../tools/executor';
import type { IApprovalSystem } from '../types';

export interface WorkflowStep {
  id: string;
  name: string;
  description?: string;
  tool: string;
  args: Record<string, any>;
  condition?: string; // Expression to evaluate before running
  parallel?: boolean; // Run in parallel with next step
  retry?: number; // Number of retries on failure
  timeout?: number; // Timeout in ms
  onSuccess?: string; // Next step or 'continue'
  onFailure?: string; // Next step or 'abort' or 'rollback'
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  version: string;
  steps: WorkflowStep[];
  parallelGroups?: string[][]; // Groups of steps to run in parallel
  metadata?: {
    author?: string;
    createdAt: Date;
    tags?: string[];
    parameters?: WorkflowParameter[];
  };
}

export interface WorkflowParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'choice';
  description: string;
  default?: any;
  required?: boolean;
  choices?: string[];
}

export interface WorkflowExecution {
  workflowId: string;
  executionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentStep?: string;
  results: Map<string, ToolResult>;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface WorkflowEngineConfig {
  maxConcurrent?: number;
  defaultTimeout?: number;
  autoRetry?: boolean;
  checkpointBeforeEach?: boolean;
}

export class VibeWorkflowEngine {
  private workflows: Map<string, Workflow> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private toolExecutor: VibeToolExecutor;
  private approvalSystem: IApprovalSystem;
  private config: WorkflowEngineConfig;
  
  constructor(
    toolExecutor: VibeToolExecutor,
    approvalSystem: IApprovalSystem,
    config?: WorkflowEngineConfig
  ) {
    this.toolExecutor = toolExecutor;
    this.approvalSystem = approvalSystem;
    this.config = {
      maxConcurrent: config?.maxConcurrent || 1,
      defaultTimeout: config?.defaultTimeout || 300000, // 5 min
      autoRetry: config?.autoRetry !== false,
      checkpointBeforeEach: config?.checkpointBeforeEach !== false,
    };
    
    this.loadBuiltinWorkflows();
  }

  /**
   * Load built-in workflow templates
   */
  private loadBuiltinWorkflows(): void {
    // CI/CD Workflow
    this.register({
      id: 'cicd',
      name: 'CI/CD Pipeline',
      description: 'Build, test, and deploy',
      version: '1.0.0',
      steps: [
        {
          id: 'install',
          name: 'Install Dependencies',
          tool: 'run_shell_command',
          args: { command: 'npm ci' },
          onSuccess: 'lint',
        },
        {
          id: 'lint',
          name: 'Run Linter',
          tool: 'run_shell_command',
          args: { command: 'npm run lint' },
          onSuccess: 'test',
        },
        {
          id: 'test',
          name: 'Run Tests',
          tool: 'run_shell_command',
          args: { command: 'npm test' },
          onSuccess: 'build',
        },
        {
          id: 'build',
          name: 'Build Project',
          tool: 'run_shell_command',
          args: { command: 'npm run build' },
          onSuccess: 'deploy',
        },
        {
          id: 'deploy',
          name: 'Deploy',
          tool: 'run_shell_command',
          args: { command: 'npm run deploy' },
          onFailure: 'rollback',
        },
        {
          id: 'rollback',
          name: 'Rollback',
          tool: 'run_shell_command',
          args: { command: 'npm run rollback' },
        },
      ],
      metadata: {
        author: 'Vibe',
        createdAt: new Date(),
        tags: ['ci', 'cd', 'deployment'],
      },
    });

    // Code Review Workflow
    this.register({
      id: 'code-review',
      name: 'Code Review',
      description: 'Analyze, test, and review changes',
      version: '1.0.0',
      steps: [
        {
          id: 'analyze',
          name: 'Code Analysis',
          tool: 'analyze_code_quality',
          args: { path: '.' },
          onSuccess: 'security',
        },
        {
          id: 'security',
          name: 'Security Scan',
          tool: 'security_scan',
          args: { path: '.' },
          onSuccess: 'test',
        },
        {
          id: 'test',
          name: 'Run Tests',
          tool: 'run_tests',
          args: {},
          onSuccess: 'report',
        },
        {
          id: 'report',
          name: 'Generate Report',
          tool: 'generate_report',
          args: {},
        },
      ],
      metadata: {
        author: 'Vibe',
        createdAt: new Date(),
        tags: ['review', 'analysis'],
      },
    });
  }

  /**
   * Register a workflow
   */
  register(workflow: Workflow): void {
    this.workflows.set(workflow.id, workflow);
  }

  /**
   * Get a workflow by ID
   */
  get(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }

  /**
   * List all workflows
   */
  list(): WorkflowInfo[] {
    return Array.from(this.workflows.values()).map(w => ({
      id: w.id,
      name: w.name,
      description: w.description,
      stepCount: w.steps.length,
      tags: w.metadata?.tags || [],
    }));
  }

  /**
   * Execute a workflow
   */
  async execute(
    workflowId: string,
    params: Record<string, any> = {},
    context: { approved?: boolean; dryRun?: boolean } = {}
  ): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const executionId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    
    const execution: WorkflowExecution = {
      workflowId,
      executionId,
      status: 'pending',
      results: new Map(),
      startedAt: new Date(),
    };

    this.executions.set(executionId, execution);

    // Start execution
    execution.status = 'running';
    
    try {
      for (const step of workflow.steps) {
        execution.currentStep = step.id;
        
        // Check if step should be skipped
        if (step.condition && !this.evaluateCondition(step.condition, params)) {
          continue;
        }

        // Execute step
        const result = await this.executeStep(step, params, context);
        execution.results.set(step.id, result);

        if (!result.success) {
          if (step.onFailure === 'abort') {
            execution.status = 'failed';
            execution.error = `Step ${step.id} failed: ${result.error}`;
            break;
          } else if (step.onFailure === 'rollback') {
            execution.status = 'failed';
            execution.error = `Step ${step.id} failed, rollback triggered`;
            break;
          }
          // Continue to next step or retry
        }

        // Handle parallel execution
        if (step.parallel && step.onSuccess === 'continue') {
          // Handle parallel group
        }
      }

      execution.status = 'completed';
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
    }

    execution.completedAt = new Date();
    return execution;
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    step: WorkflowStep,
    params: Record<string, any>,
    context: { approved?: boolean; dryRun?: boolean }
  ): Promise<ToolResult> {
    // Build tool config
    const toolConfig = this.buildToolConfig(step.tool, step.args, params);
    
    // Apply retry logic
    let lastResult: ToolResult | undefined;
    const retries = step.retry || (this.config.autoRetry ? 3 : 0);
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      lastResult = await this.toolExecutor.execute(toolConfig, {
        sessionId: 'workflow',
        approved: context.approved || false,
        dryRun: context.dryRun || false,
        sandbox: false,
      });

      if (lastResult.success) {
        break;
      }
    }

    return lastResult!;
  }

  /**
   * Build tool config from step definition
   */
  private buildToolConfig(
    tool: string,
    args: Record<string, any>,
    params: Record<string, any>
  ): any {
    // Substitute params in args
    const resolvedArgs: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(args)) {
      if (typeof value === 'string' && value.startsWith('${')) {
        const paramName = value.slice(2, -1);
        resolvedArgs[key] = params[paramName] || value;
      } else {
        resolvedArgs[key] = value;
      }
    }

    return {
      name: tool,
      command: resolvedArgs.command || tool,
      args: resolvedArgs.args,
      workingDir: resolvedArgs.workingDir,
      env: resolvedArgs.env,
      timeout: resolvedArgs.timeout || this.config.defaultTimeout,
    };
  }

  /**
   * Evaluate a condition expression
   */
  private evaluateCondition(condition: string, params: Record<string, any>): boolean {
    // Simple condition evaluation (can be extended)
    if (condition.startsWith('${')) {
      const paramName = condition.slice(2, -1);
      return Boolean(params[paramName]);
    }
    return true;
  }

  /**
   * Get execution status
   */
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * List executions
   */
  listExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values());
  }

  /**
   * Load workflow from file
   */
  loadFromFile(filePath: string): void {
    const content = fs.readFileSync(filePath, 'utf-8');
    const workflow = JSON.parse(content);
    this.register(workflow);
  }

  /**
   * Save workflow to file
   */
  saveToFile(workflowId: string, filePath: string): void {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2));
  }
}

interface WorkflowInfo {
  id: string;
  name: string;
  description?: string;
  stepCount: number;
  tags: string[];
}
