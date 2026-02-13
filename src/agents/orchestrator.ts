import * as crypto from 'crypto';
import { VibeProviderRouter } from '../providers/router.js';
import { VibeMemoryManager } from '../memory/index.js';
import { toolRegistry, sandbox } from '../tools/index.js';
import { approvalManager } from '../approvals/index.js';
import { AgentTask, AgentResult, AgentStep, VibeAgent, ExecutionPlan } from './types.js';
import { AgentExecutionContext } from './context.js';
import { PlannerAgent } from './planner.js';
import { ExecutorAgent } from './executor.js';
import { ReviewerAgent } from './reviewer.js';
import { DebuggerAgent } from './debugger.js';
import { RefactorAgent } from './refactor.js';
import { LearningAgent } from './learn.js';
import { ContextAgent } from './context-agent.js';

export class VibeAgentExecutor {
  private agents: Map<string, VibeAgent> = new Map();
  private defaultProvider: VibeProviderRouter;

  constructor(provider: VibeProviderRouter, memory?: VibeMemoryManager) {
    this.defaultProvider = provider;

    // Register built-in agents
    this.registerAgent(new PlannerAgent(provider));
    this.registerAgent(new ExecutorAgent(provider));
    this.registerAgent(new ReviewerAgent(provider));
    this.registerAgent(new DebuggerAgent(provider));
    this.registerAgent(new RefactorAgent(provider));
    this.registerAgent(new LearningAgent(provider, memory || new VibeMemoryManager()));
    this.registerAgent(new ContextAgent(provider, memory || new VibeMemoryManager()));
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
  getAvailableTools() {
    return toolRegistry.list();
  }
}
