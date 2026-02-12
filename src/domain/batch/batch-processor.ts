/**
 * VIBE CLI - Batch Processor
 * Concurrent batch processing with progress tracking
 */

import pLimit from 'p-limit';
import { createLogger } from '../../utils/pino-logger.js';
import { errors } from '../../utils/errors.js';
import { progressManager } from '../../ui/progress-manager.js';
import {
  BatchTask,
  BatchConfig,
  BatchResult,
  BatchOperation,
  DEFAULT_BATCH_CONFIG,
  BatchTaskStatus,
} from '../../types/batch.js';

const logger = createLogger('batch-processor');

/**
 * Batch Processor class
 */
export class BatchProcessor {
  private config: BatchConfig;
  private abortController: AbortController;

  constructor(config: Partial<BatchConfig> = {}) {
    this.config = { ...DEFAULT_BATCH_CONFIG, ...config };
    this.abortController = new AbortController();
  }

  /**
   * Process batch of tasks
   */
  async processBatch<T>(
    paths: string[],
    operation: BatchOperation<T>
  ): Promise<BatchResult> {
    const startTime = Date.now();
    logger.debug({ pathCount: paths.length, operation: operation.name }, 'Starting batch');

    // Create tasks
    const tasks: BatchTask[] = paths.map((path, index) => ({
      id: `task-${index}`,
      path,
      status: 'pending' as BatchTaskStatus,
      retries: 0,
    }));

    // Create progress bar
    const progressBar = progressManager.createProgressBar({
      total: tasks.length,
      title: `Processing ${operation.name}`,
    });

    // Create concurrency limiter
    const limit = pLimit(this.config.concurrency);

    // Process tasks
    const promises = tasks.map((task) =>
      limit(() => this.executeTask(task, operation, progressBar))
    );

    // Wait for completion
    await Promise.all(promises);

    progressManager.stopProgressBar();

    const durationMs = Date.now() - startTime;

    // Aggregate results
    const result: BatchResult = {
      tasks,
      completed: tasks.filter((t) => t.status === 'completed').length,
      failed: tasks.filter((t) => t.status === 'failed').length,
      cancelled: tasks.filter((t) => t.status === 'cancelled').length,
      durationMs,
      errors: tasks
        .filter((t) => t.error)
        .map((t) => `${t.path}: ${t.error}`),
    };

    logger.debug(
      { completed: result.completed, failed: result.failed, durationMs },
      'Batch complete'
    );

    return result;
  }

  /**
   * Execute a single task
   */
  private async executeTask<T>(
    task: BatchTask,
    operation: BatchOperation<T>,
    progressBar: ReturnType<typeof progressManager.createProgressBar>
  ): Promise<void> {
    if (this.abortController.signal.aborted) {
      task.status = 'cancelled';
      return;
    }

    task.status = 'running';
    const startTime = Date.now();

    try {
      // Validate if validator exists
      if (operation.validate) {
        const isValid = await operation.validate(task.path);
        if (!isValid) {
          task.status = 'failed';
          task.error = 'Validation failed';
          progressBar.increment();
          return;
        }
      }

      // Execute with retry logic
      let lastError: Error | undefined;

      for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
        if (attempt > 0) {
          logger.debug({ task: task.id, attempt }, 'Retrying task');
          await this.delay(this.config.retryDelayMs * attempt);
        }

        try {
          // Check for abort
          if (this.abortController.signal.aborted) {
            task.status = 'cancelled';
            return;
          }

          // Execute with timeout
          const result = await this.executeWithTimeout(
            () => operation.execute(task.path, task),
            this.config.timeoutMs
          );

          task.result = result;
          task.status = 'completed';
          task.durationMs = Date.now() - startTime;
          progressBar.increment();
          return;
        } catch (error) {
          lastError = error as Error;
          task.retries = attempt;
        }
      }

      // All retries exhausted
      throw lastError || new Error('Task failed after retries');
    } catch (error) {
      task.status = 'failed';
      task.error = (error as Error).message;
      task.durationMs = Date.now() - startTime;
      progressBar.increment();

      logger.error({ error, task: task.id, path: task.path }, 'Task failed');

      if (!this.config.continueOnError) {
        this.abort();
      }
    }
  }

  /**
   * Execute with timeout
   */
  private executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      fn()
        .then((result) => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Abort processing
   */
  abort(): void {
    this.abortController.abort();
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Format results for display
   */
  formatResults(result: BatchResult): string {
    const lines: string[] = [];

    lines.push(`\n📊 Batch Results\n`);
    lines.push(`✅ Completed: ${result.completed}`);
    lines.push(`❌ Failed: ${result.failed}`);
    if (result.cancelled > 0) {
      lines.push(`⚠️  Cancelled: ${result.cancelled}`);
    }
    lines.push(`⏱️  Duration: ${(result.durationMs / 1000).toFixed(2)}s`);

    if (result.errors.length > 0) {
      lines.push(`\n📝 Errors:`);
      for (const error of result.errors.slice(0, 10)) {
        lines.push(`  - ${error}`);
      }
      if (result.errors.length > 10) {
        lines.push(`  ... and ${result.errors.length - 10} more`);
      }
    }

    return lines.join('\n');
  }
}
