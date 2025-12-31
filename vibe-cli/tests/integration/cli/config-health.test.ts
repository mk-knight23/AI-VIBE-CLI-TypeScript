import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  getRuntimeConfig, 
  isCI,
  isProduction,
  isInteractive, 
  getApiKey,
  validateProductionEnv,
  recordRequest,
  getMetrics,
  getHealthCheck,
  getFallbackProvider
} from '../../../src/core/config';
import { getHealthStatus, formatHealthStatus } from '../../../src/core/health';

describe('Runtime Config', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should return default config when no env vars set', () => {
    delete process.env.VIBE_PROVIDER;
    delete process.env.VIBE_MODEL;
    
    const config = getRuntimeConfig();
    
    expect(config.provider).toBe('megallm');
    expect(config.timeout).toBe(60000);
    expect(config.maxRetries).toBe(3);
    expect(config.debug).toBe(false);
  });

  it('should read config from environment', () => {
    process.env.VIBE_PROVIDER = 'openrouter';
    process.env.VIBE_MODEL = 'gpt-4';
    process.env.VIBE_TIMEOUT = '30000';
    process.env.VIBE_DEBUG = 'true';
    
    const config = getRuntimeConfig();
    
    expect(config.provider).toBe('openrouter');
    expect(config.model).toBe('gpt-4');
    expect(config.timeout).toBe(30000);
    expect(config.debug).toBe(true);
  });

  it('should include production settings', () => {
    process.env.VIBE_MAX_CONCURRENT = '10';
    process.env.VIBE_RATE_LIMIT = '120';
    process.env.VIBE_LOG_LEVEL = 'debug';
    
    const config = getRuntimeConfig();
    
    expect(config.maxConcurrent).toBe(10);
    expect(config.rateLimitPerMin).toBe(120);
    expect(config.logLevel).toBe('debug');
  });

  it('should detect CI environment', () => {
    process.env.CI = 'true';
    expect(isCI()).toBe(true);
    
    delete process.env.CI;
    process.env.GITHUB_ACTIONS = 'true';
    expect(isCI()).toBe(true);
  });

  it('should detect production environment', () => {
    process.env.NODE_ENV = 'production';
    expect(isProduction()).toBe(true);
  });

  it('should get API key from environment', () => {
    process.env.OPENROUTER_API_KEY = 'test-key-123';
    
    expect(getApiKey('openrouter')).toBe('test-key-123');
    expect(getApiKey('unknown')).toBe('');
  });

  it('should validate production environment', () => {
    delete process.env.VIBE_PROVIDER;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.MEGALLM_API_KEY;
    
    const result = validateProductionEnv();
    
    expect(result.valid).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
  });

  it('should include warnings in validation', () => {
    process.env.NODE_ENV = 'production';
    process.env.VIBE_DEBUG = 'true';
    process.env.MEGALLM_API_KEY = 'test';
    
    const result = validateProductionEnv();
    
    expect(result.warnings).toBeDefined();
  });
});

describe('Observability', () => {
  it('should record request metrics', () => {
    recordRequest(100, true);
    recordRequest(200, true);
    recordRequest(0, false, 'Test error');
    
    const metrics = getMetrics();
    
    expect(metrics.requestCount).toBeGreaterThanOrEqual(3);
    expect(metrics.errorCount).toBeGreaterThanOrEqual(1);
    expect(metrics.avgLatency).toBeGreaterThan(0);
  });

  it('should calculate health status', () => {
    const health = getHealthCheck();
    
    expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    expect(health.details.uptime).toBeDefined();
    expect(health.details.requests).toBeDefined();
    expect(health.details.errorRate).toBeDefined();
  });
});

describe('Graceful Degradation', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should find fallback provider', () => {
    process.env.OPENROUTER_API_KEY = '';
    process.env.MEGALLM_API_KEY = 'test-key';
    
    const fallback = getFallbackProvider('openrouter');
    
    expect(fallback).toBe('megallm');
  });

  it('should return null when no fallback available', () => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.MEGALLM_API_KEY;
    delete process.env.AGENTROUTER_API_KEY;
    delete process.env.ROUTEWAY_API_KEY;
    
    const fallback = getFallbackProvider('openrouter');
    
    expect(fallback).toBeNull();
  });
});

describe('Health Check', () => {
  it('should return health status', async () => {
    const health = await getHealthStatus();
    
    expect(health.status).toBeDefined();
    expect(health.version).toBe('9.0.0');
    expect(health.uptime).toBeGreaterThanOrEqual(0);
    expect(health.checks).toBeDefined();
  });

  it('should format health status for display', async () => {
    const health = await getHealthStatus();
    const formatted = formatHealthStatus(health);
    
    expect(formatted).toContain('Status:');
    expect(formatted).toContain('Version:');
    expect(formatted).toContain('Uptime:');
    expect(formatted).toContain('Checks:');
  });

  it('should include error messages when unhealthy', async () => {
    const health = await getHealthStatus();
    
    // Without API keys, should have errors
    if (health.status === 'unhealthy') {
      expect(health.errors).toBeDefined();
      expect(health.errors!.length).toBeGreaterThan(0);
    }
  });
});
