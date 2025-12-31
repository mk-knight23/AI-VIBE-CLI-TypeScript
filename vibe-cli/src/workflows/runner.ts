/**
 * Workflow Runner - Execute workflow definitions
 */

import { ApiClient } from '../core/api';
import { AgentExecutor } from '../agents/executor';
import { WorkflowDefinition, WorkflowContext, WorkflowResult, WorkflowStep } from './types';
import pc from 'picocolors';

interface RunnerOptions {
  verbose?: boolean;
  autoApprove?: boolean;
  maxParallel?: number;
  onStepStart?: (step: WorkflowStep, index: number) => void;
  onStepComplete?: (step: WorkflowStep, index: number, result: unknown) => void;
  onApproval?: (tool: string, params: Record<string, unknown>) => Promise<boolean>;
  onCheckpoint?: (step: WorkflowStep, index: number, message: string) => Promise<boolean>;
}

export class WorkflowRunner {
  private executor: AgentExecutor;

  constructor(client: ApiClient, model: string, sessionId: string) {
    this.executor = new AgentExecutor(client, model, sessionId);
  }

  async run(workflow: WorkflowDefinition, inputs: Record<string, unknown> = {}, options: RunnerOptions = {}): Promise<WorkflowResult> {
    const startTime = Date.now();
    const settings = workflow.settings || {};
    
    const context: WorkflowContext = {
      inputs,
      outputs: {},
      variables: { ...inputs },
      currentStep: 0,
      errors: [],
      checkpoints: []
    };

    const result: WorkflowResult = {
      success: true,
      outputs: {},
      steps: [],
      duration: 0
    };

    if (options.verbose) {
      console.log(pc.cyan(`\n━━━ Workflow: ${workflow.name} ━━━\n`));
    }

    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      context.currentStep = i;

      // Check condition
      if (step.condition && !this.evaluateCondition(step.condition, context)) {
        result.steps.push({
          step: i,
          agent: step.agent,
          status: 'skipped',
          duration: 0
        });
        continue;
      }

      // Handle approval checkpoint
      if (step.requiresApproval && !settings.autoApprove && !options.autoApprove) {
        const message = step.approvalMessage || `Approve step ${i + 1}: ${step.agent}?`;
        
        if (options.onCheckpoint) {
          const approved = await options.onCheckpoint(step, i, message);
          context.checkpoints.push({ step: i, approved, timestamp: Date.now() });
          
          if (!approved) {
            result.steps.push({
              step: i,
              agent: step.agent,
              status: 'denied',
              duration: 0
            });
            result.success = false;
            break;
          }
        } else if (options.verbose) {
          console.log(pc.yellow(`⚠️  Checkpoint: ${message} (auto-skipped)`));
        }
      }

      options.onStepStart?.(step, i);
      
      if (options.verbose) {
        console.log(pc.blue(`\n[${i + 1}/${workflow.steps.length}] ${step.agent}`));
      }

      const stepStart = Date.now();

      // Handle parallel steps
      if (step.parallel && step.parallel.length > 0) {
        const parallelResult = await this.executeParallel(step.parallel, context, options, settings.maxParallel || 3);
        const stepDuration = Date.now() - stepStart;
        
        result.steps.push({
          step: i,
          agent: step.agent,
          status: parallelResult.allSuccess ? 'completed' : 'failed',
          duration: stepDuration,
          parallelResults: parallelResult.results
        });

        if (!parallelResult.allSuccess && step.onError === 'stop') {
          result.success = false;
          break;
        }

        // Merge parallel outputs
        for (const pr of parallelResult.results) {
          if (pr.output) {
            context.variables[`parallel_${pr.agent}`] = pr.output;
          }
        }
        continue;
      }

      // Execute single step
      let retries = 0;
      let stepResult: unknown;
      let stepError: string | undefined;

      while (retries <= (step.maxRetries || 0)) {
        try {
          const taskInput = this.resolveInput(step.input, context);
          const timeout = step.timeout || settings.defaultTimeout || 180000;
          
          const execution = await Promise.race([
            this.executor.execute(step.agent, {
              task: taskInput,
              params: context.variables as Record<string, unknown>
            }, {
              autoApprove: options.autoApprove,
              verbose: options.verbose,
              onApproval: options.onApproval
            }),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Step timeout')), timeout)
            )
          ]);

          if (execution.status === 'completed') {
            stepResult = execution.output?.data;
            stepError = undefined;
            break;
          } else {
            stepError = execution.steps.find(s => s.error)?.error || 'Step failed';
            retries++;
          }
        } catch (err: unknown) {
          stepError = err instanceof Error ? err.message : String(err);
          retries++;
        }
      }

