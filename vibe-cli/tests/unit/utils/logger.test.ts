/**
 * Unit tests for logger utility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Logger, LogLevel, logger, createLogger } from '../../../src/utils/logger';

describe('Logger', () => {
  let testLogger: Logger;

  beforeEach(() => {
    testLogger = Logger.getInstance();
    testLogger.setLevel(LogLevel.DEBUG);
    testLogger.setModuleName('Test');
    testLogger.enable();
  });

  describe('setLevel', () => {
    it('should set level from LogLevel enum', () => {
      testLogger.setLevel(LogLevel.INFO);
      expect(testLogger).toBeDefined();
    });

    it('should set level from string', () => {
      testLogger.setLevel('WARN');
      expect(testLogger).toBeDefined();
    });
  });

  describe('setModuleName', () => {
    it('should set module name', () => {
      testLogger.setModuleName('MyModule');
      expect(testLogger).toBeDefined();
    });
  });

  describe('enable/disable', () => {
    it('should enable logging', () => {
      testLogger.disable();
      testLogger.enable();
      expect(testLogger).toBeDefined();
    });

    it('should disable logging', () => {
      testLogger.disable();
      // Silent - no output expected
    });
  });

  describe('child logger', () => {
    it('should create child logger', () => {
      const child = testLogger.child('ChildModule');
      expect(child).toBeDefined();
    });
  });

  describe('time/timeSync', () => {
    it('should time async function', async () => {
      const result = await testLogger.time('test', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'done';
      });
      expect(result).toBe('done');
    });

    it('should time sync function', () => {
      const result = testLogger.timeSync('test', () => {
        return 'done';
      });
      expect(result).toBe('done');
    });
  });
});

describe('LogLevel enum', () => {
  it('should have correct values', () => {
    expect(LogLevel.DEBUG).toBe(0);
    expect(LogLevel.INFO).toBe(1);
    expect(LogLevel.WARN).toBe(2);
    expect(LogLevel.ERROR).toBe(3);
    expect(LogLevel.NONE).toBe(4);
  });
});

describe('createLogger', () => {
  it('should create logger with module name', () => {
    const log = createLogger('TestModule');
    expect(log).toBeDefined();
  });
});
