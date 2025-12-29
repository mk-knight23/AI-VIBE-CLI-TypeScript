/**
 * Observability Module - Structured logging, tracing, and metrics
 * Everything observable. Nothing silent.
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

// ============================================
// EXECUTION CONTEXT
// ============================================

export interface ExecutionContext {
  executionId: string;
  sessionId?: string;
  startTime: number;
  provider?: string;
  model?: string;
  command?: string;
}

let currentContext: ExecutionContext | null = null;

export function startExecution(opts: Partial<ExecutionContext> = {}): ExecutionContext {
  currentContext = {
    executionId: randomUUID().slice(0, 8),
    startTime: Date.now(),
    ...opts,
  };
  return currentContext;
}

export function getExecutionContext(): ExecutionContext | null {
  return currentContext;
}

export function endExecution(): void {
  currentContext = null;
}

// ============================================
// STRUCTURED LOGGING
// ============================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  executionId?: string;
  message: string;
  data?: Record<string, unknown>;
  duration?: number;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class StructuredLogger {
  private minLevel: LogLevel;
  private logFile: string | null;

  constructor() {
    this.minLevel = (process.env.VIBE_LOG_LEVEL as LogLevel) || 'info';
    this.logFile = process.env.VIBE_LOG_FILE || null;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  private formatEntry(entry: LogEntry): string {
    const ctx = currentContext;
    const execId = ctx?.executionId || entry.executionId || '-';
    const duration = entry.duration ? ` [${entry.duration}ms]` : '';
    return JSON.stringify({
      ...entry,
      executionId: execId,
      duration: entry.duration,
    });
  }

  private write(entry: LogEntry): void {
    const formatted = this.formatEntry(entry);
    
    // Console output (human-readable in dev, JSON in prod)
    if (process.env.NODE_ENV === 'production' || process.env.VIBE_JSON_LOGS) {
      console.log(formatted);
    } else if (this.shouldLog(entry.level)) {
      const prefix = {
        debug: '🔍',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
      }[entry.level];
      const execId = currentContext?.executionId ? `[${currentContext.executionId}] ` : '';
      console.log(`${prefix} ${execId}${entry.message}`);
    }

    // File output
    if (this.logFile) {
      try {
        fs.appendFileSync(this.logFile, formatted + '\n');
      } catch {}
    }
  }

  debug(message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog('debug')) return;
    this.write({ timestamp: new Date().toISOString(), level: 'debug', message, data });
  }

  info(message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog('info')) return;
    this.write({ timestamp: new Date().toISOString(), level: 'info', message, data });
  }

  warn(message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog('warn')) return;
    this.write({ timestamp: new Date().toISOString(), level: 'warn', message, data });
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.write({ timestamp: new Date().toISOString(), level: 'error', message, data });
  }

  timed<T>(message: string, fn: () => T): T {
    const start = Date.now();
    try {
      const result = fn();
      this.info(message, { duration: Date.now() - start });
      return result;
    } catch (err) {
      this.error(`${message} failed`, { duration: Date.now() - start, error: (err as Error).message });
      throw err;
    }
  }

  async timedAsync<T>(message: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      this.info(message, { duration: Date.now() - start });
      return result;
    } catch (err) {
      this.error(`${message} failed`, { duration: Date.now() - start, error: (err as Error).message });
      throw err;
    }
  }
}

export const logger = new StructuredLogger();

// ============================================
// METRICS
// ============================================

export interface Metrics {
  requests: number;
  errors: number;
  totalLatency: number;
  toolCalls: Record<string, number>;
  providerCalls: Record<string, number>;
  commandCalls: Record<string, number>;
}

const metrics: Metrics = {
  requests: 0,
  errors: 0,
  totalLatency: 0,
  toolCalls: {},
  providerCalls: {},
  commandCalls: {},
};

export function recordRequest(latencyMs: number, success: boolean): void {
  metrics.requests++;
  metrics.totalLatency += latencyMs;
  if (!success) metrics.errors++;
}

export function recordToolCall(tool: string): void {
  metrics.toolCalls[tool] = (metrics.toolCalls[tool] || 0) + 1;
}

export function recordProviderCall(provider: string): void {
  metrics.providerCalls[provider] = (metrics.providerCalls[provider] || 0) + 1;
}

export function recordCommand(command: string): void {
  metrics.commandCalls[command] = (metrics.commandCalls[command] || 0) + 1;
}

export function getMetrics(): Metrics & { avgLatency: number; errorRate: number } {
  return {
    ...metrics,
    avgLatency: metrics.requests > 0 ? metrics.totalLatency / metrics.requests : 0,
    errorRate: metrics.requests > 0 ? metrics.errors / metrics.requests : 0,
  };
}

export function resetMetrics(): void {
  metrics.requests = 0;
  metrics.errors = 0;
  metrics.totalLatency = 0;
  metrics.toolCalls = {};
  metrics.providerCalls = {};
  metrics.commandCalls = {};
}

// ============================================
// AGENT TRACING
// ============================================

export interface AgentTrace {
  traceId: string;
  planId: string;
  steps: AgentStepTrace[];
  startTime: number;
  endTime?: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  rollbackCount: number;
}

export interface AgentStepTrace {
  stepId: string;
  tool: string;
  startTime: number;
  endTime?: number;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  error?: string;
}

const activeTraces: Map<string, AgentTrace> = new Map();

export function startAgentTrace(planId: string): AgentTrace {
  const trace: AgentTrace = {
    traceId: randomUUID().slice(0, 8),
    planId,
    steps: [],
    startTime: Date.now(),
    status: 'running',
    rollbackCount: 0,
  };
  activeTraces.set(trace.traceId, trace);
  logger.info('Agent trace started', { traceId: trace.traceId, planId });
  return trace;
}

export function addStepToTrace(traceId: string, stepId: string, tool: string): void {
  const trace = activeTraces.get(traceId);
  if (!trace) return;
  trace.steps.push({
    stepId,
    tool,
    startTime: Date.now(),
    status: 'running',
  });
}

export function completeStep(traceId: string, stepId: string, success: boolean, error?: string): void {
  const trace = activeTraces.get(traceId);
  if (!trace) return;
  const step = trace.steps.find(s => s.stepId === stepId);
  if (step) {
    step.endTime = Date.now();
    step.status = success ? 'success' : 'failed';
    step.error = error;
  }
}

export function endAgentTrace(traceId: string, status: AgentTrace['status'], rollbackCount = 0): void {
  const trace = activeTraces.get(traceId);
  if (!trace) return;
  trace.endTime = Date.now();
  trace.status = status;
  trace.rollbackCount = rollbackCount;
  
  const duration = trace.endTime - trace.startTime;
  logger.info('Agent trace completed', {
    traceId,
    status,
    duration,
    steps: trace.steps.length,
    rollbackCount,
  });
  
  // Keep trace for debugging (limit to last 10)
  if (activeTraces.size > 10) {
    const oldest = activeTraces.keys().next().value;
    if (oldest) activeTraces.delete(oldest);
  }
}

export function getAgentTrace(traceId: string): AgentTrace | undefined {
  return activeTraces.get(traceId);
}

export function getRecentTraces(): AgentTrace[] {
  return Array.from(activeTraces.values());
}

// ============================================
// FAILURE CLASSIFICATION
// ============================================

export type FailureType = 
  | 'network'
  | 'auth'
  | 'rate_limit'
  | 'timeout'
  | 'validation'
  | 'permission'
  | 'not_found'
  | 'internal'
  | 'unknown';

export function classifyError(error: Error): FailureType {
  const msg = error.message.toLowerCase();
  
  if (msg.includes('econnrefused') || msg.includes('enotfound') || msg.includes('network')) {
    return 'network';
  }
  if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('invalid api key')) {
    return 'auth';
  }
  if (msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'rate_limit';
  }
  if (msg.includes('timeout') || msg.includes('etimedout') || msg.includes('timed out')) {
    return 'timeout';
  }
  if (msg.includes('validation') || msg.includes('invalid') || msg.includes('required')) {
    return 'validation';
  }
  if (msg.includes('permission') || msg.includes('403') || msg.includes('forbidden')) {
    return 'permission';
  }
  if (msg.includes('404') || msg.includes('not found')) {
    return 'not_found';
  }
  if (msg.includes('500') || msg.includes('internal')) {
    return 'internal';
  }
  
  return 'unknown';
}

export function logError(error: Error, context?: Record<string, unknown>): void {
  const failureType = classifyError(error);
  logger.error(error.message, {
    ...context,
    failureType,
    stack: error.stack?.split('\n').slice(0, 3).join('\n'),
  });
}

// ============================================
// HEALTH STATUS
// ============================================

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  metrics: ReturnType<typeof getMetrics>;
  activeTraces: number;
  lastError?: string;
}

const startTime = Date.now();
let lastError: string | undefined;

export function getHealthStatus(): HealthStatus {
  const m = getMetrics();
  let status: HealthStatus['status'] = 'healthy';
  
  if (m.errorRate > 0.5) status = 'unhealthy';
  else if (m.errorRate > 0.1) status = 'degraded';
  
  return {
    status,
    uptime: Date.now() - startTime,
    metrics: m,
    activeTraces: activeTraces.size,
    lastError,
  };
}

export function setLastError(error: string): void {
  lastError = error;
}
