/**
 * Batch Mode - Process multiple prompts from file or stdin
 * Usage: vibe batch <file.txt> [--parallel] [--output dir]
 */

import * as fs from 'fs';
import * as path from 'path';
import { ApiClient } from '../../core/api';
import { tools, executeTool } from '../../tools';
import { VIBE_SYSTEM_PROMPT, DEFAULT_MODEL } from '../system-prompt';
import { createSession, addMessage, getMessages, toApiMessages } from '../../storage';
import pc from 'picocolors';

export interface BatchOptions {
  file?: string;
  parallel?: boolean;
  maxParallel?: number;
  outputDir?: string;
  autoApprove?: boolean;
  model?: string;
  provider?: string;
  format?: 'json' | 'text' | 'markdown';
}

export interface BatchResult {
  total: number;
  completed: number;
  failed: number;
  results: Array<{
    index: number;
    prompt: string;
    response: string;
    error?: string;
    duration: number;
  }>;
}

export async function batchMode(args: string[]): Promise<void> {
  const options = parseBatchArgs(args);
  
  if (!options.file) {
    console.error(pc.red('Usage: vibe batch <file.txt> [--parallel] [--output dir]'));
    process.exit(1);
  }

  if (!fs.existsSync(options.file)) {
    console.error(pc.red(`File not found: ${options.file}`));
    process.exit(1);
  }

  const prompts = loadPrompts(options.file);
  if (prompts.length === 0) {
    console.error(pc.red('No prompts found in file'));
    process.exit(1);
  }

  console.log(pc.cyan(`Processing ${prompts.length} prompts...`));
  
  const result = await executeBatch(prompts, options);
  
  // Output results
  if (options.outputDir) {
    await writeResults(result, options);
  }

  // Summary
  console.log(pc.cyan('\n━━━ Batch Complete ━━━'));
  console.log(`Total: ${result.total}`);
  console.log(pc.green(`Completed: ${result.completed}`));
  if (result.failed > 0) {
    console.log(pc.red(`Failed: ${result.failed}`));
  }

  process.exit(result.failed > 0 ? 1 : 0);
}

function parseBatchArgs(args: string[]): BatchOptions {
  const options: BatchOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--parallel' || arg === '-p') {
      options.parallel = true;
    } else if (arg === '--max-parallel' && args[i + 1]) {
      options.maxParallel = parseInt(args[++i], 10);
    } else if ((arg === '--output' || arg === '-o') && args[i + 1]) {
      options.outputDir = args[++i];
    } else if (arg === '--auto-approve' || arg === '-y') {
      options.autoApprove = true;
    } else if (arg === '--model' && args[i + 1]) {
      options.model = args[++i];
    } else if (arg === '--provider' && args[i + 1]) {
      options.provider = args[++i];
    } else if (arg === '--format' && args[i + 1]) {
      options.format = args[++i] as BatchOptions['format'];
    } else if (!arg.startsWith('-')) {
      options.file = arg;
    }
  }

  return options;
}

function loadPrompts(file: string): string[] {
  const content = fs.readFileSync(file, 'utf8');
  const ext = path.extname(file).toLowerCase();

  if (ext === '.json') {
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : data.prompts || [];
  }

  if (ext === '.jsonl') {
    return content
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const obj = JSON.parse(line);
        return obj.prompt || obj.text || obj;
      });
  }

  // Plain text: one prompt per line, or separated by ---
  if (content.includes('\n---\n')) {
    return content.split('\n---\n').map(p => p.trim()).filter(Boolean);
  }

  return content.split('\n').map(p => p.trim()).filter(Boolean);
}

async function executeBatch(prompts: string[], options: BatchOptions): Promise<BatchResult> {
  const result: BatchResult = {
    total: prompts.length,
    completed: 0,
    failed: 0,
    results: []
  };

  const client = new ApiClient();
  const model = options.model || DEFAULT_MODEL;

  if (options.parallel) {
    const maxParallel = options.maxParallel || 3;
    const chunks = chunkArray(prompts, maxParallel);

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map((prompt, i) => 
          executePrompt(client, model, prompt, prompts.indexOf(prompt), options)
        )
      );
      
      for (const r of chunkResults) {
        result.results.push(r);
        if (r.error) result.failed++;
        else result.completed++;
        
        const status = r.error ? pc.red('✗') : pc.green('✓');
        console.log(`${status} [${r.index + 1}/${prompts.length}] ${r.prompt.slice(0, 50)}...`);
      }
    }
  } else {
    for (let i = 0; i < prompts.length; i++) {
      const r = await executePrompt(client, model, prompts[i], i, options);
      result.results.push(r);
      
      if (r.error) result.failed++;
      else result.completed++;
      
      const status = r.error ? pc.red('✗') : pc.green('✓');
      console.log(`${status} [${i + 1}/${prompts.length}] ${prompts[i].slice(0, 50)}...`);
    }
  }

  return result;
}

async function executePrompt(
  client: ApiClient,
  model: string,
  prompt: string,
  index: number,
  options: BatchOptions
): Promise<BatchResult['results'][0]> {
  const startTime = Date.now();

  try {
    const session = createSession(model, client.getProvider());
    addMessage(session.id, 'system', VIBE_SYSTEM_PROMPT, Math.ceil(VIBE_SYSTEM_PROMPT.length / 4));
    addMessage(session.id, 'user', prompt, Math.ceil(prompt.length / 4));

    const messages = toApiMessages(getMessages(session.id));
    
    const response = await client.chat(messages, model, {
      temperature: 0.7,
      maxTokens: 4000
    });

    const reply = response.choices?.[0]?.message?.content || '';

    return {
      index,
      prompt,
      response: reply,
      duration: Date.now() - startTime
    };
  } catch (err: any) {
    return {
      index,
      prompt,
      response: '',
      error: err.message,
      duration: Date.now() - startTime
    };
  }
}

async function writeResults(result: BatchResult, options: BatchOptions): Promise<void> {
  const dir = options.outputDir!;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const format = options.format || 'json';

  if (format === 'json') {
    fs.writeFileSync(
      path.join(dir, 'results.json'),
      JSON.stringify(result, null, 2)
    );
  } else if (format === 'markdown') {
    const md = result.results.map(r => 
      `## Prompt ${r.index + 1}\n\n**Input:** ${r.prompt}\n\n**Output:**\n${r.response}\n\n---`
    ).join('\n\n');
    fs.writeFileSync(path.join(dir, 'results.md'), md);
  } else {
    for (const r of result.results) {
      fs.writeFileSync(
        path.join(dir, `${r.index + 1}.txt`),
        `Prompt: ${r.prompt}\n\nResponse:\n${r.response}`
      );
    }
  }

  console.log(pc.gray(`Results written to ${dir}/`));
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
