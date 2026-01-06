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

import * as crypto from 'crypto';
import { VibeProviderRouter } from '../providers/router.js';
import { VibeMemoryManager } from '../memory/index.js';
import { toolRegistry, checkpointSystem, sandbox } from '../tools/index.js';
import { approvalManager } from '../approvals/index.js';
import type { ToolDefinition, ToolResult, ToolContext } from '../tools/registry/index.js';

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// BASE AGENT
// ============================================================================

export interface VibeAgent {
  name: string;
  description: string;
  phases: AgentPhase[];
  execute(task: AgentTask, context: AgentExecutionContext): Promise<AgentResult>;
}

/**
 * Base agent with common functionality
 */
abstract class BaseAgent implements VibeAgent {
  abstract name: string;
  abstract description: string;
  abstract phases: AgentPhase[];

  protected constructor(protected provider: VibeProviderRouter) {}

  async execute(task: AgentTask, context: AgentExecutionContext): Promise<AgentResult> {
    const startTime = Date.now();
    const steps: AgentStep[] = [];

    try {
      const result = await this.run(task, context, steps);
      return {
        success: result.success,
        output: result.output,
        error: result.error,
        steps,
        artifacts: result.artifacts,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        steps,
      };
    }
  }

  protected abstract run(
    task: AgentTask,
    context: AgentExecutionContext,
    steps: AgentStep[]
  ): Promise<{ success: boolean; output: string; error?: string; artifacts?: string[] }>;
}

// ============================================================================
// AGENT EXECUTION CONTEXT
// ============================================================================

export class AgentExecutionContext {
  workingDir: string;
  dryRun: boolean = false;
  sessionId: string;
  checkpointCreated: boolean = false;
  tools: Map<string, ToolDefinition> = new Map();
  results: ToolResult[] = [];

  constructor(options: { workingDir?: string; sessionId?: string; dryRun?: boolean } = {}) {
    this.workingDir = options.workingDir || process.cwd();
    this.sessionId = options.sessionId || crypto.randomUUID();
    this.dryRun = options.dryRun || false;

    // Load available tools
    for (const tool of toolRegistry.list()) {
      this.tools.set(tool.name, tool);
    }
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  async executeTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, output: '', error: `Tool not found: ${name}`, duration: 0 };
    }

    const context: ToolContext = {
      workingDir: this.workingDir,
      dryRun: this.dryRun,
      sandbox: sandbox.getConfig().enabled,
      sessionId: this.sessionId,
      approvalSystem: {
        async request(description: string, operations: string[], risk: 'low' | 'medium' | 'high' | 'critical'): Promise<boolean> {
          return approvalManager.request(description, operations, risk);
        },
      },
    };

    const result = await tool.handler(args, context);
    this.results.push(result);
    return result;
  }

  async createCheckpoint(description: string): Promise<string | null> {
    return checkpointSystem.createSync(this.sessionId, description) || null;
  }

  async restoreCheckpoint(checkpointId: string): Promise<boolean> {
    return checkpointSystem.restoreSync(checkpointId);
  }
}

// ============================================================================
// PLANNER AGENT
// ============================================================================

export class PlannerAgent extends BaseAgent {
  name = 'planner';
  description = 'Creates execution plans for complex tasks';
  phases: AgentPhase[] = ['plan', 'propose'];

  constructor(provider: VibeProviderRouter) {
    super(provider);
  }

  protected async run(
    task: AgentTask,
    context: AgentExecutionContext,
    steps: AgentStep[]
  ): Promise<{ success: boolean; output: string; artifacts?: string[] }> {
    const startTime = Date.now();

    // Generate plan using LLM
    const prompt = this.buildPlanningPrompt(task);
    const availableTools = this.getAvailableTools();

    const response = await this.provider.chat([
      { role: 'system', content: 'You are a planning agent. Create detailed execution plans.' },
      { role: 'user', content: prompt },
    ]);

    if (!response || response.provider === 'none') {
      return {
        success: false,
        output: '',
      };
    }

    // Parse the plan (simplified - in production would use structured output)
    const plan = this.parsePlan(response.content, availableTools);

    steps.push({
      id: crypto.randomUUID(),
      phase: 'plan',
      action: 'Generate execution plan',
      result: `Created plan with ${plan.steps.length} steps`,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    });

    return {
      success: true,
      output: this.formatPlan(plan),
      artifacts: [JSON.stringify(plan, null, 2)],
    };
  }

