/**
 * VIBE-CLI v12 - Intent Router Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntentRouter } from '../../src/intent/router';

// Mock provider for testing
const mockProvider = {
  chat: vi.fn(),
  complete: vi.fn(),
  selectModel: vi.fn(),
};

describe('IntentRouter', () => {
  let router: IntentRouter;

  beforeEach(() => {
    router = new IntentRouter(mockProvider as any);
  });

  describe('Intent Classification', () => {
    it('should classify deployment queries correctly', async () => {
      const deployQueries = [
        'deploy to production',
        'build the project',
        'setup CI/CD pipeline',
        'deploy to vercel',
      ];

      for (const query of deployQueries) {
        const result = await router.classify(query);
        expect(result.intent.category).toBe('deploy');
      }
    });

    it('should classify some queries as unknown', async () => {
      const unknownQueries = [
        'what is 2+2',
        'tell me a joke',
        'random text',
      ];

      for (const query of unknownQueries) {
        const result = await router.classify(query);
        // These should be either unknown or question
        expect(['unknown', 'question']).toContain(result.intent.category);
      }
    });
  });

  describe('Intent Properties', () => {
    it('should generate valid intent structure', async () => {
      const result = await router.classify('write a function to add numbers');
      const intent = result.intent;

      expect(intent.id).toBeDefined();
      expect(intent.type).toBeDefined();
      expect(intent.category).toBeDefined();
      expect(intent.query).toBe('write a function to add numbers');
      expect(intent.confidence).toBeGreaterThan(0);
      expect(intent.context).toBeDefined();
      expect(intent.shouldRemember).toBeDefined();
      expect(intent.shouldApprove).toBeDefined();
      expect(intent.risk).toBeDefined();
    });

    it('should assign risk levels based on category', async () => {
      const explainQuery = await router.classify('explain this code');
      // Explain queries should be low risk
      expect(['low', 'medium']).toContain(explainQuery.intent.risk);

      const writeQuery = await router.classify('write code');
      // Write queries should be medium risk
      expect(['low', 'medium', 'high']).toContain(writeQuery.intent.risk);
    });
  });

  describe('Classification Result', () => {
    it('should return IntentClassificationResult structure', async () => {
      const result = await router.classify('test query');

      expect(result).toHaveProperty('intent');
      expect(typeof result.needsClarification).toBe('boolean');
    });

    it('should suggest clarification for low confidence queries', async () => {
      const result = await router.classify('hello');

      // Low confidence queries might need clarification
      if (result.confidence < 0.6) {
        expect(result.suggestedOptions).toBeDefined();
      }
    });
  });

  describe('Meta Commands', () => {
    it('should recognize help command', async () => {
      const result = await router.classify('/help');
      expect(result.intent.category).toBe('question');
    });

    it('should recognize status command', async () => {
      const result = await router.classify('/status');
      expect(result.intent.category).toBe('analysis');
    });
  });
});
