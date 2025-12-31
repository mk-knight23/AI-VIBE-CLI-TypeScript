/**
 * Agent Executor - Executes agents with tool access and delegation
 */

import { ApiClient } from '../core/api';
import { executeTool, tools } from '../tools';
import { getPermission, shouldPrompt, setPermission } from '../permissions';
import { AgentDefinition, AgentContext, AgentInput, AgentOutput, AgentStep, AgentExecution, OutputFormat } from './types';
import { getAgentRegistry } from './registry';
import pc from 'picocolors';

interface ExecutorOptions {
  autoApprove?: boolean;
  maxSteps?: number;
  verbose?: boolean;
  onStep?: (step: AgentStep) => void;
  onApproval?: (tool: string, params: Record<string, unknown>) => Promise<boolean>;
}

export class AgentExecutor {
  private client: ApiClient;
  private model: string;
  private sessionId: string;

  constructor(client: ApiClient, model: string, sessionId: string) {
    this.client = client;
    this.model = model;
    this.sessionId = sessionId;
  }

  async execute(agentName: string, input: AgentInput, options: ExecutorOptions = {}): Promise<AgentExecution> {
    const registry = getAgentRegistry();
    const agent = registry.get(agentName);
    
    if (!agent) {
      throw new Error(`Agent not found: ${agentName}`);
    }

    const execution: AgentExecution = {
      agentName,
      input,
      steps: [],
      status: 'running',
      startTime: Date.now()
    };

    const maxSteps = options.maxSteps || 10;
    const availableTools = this.filterTools(agent.tools);

    const messages = [
      { role: 'system', content: this.buildSystemPrompt(agent, availableTools) },
      { role: 'user', content: this.buildTaskPrompt(input) }
    ];

    try {
      for (let i = 0; i < maxSteps; i++) {
        const step = await this.executeStep(agent, messages, availableTools, options);
        execution.steps.push(step);
        options.onStep?.(step);

        if (step.action === 'complete' || step.action === 'delegate') {
          break;
        }

        if (step.error) {
          messages.push({ role: 'assistant', content: JSON.stringify(step) });
          messages.push({ role: 'user', content: `Error: ${step.error}. Try a different approach.` });
        } else {
          messages.push({ role: 'assistant', content: JSON.stringify(step) });
          messages.push({ role: 'user', content: `Result: ${JSON.stringify(step.result)}` });
        }

        if (Date.now() - execution.startTime > agent.timeout) {
          execution.status = 'failed';
          break;
        }
      }

      execution.endTime = Date.now();
      execution.status = execution.steps.some(s => s.action === 'complete') ? 'completed' : 'failed';
      execution.output = this.buildOutput(agent, execution);

    } catch (err: unknown) {
      execution.status = 'failed';
      execution.endTime = Date.now();
      const lastStep: AgentStep = {
        thought: 'Execution failed',
        action: 'error',
        error: err instanceof Error ? err.message : String(err),
        timestamp: Date.now()
      };
      execution.steps.push(lastStep);
    }

    return execution;
  }

  private buildSystemPrompt(agent: AgentDefinition, availableTools: string[]): string {
    return `${agent.systemPrompt}

Available tools: ${availableTools.join(', ')}

Respond in JSON format:
{
  "thought": "your reasoning",
  "action": "tool_name or 'complete' or 'delegate'",
  "params": { ... },
  "delegateTo": "agent_name (if action is delegate)"
}

When task is complete, use action: "complete" with your final answer in params.result`;
  }

  private buildTaskPrompt(input: AgentInput): string {
    let prompt = `Task: ${input.task}`;
    if (input.params) {
      prompt += `\n\nParameters: ${JSON.stringify(input.params, null, 2)}`;
    }
    return prompt;
  }

  private filterTools(agentTools: string[]): string[] {
    const allToolNames = tools.map(t => t.name);
    return agentTools.filter(t => allToolNames.includes(t));
  }

  private async executeStep(
    agent: AgentDefinition,
    messages: Array<{ role: string; content: string }>,
    availableTools: string[],
    options: ExecutorOptions
  ): Promise<AgentStep> {
    const response = await this.client.chat(messages, this.model, {
      temperature: 0.7,
      maxTokens: 2000
    });

    const content = response.choices?.[0]?.message?.content || '';
    
    try {
      const parsed = JSON.parse(content);
      const step: AgentStep = {
        thought: parsed.thought || '',
        action: parsed.action || 'complete',
        params: parsed.params,
        timestamp: Date.now()
      };

      if (options.verbose) {
        console.log(pc.yellow(`💭 ${step.thought}`));
        console.log(pc.blue(`⚡ ${step.action}`));
      }

      if (step.action === 'complete') {
        step.result = parsed.params?.result || parsed.result;
        return step;
      }

      if (step.action === 'delegate') {
        step.result = await this.handleDelegation(agent, parsed.delegateTo, parsed.params, options);
        return step;
      }

      if (!availableTools.includes(step.action)) {
        step.error = `Tool not available: ${step.action}`;
        return step;
      }

      // Permission check
      const tool = tools.find(t => t.name === step.action);
      if (tool?.requiresConfirmation && !options.autoApprove) {
        if (shouldPrompt(step.action, this.sessionId)) {
          const approved = options.onApproval 
            ? await options.onApproval(step.action, step.params || {})
            : false;
          
          if (!approved) {
            step.error = 'Tool execution denied by user';
            return step;
          }
          setPermission(step.action, 'allow_session', this.sessionId);
        }
      }

      step.result = await executeTool(step.action, step.params || {});
      return step;

    } catch {
      return {
        thought: 'Failed to parse response',
        action: 'error',
        error: 'Invalid JSON response from model',
        timestamp: Date.now()
      };
    }
  }

  private async handleDelegation(
    parent: AgentDefinition,
    targetAgent: string,
    params: Record<string, unknown>,
    options: ExecutorOptions
  ): Promise<unknown> {
    if (!parent.canDelegate.includes(targetAgent)) {
      return { error: `Cannot delegate to ${targetAgent}` };
    }

    const subExecution = await this.execute(targetAgent, {
      task: params.task as string,
      params
    }, { ...options, maxSteps: 5 });

    return subExecution.output?.data || { error: 'Delegation failed' };
  }

  private buildOutput(agent: AgentDefinition, execution: AgentExecution): AgentOutput {
    const lastComplete = execution.steps.find(s => s.action === 'complete');
    const format: OutputFormat = agent.outputs[0] || 'markdown';

    return {
      type: format,
      data: lastComplete?.result || this.summarizeSteps(execution.steps),
      metadata: {
        agent: agent.name,
        timestamp: new Date().toISOString(),
        duration: (execution.endTime || Date.now()) - execution.startTime,
        delegatedTo: execution.steps
          .filter(s => s.action === 'delegate')
          .map(s => s.params?.delegateTo as string)
          .filter(Boolean)
      }
    };
  }

  private summarizeSteps(steps: AgentStep[]): string {
    return steps
      .filter(s => s.thought)
      .map(s => `- ${s.thought}`)
      .join('\n');
  }
}
