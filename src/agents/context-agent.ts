import * as crypto from 'crypto';
import { BaseAgent } from './base-agent.js';
import { AgentTask, AgentStep, AgentPhase } from './types.js';
import { AgentExecutionContext } from './context.js';
import { VibeProviderRouter } from '../providers/router.js';
import { VibeMemoryManager } from '../memory/index.js';

export interface ContextResult {
  relevantContext: string[];
  indexedFiles: number;
  semanticMatches: ContextMatch[];
  contextCoverage: number;
}

export interface ContextMatch {
  file: string;
  relevance: number;
  excerpt: string;
}

export class ContextAgent extends BaseAgent {
  name = 'context';
  description = 'Manages semantic indexing and context retrieval';
  phases: AgentPhase[] = ['context'];

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
    const query = task.context.query as string || task.task;

    // Retrieve relevant context from memory
    const relevantDocs = this.memory.search(query);

    const prompt = `
Given this query: ${query}

And these context documents:
${relevantDocs.map((d: { content: string }) => `- ${d.content.slice(0, 200)}...`).join('\n')}

Identify the most relevant context and provide:
1. Key context points
2. Files that should be indexed
3. Semantic matches
4. Context coverage score (0-1)

Respond with JSON: {relevantContext: string[], indexedFiles, semanticMatches: [{file, relevance, excerpt}], contextCoverage}
    `.trim();

    const response = await this.provider.chat([
      { role: 'system', content: 'You are a context agent that manages semantic understanding.' },
      { role: 'user', content: prompt },
    ]);

    let contextResult: ContextResult = {
      relevantContext: relevantDocs.map((d: { content: string }) => d.content),
      indexedFiles: relevantDocs.length,
      semanticMatches: [],
      contextCoverage: 0.5,
    };

    try {
      const jsonMatch = response?.content?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        contextResult = { ...contextResult, ...parsed };
      }
    } catch {
      // Use defaults
    }

    steps.push({
      id: crypto.randomUUID(),
      phase: 'context',
      action: 'Retrieve relevant context',
      result: `Found ${contextResult.relevantContext.length} context items, ${contextResult.indexedFiles} files indexed`,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    });

    return {
      success: true,
      output: `Context Retrieval:\n\nRelevant Context: ${contextResult.relevantContext.length} items\nFiles Indexed: ${contextResult.indexedFiles}\nCoverage: ${(contextResult.contextCoverage * 100).toFixed(0)}%`,
      artifacts: [JSON.stringify(contextResult, null, 2)],
    };
  }
}