  private buildPlanningPrompt(task: AgentTask): string {
    const availableTools = this.getAvailableTools();
    return `
Task: ${task.task}

Context:
${JSON.stringify(task.context, null, 2)}

Available Tools:
${availableTools}

Create an execution plan with the following structure:
1. Step-by-step breakdown
2. For each step, specify the tool to use and arguments
3. Identify any risky operations that need approval
4. Estimate overall risk level (low/medium/high/critical)

Respond with a JSON object containing:
- steps: array of {description, tool, args, reason}
- tools: array of tool names used
- estimatedRisk: risk level

Only respond with the JSON, no other text.
    `.trim();
  }

  private getAvailableTools(): string {
    return toolRegistry.list()
      .map(t => `- ${t.name}: ${t.description} (risk: ${t.riskLevel})`)
      .join('\n');
  }

  private parsePlan(content: string, availableTools: string): ExecutionPlan {
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as ExecutionPlan;
      }
    } catch {
      // Ignore parsing errors
    }

    // Fallback: return a basic plan
    return {
      steps: [{
        description: `Execute: ${content.slice(0, 100)}...`,
        tool: 'shell_exec',
        args: { command: `echo "${content.slice(0, 200)}..."` },
        reason: 'Fallback execution',
      }],
      tools: ['shell_exec'],
      estimatedRisk: 'medium',
    };
  }

  private formatPlan(plan: ExecutionPlan): string {
    const lines = [
      `Execution Plan (Risk: ${plan.estimatedRisk.toUpperCase()})`,
      '',
      `Tools: ${plan.tools.join(', ')}`,
      '',
      'Steps:',
    ];

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      lines.push(`${i + 1}. ${step.description}`);
      lines.push(`   Tool: ${step.tool}`);
      lines.push(`   Reason: ${step.reason}`);
      lines.push('');
    }

    return lines.join('\n');
  }
}

// ============================================================================
// EXECUTOR AGENT
// ============================================================================

export class ExecutorAgent extends BaseAgent {
  name = 'executor';
  description = 'Executes tools and commands';
  phases: AgentPhase[] = ['execute'];

  constructor(private router: VibeProviderRouter) {
    super(router);
  }

  protected async run(
    task: AgentTask,
    context: AgentExecutionContext,
    steps: AgentStep[]
  ): Promise<{ success: boolean; output: string; error?: string; artifacts?: string[] }> {
    const startTime = Date.now();

    // Create checkpoint if requested
    if (task.checkpoint !== false) {
      const checkpointId = await context.createCheckpoint(`Before: ${task.task.slice(0, 50)}`);
      if (checkpointId) {
        context.checkpointCreated = true;
      }
    }

    // Parse task to extract tool execution
    const execution = this.parseExecution(task);

    if (!execution.tool) {
      return {
        success: false,
        output: '',
        error: 'No tool specified in task',
      };
    }

    // Execute the tool
    const stepStart = Date.now();
    const result = await context.executeTool(execution.tool, execution.args);

    steps.push({
      id: crypto.randomUUID(),
      phase: 'execute',
      action: `Execute ${execution.tool}`,
      result: result.success ? result.output : `Error: ${result.error}`,
      approved: true, // Already approved by planner or auto-approved
      timestamp: new Date(),
      duration: Date.now() - stepStart,
    });

    if (!result.success) {
      return {
        success: false,
        output: result.output,
        error: result.error,
      };
    }

    return {
      success: true,
      output: result.output,
      artifacts: result.filesChanged,
    };
  }