      const stepDuration = Date.now() - stepStart;

      if (stepError) {
        result.steps.push({
          step: i,
          agent: step.agent,
          status: 'failed',
          duration: stepDuration,
          error: stepError
        });

        context.errors.push({ step: i, error: stepError });

        if (step.onError === 'stop') {
          result.success = false;
          break;
        }
      } else {
        result.steps.push({
          step: i,
          agent: step.agent,
          status: 'completed',
          duration: stepDuration,
          output: stepResult
        });

        // Store output
        if (step.output) {
          context.outputs[step.output] = stepResult;
          context.variables[step.output] = stepResult;
        }
        context.variables['$prev'] = { output: stepResult };

        options.onStepComplete?.(step, i, stepResult);
      }
    }

    result.duration = Date.now() - startTime;
    result.outputs = context.outputs;

    if (options.verbose) {
      console.log(pc.cyan(`\n━━━ Workflow Complete ━━━`));
      console.log(`Duration: ${result.duration}ms`);
      console.log(`Success: ${result.success}`);
    }

    return result;
  }

  private async executeParallel(
    steps: WorkflowStep[],
    context: WorkflowContext,
    options: RunnerOptions,
    maxParallel: number
  ): Promise<{ allSuccess: boolean; results: Array<{ agent: string; status: string; output?: unknown }> }> {
    const results: Array<{ agent: string; status: string; output?: unknown }> = [];
    
    // Chunk steps for parallel execution
    const chunks: WorkflowStep[][] = [];
    for (let i = 0; i < steps.length; i += maxParallel) {
      chunks.push(steps.slice(i, i + maxParallel));
    }

    for (const chunk of chunks) {
      const promises = chunk.map(async (step) => {
        try {
          const taskInput = this.resolveInput(step.input, context);
          const execution = await this.executor.execute(step.agent, {
            task: taskInput,
            params: context.variables as Record<string, unknown>
          }, {
            autoApprove: options.autoApprove,
            verbose: false
          });

          return {
            agent: step.agent,
            status: execution.status === 'completed' ? 'completed' : 'failed',
            output: execution.output?.data
          };
        } catch (err) {
          return {
            agent: step.agent,
            status: 'failed',
            output: undefined
          };
        }
      });

      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults);
    }

    return {
      allSuccess: results.every(r => r.status === 'completed'),
      results
    };
  }

  private resolveInput(input: string | Record<string, unknown> | undefined, context: WorkflowContext): string {
    if (!input) return '';
    
    if (typeof input === 'string') {
      return this.interpolate(input, context.variables);
    }
    
    return JSON.stringify(input);
  }

  private interpolate(template: string, vars: Record<string, unknown>): string {
    return template.replace(/\$(\w+)|\$\{([^}]+)\}|\$prev\.(\w+)/g, (_, simple, braced, prev) => {
      const key = simple || braced || (prev ? `$prev.${prev}` : '');
      
      if (key.startsWith('$prev.')) {
        const prevData = vars['$prev'] as Record<string, unknown> | undefined;
        const subKey = key.slice(6);
        return prevData?.[subKey] !== undefined ? String(prevData[subKey]) : '';
      }
      
      return vars[key] !== undefined ? String(vars[key]) : '';
    });
  }

  private evaluateCondition(condition: string, context: WorkflowContext): boolean {
    // Simple condition evaluation
    const interpolated = this.interpolate(condition, context.variables);
    
    // Handle basic comparisons
    if (interpolated.includes('==')) {
      const [left, right] = interpolated.split('==').map(s => s.trim());
      return left === right;
    }
    if (interpolated.includes('!=')) {
      const [left, right] = interpolated.split('!=').map(s => s.trim());
      return left !== right;
    }
    
    // Truthy check
    return Boolean(interpolated && interpolated !== 'false' && interpolated !== '0');
  }
}
