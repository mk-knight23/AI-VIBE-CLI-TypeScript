/**
 * Observability Tests - P1
 * Tests for structured logging, metrics, and agent tracing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  startExecution,
  getExecutionContext,
  endExecution,
  logger,
  recordRequest,
  recordToolCall,
  recordProviderCall,
  recordCommand,
  getMetrics,
  resetMetrics,
  startAgentTrace,
  addStepToTrace,
  completeStep,
  endAgentTrace,
  getAgentTrace,
  getRecentTraces,
  classifyError,
  getHealthStatus,
} from '../../src/core/observability';

describe('Execution Context', () => {
  beforeEach(() => {
    endExecution();
  });

  it('should create execution context with ID', () => {
    const ctx = startExecution();
    expect(ctx.executionId).toBeDefined();
    expect(ctx.executionId.length).toBe(8);
    expect(ctx.startTime).toBeLessThanOrEqual(Date.now());
  });

  it('should include optional fields', () => {
    const ctx = startExecution({
      sessionId: 'sess-123',
      provider: 'openai',
      model: 'gpt-4',
    });
    expect(ctx.sessionId).toBe('sess-123');
    expect(ctx.provider).toBe('openai');
    expect(ctx.model).toBe('gpt-4');
  });

  it('should return current context', () => {
    const ctx = startExecution();
    expect(getExecutionContext()).toBe(ctx);
  });

  it('should clear context on end', () => {
    startExecution();
    endExecution();
    expect(getExecutionContext()).toBeNull();
  });
});

describe('Metrics', () => {
  beforeEach(() => {
    resetMetrics();
  });

  it('should record requests', () => {
    recordRequest(100, true);
    recordRequest(200, true);
    recordRequest(150, false);

    const m = getMetrics();
    expect(m.requests).toBe(3);
    expect(m.errors).toBe(1);
    expect(m.avgLatency).toBe(150);
    expect(m.errorRate).toBeCloseTo(0.333, 2);
  });

  it('should record tool calls', () => {
    recordToolCall('read_file');
    recordToolCall('read_file');
    recordToolCall('write_file');

    const m = getMetrics();
    expect(m.toolCalls['read_file']).toBe(2);
    expect(m.toolCalls['write_file']).toBe(1);
  });

  it('should record provider calls', () => {
    recordProviderCall('openai');
    recordProviderCall('anthropic');
    recordProviderCall('openai');

    const m = getMetrics();
    expect(m.providerCalls['openai']).toBe(2);
    expect(m.providerCalls['anthropic']).toBe(1);
  });

  it('should record command calls', () => {
    recordCommand('help');
    recordCommand('model');
    recordCommand('help');

    const m = getMetrics();
    expect(m.commandCalls['help']).toBe(2);
    expect(m.commandCalls['model']).toBe(1);
  });

  it('should reset metrics', () => {
    recordRequest(100, true);
    recordToolCall('test');
    resetMetrics();

    const m = getMetrics();
    expect(m.requests).toBe(0);
    expect(m.toolCalls).toEqual({});
  });
});

describe('Agent Tracing', () => {
  it('should create trace with ID', () => {
    const trace = startAgentTrace('plan-123');
    expect(trace.traceId).toBeDefined();
    expect(trace.planId).toBe('plan-123');
    expect(trace.status).toBe('running');
    expect(trace.steps).toEqual([]);
  });

  it('should add steps to trace', () => {
    const trace = startAgentTrace('plan-456');
    addStepToTrace(trace.traceId, 'step-0', 'read_file');
    addStepToTrace(trace.traceId, 'step-1', 'write_file');

    const updated = getAgentTrace(trace.traceId);
    expect(updated?.steps).toHaveLength(2);
    expect(updated?.steps[0].tool).toBe('read_file');
    expect(updated?.steps[0].status).toBe('running');
  });

  it('should complete steps', () => {
    const trace = startAgentTrace('plan-789');
    addStepToTrace(trace.traceId, 'step-0', 'read_file');
    completeStep(trace.traceId, 'step-0', true);

    const updated = getAgentTrace(trace.traceId);
    expect(updated?.steps[0].status).toBe('success');
    expect(updated?.steps[0].endTime).toBeDefined();
  });

  it('should record step failures', () => {
    const trace = startAgentTrace('plan-fail');
    addStepToTrace(trace.traceId, 'step-0', 'write_file');
    completeStep(trace.traceId, 'step-0', false, 'Permission denied');

    const updated = getAgentTrace(trace.traceId);
    expect(updated?.steps[0].status).toBe('failed');
    expect(updated?.steps[0].error).toBe('Permission denied');
  });

  it('should end trace with status', () => {
    const trace = startAgentTrace('plan-end');
    endAgentTrace(trace.traceId, 'completed', 0);

    const updated = getAgentTrace(trace.traceId);
    expect(updated?.status).toBe('completed');
    expect(updated?.endTime).toBeDefined();
  });

  it('should track rollback count', () => {
    const trace = startAgentTrace('plan-rollback');
    endAgentTrace(trace.traceId, 'failed', 3);

    const updated = getAgentTrace(trace.traceId);
    expect(updated?.rollbackCount).toBe(3);
  });

  it('should list recent traces', () => {
    startAgentTrace('plan-a');
    startAgentTrace('plan-b');

    const traces = getRecentTraces();
    expect(traces.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Failure Classification', () => {
  it('should classify network errors', () => {
    expect(classifyError(new Error('ECONNREFUSED'))).toBe('network');
    expect(classifyError(new Error('ENOTFOUND'))).toBe('network');
    expect(classifyError(new Error('Network error'))).toBe('network');
  });

  it('should classify auth errors', () => {
    expect(classifyError(new Error('401 Unauthorized'))).toBe('auth');
    expect(classifyError(new Error('Invalid API key'))).toBe('auth');
  });

  it('should classify rate limit errors', () => {
    expect(classifyError(new Error('429 Too Many Requests'))).toBe('rate_limit');
    expect(classifyError(new Error('Rate limit exceeded'))).toBe('rate_limit');
  });

  it('should classify timeout errors', () => {
    expect(classifyError(new Error('Request timeout'))).toBe('timeout');
    expect(classifyError(new Error('ETIMEDOUT'))).toBe('timeout');
  });

  it('should classify validation errors', () => {
    expect(classifyError(new Error('Validation failed'))).toBe('validation');
    expect(classifyError(new Error('Invalid parameter'))).toBe('validation');
  });

  it('should classify permission errors', () => {
    expect(classifyError(new Error('403 Forbidden'))).toBe('permission');
    expect(classifyError(new Error('Permission denied'))).toBe('permission');
  });

  it('should classify not found errors', () => {
    expect(classifyError(new Error('404 Not Found'))).toBe('not_found');
    expect(classifyError(new Error('Resource not found'))).toBe('not_found');
  });

  it('should classify internal errors', () => {
    expect(classifyError(new Error('500 Internal Server Error'))).toBe('internal');
  });

  it('should return unknown for unclassified errors', () => {
    expect(classifyError(new Error('Something weird happened'))).toBe('unknown');
  });
});

describe('Health Status', () => {
  beforeEach(() => {
    resetMetrics();
  });

  it('should return healthy status with no errors', () => {
    recordRequest(100, true);
    recordRequest(100, true);

    const health = getHealthStatus();
    expect(health.status).toBe('healthy');
    expect(health.uptime).toBeGreaterThan(0);
  });

  it('should return degraded status with some errors', () => {
    recordRequest(100, true);
    recordRequest(100, false); // 50% error rate

    const health = getHealthStatus();
    expect(health.status).toBe('degraded');
  });

  it('should return unhealthy status with many errors', () => {
    recordRequest(100, false);
    recordRequest(100, false);
    recordRequest(100, true); // 66% error rate

    const health = getHealthStatus();
    expect(health.status).toBe('unhealthy');
  });

  it('should include metrics', () => {
    recordRequest(100, true);
    recordToolCall('test');

    const health = getHealthStatus();
    expect(health.metrics.requests).toBe(1);
    expect(health.metrics.toolCalls['test']).toBe(1);
  });
});
