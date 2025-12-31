/**
 * Analysis Pipeline - Data analysis, comparison, extraction
 * Enables: analytics extraction, spreadsheet reasoning, comparison matrices
 */

import { AgentExecutor } from '../agents/executor';
import { ApiClient } from '../core/api';
import { exportToStructured } from '../output/export';
import pc from 'picocolors';

export interface AnalysisQuery {
  type: 'compare' | 'extract' | 'summarize' | 'trend' | 'matrix';
  data: string | string[] | Record<string, unknown>[];
  criteria?: string[];
  outputFormat?: 'json' | 'csv' | 'table' | 'markdown';
}

export interface AnalysisResult {
  type: string;
  output: unknown;
  formatted: string;
  insights: string[];
  metadata: { duration: number };
}

export async function runAnalysisPipeline(
  query: AnalysisQuery,
  client: ApiClient,
  model: string,
  sessionId: string
): Promise<AnalysisResult> {
  const startTime = Date.now();
  const executor = new AgentExecutor(client, model, sessionId);

  console.log(pc.cyan(`\n━━━ Analysis: ${query.type} ━━━\n`));

  let output: unknown;
  let insights: string[] = [];

  const dataStr = typeof query.data === 'string' 
    ? query.data 
    : JSON.stringify(query.data, null, 2);

  switch (query.type) {
    case 'compare': {
      const result = await executor.execute('analyst', {
        task: `Compare the following items${query.criteria ? ` based on: ${query.criteria.join(', ')}` : ''}:\n${dataStr}\n\nProvide a structured comparison with pros/cons for each.`,
        params: {}
      }, { autoApprove: true });
      output = result.output?.data;
      break;
    }

    case 'extract': {
      const result = await executor.execute('analyst', {
        task: `Extract structured data from:\n${dataStr}\n\n${query.criteria ? `Focus on: ${query.criteria.join(', ')}` : 'Extract all key information'}. Return as JSON.`,
        params: {}
      }, { autoApprove: true });
      try {
        const text = String(result.output?.data || '{}');
        const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
        output = jsonMatch ? JSON.parse(jsonMatch[1] || jsonMatch[0]) : text;
      } catch {
        output = result.output?.data;
      }
      break;
    }

    case 'matrix': {
      const items = Array.isArray(query.data) ? query.data : [query.data];
      const criteria = query.criteria || ['quality', 'cost', 'complexity'];
      
      const result = await executor.execute('analyst', {
        task: `Create a comparison matrix for:\nItems: ${items.join(', ')}\nCriteria: ${criteria.join(', ')}\n\nRate each item 1-5 on each criterion. Return as JSON array.`,
        params: {}
      }, { autoApprove: true });
      
      try {
        const text = String(result.output?.data || '[]');
        const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\[[\s\S]*\]/);
        output = jsonMatch ? JSON.parse(jsonMatch[1] || jsonMatch[0]) : [];
      } catch {
        output = [];
      }
      break;
    }

    case 'trend':
    case 'summarize':
    default: {
      const result = await executor.execute('analyst', {
        task: `Analyze and ${query.type} the following data:\n${dataStr}\n\nProvide key insights and patterns.`,
        params: {}
      }, { autoApprove: true });
      output = result.output?.data;
    }
  }

  // Extract insights
  const insightResult = await executor.execute('summarizer', {
    task: `Extract 3-5 key insights from this analysis:\n${JSON.stringify(output)}`,
    params: {}
  }, { autoApprove: true, maxSteps: 3 });

  const insightText = String(insightResult.output?.data || '');
  insights = insightText.split('\n')
    .filter(l => l.trim().match(/^[-•\d]/))
    .map(l => l.replace(/^[-•\d.)\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 5);

  // Format output
  const format = query.outputFormat || 'json';
  let formatted: string;
  
  if (Array.isArray(output) && output.length > 0 && typeof output[0] === 'object') {
    formatted = exportToStructured(output, format === 'markdown' ? 'table' : format as any);
  } else {
    formatted = typeof output === 'string' ? output : JSON.stringify(output, null, 2);
  }

  console.log(pc.green(`\n✓ Analysis complete\n`));

  return {
    type: query.type,
    output,
    formatted,
    insights,
    metadata: { duration: Date.now() - startTime }
  };
}
