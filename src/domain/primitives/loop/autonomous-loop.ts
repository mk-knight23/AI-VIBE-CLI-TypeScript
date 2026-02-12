/**
 * Autonomous Development Loop Primitive
 *
 * Core primitive for autonomous development loops inspired by Ralph-Claude-Code.
 * Implements intelligent exit detection, rate limiting, circuit breaking, and session management.
 *
 * Key Features:
 * - Dual-condition exit gate (requires BOTH exit signal AND completion indicator)
 * - Rate limiting (100 calls/hour default)
 * - Circuit breaker for stuck loop detection
 * - Session continuity across invocations
 * - Real-time monitoring and logging
 */

import { ResponseAnalyzer } from './response-analyzer-v2.js';
import { RateLimiter } from './rate-limiter.js';
import { CircuitBreaker } from './circuit-breaker.js';
import { SessionManager } from '../../session/session-manager.js';
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
  private rateLimiter: RateLimiter;
  private circuitBreaker: CircuitBreaker;
  private sessionManager: SessionManager;

  constructor() {
    this.analyzer = new ResponseAnalyzer();
    this.rateLimiter = new RateLimiter();
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      timeoutMs: 60000,
    });
    this.sessionManager = new SessionManager();
  }

  /**
   * Execute autonomous development loop
   */
  async execute(options: AutonomousExecuteOptions): Promise<PrimitiveResult> {
    const config = { ...DEFAULT_AUTONOMOUS_CONFIG, ...options.config };

    logger.info({ task: options.task, config }, 'Starting autonomous development loop');

    // Initialize or resume session
    let sessionId = config.sessionId;
    if (sessionId) {
      await this.sessionManager.resumeSession(sessionId);
      logger.info({ sessionId }, 'Resumed session');
    } else {
      const session = await this.sessionManager.createSession({
        projectId: process.cwd(),
        task: options.task,
        objectives: ['Complete the autonomous development task'],
      });
      sessionId = session.id;
      logger.info({ sessionId }, 'Created new session');
    }

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

    try {
      // Main autonomous loop
      while (this.shouldContinue(state, config)) {
        // Check rate limit
        const rateStatus = this.rateLimiter.canMakeCall();
        if (!rateStatus.allowed) {
          logger.warn({
            callsThisHour: rateStatus.callsThisHour,
            windowResetTime: rateStatus.windowResetTime,
          }, 'Rate limit reached, waiting...');

          await this.rateLimiter.waitForAvailability();
        }

        // Check circuit breaker
        if (!this.circuitBreaker.canExecute()) {
          const stats = this.circuitBreaker.getStats();
          logger.error({
            state: stats.state,
            failures: stats.totalFailures,
          }, 'Circuit breaker is OPEN, stopping loop');

          state.isStuck = true;
          break;
        }

        // Increment iteration
        state.iteration++;

        // Build context from session
        const context = await this.buildContext(sessionId!, state);

        // Execute iteration through circuit breaker
        const response = await this.circuitBreaker.execute(async () => {
          this.rateLimiter.recordCall();
          state.apiCallsThisHour = this.rateLimiter.getStatus().callsThisHour;
          state.lastApiCall = new Date();

          logger.info({
            iteration: state.iteration,
            maxIterations: config.maxIterations,
          }, `Iteration ${state.iteration}`);

          return await options.executor(state.iteration, context);
        });

        // Analyze response
        const analysis = this.analyzer.analyze(response);

        // Update state based on analysis
        state.exitSignalsFound = analysis.exitSignals;
        state.completionIndicators = analysis.completionIndicators;
        state.stuckIndicators = analysis.stuckIndicators;
        state.shouldExit = analysis.shouldExit;
        state.isStuck = analysis.stuckIndicators.length >= 2;

        // Log iteration results
        if (config.logLevel === 'verbose' || config.logLevel === 'debug') {
          logger.debug({
            hasExitSignal: analysis.hasExitSignal,
            hasCompletion: analysis.hasCompletionIndicator,
            shouldExit: analysis.shouldExit,
            confidence: analysis.confidence,
            actionItems: analysis.actionItems,
            stuckIndicators: analysis.stuckIndicators,
          }, 'Iteration analysis');
        }

        // Add iteration to session
        await this.sessionManager.addIteration({
          response,
          actionItems: analysis.actionItems,
          completion: analysis.confidence,
          durationMs: 0, // TODO: track actual duration
          errors: state.stuckIndicators,
        });

        // Call iteration callback
        if (options.onIteration) {
          options.onIteration(state, response);
        }

        // Check for stuck loop
        if (state.isStuck) {
          logger.error({
            stuckIndicators: state.stuckIndicators,
            iteration: state.iteration,
          }, 'Loop appears stuck, stopping');
          break;
        }

        // Check for exit
        if (state.shouldExit) {
          logger.info({
            exitSignals: state.exitSignalsFound,
            completions: state.completionIndicators,
            confidence: analysis.confidence,
          }, 'Exit conditions met, completing loop');
          state.isComplete = true;
          break;
        }

        // Cooldown between iterations
        if (config.cooldownMs > 0) {
          await new Promise(resolve => setTimeout(resolve, config.cooldownMs));
        }
      }

      // Build result
      const durationMs = Date.now() - startTime;
      const result: LoopResult = {
        success: state.isComplete,
        iterations: state.iteration,
        durationMs,
        reason: this.getExitReason(state),
        state,
        errors,
      };

      // Complete session
      await this.sessionManager.completeSession(
        `Loop completed: ${result.reason}`
      );

      logger.info({
        success: result.success,
        iterations: result.iterations,
        durationMs: result.durationMs,
        reason: result.reason,
      }, 'Autonomous loop finished');

      // Call completion callback
      if (options.onComplete) {
        options.onComplete(result);
      }

      return {
        success: result.success,
        data: result,
        error: result.success ? undefined : result.reason,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(errorMessage);

      logger.error({ error: errorMessage }, 'Autonomous loop failed');

      return {
        success: false,
        error: errorMessage,
        data: {
          success: false,
          iterations: state.iteration,
          durationMs: Date.now() - startTime,
          reason: `Error: ${errorMessage}`,
          state,
          errors,
        },
      };
    }
  }

  /**
   * Determine if loop should continue
   */
  private shouldContinue(state: LoopState, config: AutonomousLoopConfig): boolean {
    // Check max iterations
    if (state.iteration >= config.maxIterations) {
      logger.info('Max iterations reached');
      return false;
    }

    // Check max duration
    const elapsed = Date.now() - state.startTime.getTime();
    if (elapsed >= config.maxDurationMs) {
      logger.info('Max duration reached');
      return false;
    }

    // Check if complete
    if (state.isComplete) {
      return false;
    }

    // Check if stuck
    if (state.isStuck) {
      return false;
    }

    return true;
  }

  /**
   * Build context for iteration
   */
  private async buildContext(sessionId: string, state: LoopState): Promise<string> {
    const context = this.sessionManager.getContext();
    return context;
  }

  /**
   * Get exit reason
   */
  private getExitReason(state: LoopState): string {
    if (state.isComplete) {
      return 'Task completed successfully';
    }
    if (state.isStuck) {
      return `Loop stuck: ${state.stuckIndicators.slice(0, 3).join(', ')}`;
    }
    if (state.iteration >= 100) {
      return 'Maximum iterations reached';
    }
    return 'Loop terminated';
  }

  /**
   * Get current configuration
   */
  getConfig(): typeof DEFAULT_AUTONOMOUS_CONFIG {
    return DEFAULT_AUTONOMOUS_CONFIG;
  }
}
