/**
 * Unit tests for logger utility
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createLogger,
  getRootLogger,
  createTimer,
  cliLogger,
  commandLogger,
} from '../../../src/utils/pino-logger';

describe('createLogger', () => {
  it('should create a child logger with component name', () => {
    const logger = createLogger('TestModule');
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should create a child logger with additional meta', () => {
    const logger = createLogger('TestModule', { version: '1.0.0' });
    expect(logger).toBeDefined();
  });
});

describe('getRootLogger', () => {
  it('should return the root logger', () => {
    const root = getRootLogger();
    expect(root).toBeDefined();
    expect(typeof root.info).toBe('function');
  });
});

describe('createTimer', () => {
  it('should measure elapsed time', async () => {
    const timer = createTimer();
    await new Promise(resolve => setTimeout(resolve, 10));
    const elapsed = timer.elapsedMs();
    expect(elapsed).toBeGreaterThan(0);
  });
});

describe('Convenience loggers', () => {
  it('should export cliLogger', () => {
    expect(cliLogger).toBeDefined();
    expect(typeof cliLogger.info).toBe('function');
  });

  it('should export commandLogger', () => {
    expect(commandLogger).toBeDefined();
    expect(typeof commandLogger.info).toBe('function');
  });
});
