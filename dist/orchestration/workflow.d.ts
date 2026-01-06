/**
 * VIBE-CLI v12 - Workflow Automation Engine
 * Create, execute, and manage multi-step workflows
 */
import { VibeToolExecutor, ToolResult } from '../tools/executor';
import type { IApprovalSystem } from '../types';
export interface WorkflowStep {
    id: string;
    name: string;
    description?: string;
    tool: string;
    args: Record<string, any>;
    condition?: string;
    parallel?: boolean;
    retry?: number;
    timeout?: number;
    onSuccess?: string;
    onFailure?: string;
}
export interface Workflow {
    id: string;
    name: string;
    description?: string;
    version: string;
    steps: WorkflowStep[];
    parallelGroups?: string[][];
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
export declare class VibeWorkflowEngine {
    private workflows;
    private executions;
    private toolExecutor;
    private approvalSystem;
    private config;
    constructor(toolExecutor: VibeToolExecutor, approvalSystem: IApprovalSystem, config?: WorkflowEngineConfig);
    /**
     * Load built-in workflow templates
     */
    private loadBuiltinWorkflows;
    /**
     * Register a workflow
     */
    register(workflow: Workflow): void;
    /**
     * Get a workflow by ID
     */
    get(id: string): Workflow | undefined;
    /**
     * List all workflows
     */
    list(): WorkflowInfo[];
    /**
     * Execute a workflow
     */
    execute(workflowId: string, params?: Record<string, any>, context?: {
        approved?: boolean;
        dryRun?: boolean;
    }): Promise<WorkflowExecution>;
    /**
     * Execute a single step
     */
    private executeStep;
    /**
     * Build tool config from step definition
     */
    private buildToolConfig;
    /**
     * Evaluate a condition expression
     */
    private evaluateCondition;
    /**
     * Get execution status
     */
    getExecution(executionId: string): WorkflowExecution | undefined;
    /**
     * List executions
     */
    listExecutions(): WorkflowExecution[];
    /**
     * Load workflow from file
     */
    loadFromFile(filePath: string): void;
    /**
     * Save workflow to file
     */
    saveToFile(workflowId: string, filePath: string): void;
}
interface WorkflowInfo {
    id: string;
    name: string;
    description?: string;
    stepCount: number;
    tags: string[];
}
export {};
//# sourceMappingURL=workflow.d.ts.map