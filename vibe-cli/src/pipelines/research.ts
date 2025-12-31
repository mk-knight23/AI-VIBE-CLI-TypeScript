/**
 * Research Pipeline - Multi-source research with synthesis
 * Enables: research pipelines, knowledge extraction, fact verification
 */

import { AgentExecutor } from '../agents/executor';
import { ApiClient } from '../core/api';
import { getProjectMemory } from '../memory/project-memory';
import pc from 'picocolors';

export interface ResearchQuery {
  topic: string;
  sources?: ('web' | 'files' | 'memory')[];
  depth?: 'quick' | 'standard' | 'deep';
  outputFormat?: 'summary' | 'report' | 'bullets' | 'json';
}

export interface ResearchResult {
  topic: string;
  summary: string;
  findings: Array<{
    source: string;
    content: string;
    confidence: number;
  }>;
  recommendations?: string[];
  metadata: {
    sourcesSearched: number;
    duration: number;
    depth: string;
  };
}

export async function runResearchPipeline(
  query: ResearchQuery,
  client: ApiClient,
  model: string,
  sessionId: string
): Promise<ResearchResult> {
  const startTime = Date.now();
  const executor = new AgentExecutor(client, model, sessionId);
  const memory = getProjectMemory();
  
  const sources = query.sources || ['web', 'files', 'memory'];
  const depth = query.depth || 'standard';
  const findings: ResearchResult['findings'] = [];

  console.log(pc.cyan(`\n━━━ Research: ${query.topic} ━━━\n`));

  // Phase 1: Gather from sources
  for (const source of sources) {
    console.log(pc.gray(`Searching ${source}...`));
    
    try {
      if (source === 'memory') {
        const memResults = memory.search(query.topic, { limit: 5 });
        for (const entry of memResults) {
          findings.push({
            source: `memory:${entry.type}`,
            content: entry.content,
            confidence: entry.confidence
          });
        }
      } else {
        const result = await executor.execute('researcher', {
          task: `Research "${query.topic}" using ${source} sources. Depth: ${depth}`,
          params: { source, depth }
        }, { autoApprove: true, maxSteps: depth === 'deep' ? 8 : 4 });

        if (result.output?.data) {
          findings.push({
            source,
            content: String(result.output.data),
            confidence: 0.8
          });
        }
      }
    } catch (err) {
      console.log(pc.yellow(`  ${source}: skipped (${(err as Error).message})`));
    }
  }

  // Phase 2: Synthesize findings
  console.log(pc.gray('Synthesizing findings...'));
  
  const synthesisResult = await executor.execute('summarizer', {
    task: `Synthesize these research findings about "${query.topic}" into a coherent summary:\n${findings.map(f => `[${f.source}]: ${f.content}`).join('\n\n')}`,
    params: { format: query.outputFormat || 'summary' }
  }, { autoApprove: true });

  const summary = String(synthesisResult.output?.data || 'No synthesis available');

  // Phase 3: Extract recommendations if deep
  let recommendations: string[] | undefined;
  if (depth === 'deep') {
    const recResult = await executor.execute('strategist', {
      task: `Based on this research about "${query.topic}", provide actionable recommendations:\n${summary}`,
      params: {}
    }, { autoApprove: true });
    
    const recText = String(recResult.output?.data || '');
    recommendations = recText.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('•')).map(l => l.replace(/^[-•]\s*/, ''));
  }

  // Store in memory
  memory.add({
    type: 'fact',
    content: `Research on "${query.topic}": ${summary.slice(0, 200)}...`,
    tags: ['research', query.topic.toLowerCase().split(' ')[0]],
    confidence: 0.7,
    source: 'research-pipeline'
  });
  memory.save();

  const result: ResearchResult = {
    topic: query.topic,
    summary,
    findings,
    recommendations,
    metadata: {
      sourcesSearched: sources.length,
      duration: Date.now() - startTime,
      depth
    }
  };

  console.log(pc.green(`\n✓ Research complete (${result.metadata.duration}ms)\n`));
  return result;
}
