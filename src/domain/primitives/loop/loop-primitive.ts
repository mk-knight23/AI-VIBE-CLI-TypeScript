/**
 * Loop Primitive
 *
 * Autonomous development loop that iteratively executes tasks until completion.
 * Integrates circuit breaker and response analyzer for safe, reliable operation.
 *
 * Features:
 * - Configurable iteration limits
 * - Circuit breaker for runaway loop protection
 * - Response analysis for intelligent exit detection
 * - Context window management
 * - Progress tracking and reporting
 */

import { CircuitBreaker } from './circuit-breaker.js';
import { ResponseAnalyzer } from './response-analyzer.js';
import {
  LoopConfig,
  DEFAULT_LOOP_CONFIG,
  LoopState,
  IterationResult,
  LoopResult,
} from './loop-config.js';

export interface LoopPrimitiveOptions {
  config?: Partial<LoopConfig>;
  onIteration?: (result: IterationResult) => void;
  onComplete?: (result: LoopResult) => void;
  onError?: (error: Error) => void;
}

/**
 * Loop Primitive for autonomous development
 */
export class LoopPrimitive {
  private config: LoopConfig;
  private state: LoopState;
  private circuitBreaker?: CircuitBreaker;
  private responseAnalyzer: ResponseAnalyzer;
  private callbacks: {
    onIteration?: (result: IterationResult) => void;
    onComplete?: (result: LoopResult) => void;
    onError?: (error: Error) => void;
  };

  constructor(options: LoopPrimitiveOptions = {}) {
    this.config = { ...DEFAULT_LOOP_CONFIG, ...options.config };
    this.callbacks = options;

    // Initialize state
    this.state = {
      iteration: 0,
      startTime: new Date(),
      lastIterationTime: new Date(),
      completions: [],
      errors: [],
      isComplete: false,
      isStuck: false,
    };

    // Initialize response analyzer
    this.responseAnalyzer = new ResponseAnalyzer({
      confidenceThreshold: this.config.responseAnalyzer?.confidenceThreshold ?? 0.7,
    });

    // Initialize circuit breaker if enabled
    if (this.config.enableCircuitBreaker && this.config.circuitBreaker) {
      this.circuitBreaker = new CircuitBreaker(this.config.circuitBreaker);
    }
  }

  /**
   * Execute the autonomous loop
   *
   * @param executor - Function to execute each iteration
   * @returns Loop result with completion status
   */
  async execute(executor: (iteration: number, context: string) => Promise<string>): Promise<LoopResult> {
    const startTime = Date.now();

    try {
      // Execute iterations
      while (this.shouldContinue()) {
        const result = await this.executeIteration(executor);

        // Handle iteration callbacks
        if (this.callbacks.onIteration) {
          this.callbacks.onIteration(result);
        }

        // Check if we should exit
        if (result.shouldExit) {
          this.state.isComplete = true;
          this.state.completions.push(result.response || '');
          break;
        }

        // Check if stuck
        if (result.isStuck) {
          this.state.isStuck = true;
          break;
        }
      }

      // Build final result
      const durationMs = Date.now() - startTime;
      const result: LoopResult = {
        success: this.state.isComplete,
        totalIterations: this.state.iteration,
        durationMs,
        completions: this.state.completions,
        errors: this.state.errors,
        finalState: { ...this.state },
        reason: this.getExitReason(),
      };

      // Handle completion callback
      if (this.callbacks.onComplete) {
        this.callbacks.onComplete(result);
      }

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Handle error callback
      if (this.callbacks.onError) {
        this.callbacks.onError(err);
      }

      return {
        success: false,
        totalIterations: this.state.iteration,
        durationMs: Date.now() - startTime,
        completions: this.state.completions,
        errors: [...this.state.errors, err],
        finalState: { ...this.state },
        reason: `Error: ${err.message}`,
      };
    }
  }

