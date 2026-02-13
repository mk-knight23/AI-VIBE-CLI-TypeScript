import * as crypto from 'crypto';
import { BaseAgent } from './base-agent.js';
import { AgentTask, AgentStep, AgentPhase } from './types.js';
import { AgentExecutionContext } from './context.js';
import { VibeProviderRouter } from '../providers/router.js';
import { VibeMemoryManager } from '../memory/index.js';

export interface LearningResult {
  knowledgeGained: string;
  patternsLearned: string[];
  suggestions: string[];
  confidenceBoost: number;
}

export class LearningAgent extends BaseAgent {
  name = 'learn';
  description = 'Learns from interactions and improves over time';
  phases: AgentPhase[] = ['learn'];

  constructor(
    provider: VibeProviderRouter,
    private memory: VibeMemoryManager
  ) {
    super(provider);
  }

  protected async run(
    task: AgentTask,
    context: AgentExecutionContext,
    steps: AgentStep[]
  ): Promise<{ success: boolean; output: string; artifacts?: string[] }> {
    const startTime = Date.now();

    // Extract learning from the task and context
    const prompt = `
Learn from this interaction and improve future responses:

Task: ${task.task}
Context: ${JSON.stringify(task.context, null, 2)}

What can be learned from this interaction?
Provide:
1. Key knowledge gained
2. Patterns observed
3. Suggestions for improvement
4. Confidence boost (0-1)

Respond with JSON: {knowledgeGained, patternsLearned: string[], suggestions: string[], confidenceBoost}
    `.trim();

    const response = await this.provider.chat([
      { role: 'system', content: 'You are a learning agent that improves from interactions.' },
      { role: 'user', content: prompt },
    ]);

    let learningResult: LearningResult = {
      knowledgeGained: 'General pattern recognition',
      patternsLearned: [],
      suggestions: [],
      confidenceBoost: 0,
    };

    try {
      const jsonMatch = response?.content?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        learningResult = { ...learningResult, ...JSON.parse(jsonMatch[0]) };
      }
    } catch {
      learningResult.knowledgeGained = response?.content || 'No new learning';
    }

    // Store the learning in memory
    this.memory.add({
      type: 'action',
      content: learningResult.knowledgeGained,
      tags: ['learning', ...learningResult.patternsLearned],
      source: 'inference',
    });

    steps.push({
      id: crypto.randomUUID(),
      phase: 'learn',
      action: 'Extract and store knowledge',
      result: `Learned: ${learningResult.knowledgeGained.slice(0, 100)}...`,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    });

    return {
      success: true,
      output: `Learning Complete:\n\nKnowledge Gained: ${learningResult.knowledgeGained}\nPatterns: ${learningResult.patternsLearned.length}\nSuggestions: ${learningResult.suggestions.length}`,
      artifacts: [JSON.stringify(learningResult, null, 2)],
    };
  }
}