  private parseExecution(task: AgentTask): { tool: string; args: Record<string, unknown> } {
    // Try to extract tool info from task
    // This is simplified - in production would use structured parsing

    const taskLower = task.task.toLowerCase();

    // Detect common operations
    if (taskLower.includes('read') || taskLower.includes('cat')) {
      const pathMatch = task.task.match(/(?:read|cat)\s+([^\s]+)/i);
      return { tool: 'file_read', args: { path: pathMatch?.[1] || task.task } };
    }

    if (taskLower.includes('write') || taskLower.includes('create') || taskLower.includes('add')) {
      const pathMatch = task.task.match(/create\s+(?:file\s+)?([^\s]+)/i);
      const contentMatch = task.task.match(/with\s+`([^`]+)`/s) || task.task.match(/containing\s+["']([^"']+)["']/s);
      return {
        tool: 'file_write',
        args: {
          path: pathMatch?.[1] || 'new-file.txt',
          content: contentMatch?.[1] || '# New file\n',
        },
      };
    }

    if (taskLower.includes('run') || taskLower.includes('execute') || taskLower.includes('command')) {
      const cmdMatch = task.task.match(/(?:run|execute)\s+(.+)/i);
      return { tool: 'shell_exec', args: { command: cmdMatch?.[1] || task.task } };
    }

    if (taskLower.includes('search') || taskLower.includes('find')) {
      const patternMatch = task.task.match(/(?:search|find)\s+(?:for\s+)?["']?([^"'\n]+)["']?/i);
      return { tool: 'file_search', args: { pattern: patternMatch?.[1] || task.task } };
    }

    // Default: use shell for complex tasks
    return { tool: 'shell_exec', args: { command: task.task } };
  }
}

// ============================================================================
// REVIEWER AGENT
// ============================================================================

export class ReviewerAgent extends BaseAgent {
  name = 'reviewer';
  description = 'Reviews and validates code changes';
  phases: AgentPhase[] = ['verify', 'explain'];

  constructor(private router: VibeProviderRouter) {
    super(router);
  }

  protected async run(
    task: AgentTask,
    context: AgentExecutionContext,
    steps: AgentStep[]
  ): Promise<{ success: boolean; output: string; error?: string }> {
    const startTime = Date.now();

    // Get recent results
    const results = context.results;
    const lastResult = results[results.length - 1];

    // Verify the result
    const verification = this.verifyResult(lastResult);

    steps.push({
      id: crypto.randomUUID(),
      phase: 'verify',
      action: 'Verify execution result',
      result: verification.message,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    });

    // Generate explanation
    const explainStart = Date.now();
    const explanation = await this.explainResult(task, lastResult, verification);

    steps.push({
      id: crypto.randomUUID(),
      phase: 'explain',
      action: 'Explain actions taken',
      result: explanation,
      timestamp: new Date(),
      duration: Date.now() - explainStart,
    });

    return {
      success: verification.valid,
      output: `Verification: ${verification.message}\n\nExplanation:\n${explanation}`,
      error: verification.valid ? undefined : 'Verification failed',
    };
  }

  private verifyResult(result: ToolResult | undefined): { valid: boolean; message: string } {
    if (!result) {
      return { valid: false, message: 'No results to verify' };
    }

    if (!result.success) {
      return { valid: false, message: `Execution failed: ${result.error}` };
    }

    if (!result.output || result.output.trim() === '') {
      return { valid: false, message: 'No output produced' };
    }

    return { valid: true, message: 'Execution completed successfully' };
  }

  private async explainResult(
    task: AgentTask,
    result: ToolResult | undefined,
    verification: { valid: boolean; message: string }
  ): Promise<string> {
    const prompt = `
Task: ${task.task}

Result: ${JSON.stringify(result, null, 2)}

Verification: ${verification.message}

Explain what was done and why. Keep it concise and actionable.
    `.trim();

    const response = await this.router.chat([
      { role: 'system', content: 'You are a helpful assistant that explains code changes.' },
      { role: 'user', content: prompt },
    ]);

    return response?.content || 'Execution completed.';
  }
}

// ============================================================================
// AGENT EXECUTOR (ORCHESTRATOR)
// ============================================================================

export class VibeAgentExecutor {
  private agents: Map<string, VibeAgent> = new Map();
  private defaultProvider: VibeProviderRouter;

  constructor(provider: VibeProviderRouter) {
    this.defaultProvider = provider;

    // Register built-in agents
    this.registerAgent(new PlannerAgent(provider));
    this.registerAgent(new ExecutorAgent(provider));
    this.registerAgent(new ReviewerAgent(provider));
  }

  /**
   * Register an agent
   */
  registerAgent(agent: VibeAgent): void {
    this.agents.set(agent.name, agent);
  }

  /**
   * Get an agent by name
   */
  getAgent(name: string): VibeAgent | undefined {
    return this.agents.get(name);
  }

  /**
   * Execute a task with the full pipeline
   */
  async execute(task: AgentTask, options: { workingDir?: string; dryRun?: boolean } = {}): Promise<AgentResult> {
    const context = new AgentExecutionContext({
      workingDir: options.workingDir,
      dryRun: options.dryRun,
    });

    const planner = this.agents.get('planner');
    const executor = this.agents.get('executor');
    const reviewer = this.agents.get('reviewer');

    if (!planner || !executor || !reviewer) {
      return {
        success: false,
        output: '',
        error: 'Required agents not registered',
        steps: [],
      };
    }

    // Phase 1: Plan
    const planResult = await planner.execute(task, context);

    if (!planResult.success) {
      return {
        success: false,
        output: planResult.output,
        error: planResult.error,
        steps: planResult.steps,
      };
    }

    // Phase 2: Execute
    const execTask: AgentTask = {
      ...task,
      context: {
        ...task.context,
        plan: planResult.artifacts?.[0],
      },
    };

    const execResult = await executor.execute(execTask, context);

    // Phase 3: Review (Verify + Explain)
    const reviewResult = await reviewer.execute(execTask, context);

    return {
      success: execResult.success && reviewResult.success,
      output: `Plan:\n${planResult.output}\n\nExecution:\n${execResult.output}\n\nReview:\n${reviewResult.output}`,
      error: execResult.error || reviewResult.error,
      steps: [...planResult.steps, ...execResult.steps, ...reviewResult.steps],
      artifacts: execResult.artifacts,
    };
  }

  /**
   * Execute with full pipeline (PLAN → PROPOSE → APPROVE → EXECUTE → VERIFY → EXPLAIN)
   */
  async executePipeline(task: AgentTask, options: { workingDir?: string; dryRun?: boolean } = {}): Promise<AgentResult> {
    const context = new AgentExecutionContext({
      workingDir: options.workingDir,
      dryRun: options.dryRun,
    });

    const planner = this.agents.get('planner');
    const executor = this.agents.get('executor');
    const reviewer = this.agents.get('reviewer');

    if (!planner || !executor || !reviewer) {
      return this.execute(task, options);
    }

    const allSteps: AgentStep[] = [];
    const startTime = Date.now();

    // Step 1: PLAN
    const planResult = await planner.execute(task, context);
    allSteps.push(...planResult.steps);

    if (!planResult.success) {
      return { success: false, output: planResult.output, steps: allSteps, error: planResult.error };
    }

    // Step 2: PROPOSE (show what will be done)
    const plan = planResult.artifacts?.[0] ? JSON.parse(planResult.artifacts[0]) as ExecutionPlan : null;

    // Step 3: APPROVE (if needed)
    if (plan && plan.estimatedRisk !== 'low' && task.approvalMode === 'prompt') {
      const approved = await approvalManager.request(
        `Execute plan with ${plan.steps.length} steps`,
        plan.steps.map(s => `${s.tool}: ${s.description}`),
        plan.estimatedRisk
      );

      if (!approved) {
        allSteps.push({
          id: crypto.randomUUID(),
          phase: 'approve',
          action: 'Request approval',
          result: 'Operation cancelled by user',
          approved: false,
          timestamp: new Date(),
          duration: Date.now() - startTime,
        });

        return {
          success: false,
          output: 'Operation cancelled',
          steps: allSteps,
          error: 'User declined approval',
        };
      }
    }

    // Step 4: EXECUTE
    const execTask: AgentTask = {
      ...task,
      checkpoint: true,
    };
    const execResult = await executor.execute(execTask, context);
    allSteps.push(...execResult.steps);

    if (!execResult.success) {
      return {
        success: false,
        output: execResult.output,
        steps: allSteps,
        error: execResult.error,
        artifacts: execResult.artifacts,
      };
    }

    // Step 5: VERIFY
    // Step 6: EXPLAIN
    const reviewResult = await reviewer.execute(execTask, context);
    allSteps.push(...reviewResult.steps);

    return {
      success: execResult.success && reviewResult.success,
      output: this.formatPipelineOutput(planResult, execResult, reviewResult),
      steps: allSteps,
      error: execResult.error || reviewResult.error,
      artifacts: execResult.artifacts,
    };
  }

  private formatPipelineOutput(
    plan: AgentResult,
    exec: AgentResult,
    review: AgentResult
  ): string {
    return `
╔═══════════════════════════════════════════════════════════════════════╗
║  AGENT PIPELINE COMPLETE                                             ║
╚═══════════════════════════════════════════════════════════════════════╝

PLAN:
${plan.output}

EXECUTION:
${exec.output}

REVIEW:
${review.output}
    `.trim();
  }

  /**
   * Get list of all registered agents
   */
  listAgents(): VibeAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get available tools from all agents
   */
  getAvailableTools(): ToolDefinition[] {
    return toolRegistry.list();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const agentExecutor = new VibeAgentExecutor(new VibeProviderRouter());
export { VibeAgentExecutor as VibeAgentSystem };
export type {
  AgentTask as VibeAgentTask,
  AgentResult as VibeAgentResult,
  AgentStep as VibeAgentStep,
};
