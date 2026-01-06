/**
 * VIBE-CLI v13 - Agents Module
 *
 * Multi-agent system for autonomous task execution:
 * - PLAN: Create execution plan
 * - PROPOSE: Propose changes with diff preview
 * - APPROVE: Request user approval for risky operations
 * - EXECUTE: Run tools and commands
 * - VERIFY: Validate results
 * - EXPLAIN: Provide explanation of actions
 *
 * Version: 13.0.0
 */
import { VibeProviderRouter } from '../providers/router.js';
import type { ToolDefinition, ToolResult } from '../tools/registry/index.js';
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
export type AgentPhase = 'plan' | 'propose' | 'approve' | 'execute' | 'verify' | 'explain';
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
export interface VibeAgent {
    name: string;
    description: string;
    phases: AgentPhase[];
    execute(task: AgentTask, context: AgentExecutionContext): Promise<AgentResult>;
}
/**
 * Base agent with common functionality
 */
declare abstract class BaseAgent implements VibeAgent {
    protected provider: VibeProviderRouter;
    abstract name: string;
    abstract description: string;
    abstract phases: AgentPhase[];
    protected constructor(provider: VibeProviderRouter);
    execute(task: AgentTask, context: AgentExecutionContext): Promise<AgentResult>;
    protected abstract run(task: AgentTask, context: AgentExecutionContext, steps: AgentStep[]): Promise<{
        success: boolean;
        output: string;
        error?: string;
        artifacts?: string[];
    }>;
}
export declare class AgentExecutionContext {
    workingDir: string;
    dryRun: boolean;
    sessionId: string;
    checkpointCreated: boolean;
    tools: Map<string, ToolDefinition>;
    results: ToolResult[];
    constructor(options?: {
        workingDir?: string;
        sessionId?: string;
        dryRun?: boolean;
    });
    getTool(name: string): ToolDefinition | undefined;
    executeTool(name: string, args: Record<string, unknown>): Promise<ToolResult>;
    createCheckpoint(description: string): Promise<string | null>;
    restoreCheckpoint(checkpointId: string): Promise<boolean>;
}
export declare class PlannerAgent extends BaseAgent {
    name: string;
    description: string;
    phases: AgentPhase[];
    constructor(provider: VibeProviderRouter);
    protected run(task: AgentTask, context: AgentExecutionContext, steps: AgentStep[]): Promise<{
        success: boolean;
        output: string;
        artifacts?: string[];
    }>;
    private buildPlanningPrompt;
    private getAvailableTools;
    private parsePlan;
    private formatPlan;
}
export declare class ExecutorAgent extends BaseAgent {
    private router;
    name: string;
    description: string;
    phases: AgentPhase[];
    constructor(router: VibeProviderRouter);
    protected run(task: AgentTask, context: AgentExecutionContext, steps: AgentStep[]): Promise<{
        success: boolean;
        output: string;
        error?: string;
        artifacts?: string[];
    }>;
    private parseExecution;
}
export declare class ReviewerAgent extends BaseAgent {
    private router;
    name: string;
    description: string;
    phases: AgentPhase[];
    constructor(router: VibeProviderRouter);
    protected run(task: AgentTask, context: AgentExecutionContext, steps: AgentStep[]): Promise<{
        success: boolean;
        output: string;
        error?: string;
    }>;
    private verifyResult;
    private explainResult;
}
export declare class VibeAgentExecutor {
    private agents;
    private defaultProvider;
    constructor(provider: VibeProviderRouter);
    /**
     * Register an agent
     */
    registerAgent(agent: VibeAgent): void;
    /**
     * Get an agent by name
     */
    getAgent(name: string): VibeAgent | undefined;
    /**
     * Execute a task with the full pipeline
     */
    execute(task: AgentTask, options?: {
        workingDir?: string;
        dryRun?: boolean;
    }): Promise<AgentResult>;
    /**
     * Execute with full pipeline (PLAN → PROPOSE → APPROVE → EXECUTE → VERIFY → EXPLAIN)
     */
    executePipeline(task: AgentTask, options?: {
        workingDir?: string;
        dryRun?: boolean;
    }): Promise<AgentResult>;
    private formatPipelineOutput;
    /**
     * Get list of all registered agents
     */
    listAgents(): VibeAgent[];
    /**
     * Get available tools from all agents
     */
    getAvailableTools(): ToolDefinition[];
}
export declare const agentExecutor: VibeAgentExecutor;
export { VibeAgentExecutor as VibeAgentSystem };
export type { AgentTask as VibeAgentTask, AgentResult as VibeAgentResult, AgentStep as VibeAgentStep, };
//# sourceMappingURL=index.d.ts.map