/**
 * Context Builder Tests
 *
 * Tests for context building and summarization.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContextBuilder } from '../../../../src/core/session/context-builder';
import { Session, Iteration } from '../../../../src/core/session/session-types';

describe('ContextBuilder', () => {
  let builder: ContextBuilder;
  let mockSession: Session;

  beforeEach(() => {
    builder = new ContextBuilder();

    mockSession = {
      id: 'test-session',
      projectId: 'test-project',
      startTime: new Date('2024-01-01T10:00:00Z'),
      iterations: [],
      context: {
        task: 'Implement feature X',
        objectives: ['Write code', 'Add tests', 'Update docs'],
        completed: ['Task 1', 'Task 2'],
        inProgress: ['Task 3'],
        blocked: ['Task 4'],
        tokenCount: 0,
      },
      status: 'active' as any,
      metadata: {},
    };
  });

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      const defaultBuilder = new ContextBuilder();

      const config = defaultBuilder.getConfig();
      expect(config.maxHistoryLength).toBe(10);
      expect(config.maxTokens).toBe(50000);
    });

    it('should accept custom config', () => {
      const customBuilder = new ContextBuilder({
        maxHistoryLength: 20,
        maxTokens: 100000,
      });

      const config = customBuilder.getConfig();
      expect(config.maxHistoryLength).toBe(20);
      expect(config.maxTokens).toBe(100000);
    });
  });

  describe('Building Task Context', () => {
    it('should include task in context', () => {
      const context = builder.buildContext(mockSession);

      expect(context).toContain('**Task**: Implement feature X');
    });

    it('should include session ID', () => {
      const context = builder.buildContext(mockSession);

      expect(context).toContain('**Session ID**: test-session');
    });

    it('should include iteration count', () => {
      mockSession.iterations = [
        { number: 1, timestamp: new Date(), response: '', actionItems: [], completion: 0, durationMs: 0, errors: [] },
        { number: 2, timestamp: new Date(), response: '', actionItems: [], completion: 0, durationMs: 0, errors: [] },
      ];

      const context = builder.buildContext(mockSession);

      expect(context).toContain('**Iteration**: 2 completed');
    });

    it('should include objectives', () => {
      const context = builder.buildContext(mockSession);

      expect(context).toContain('**Objectives**:');
      expect(context).toContain('- Write code');
      expect(context).toContain('- Add tests');
      expect(context).toContain('- Update docs');
    });

    it('should include completed tasks', () => {
      const context = builder.buildContext(mockSession);

      expect(context).toContain('**Completed**:');
      expect(context).toContain('✅ Task 1');
      expect(context).toContain('✅ Task 2');
    });

    it('should include in-progress tasks', () => {
      const context = builder.buildContext(mockSession);

      expect(context).toContain('**In Progress**:');
      expect(context).toContain('🔄 Task 3');
    });

    it('should include blocked tasks', () => {
      const context = builder.buildContext(mockSession);

      expect(context).toContain('**Blocked**:');
      expect(context).toContain('🚫 Task 4');
    });

    it('should handle empty objectives', () => {
      mockSession.context.objectives = [];

      const context = builder.buildContext(mockSession);

      expect(context).toContain('**Task**: Implement feature X');
    });

    it('should handle empty completed list', () => {
      mockSession.context.completed = [];

      const context = builder.buildContext(mockSession);

      expect(context).toBeDefined();
    });
  });

  describe('Building Iteration History', () => {
    it('should include iteration history', () => {
      mockSession.iterations = [
        {
          number: 1,
          timestamp: new Date('2024-01-01T10:00:00Z'),
          response: 'Iteration 1 response',
          actionItems: ['Task A'],
          completion: 0.5,
          durationMs: 1000,
          errors: [],
        },
      ];

      const context = builder.buildContext(mockSession);

      expect(context).toContain('## Iteration 1');
      expect(context).toContain('Iteration 1 response');
    });

    it('should limit iterations to maxHistoryLength', () => {
      const limitedBuilder = new ContextBuilder({ maxHistoryLength: 2 });

      for (let i = 1; i <= 10; i++) {
        mockSession.iterations.push({
          number: i,
          timestamp: new Date(),
          response: `Iteration ${i}`,
          actionItems: [],
          completion: 0,
          durationMs: 0,
          errors: [],
        });
      }

      const context = limitedBuilder.buildContext(mockSession);

      // Should only include last 2 iterations
      expect(context).toContain('Iteration 9');
      expect(context).toContain('Iteration 10');
    });

    it('should include action items', () => {
      mockSession.iterations = [
        {
          number: 1,
          timestamp: new Date(),
          response: 'Working on it',
          actionItems: ['Write tests', 'Fix bug'],
          completion: 0,
          durationMs: 0,
          errors: [],
        },
      ];

      const context = builder.buildContext(mockSession);

      expect(context).toContain('**Action Items**:');
      expect(context).toContain('- Write tests');
      expect(context).toContain('- Fix bug');
    });

    it('should include errors when enabled', () => {
      mockSession.iterations = [
        {
          number: 1,
          timestamp: new Date(),
          response: 'Failed',
          actionItems: [],
          completion: 0,
          durationMs: 0,
          errors: ['Error 1', 'Error 2'],
        },
      ];

      const context = builder.buildContext(mockSession);

      expect(context).toContain('**Errors**:');
      expect(context).toContain('❌ Error 1');
      expect(context).toContain('❌ Error 2');
    });

    it('should not include errors when disabled', () => {
      const noErrorBuilder = new ContextBuilder({ includeErrors: false });

      mockSession.iterations = [
        {
          number: 1,
          timestamp: new Date(),
          response: 'Failed',
          actionItems: [],
          completion: 0,
          durationMs: 0,
          errors: ['Error 1'],
        },
      ];

      const context = noErrorBuilder.buildContext(mockSession);

      expect(context).not.toContain('**Errors**:');
    });

    it('should include completion percentage', () => {
      mockSession.iterations = [
        {
          number: 1,
          timestamp: new Date(),
          response: 'Half done',
          actionItems: [],
          completion: 0.5,
          durationMs: 0,
          errors: [],
        },
      ];

      const context = builder.buildContext(mockSession);

      expect(context).toContain('**Progress**: 50%');
    });
  });

  describe('Summarization', () => {
    it('should include summary when available', () => {
      mockSession.context.summary = 'Session completed successfully';

      const context = builder.buildContext(mockSession);

      expect(context).toContain('# Summary');
      expect(context).toContain('Session completed successfully');
    });

    it('should not include summary section when not available', () => {
      mockSession.context.summary = undefined;

      const context = builder.buildContext(mockSession);

      expect(context).not.toContain('# Summary');
    });

    it('should truncate long responses', () => {
      const longResponse = 'a'.repeat(1000);

      mockSession.iterations = [
        {
          number: 1,
          timestamp: new Date(),
          response: longResponse,
          actionItems: [],
          completion: 0,
          durationMs: 0,
          errors: [],
        },
      ];

      const context = builder.buildContext(mockSession);

      // Response should be truncated
      expect(context).toContain('...');
      // But overall context can be longer due to other sections
      expect(context.length).toBeGreaterThan(500);
    });

    it('should not truncate short responses', () => {
      const shortResponse = 'Short response';

      mockSession.iterations = [
        {
          number: 1,
          timestamp: new Date(),
          response: shortResponse,
          actionItems: [],
          completion: 0,
          durationMs: 0,
          errors: [],
        },
      ];

      const context = builder.buildContext(mockSession);

      expect(context).toContain(shortResponse);
      expect(context).not.toContain('...');
    });
  });

  describe('Token Estimation', () => {
    it('should estimate tokens', () => {
      const text = 'a'.repeat(1000); // 1000 chars

      const tokens = builder.estimateTokens(text);

      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(1000);
    });

    it('should handle empty string', () => {
      const tokens = builder.estimateTokens('');

      expect(tokens).toBe(0);
    });

    it('should use tokensPerChar ratio', () => {
      const customBuilder = new ContextBuilder({ tokensPerChar: 0.5 });
      const text = 'a'.repeat(100);

      const tokens = customBuilder.estimateTokens(text);

      expect(tokens).toBe(50);
    });
  });

  describe('Token Limit Trimming', () => {
    it('should not trim when under limit', () => {
      const limitedBuilder = new ContextBuilder({ maxTokens: 10000 });

      mockSession.context.summary = 'a'.repeat(1000);

      const context = limitedBuilder.buildContext(mockSession);

      expect(context).not.toContain('truncated');
    });

    it('should trim when over limit', () => {
      const limitedBuilder = new ContextBuilder({ maxTokens: 100 });

      mockSession.context.summary = 'a'.repeat(10000);

      const context = limitedBuilder.buildContext(mockSession);

      expect(context).toContain('truncated');
    });

    it('should add truncation message', () => {
      const limitedBuilder = new ContextBuilder({ maxTokens: 100 });

      mockSession.context.summary = 'a'.repeat(10000);

      const context = limitedBuilder.buildContext(mockSession);

      expect(context).toContain('[Context truncated due to token limit]');
    });
  });

  describe('Updating Context', () => {
    it('should add action items to in progress', () => {
      const iteration: Iteration = {
        number: 1,
        timestamp: new Date(),
        response: 'Working',
        actionItems: ['New Task 1', 'New Task 2'],
        completion: 0,
        durationMs: 0,
        errors: [],
      };

      const updated = builder.updateContext(mockSession, iteration);

      expect(updated.context.inProgress).toContain('New Task 1');
      expect(updated.context.inProgress).toContain('New Task 2');
    });

    it('should update token count', () => {
      const iteration: Iteration = {
        number: 1,
        timestamp: new Date(),
        response: 'Test',
        actionItems: [],
        completion: 0,
        durationMs: 0,
        errors: [],
      };

      const updated = builder.updateContext(mockSession, iteration);

      expect(updated.context.tokenCount).toBeGreaterThan(0);
    });
  });

  describe('Summary Generation', () => {
    it('should generate summary for session', () => {
      mockSession.iterations = [
        { number: 1, timestamp: new Date(), response: 'Done', actionItems: [], completion: 1, durationMs: 0, errors: [] },
        { number: 2, timestamp: new Date(), response: 'Done', actionItems: [], completion: 1, durationMs: 0, errors: [] },
      ];

      mockSession.context.completed = ['Task A', 'Task B'];

      const summary = builder.generateSummary(mockSession);

      expect(summary).toContain('2 iterations');
      expect(summary).toContain('2 tasks');
    });

    it('should include blocked items in summary', () => {
      mockSession.context.blocked = ['Blocker 1', 'Blocker 2'];

      const summary = builder.generateSummary(mockSession);

      expect(summary).toContain('Blocked on 2 items');
    });

    it('should include average completion', () => {
      mockSession.iterations = [
        { number: 1, timestamp: new Date(), response: 'Done', actionItems: [], completion: 0.5, durationMs: 0, errors: [] },
        { number: 2, timestamp: new Date(), response: 'Done', actionItems: [], completion: 0.7, durationMs: 0, errors: [] },
      ];

      const summary = builder.generateSummary(mockSession);

      expect(summary).toContain('60%');
    });
  });

  describe('Configuration Management', () => {
    it('should get current config', () => {
      const config = builder.getConfig();

      expect(config).toHaveProperty('maxHistoryLength');
      expect(config).toHaveProperty('maxTokens');
    });

    it('should update config', () => {
      builder.updateConfig({ maxHistoryLength: 20 });

      const config = builder.getConfig();
      expect(config.maxHistoryLength).toBe(20);
    });

    it('should preserve other config on update', () => {
      const originalTokens = builder.getConfig().maxTokens;
      builder.updateConfig({ maxHistoryLength: 20 });

      expect(builder.getConfig().maxTokens).toBe(originalTokens);
    });
  });

  describe('Edge Cases', () => {
    it('should handle session with no iterations', () => {
      const context = builder.buildContext(mockSession);

      expect(context).toBeDefined();
      expect(context).toContain('0 completed');
    });

    it('should handle session with no objectives', () => {
      mockSession.context.objectives = [];

      const context = builder.buildContext(mockSession);

      expect(context).toBeDefined();
    });

    it('should handle empty response', () => {
      mockSession.iterations = [
        {
          number: 1,
          timestamp: new Date(),
          response: '',
          actionItems: [],
          completion: 0,
          durationMs: 0,
          errors: [],
        },
      ];

      const context = builder.buildContext(mockSession);

      expect(context).toBeDefined();
    });

    it('should handle special characters in responses', () => {
      mockSession.iterations = [
        {
          number: 1,
          timestamp: new Date(),
          response: 'Special chars: \n\t\r',
          actionItems: [],
          completion: 0,
          durationMs: 0,
          errors: [],
        },
      ];

      const context = builder.buildContext(mockSession);

      expect(context).toContain('Special chars:');
    });

    it('should handle unicode in responses', () => {
      mockSession.iterations = [
        {
          number: 1,
          timestamp: new Date(),
          response: 'Unicode: 🚀 𝕌𝕟𝕚𝕔𝕠𝕕𝕖',
          actionItems: [],
          completion: 0,
          durationMs: 0,
          errors: [],
        },
      ];

      const context = builder.buildContext(mockSession);

      expect(context).toContain('🚀');
    });
  });
});
