import * as crypto from 'crypto';
import { BaseAgent } from './base-agent.js';
import { AgentTask, AgentStep, AgentPhase, ToolResult } from './types.js';
import { AgentExecutionContext } from './context.js';
import { VibeProviderRouter } from '../providers/router.js';

export class ReviewerAgent extends BaseAgent {
  name = 'reviewer';
  description = 'Reviews and validates code changes';
  phases: AgentPhase[] = ['verify', 'explain'];

  constructor(provider: VibeProviderRouter) {
    super(provider);
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

  private verifyResult(result: any | undefined): { valid: boolean; message: string } {
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
    result: any | undefined,
    verification: { valid: boolean; message: string }
  ): Promise<string> {
    const prompt = `
Task: ${task.task}

Result: ${JSON.stringify(result, null, 2)}

Verification: ${verification.message}

Explain what was done and why. Keep it concise and actionable.
    `.trim();

    const response = await this.provider.chat([
      { role: 'system', content: 'You are a helpful assistant that explains code changes.' },
      { role: 'user', content: prompt },
    ]);

    return response?.content || 'Execution completed.';
  }
}
