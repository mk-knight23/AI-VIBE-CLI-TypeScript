/**
 * Quick Agent Commands - Shorthand commands for common agent tasks
 */

import { ApiClient } from '../core/api';
import { AgentExecutor } from '../agents/executor';
import { formatOutput } from '../output/formatters';
import { loadConfig } from '../config/loader';
import pc from 'picocolors';
import * as readline from 'readline';

interface QuickCommandOptions {
  output?: string;
  format?: 'markdown' | 'json' | 'table' | 'csv';
  verbose?: boolean;
  autoApprove?: boolean;
}

async function runAgent(
  agentName: string,
  task: string,
  options: QuickCommandOptions = {}
): Promise<void> {
  const { config } = loadConfig();
  const client = new ApiClient();
  const sessionId = `quick-${Date.now()}`;
  const model = config?.model || 'gpt-4';
  const executor = new AgentExecutor(client, model, sessionId);

  console.log(pc.cyan(`\n━━━ ${agentName} agent ━━━\n`));
  console.log(pc.dim(`Task: ${task}\n`));

  const onApproval = async (tool: string, params: Record<string, unknown>): Promise<boolean> => {
    if (options.autoApprove) return true;
    
    console.log(pc.yellow(`\n⚠️  Tool requires approval: ${tool}`));
    console.log(pc.dim(JSON.stringify(params, null, 2)));
    
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
      rl.question('Allow? [y/n/s(ession)] ', answer => {
        rl.close();
        resolve(answer.toLowerCase().startsWith('y') || answer.toLowerCase() === 's');
      });
    });
  };

  try {
    const execution = await executor.execute(agentName, { task }, {
      verbose: options.verbose ?? true,
      autoApprove: options.autoApprove,
      onApproval,
      onStep: (step) => {
        if (options.verbose) {
          console.log(pc.yellow(`💭 ${step.thought}`));
          if (step.action !== 'complete') {
            console.log(pc.blue(`⚡ ${step.action}`));
          }
        }
      }
    });

    console.log(pc.cyan('\n━━━ Result ━━━\n'));

    const format = options.format || 'markdown';
    const output = formatOutput(execution.output?.data, format);
    console.log(output);

    if (options.output) {
      const fs = await import('fs');
      fs.writeFileSync(options.output, output);
      console.log(pc.green(`\n✅ Output saved to ${options.output}`));
    }

    console.log(pc.dim(`\nDuration: ${execution.output?.metadata.duration}ms`));

  } catch (err: unknown) {
    console.log(pc.red(`\n❌ Error: ${err instanceof Error ? err.message : String(err)}`));
    process.exit(1);
  }
}

export async function planCommand(args: string[], options: QuickCommandOptions = {}): Promise<void> {
  const task = args.join(' ');
  if (!task) {
    console.log('Usage: vibe plan <goal>');
    console.log('Example: vibe plan "migrate from JavaScript to TypeScript"');
    return;
  }
  await runAgent('planner', task, options);
}

export async function researchCommand(args: string[], options: QuickCommandOptions = {}): Promise<void> {
  const topic = args.join(' ');
  if (!topic) {
    console.log('Usage: vibe research <topic>');
    console.log('Example: vibe research "best practices for React state management"');
    return;
  }
  await runAgent('researcher', topic, options);
}

export async function analyzeCommand(args: string[], options: QuickCommandOptions = {}): Promise<void> {
  const target = args.join(' ');
  if (!target) {
    console.log('Usage: vibe analyze <target>');
    console.log('Example: vibe analyze "src/components for code quality"');
    return;
  }
  await runAgent('analyst', target, options);
}

export async function buildCommand(args: string[], options: QuickCommandOptions = {}): Promise<void> {
  const task = args.join(' ');
  if (!task) {
    console.log('Usage: vibe build <task>');
    console.log('Example: vibe build "a REST API endpoint for user authentication"');
    return;
  }
  await runAgent('builder', task, options);
}

export async function reviewCommand(args: string[], options: QuickCommandOptions = {}): Promise<void> {
  const target = args.join(' ');
  if (!target) {
    console.log('Usage: vibe review <target>');
    console.log('Example: vibe review "src/api/auth.ts"');
    return;
  }
  await runAgent('reviewer', target, options);
}

export async function summarizeCommand(args: string[], options: QuickCommandOptions = {}): Promise<void> {
  const target = args.join(' ');
  if (!target) {
    console.log('Usage: vibe summarize <content>');
    console.log('Example: vibe summarize "README.md"');
    return;
  }
  await runAgent('summarizer', target, options);
}

export async function auditCommand(args: string[], options: QuickCommandOptions = {}): Promise<void> {
  const target = args.join(' ') || '.';
  await runAgent('auditor', `Security audit of ${target}`, options);
}
