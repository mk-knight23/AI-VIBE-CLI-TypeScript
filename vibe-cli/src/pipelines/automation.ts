/**
 * Automation Pipeline - DevOps, CI/CD, workflow automation
 * Enables: DevOps reasoning, CI automation, infrastructure tasks
 */

import { AgentExecutor } from '../agents/executor';
import { ApiClient } from '../core/api';
import { executeTool } from '../tools';
import pc from 'picocolors';

export interface AutomationTask {
  type: 'ci' | 'deploy' | 'docker' | 'script' | 'infra';
  action: string;
  target?: string;
  dryRun?: boolean;
  params?: Record<string, unknown>;
}

export interface AutomationResult {
  type: string;
  action: string;
  success: boolean;
  output: string;
  artifacts?: string[];
  commands?: string[];
  metadata: { duration: number };
}

export async function runAutomationPipeline(
  task: AutomationTask,
  client: ApiClient,
  model: string,
  sessionId: string
): Promise<AutomationResult> {
  const startTime = Date.now();
  const executor = new AgentExecutor(client, model, sessionId);
  const commands: string[] = [];
  const artifacts: string[] = [];

  console.log(pc.cyan(`\n━━━ Automation: ${task.type}/${task.action} ━━━\n`));

  // Plan the automation
  const planResult = await executor.execute('planner', {
    task: `Plan automation for: ${task.type} - ${task.action}${task.target ? ` targeting ${task.target}` : ''}\n\nProvide step-by-step commands needed. Consider error handling.`,
    params: task.params || {}
  }, { autoApprove: true, maxSteps: 3 });

  const plan = String(planResult.output?.data || '');
  
  // Extract commands from plan
  const cmdMatches = plan.match(/```(?:bash|sh|shell)?\n([\s\S]*?)```/g) || [];
  for (const match of cmdMatches) {
    const cmd = match.replace(/```(?:bash|sh|shell)?\n?/g, '').trim();
    commands.push(...cmd.split('\n').filter(l => l.trim() && !l.startsWith('#')));
  }

  let output = plan;
  let success = true;

  // Execute if not dry run
  if (!task.dryRun && commands.length > 0) {
    console.log(pc.yellow(`Executing ${commands.length} commands...`));
    
    for (const cmd of commands.slice(0, 10)) { // Limit to 10 commands
      console.log(pc.gray(`$ ${cmd}`));
      
      try {
        const result = await executeTool('run_shell_command', { 
          command: cmd,
          description: `Automation: ${task.action}`
        });
        output += `\n\n$ ${cmd}\n${result}`;
      } catch (err) {
        output += `\n\n$ ${cmd}\nError: ${(err as Error).message}`;
        success = false;
        break;
      }
    }
  } else if (task.dryRun) {
    console.log(pc.yellow('Dry run - commands not executed'));
    output = `DRY RUN - Would execute:\n${commands.map(c => `$ ${c}`).join('\n')}`;
  }

  // Generate artifacts for certain types
  if (task.type === 'docker' && !task.dryRun) {
    const dockerResult = await executor.execute('builder', {
      task: `Generate a Dockerfile for: ${task.action}${task.target ? ` (${task.target})` : ''}`,
      params: {}
    }, { autoApprove: true, maxSteps: 3 });
    
    const dockerfile = String(dockerResult.output?.data || '');
    if (dockerfile.includes('FROM')) {
      artifacts.push('Dockerfile');
    }
  }

  if (task.type === 'ci') {
    const ciResult = await executor.execute('builder', {
      task: `Generate a GitHub Actions workflow for: ${task.action}`,
      params: {}
    }, { autoApprove: true, maxSteps: 3 });
    
    const workflow = String(ciResult.output?.data || '');
    if (workflow.includes('jobs:')) {
      artifacts.push('.github/workflows/ci.yml');
    }
  }

  console.log(pc.green(`\n✓ Automation ${success ? 'complete' : 'failed'}\n`));

  return {
    type: task.type,
    action: task.action,
    success,
    output,
    artifacts: artifacts.length > 0 ? artifacts : undefined,
    commands: commands.length > 0 ? commands : undefined,
    metadata: { duration: Date.now() - startTime }
  };
}