  /**
   * Execute a single iteration
   */
  private async executeIteration(
    executor: (iteration: number, context: string) => Promise<string>
  ): Promise<IterationResult> {
    const iterationStart = Date.now();

    try {
      // Check circuit breaker
      if (this.circuitBreaker && !this.circuitBreaker.canExecute()) {
        throw new Error('Circuit breaker is OPEN, blocking execution');
      }

      // Increment iteration counter
      this.state.iteration++;
      this.state.lastIterationTime = new Date();

      // Build context for this iteration
      const context = this.buildContext();

      // Execute iteration through circuit breaker
      const response = this.circuitBreaker
        ? await this.circuitBreaker.execute(() => executor(this.state.iteration, context))
        : await executor(this.state.iteration, context);

      // Analyze response
      const analysis = this.responseAnalyzer.analyze(response);

      // Calculate duration
      const durationMs = Date.now() - iterationStart;

      // Build iteration result
      const result: IterationResult = {
        iteration: this.state.iteration,
        success: true,
        response,
        durationMs,
        shouldExit: analysis.isComplete && analysis.confidence >= this.config.responseAnalyzer!.confidenceThreshold!,
        isStuck: analysis.stuckIndicators.length >= this.config.responseAnalyzer!.stuckThreshold!,
        confidence: analysis.confidence,
      };

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.state.errors.push(err);

      const durationMs = Date.now() - iterationStart;

      return {
        iteration: this.state.iteration,
        success: false,
        error: err,
        durationMs,
        shouldExit: false,
        isStuck: false,
        confidence: 0.0,
      };
    }
  }

  /**
   * Check if loop should continue
   */
  private shouldContinue(): boolean {
    // Check iteration limit
    if (this.state.iteration >= this.config.maxIterations) {
      return false;
    }

    // Check if already complete
    if (this.state.isComplete) {
      return false;
    }

    // Check if stuck
    if (this.state.isStuck) {
      return false;
    }

    return true;
  }

  /**
   * Build context for iteration
   */
  private buildContext(): string {
    const parts: string[] = [];

    // Add iteration info
    parts.push(`Iteration: ${this.state.iteration}/${this.config.maxIterations}`);

    // Add completions summary
    if (this.state.completions.length > 0) {
      parts.push(`\nCompleted iterations: ${this.state.completions.length}`);
    }

    // Add error summary
    if (this.state.errors.length > 0) {
      parts.push(`\nErrors encountered: ${this.state.errors.length}`);
      parts.push('Recent errors:');
      this.state.errors.slice(-3).forEach(err => {
        parts.push(`  - ${err.message}`);
      });
    }

    // Add recent context if available
    if (this.state.completions.length > 0) {
      parts.push('\nRecent work:');
      this.state.completions.slice(-2).forEach(comp => {
        parts.push(`  - ${comp.slice(0, 100)}...`);
      });
    }

    return parts.join('\n');
  }

  /**
   * Get exit reason
   */
  private getExitReason(): string {
    if (this.state.isComplete) {
      return 'Task completed successfully';
    }

    if (this.state.isStuck) {
      return 'Loop appears stuck';
    }

    if (this.state.iteration >= this.config.maxIterations) {
      return `Maximum iterations reached (${this.config.maxIterations})`;
    }

    return 'Loop terminated';
  }

  /**
   * Get current state
   */
  getState(): LoopState {
    return { ...this.state };
  }

  /**
   * Get configuration
   */
  getConfig(): LoopConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LoopConfig>): void {
    this.config = { ...this.config, ...config };

    // Update response analyzer
    if (config.responseAnalyzer?.confidenceThreshold !== undefined) {
      this.responseAnalyzer.updateConfig({
        confidenceThreshold: config.responseAnalyzer.confidenceThreshold,
      });
    }

    // Reinitialize circuit breaker if config changed
    if (config.circuitBreaker && this.config.enableCircuitBreaker) {
      this.circuitBreaker = new CircuitBreaker(this.config.circuitBreaker!);
    }
  }

  /**
   * Reset loop state
   */
  reset(): void {
    this.state = {
      iteration: 0,
      startTime: new Date(),
      lastIterationTime: new Date(),
      completions: [],
      errors: [],
      isComplete: false,
      isStuck: false,
    };

    if (this.circuitBreaker) {
      this.circuitBreaker.reset();
    }
  }

  /**
   * Get circuit breaker stats (if enabled)
   */
  getCircuitBreakerStats() {
    return this.circuitBreaker?.getStats();
  }

  /**
   * Get response analyzer config
   */
  getResponseAnalyzerConfig() {
    return this.responseAnalyzer.getConfig();
  }
}
