/**
 * Loop Primitive Configuration
 *
 * Configuration types for the autonomous loop primitive.
 */

export interface LoopConfig {
  // Maximum number of iterations before forced exit
  maxIterations: number;

  // Timeout per iteration in milliseconds
  iterationTimeoutMs: number;

  // Exit signals that indicate completion
  exitSignals: string[];

  // Maximum context window size for LLM
  maxContextTokens: number;

  // Whether to use circuit breaker
  enableCircuitBreaker: boolean;

  // Circuit breaker configuration
  circuitBreaker?: {
    failureThreshold: number;
    successThreshold: number;
    timeoutMs: number;
  };

  // Response analyzer configuration
  responseAnalyzer?: {
    confidenceThreshold: number;
    stuckThreshold: number;
  };
}

export const DEFAULT_LOOP_CONFIG: LoopConfig = {
  maxIterations: 100,
  iterationTimeoutMs: 300000, // 5 minutes
  exitSignals: ['EXIT_SIGNAL', 'TASK_COMPLETE', 'ALL_TASKS_COMPLETE'],
  maxContextTokens: 100000,
  enableCircuitBreaker: true,
  circuitBreaker: {
    failureThreshold: 3,
    successThreshold: 2,
    timeoutMs: 60000, // 1 minute
  },
  responseAnalyzer: {
    confidenceThreshold: 0.7,
    stuckThreshold: 2,
  },
};

export interface LoopState {
  iteration: number;
  startTime: Date;
  lastIterationTime: Date;
  completions: string[];
  errors: Error[];
  isComplete: boolean;
  isStuck: boolean;
}

export interface IterationResult {
  iteration: number;
  success: boolean;
  response?: string;
  error?: Error;
  durationMs: number;
  shouldExit: boolean;
  isStuck: boolean;
  confidence: number;
}

export interface LoopResult {
  success: boolean;
  totalIterations: number;
  durationMs: number;
  completions: string[];
  errors: Error[];
  finalState: LoopState;
  reason?: string;
}
