/**
 * Loop Primitive
 *
 * Autonomous development loop that iteratively executes tasks until completion.
 * Simplified implementation using consolidated utilities.
 */

import { CircuitBreaker } from '../../../core/resilience/circuit-breaker.js';
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
      this.circuitBreaker = new CircuitBreaker({
        failureThreshold: this.config.circuitBreaker.failureThreshold ?? 3,
        resetTimeout: (this.config.circuitBreaker as any).timeoutMs ?? 60000,
      });
    }
  }

  /**
   * Execute the autonomous loop
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
      if (this.circuitBreaker?.isOpen()) {
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
        shouldExit: analysis.isComplete && analysis.confidence >= (this.config.responseAnalyzer?.confidenceThreshold ?? 0.7),
        isStuck: (analysis.stuckIndicators?.length ?? 0) >= (this.config.responseAnalyzer?.stuckThreshold ?? 3),
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
        confidence: 0,
      };
    }
  }

  /**
   * Determine if the loop should continue
   */
  private shouldContinue(): boolean {
    // Check max iterations
    if (this.state.iteration >= this.config.maxIterations!) {
      return false;
    }

    // Check timeout
    const timeoutMs = (this.config as any).timeoutMs;
    if (timeoutMs) {
      const elapsed = Date.now() - this.state.startTime.getTime();
      if (elapsed >= timeoutMs) {
        return false;
      }
    }

    return true;
  }

  /**
   * Build context for iteration
   */
  private buildContext(): string {
    return `Iteration ${this.state.iteration}`;
  }

  /**
   * Get exit reason
   */
  private getExitReason(): string {
    if (this.state.isComplete) {
      return 'Completed successfully';
    }
    if (this.state.isStuck) {
      return 'Loop detected as stuck';
    }
    if (this.state.iteration >= this.config.maxIterations!) {
      return 'Max iterations reached';
    }
    return 'Unknown';
  }

  /**
   * Get current state
   */
  getState(): LoopState {
    return { ...this.state };
  }

  /**
   * Reset the loop state
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
  }
}
