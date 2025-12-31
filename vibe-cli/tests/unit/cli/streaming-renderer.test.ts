import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StreamingRenderer, StreamEvent, CostEstimator, ErrorRenderer } from '../../../src/ui/streaming-renderer';

describe('StreamingRenderer', () => {
  let renderer: StreamingRenderer;

  beforeEach(() => {
    renderer = new StreamingRenderer();
    // Mock console methods to avoid output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  it('should initialize with default state', () => {
    const state = renderer.getCurrentState();
    
    expect(state.currentPhase).toBe('initializing');
    expect(state.progress).toBe(0);
    expect(state.totalTokens).toBe(0);
    expect(state.estimatedCost).toBe(0);
    expect(state.isComplete).toBe(false);
    expect(state.hasError).toBe(false);
  });

  it('should update phase correctly', () => {
    renderer.updatePhase('analyzing', 25);
    
    const state = renderer.getCurrentState();
    expect(state.currentPhase).toBe('analyzing');
    expect(state.progress).toBe(25);
  });

  it('should update tokens and cost', () => {
    renderer.updateTokens(1500, 0.045);
    
    const state = renderer.getCurrentState();
    expect(state.totalTokens).toBe(1500);
    expect(state.estimatedCost).toBe(0.045);
  });

  it('should track thinking time', () => {
    renderer.showThinking(3500);
    
    const state = renderer.getCurrentState();
    expect(state.thinkingTime).toBe(3500);
  });

  it('should manage active tools', () => {
    renderer.showTool('security-scan', 'running');
    renderer.showTool('test-generator', 'running');
    
    let state = renderer.getCurrentState();
    expect(state.activeTools).toContain('security-scan');
    expect(state.activeTools).toContain('test-generator');
    
    renderer.showTool('security-scan', 'success');
    
    state = renderer.getCurrentState();
    expect(state.activeTools).not.toContain('security-scan');
    expect(state.activeTools).toContain('test-generator');
  });

  it('should emit events on updates', () => {
    const phaseListener = vi.fn();
    const tokenListener = vi.fn();
    
    renderer.on('phase-updated', phaseListener);
    renderer.on('tokens-updated', tokenListener);
    
    renderer.updatePhase('generating', 50);
    renderer.updateTokens(2000, 0.06);
    
    expect(phaseListener).toHaveBeenCalledWith({ phase: 'generating', progress: 50 });
    expect(tokenListener).toHaveBeenCalledWith({ count: 2000, cost: 0.06 });
  });

  it('should reset state correctly', () => {
    renderer.updatePhase('finalizing', 90);
    renderer.updateTokens(3000, 0.12);
    
    renderer.reset();
    
    const state = renderer.getCurrentState();
    expect(state.currentPhase).toBe('initializing');
    expect(state.progress).toBe(0);
    expect(state.totalTokens).toBe(0);
    expect(state.estimatedCost).toBe(0);
  });

  it('should clamp progress values', () => {
    renderer.updatePhase('analyzing', -10);
    expect(renderer.getCurrentState().progress).toBe(0);
    
    renderer.updatePhase('analyzing', 150);
    expect(renderer.getCurrentState().progress).toBe(100);
  });

  it('should process stream events correctly', async () => {
    const events: StreamEvent[] = [
      {
        type: 'phase',
        data: { phase: 'analyzing', progress: 30 },
        timestamp: new Date()
      },
      {
        type: 'token',
        data: { tokens: 500, cost: 0.015 },
        timestamp: new Date()
      },
      {
        type: 'thinking',
        data: { thinkingTime: 2000 },
        timestamp: new Date()
      },
      {
        type: 'complete',
        data: {},
        timestamp: new Date()
      }
    ];

    async function* eventGenerator() {
      for (const event of events) {
        yield event;
      }
    }

    await renderer.render(eventGenerator());

    const state = renderer.getCurrentState();
    expect(state.currentPhase).toBe('analyzing');
    expect(state.totalTokens).toBe(500);
    expect(state.thinkingTime).toBe(2000);
    expect(state.isComplete).toBe(true);
  });
});

describe('CostEstimator', () => {
  it('should estimate costs correctly for different models', () => {
    const cost1 = CostEstimator.estimateCost('openai/o3-mini', 1000, 500);
    const cost2 = CostEstimator.estimateCost('google/gemini-2-0-flash', 1000, 500);
    
    expect(cost1).toBeGreaterThan(0);
    expect(cost2).toBeGreaterThan(0);
    expect(cost1).toBeGreaterThan(cost2); // o3-mini should be more expensive
  });

  it('should return 0 for unknown models', () => {
    const cost = CostEstimator.estimateCost('unknown/model', 1000, 500);
    expect(cost).toBe(0);
  });

  it('should format costs correctly', () => {
    expect(CostEstimator.formatCost(0.001234)).toBe('$0.0012');
    expect(CostEstimator.formatCost(0.123456)).toBe('$0.12');
    expect(CostEstimator.formatCost(1.234567)).toBe('$1.23');
  });
});

describe('ErrorRenderer', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should render errors with context', () => {
    const error = new Error('Test error message');
    ErrorRenderer.renderError(error, 'Test context');
    
    expect(console.log).toHaveBeenCalledWith('\n❌ Error occurred:');
    expect(console.log).toHaveBeenCalledWith('   Context: Test context');
    expect(console.log).toHaveBeenCalledWith('   Message: Test error message');
  });

  it('should render warnings', () => {
    ErrorRenderer.renderWarning('Test warning');
    expect(console.log).toHaveBeenCalledWith('⚠️  Warning: Test warning');
  });

  it('should render success messages', () => {
    ErrorRenderer.renderSuccess('Test success');
    expect(console.log).toHaveBeenCalledWith('✅ Test success');
  });
});
