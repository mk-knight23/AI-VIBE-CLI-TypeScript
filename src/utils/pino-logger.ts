/**
 * VIBE CLI - Structured Logging with Pino
 * Replaces console.log with production-ready structured logging
 */

import pino, { Logger as PinoLogger, LoggerOptions } from 'pino';
import { VibeError, ErrorCode } from './errors.js';

// Log level from environment or default (silent unless DEBUG is set for CLI usage)
const LOG_LEVEL = process.env.LOG_LEVEL ||
  (process.env.DEBUG === 'true' || process.env.VIBE_DEBUG === 'true' ? 'debug' : 'silent');
const IS_DEV = process.env.NODE_ENV !== 'production';
const IS_TEST = process.env.NODE_ENV === 'test';

// Base configuration
const baseConfig: LoggerOptions = {
  level: LOG_LEVEL,
  base: {
    pid: process.pid,
    version: process.env.npm_package_version || '0.0.2',
  },
  // Redact sensitive fields
  redact: {
    paths: [
      'apiKey',
      '*.apiKey',
      'password',
      '*.password',
      'token',
      '*.token',
      'secret',
      '*.secret',
      'authorization',
      '*.authorization',
      'headers.authorization',
      'headers["authorization"]',
    ],
    remove: true,
  },
  // Add timestamp
  timestamp: pino.stdTimeFunctions.isoTime,
};

// Pretty printing for development (only if DEBUG is enabled)
const devConfig: LoggerOptions = (IS_DEV && !IS_TEST && (process.env.DEBUG === 'true' || process.env.VIBE_DEBUG === 'true'))
  ? {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,version',
          messageFormat: '{msg}',
        },
      },
    }
  : {};

// Create the root logger
const rootLogger = pino({
  ...baseConfig,
  ...devConfig,
});

/**
 * Child logger with component context
 */
export function createLogger(component: string, meta?: Record<string, unknown>): PinoLogger {
  return rootLogger.child({
    component,
    ...meta,
  });
}

/**
 * Get the root logger (for general use)
 */
export function getRootLogger(): PinoLogger {
  return rootLogger;
}

/**
 * Log a VibeError with structured data
 */
export function logError(logger: PinoLogger, error: unknown, context?: Record<string, unknown>): void {
  if (error instanceof VibeError) {
    logger.error({
      err: error.toJSON(),
      errorCode: error.code,
      ...context,
    }, error.message);
  } else if (error instanceof Error) {
    logger.error({
      err: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      ...context,
    }, error.message);
  } else {
    logger.error({
      err: String(error),
      ...context,
    }, String(error));
  }
}

/**
 * Log an operation start
 */
export function logOperationStart(
  logger: PinoLogger,
  operation: string,
  meta?: Record<string, unknown>
): void {
  logger.debug({ operation, status: 'started', ...meta }, `${operation} started`);
}

/**
 * Log an operation completion
 */
export function logOperationComplete(
  logger: PinoLogger,
  operation: string,
  durationMs: number,
  meta?: Record<string, unknown>
): void {
  logger.debug(
    { operation, status: 'completed', durationMs, ...meta },
    `${operation} completed in ${durationMs}ms`
  );
}

/**
 * Log an operation failure
 */
export function logOperationFailed(
  logger: PinoLogger,
  operation: string,
  error: unknown,
  durationMs?: number,
  meta?: Record<string, unknown>
): void {
  const logData: Record<string, unknown> = {
    operation,
    status: 'failed',
    ...meta,
  };

  if (durationMs !== undefined) {
    logData.durationMs = durationMs;
  }

  if (error instanceof VibeError) {
    logData.error = error.toJSON();
    logData.errorCode = error.code;
    logger.error(logData, `${operation} failed: ${error.message}`);
  } else if (error instanceof Error) {
    logData.error = {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
    logger.error(logData, `${operation} failed: ${error.message}`);
  } else {
    logData.error = String(error);
    logger.error(logData, `${operation} failed: ${String(error)}`);
  }
}

/**
 * Create a timer for measuring operation duration
 */
export function createTimer(): { elapsedMs: () => number } {
  const start = process.hrtime.bigint();
  return {
    elapsedMs: () => Number(process.hrtime.bigint() - start) / 1_000_000,
  };
}

/**
 * Wrap an async function with logging
 */
export function withLogging<T extends (...args: any[]) => Promise<any>>(
  logger: PinoLogger,
  operation: string,
  fn: T
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const timer = createTimer();
    logOperationStart(logger, operation, { args });

    try {
      const result = await fn(...args);
      logOperationComplete(logger, operation, timer.elapsedMs(), { result });
      return result;
    } catch (error) {
      logOperationFailed(logger, operation, error, timer.elapsedMs());
      throw error;
    }
  }) as T;
}

// Export the root logger as default
export default rootLogger;

// Convenience exports for common components
export const cliLogger = createLogger('cli');
export const commandLogger = createLogger('command');
export const primitiveLogger = createLogger('primitive');
export const mcpLogger = createLogger('mcp');
