/**
 * Unit tests for error utilities
 */

import { describe, it, expect } from 'vitest';
import {
  VibeError,
  ErrorCode,
  errors,
  wrapError,
  isVibeError,
} from '../../../src/utils/errors';

describe('Error Classes', () => {
  describe('VibeError', () => {
    it('should create error with ErrorDetails', () => {
      const error = new VibeError({
        code: ErrorCode.UNKNOWN_ERROR,
        message: 'Test error',
        userMessage: 'Something went wrong',
      });
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(error.name).toBe('VibeError');
      expect(error.userMessage).toBe('Something went wrong');
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should create error with suggestion and context', () => {
      const error = new VibeError({
        code: ErrorCode.CONFIG_NOT_FOUND,
        message: 'Config missing',
        userMessage: 'No config found',
        suggestion: 'Run vibe config init',
        context: { key: 'value' },
      });
      expect(error.suggestion).toBe('Run vibe config init');
      expect(error.context).toEqual({ key: 'value' });
    });

    it('should format for display', () => {
      const error = new VibeError({
        code: ErrorCode.API_KEY_MISSING,
        message: 'API key missing',
        userMessage: 'No API key configured',
        suggestion: 'Set the API key',
      });
      const display = error.formatForDisplay();
      expect(display).toContain('No API key configured');
      expect(display).toContain('Set the API key');
    });

    it('should serialize to JSON', () => {
      const error = new VibeError({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid input',
        userMessage: 'Bad input',
      });
      const json = error.toJSON();
      expect(json.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(json.message).toBe('Invalid input');
      expect(json.timestamp).toBeDefined();
    });
  });
});

describe('errors helper', () => {
  it('should create configNotFound error', () => {
    const error = errors.configNotFound('/path/to/config');
    expect(error.code).toBe(ErrorCode.CONFIG_NOT_FOUND);
    expect(error.message).toContain('/path/to/config');
  });

  it('should create apiKeyMissing error', () => {
    const error = errors.apiKeyMissing('openai');
    expect(error.code).toBe(ErrorCode.API_KEY_MISSING);
    expect(error.message).toContain('openai');
  });

  it('should create validationError', () => {
    const error = errors.validationError('email', 'invalid format');
    expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(error.message).toContain('email');
  });

  it('should create timeoutError', () => {
    const error = errors.timeoutError('fetch', 5000);
    expect(error.code).toBe(ErrorCode.TIMEOUT_ERROR);
    expect(error.message).toContain('5000');
  });

  it('should create unknownError', () => {
    const cause = new Error('root cause');
    const error = errors.unknownError(cause);
    expect(error.code).toBe(ErrorCode.UNKNOWN_ERROR);
    expect(error.message).toContain('root cause');
  });
});

describe('wrapError', () => {
  it('should pass through VibeError unchanged', () => {
    const original = errors.apiKeyMissing('test');
    const wrapped = wrapError(original);
    expect(wrapped).toBe(original);
  });

  it('should wrap generic Error in VibeError', () => {
    const generic = new Error('generic failure');
    const wrapped = wrapError(generic);
    expect(wrapped).toBeInstanceOf(VibeError);
    expect(wrapped.code).toBe(ErrorCode.UNKNOWN_ERROR);
    expect(wrapped.message).toBe('generic failure');
  });

  it('should wrap string errors', () => {
    const wrapped = wrapError('something broke');
    expect(wrapped).toBeInstanceOf(VibeError);
    expect(wrapped.message).toBe('something broke');
  });
});

describe('isVibeError', () => {
  it('should return true for VibeError', () => {
    const error = errors.unknownError();
    expect(isVibeError(error)).toBe(true);
  });

  it('should return false for generic Error', () => {
    expect(isVibeError(new Error('test'))).toBe(false);
  });

  it('should return false for non-errors', () => {
    expect(isVibeError('string')).toBe(false);
    expect(isVibeError(null)).toBe(false);
  });
});
