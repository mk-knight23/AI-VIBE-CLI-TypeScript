/**
 * Autonomous Development Loop Primitive
 *
 * Core primitive for autonomous development loops.
 * Simplified implementation using consolidated utilities.
 */

import { ResponseAnalyzer } from './response-analyzer.js';
import { RateLimiter } from '../../../utils/rate-limiter.js';
import { CircuitBreaker } from '../../../core/resilience/circuit-breaker.js';
import { AutonomousLoopConfig, DEFAULT_AUTONOMOUS_CONFIG, LoopState, LoopResult } from './autonomous-config.js';
import { PrimitiveResult, IPrimitive } from '../types.js';
import { createLogger } from '../../../utils/pino-logger.js';

const logger = createLogger('autonomous-loop');

export interface AutonomousExecuteOptions {
  task: string;
  executor: (iteration: number, context: string) => Promise<string>;
  onIteration?: (state: LoopState, response: string) => void;
  onComplete?: (result: LoopResult) => void;
  config?: Partial<AutonomousLoopConfig>;
}

export class AutonomousLoopPrimitive implements IPrimitive {
  id = 'autonomous-loop';
  name = 'Autonomous Development Loop';

  private analyzer: ResponseAnalyzer;

  constructor() {
    this.analyzer = new ResponseAnalyzer();
  }

  /**
   * Execute autonomous development loop
   */
  async execute(options: AutonomousExecuteOptions): Promise<PrimitiveResult> {
    const config = { ...DEFAULT_AUTONOMOUS_CONFIG, ...options.config };

    logger.info({ task: options.task, config }, 'Starting autonomous development loop');

    // Initialize loop state
    const state: LoopState = {
      iteration: 0,
      startTime: new Date(),
      apiCallsThisHour: 0,
      circuitBreakerTrips: 0,
      completionIndicators: [],
      exitSignalsFound: [],
      stuckIndicators: [],
      isComplete: false,
      isStuck: false,
      shouldExit: false,
    };

    const startTime = Date.now();
    const errors: string[] = [];

    // Create rate limiter and circuit breaker for this execution
    const rateLimiter = new RateLimiter({
      maxRequests: 100,
      windowMs: 60 * 60 * 1000, // 1 hour
    });

    const circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 60000,
    });

    try {
      // Main autonomous loop
      while (this.shouldContinue(state, config)) {
        // Check rate limit
        if (rateLimiter.isRateLimited()) {
          logger.warn('Rate limit reached, waiting...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        // Check circuit breaker
        if (circuitBreaker.isOpen()) {
          logger.error('Circuit breaker is OPEN, stopping loop');
          state.isStuck = true;
          break;
        }

        // Increment iteration
        state.iteration++;

        try {
          // Execute iteration
          const response = await circuitBreaker.execute(async () => {
            state.apiCallsThisHour++;
            state.lastApiCall = new Date();

            logger.info({
              iteration: state.iteration,
              maxIterations: config.maxIterations,
            }, `Iteration ${state.iteration}`);

            return await options.executor(state.iteration, '');
          });

          // Analyze response
          const analysis = this.analyzer.analyze(response);

          // Update state based on analysis
          state.shouldExit = analysis.isComplete && analysis.hasExitSignal;
          state.isStuck = analysis.stuckIndicators && analysis.stuckIndicators.length >= 2;

          // Call iteration callback
          if (options.onIteration) {
            options.onIteration(state, response);
          }

          // Check for stuck loop
          if (state.isStuck) {
            logger.error({ iteration: state.iteration }, 'Loop appears stuck, stopping');
            break;
          }

          // Check for exit
          if (state.shouldExit) {
            logger.info('Exit conditions met, completing loop');
            state.isComplete = true;
            break;
          }
        } catch (error) {
          logger.error({ error, iteration: state.iteration }, 'Iteration failed');
          errors.push(error instanceof Error ? error.message : 'Unknown error');

          if (errors.length >= 3) {
            logger.error('Too many errors, stopping loop');
            break;
          }
        }

        // Cooldown between iterations
        if (config.cooldownMs > 0) {
          await new Promise(resolve => setTimeout(resolve, config.cooldownMs));
        }
      }

      // Build result
      const result: LoopResult = {
        success: state.isComplete || errors.length === 0,
        state,
        durationMs: Date.now() - startTime,
        iterationsCompleted: state.iteration,
        errors: errors.length > 0 ? errors : undefined,
      };

      if (options.onComplete) {
        options.onComplete(result);
      }

      return {
        success: result.success,
        data: result,
      };
    } catch (error) {
      logger.error({ error }, 'Autonomous loop failed');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Determine if loop should continue
   */
  private shouldContinue(state: LoopState, config: AutonomousLoopConfig): boolean {
    // Check iteration limit
    if (state.iteration >= config.maxIterations!) {
      logger.info({ maxIterations: config.maxIterations }, 'Max iterations reached');
      return false;
    }

    // Check max duration
    if (config.maxDurationMs) {
      const elapsed = Date.now() - state.startTime.getTime();
      if (elapsed >= config.maxDurationMs) {
        logger.info({ elapsed, maxDuration: config.maxDurationMs }, 'Max duration reached');
        return false;
      }
    }

    return true;
  }
}
