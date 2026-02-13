import { randomUUID } from 'crypto';
import { BaseAgent } from './base-agent.js';
import { AgentTask, AgentStep, AgentPhase, ExecutionPlan } from './types.js';
import { AgentExecutionContext } from './context.js';
import { VibeProviderRouter } from '../providers/router.js';
import { toolRegistry } from '../tools/index.js';

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
    const _startTime = Date.now();

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

    // Parse the plan
    const plan = this.parsePlan(response.content, availableTools);

    steps.push({
      id: randomUUID(),
      phase: 'plan',
      action: 'Generate execution plan',
      result: `Created plan with ${plan.steps.length} steps`,
      timestamp: new Date(),
      duration: Date.now() - _startTime,
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

  private parsePlan(content: string, _availableTools: string): ExecutionPlan {
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
