/**
 * LLM Executor for Autonomous Loop
 *
 * Executes LLM requests for autonomous development loops.
 * Handles prompt building, token tracking, error handling, and retries.
 */

import { CompletionPrimitive } from '../completion.js';
import { createLogger } from '../../../utils/pino-logger.js';
import { configManager } from '../../../infrastructure/config/config-system.js';

const logger = createLogger('llm-executor');

export interface LLMExecutorOptions {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface LLMExecutionResult {
  response: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: number;
  provider: string;
  model: string;
}

export interface LLMExecutorContext {
  task: string;
  iteration: number;
  previousIterations: Array<{
    iteration: number;
    response: string;
    timestamp: Date;
  }>;
  sessionHistory: string;
  projectInfo?: {
    type: string;
    framework: string;
    language: string;
  };
}

export class LLMExecutor {
  private completion: CompletionPrimitive;
  private totalTokensUsed = 0;
  private totalCost = 0;

  constructor(private options: LLMExecutorOptions = {}) {
    this.completion = new CompletionPrimitive();

    // Default options
    this.options = {
      maxTokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7,
      timeoutMs: options.timeoutMs || 120000,
      maxRetries: options.maxRetries || 3,
    };
  }

  /**
   * Execute LLM request with context
   */
  async execute(context: LLMExecutorContext): Promise<LLMExecutionResult> {
    const prompt = this.buildPrompt(context);
    const systemPrompt = this.buildSystemPrompt(context);

    logger.info({
      iteration: context.iteration,
      promptLength: prompt.length,
      maxTokens: this.options.maxTokens,
    }, 'Executing LLM request');

    let lastError: Error | null = null;
    let attempt = 0;

    // Retry logic for transient failures
    while (attempt < (this.options.maxRetries || 3)) {
      try {
        const startTime = Date.now();

        const result = await this.completion.execute({
          prompt,
          options: {
            maxTokens: this.options.maxTokens,
            temperature: this.options.temperature,
            systemPrompt,
          },
        });

        const duration = Date.now() - startTime;

        if (!result.success || !result.data) {
          throw new Error(result.error || 'LLM request failed');
        }

        // Extract response and usage
        const response = result.data.text || result.data.response || '';
        const usage = result.data.usage || {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        };

        // Calculate cost
        const cost = this.calculateCost(usage, result.data.model || 'unknown');

        // Track totals
        this.totalTokensUsed += usage.totalTokens;
        this.totalCost += cost;

        logger.info({
          iteration: context.iteration,
          duration,
          usage,
          cost,
          totalTokensUsed: this.totalTokensUsed,
          totalCost: this.totalCost,
        }, 'LLM request completed');

        return {
          response,
          usage,
          cost,
          provider: result.data.provider || 'unknown',
          model: result.data.model || 'unknown',
        };
      } catch (error: any) {
        lastError = error;
        attempt++;

        logger.warn({
          iteration: context.iteration,
          attempt,
          error: error.message,
        }, 'LLM request failed, retrying');

        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }

        // Exponential backoff
        if (attempt < (this.options.maxRetries || 3)) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }

    // All retries exhausted
    throw new Error(
      `LLM request failed after ${attempt} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Build prompt with context
   */
  private buildPrompt(context: LLMExecutorContext): string {
    const sections: string[] = [];

    // Context header
    sections.push('# Autonomous Development Context');
    sections.push(`Iteration: ${context.iteration}`);

    // Session history (last few iterations)
    if (context.previousIterations.length > 0) {
      sections.push('\n# Recent Work');
      const recentIterations = context.previousIterations.slice(-5);
      for (const iter of recentIterations) {
        sections.push(`\n## Iteration ${iter.iteration}`);
        sections.push(iter.response.substring(0, 500)); // Truncate long responses
        if (iter.response.length > 500) {
          sections.push('...[truncated]');
        }
      }
    }

    // Session history (full context)
    if (context.sessionHistory) {
      sections.push('\n# Session History');
      sections.push(context.sessionHistory.substring(0, 2000)); // Limit context length
      if (context.sessionHistory.length > 2000) {
        sections.push('\n...[context truncated]');
      }
    }

