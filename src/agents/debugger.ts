import * as crypto from 'crypto';
import { BaseAgent } from './base-agent.js';
import { AgentTask, AgentStep, AgentPhase } from './types.js';
import { AgentExecutionContext } from './context.js';
import { VibeProviderRouter } from '../providers/router.js';

export interface DebuggerResult {
  rootCause: string;
  suggestedFix: string;
  stackTrace?: string;
  relevantFiles: string[];
  fixConfidence: number;
}

export class DebuggerAgent extends BaseAgent {
  name = 'debugger';
  description = 'Analyzes errors and suggests fixes';
  phases: AgentPhase[] = ['debug'];

  constructor(provider: VibeProviderRouter) {
    super(provider);
  }

  protected async run(
    task: AgentTask,
    context: AgentExecutionContext,
    steps: AgentStep[]
  ): Promise<{ success: boolean; output: string; artifacts?: string[] }> {
    const startTime = Date.now();
    const errorInfo = task.context.error as { message?: string; stack?: string; file?: string } || {};

    // Analyze the error
    const prompt = `
Analyze this error and provide debugging assistance:

Error: ${errorInfo.message || task.task}
${errorInfo.stack ? `Stack Trace:\n${errorInfo.stack}` : ''}
File: ${errorInfo.file || 'Unknown'}

Context:
${JSON.stringify(task.context, null, 2)}

Provide:
1. Root cause analysis
2. Suggested fix
3. List of relevant files that may need changes
4. Confidence level (0-1)

Respond with JSON: {rootCause, suggestedFix, relevantFiles: string[], fixConfidence}
    `.trim();

    const response = await this.provider.chat([
      { role: 'system', content: 'You are an expert debugger. Analyze errors and provide clear fixes.' },
      { role: 'user', content: prompt },
    ]);

    // Parse the response
    let debugResult: DebuggerResult = {
      rootCause: 'Unable to determine root cause',
      suggestedFix: 'Manual investigation required',
      relevantFiles: [],
      fixConfidence: 0,
    };

    try {
      const jsonMatch = response?.content?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        debugResult = { ...debugResult, ...JSON.parse(jsonMatch[0]) };
      }
    } catch {
      // Fallback to raw response
      debugResult.rootCause = response?.content || 'Unknown error';
    }

    steps.push({
      id: crypto.randomUUID(),
      phase: 'debug',
      action: 'Analyze error and suggest fix',
      result: `Root cause: ${debugResult.rootCause}\nFix: ${debugResult.suggestedFix}`,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    });

    return {
      success: true,
      output: `Debug Analysis:\n\nRoot Cause: ${debugResult.rootCause}\n\nSuggested Fix: ${debugResult.suggestedFix}\n\nConfidence: ${(debugResult.fixConfidence * 100).toFixed(0)}%`,
      artifacts: [JSON.stringify(debugResult, null, 2)],
    };
  }
}
