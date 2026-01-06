/**
 * Unit tests for error utilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  VibeError,
  ModuleError,
  RouteError,
  ProviderError,
  ConfigurationError,
  ValidationError,
  createErrorResponse,
  withErrorHandling,
} from '../../../src/utils/error';

describe('Error Classes', () => {
  describe('VibeError', () => {
    it('should create error with message and code', () => {
      const error = new VibeError('Test error', 'TEST_CODE');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('VibeError');
    });

    it('should create error with details', () => {
      const error = new VibeError('Test error', 'TEST_CODE', { key: 'value' });
      expect(error.details).toEqual({ key: 'value' });
    });
  });

  describe('ModuleError', () => {
    it('should create module error with module name', () => {
      const error = new ModuleError('Module failed', 'test_module', 'execute');
      expect(error.message).toBe('Module failed');
      expect(error.moduleName).toBe('test_module');
      expect(error.action).toBe('execute');
      expect(error.code).toBe('MODULE_ERROR');
    });
  });

  describe('RouteError', () => {
    it('should create route error with route info', () => {
      const error = new RouteError('Route not found', '/api/users', 'invalid input');
      expect(error.message).toBe('Route not found');
      expect(error.route).toBe('/api/users');
      expect(error.input).toBe('invalid input');
      expect(error.code).toBe('ROUTE_ERROR');
    });
  });

  describe('ProviderError', () => {
    it('should create provider error with provider info', () => {
      const error = new ProviderError('API failed', 'openai', 'gpt-4o', 401);
      expect(error.message).toBe('API failed');
      expect(error.provider).toBe('openai');
      expect(error.model).toBe('gpt-4o');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('PROVIDER_ERROR');
    });
  });

  describe('ConfigurationError', () => {
    it('should create configuration error', () => {
      const error = new ConfigurationError('Invalid config', 'API_KEY');
      expect(error.message).toBe('Invalid config');
      expect(error.configKey).toBe('API_KEY');
      expect(error.code).toBe('CONFIGURATION_ERROR');
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with field info', () => {
      const error = new ValidationError('Invalid email', 'email', 'not-an-email');
      expect(error.message).toBe('Invalid email');
      expect(error.field).toBe('email');
      expect(error.value).toBe('not-an-email');
      expect(error.code).toBe('VALIDATION_ERROR');
    });
  });
});

describe('createErrorResponse', () => {
  it('should create error response from VibeError', () => {
    const error = new VibeError('Test error', 'TEST_CODE', { extra: 'data' });
    const response = createErrorResponse(error, { context: 'test' });

    expect(response.success).toBe(false);
    expect(response.error).toBe('Test error');
    expect(response.code).toBe('TEST_CODE');
    expect(response.context).toEqual({ context: 'test', extra: 'data' });
  });

  it('should create error response from generic Error', () => {
    const error = new Error('Generic error');
    const response = createErrorResponse(error);

    expect(response.success).toBe(false);
    expect(response.error).toBe('Generic error');
    expect(response.code).toBe('UNKNOWN_ERROR');
  });
});

describe('withErrorHandling', () => {
  it('should return result on success', async () => {
    const fn = async () => 'success';
    const result = await withErrorHandling(fn, () => 'error');
    expect(result).toBe('success');
  });

  it('should return error handler result on failure', async () => {
    const fn = async () => {
      throw new Error('fail');
    };
    const result = await withErrorHandling(fn, (e) => `handled: ${e.message}`);
    expect(result).toBe('handled: fail');
  });
});
