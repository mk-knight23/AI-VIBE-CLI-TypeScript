/**
 * Autonomous Development Loop Configuration
 *
 * Configuration for the autonomous development loop system inspired by Ralph-Claude-Code.
 * This enables VIBE CLI to run continuously until task completion with intelligent stopping.
 */

export interface AutonomousLoopConfig {
  // Loop execution limits
  maxIterations: number;
  maxDurationMs: number;
  cooldownMs: number;

  // Exit detection (dual-condition gate)
  exitSignals: string[];
  completionPhrases: string[];
  confidenceThreshold: number;

  // Rate limiting (100 calls/hour by default)
  rateLimitPerHour: number;
  rateLimitWindowMs: number;

  // Circuit breaker settings
  circuitBreakerThreshold: number;
  circuitBreakerCooldownMs: number;

  // Session management
  sessionId?: string;
  sessionExpirationMs: number;

  // Monitoring
  enableMonitoring: boolean;
  logLevel: 'silent' | 'progress' | 'verbose' | 'debug';
}

export const DEFAULT_AUTONOMOUS_CONFIG: AutonomousLoopConfig = {
  maxIterations: 100,
  maxDurationMs: 3600000, // 1 hour
  cooldownMs: 1000,

  exitSignals: ['EXIT_SIGNAL', 'TASK_COMPLETE', 'ALL_TASKS_COMPLETE'],
  completionPhrases: [
    'all tasks have been completed',
    'all requirements have been implemented',
    'the implementation is complete',
    'all tests are passing',
  ],
  confidenceThreshold: 0.7,

  rateLimitPerHour: 100,
  rateLimitWindowMs: 3600000, // 1 hour

  circuitBreakerThreshold: 3,
  circuitBreakerCooldownMs: 60000, // 1 minute

  sessionExpirationMs: 86400000, // 24 hours

  enableMonitoring: true,
  logLevel: 'progress',
};

export interface LoopState {
  iteration: number;
  startTime: Date;
  lastApiCall?: Date;
  apiCallsThisHour: number;
  circuitBreakerTrips: number;
  lastCircuitBreakerTrip?: Date;
  completionIndicators: string[];
  exitSignalsFound: string[];
  stuckIndicators: string[];
  isComplete: boolean;
  isStuck: boolean;
  shouldExit: boolean;
}

export interface LoopResult {
  success: boolean;
  iterations: number;
  durationMs: number;
  reason: string;
  state: LoopState;
  errors: string[];
}
