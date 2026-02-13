import { BaseAgent } from './base-agent.js';
import { AgentTask, AgentStep, AgentPhase } from './types.js';
import { AgentExecutionContext } from './context.js';
import { VibeProviderRouter } from '../providers/router.js';

export class ExecutorAgent extends BaseAgent {
  name = 'executor';
  description = 'Executes tools and commands';
  phases: AgentPhase[] = ['execute'];

  constructor(provider: VibeProviderRouter) {
    super(provider);
  }

  protected async run(
    task: AgentTask,
    context: AgentExecutionContext,
    steps: AgentStep[]
  ): Promise<{ success: boolean; output: string; error?: string; artifacts?: string[] }> {
    const _startTime = Date.now();

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
      approved: true,
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
    const taskLower = task.task.toLowerCase();

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

    return { tool: 'shell_exec', args: { command: task.task } };
  }
}