    // Project context
    if (context.projectInfo) {
      sections.push('\n# Project Context');
      sections.push(`Type: ${context.projectInfo.type}`);
      sections.push(`Framework: ${context.projectInfo.framework}`);
      sections.push(`Language: ${context.projectInfo.language}`);
    }

    // Task
    sections.push('\n# Task');
    sections.push(context.task);

    // Instructions
    sections.push('\n# Instructions');
    sections.push('You are an autonomous AI developer working on this task.');
    sections.push('Continue from where previous iterations left off.');
    sections.push('Use tools to read, edit, and test code.');
    sections.push('Report your progress clearly.');
    sections.push('When the task is complete, include EXIT_SIGNAL in your response.');
    sections.push('\nYour response:');

    return sections.join('\n');
  }

  /**
   * Build system prompt
   */
  private buildSystemPrompt(context: LLMExecutorContext): string {
    let prompt = 'You are VIBE CLI, an autonomous AI development assistant.\n\n';

    prompt += '## Your Role\n';
    prompt += 'Work systematically through software development tasks.\n';
    prompt += 'Use tools to read files, edit code, run tests, and verify your work.\n';
    prompt += 'Report your progress clearly and concisely.\n\n';

    prompt += '## Working Style\n';
    prompt += '- Be methodical and thorough\n';
    prompt += '- Test your changes before moving on\n';
    prompt += '- Follow best practices for the project\n';
    prompt += '- Handle errors gracefully\n';
    prompt += '- Ask for clarification if stuck\n\n';

    prompt += '## Completion Criteria\n';
    prompt += 'Include EXIT_SIGNAL in your response when:\n';
    prompt += '- All task requirements are met\n';
    prompt += '- Tests pass\n';
    prompt += '- Code is clean and follows best practices\n';
    prompt += '- Documentation is updated if needed\n';
    prompt += '- No obvious issues remain\n\n';

    prompt += '## Response Format\n';
    prompt += 'Provide clear updates on:\n';
    prompt += '- What you did in this iteration\n';
    prompt += '- Files you modified\n';
    prompt += '- Tests you ran\n';
    prompt += '- Any issues encountered\n';
    prompt += '- What you plan to do next\n\n';

    if (context.projectInfo) {
      prompt += `## Project Context\n`;
      prompt += `This is a ${context.projectInfo.type} project`;
      if (context.projectInfo.framework !== 'unknown') {
        prompt += ` using ${context.projectInfo.framework}`;
      }
      prompt += ` with ${context.projectInfo.language}.\n`;
    }

    return prompt;
  }

  /**
   * Check if error is non-retryable
   */
  private isNonRetryableError(error: Error): boolean {
    const nonRetryablePatterns = [
      'authentication',
      'authorization',
      'invalid api key',
      'quota exceeded',
      'rate limit',
      'credits exhausted',
      'billing',
    ];

    const message = error.message.toLowerCase();
    return nonRetryablePatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Calculate cost from token usage
   */
  private calculateCost(
    usage: { promptTokens: number; completionTokens: number; totalTokens: number },
    model: string
  ): number {
    // Rough cost estimates (will vary by provider)
    const costs: Record<string, { input: number; output: number }> = {
      'claude-3-5-sonnet': { input: 0.000003, output: 0.000015 },
      'claude-3-5-haiku': { input: 0.0000008, output: 0.000004 },
      'claude-3-opus': { input: 0.000015, output: 0.000075 },
      'gpt-4': { input: 0.00003, output: 0.00006 },
      'gpt-4-turbo': { input: 0.00001, output: 0.00003 },
      'gpt-3.5-turbo': { input: 0.0000005, output: 0.0000015 },
    };

    const pricing = costs[model] || costs['gpt-4-turbo']; // Default to GPT-4-turbo pricing

    const inputCost = usage.promptTokens * pricing.input;
    const outputCost = usage.completionTokens * pricing.output;

    return inputCost + outputCost;
  }

  /**
   * Get total statistics
   */
  getStats() {
    return {
      totalTokensUsed: this.totalTokensUsed,
      totalCost: this.totalCost,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.totalTokensUsed = 0;
    this.totalCost = 0;
  }
}
