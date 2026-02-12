/**
 * Context Builder
 *
 * Builds context from previous iterations for LLM consumption.
 * Handles summarization, token counting, and context window management.
 */

import { Session, Iteration, ContextBuilderConfig } from './session-types.js';

const DEFAULT_CONFIG: ContextBuilderConfig = {
  maxHistoryLength: 10,
  summarizeAfter: 5,
  includeTests: true,
  includeErrors: true,
  maxTokens: 50000,
  tokensPerChar: 0.25, // Rough approximation: 1 token ≈ 4 characters
};

export class ContextBuilder {
  private config: ContextBuilderConfig;

  constructor(config?: Partial<ContextBuilderConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Build context from session iterations
   */
  buildContext(session: Session): string {
    const parts: string[] = [];

    // Add task context
    parts.push(this.buildTaskContext(session));

    // Add iteration history
    parts.push(this.buildIterationHistory(session));

    // Add summary if available
    if (session.context.summary) {
      parts.push(this.buildSummaryContext(session));
    }

    // Combine and trim to token limit
    let context = parts.join('\n\n');
    context = this.trimToTokenLimit(context);

    return context;
  }

  /**
   * Build task context
   */
  private buildTaskContext(session: Session): string {
    const lines: string[] = [];

    lines.push('# Task Context');
    lines.push(`**Task**: ${session.context.task}`);
    lines.push(`**Session ID**: ${session.id}`);
    lines.push(`**Iteration**: ${session.iterations.length} completed`);

    if (session.context.objectives.length > 0) {
      lines.push('\n**Objectives**:');
      session.context.objectives.forEach(obj => {
        lines.push(`  - ${obj}`);
      });
    }

    if (session.context.completed.length > 0) {
      lines.push('\n**Completed**:');
      session.context.completed.slice(-10).forEach(item => {
        lines.push(`  ✅ ${item}`);
      });
    }

    if (session.context.inProgress.length > 0) {
      lines.push('\n**In Progress**:');
      session.context.inProgress.forEach(item => {
        lines.push(`  🔄 ${item}`);
      });
    }

    if (session.context.blocked.length > 0) {
      lines.push('\n**Blocked**:');
      session.context.blocked.forEach(item => {
        lines.push(`  🚫 ${item}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Build iteration history
   */
  private buildIterationHistory(session: Session): string {
    const lines: string[] = [];
    const iterations = this.getRelevantIterations(session);

    lines.push(`# Recent Work (${iterations.length} iterations)`);

    iterations.forEach((iter, index) => {
      lines.push(`\n## Iteration ${iter.number}`);

      if (iter.response) {
        const summary = this.summarizeResponse(iter.response);
        lines.push(summary);
      }

      if (iter.actionItems.length > 0) {
        lines.push('\n**Action Items**:');
        iter.actionItems.forEach(item => {
          lines.push(`  - ${item}`);
        });
      }

      if (iter.errors.length > 0 && this.config.includeErrors) {
        lines.push('\n**Errors**:');
        iter.errors.forEach(err => {
          lines.push(`  ❌ ${err}`);
        });
      }

      if (iter.completion > 0) {
        const percentage = Math.round(iter.completion * 100);
        lines.push(`\n**Progress**: ${percentage}%`);
      }
    });

    return lines.join('\n');
  }

  /**
   * Build summary context
   */
  private buildSummaryContext(session: Session): string {
    const lines: string[] = [];

    lines.push('# Summary');
    lines.push(session.context.summary || 'No summary available');

    return lines.join('\n');
  }

  /**
   * Get relevant iterations based on configuration
   */
  private getRelevantIterations(session: Session): Iteration[] {
    let iterations = [...session.iterations];

    // Sort by iteration number (newest last)
    iterations.sort((a, b) => a.number - b.number);

    // Limit to max history length
    if (iterations.length > this.config.maxHistoryLength) {
      iterations = iterations.slice(-this.config.maxHistoryLength);
    }

    return iterations;
  }

  /**
   * Summarize a response
   */
  private summarizeResponse(response: string): string {
    // Limit response length
    const maxLength = 500;
    if (response.length <= maxLength) {
      return response;
    }

    // Truncate with ellipsis
    return response.substring(0, maxLength) + '...';
  }

  /**
   * Estimate token count
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length * this.config.tokensPerChar);
  }

  /**
   * Trim context to token limit
   */
  private trimToTokenLimit(context: string): string {
    const currentTokens = this.estimateTokens(context);

    if (currentTokens <= this.config.maxTokens) {
      return context;
    }

    // Rough approximation: trim proportionally
    const ratio = this.config.maxTokens / currentTokens;
    const targetLength = Math.floor(context.length * ratio);

    return context.substring(0, targetLength) + '\n\n[Context truncated due to token limit]';
  }

  /**
   * Update session context based on iteration
   */
  updateContext(session: Session, iteration: Iteration): Session {
    const updated = { ...session };

    // Add action items to in progress
    if (iteration.actionItems.length > 0) {
      updated.context.inProgress = [
        ...updated.context.inProgress,
        ...iteration.actionItems,
      ];
    }

    // Update completion status
    updated.context.tokenCount = this.estimateTokens(this.buildContext(session));

    return updated;
  }

  /**
   * Generate summary from session
   */
  generateSummary(session: Session): string {
    const parts: string[] = [];

    parts.push(`Session ${session.id} ran for ${session.iterations.length} iterations.`);

    if (session.context.completed.length > 0) {
      parts.push(`Completed ${session.context.completed.length} tasks.`);
    }

    if (session.iterations.length > 0) {
      const lastIteration = session.iterations[session.iterations.length - 1];
      const avgCompletion = session.iterations.reduce((sum, i) => sum + i.completion, 0) / session.iterations.length;
      parts.push(`Average completion: ${Math.round(avgCompletion * 100)}%.`);
    }

    if (session.context.blocked.length > 0) {
      parts.push(`Blocked on ${session.context.blocked.length} items.`);
    }

    return parts.join(' ');
  }

  /**
   * Get configuration
   */
  getConfig(): ContextBuilderConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ContextBuilderConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
