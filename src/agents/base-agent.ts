import * as crypto from 'crypto';
import { VibeProviderRouter } from '../providers/router.js';
import { AgentTask, AgentResult, AgentStep, AgentPhase, VibeAgent } from './types.js';
import { AgentExecutionContext } from './context.js';

/**
 * Base agent with common functionality
 */
export abstract class BaseAgent implements VibeAgent {
  abstract name: string;
  abstract description: string;
  abstract phases: AgentPhase[];

  protected constructor(protected provider: VibeProviderRouter) { }

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
