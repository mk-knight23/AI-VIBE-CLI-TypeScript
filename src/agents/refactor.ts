import * as crypto from 'crypto';
import { BaseAgent } from './base-agent.js';
import { AgentTask, AgentStep, AgentPhase } from './types.js';
import { AgentExecutionContext } from './context.js';
import { VibeProviderRouter } from '../providers/router.js';

export interface RefactorResult {
  patterns: string[];
  changes: RefactorChange[];
  estimatedComplexity: 'low' | 'medium' | 'high';
  breakingChanges: string[];
}

export interface RefactorChange {
  file: string;
  description: string;
  before: string;
  after: string;
  rationale: string;
}

export class RefactorAgent extends BaseAgent {
  name = 'refactor';
  description = 'Identifies patterns and refactors code';
  phases: AgentPhase[] = ['refactor'];

  constructor(provider: VibeProviderRouter) {
    super(provider);
  }

  protected async run(
    task: AgentTask,
    context: AgentExecutionContext,
    steps: AgentStep[]
  ): Promise<{ success: boolean; output: string; artifacts?: string[] }> {
    const startTime = Date.now();
    const targetFile = task.context.file as string || '';
    const patternType = task.context.pattern as string || 'general';

    const prompt = `
Refactor task: ${task.task}

Target file: ${targetFile}
Pattern type: ${patternType}

Analyze the code and identify refactoring opportunities:
1. Code smells or anti-patterns
2. Potential improvements
3. Breaking changes (if any)
4. Estimated complexity

Respond with JSON: {patterns: string[], changes: [{file, description, before, after, rationale}], estimatedComplexity, breakingChanges: string[]}
    `.trim();

    const response = await this.provider.chat([
      { role: 'system', content: 'You are an expert code refactorer. Identify patterns and improve code quality.' },
      { role: 'user', content: prompt },
    ]);

    let refactorResult: RefactorResult = {
      patterns: ['General code improvement'],
      changes: [],
      estimatedComplexity: 'medium',
      breakingChanges: [],
    };

    try {
      const jsonMatch = response?.content?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        refactorResult = { ...refactorResult, ...JSON.parse(jsonMatch[0]) };
      }
    } catch {
      refactorResult.patterns = [response?.content || 'No patterns identified'];
    }

    steps.push({
      id: crypto.randomUUID(),
      phase: 'refactor',
      action: 'Identify refactoring patterns',
      result: `Found ${refactorResult.patterns.length} patterns, ${refactorResult.changes.length} changes proposed`,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    });

    return {
      success: true,
      output: `Refactoring Analysis:\n\nPatterns Found:\n${refactorResult.patterns.map(p => `- ${p}`).join('\n')}\n\nProposed Changes: ${refactorResult.changes.length}\nComplexity: ${refactorResult.estimatedComplexity.toUpperCase()}`,
      artifacts: [JSON.stringify(refactorResult, null, 2)],
    };
  }
}
