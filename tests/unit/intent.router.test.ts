/**
 * VIBE-CLI v0.0.2 - Intent Classification Types Unit Tests
 * Tests for the core intent types used for routing user queries
 */

import { describe, it, expect } from 'vitest';
import type { IntentClassificationResult, VibeIntent, IntentCategory } from '../../src/core-types';

describe('Intent Types', () => {
  describe('IntentCategory', () => {
    it('should support expected category values', () => {
      const categories: IntentCategory[] = [
        'create', 'modify', 'delete', 'explain', 'deploy',
        'test', 'review', 'refactor', 'debug', 'question',
        'config', 'analysis', 'unknown'
      ];

      expect(categories.length).toBeGreaterThan(0);
      categories.forEach(cat => {
        expect(typeof cat).toBe('string');
      });
    });
  });

  describe('VibeIntent', () => {
    it('should construct a valid intent object', () => {
      const intent: VibeIntent = {
        id: 'test-id',
        type: 'command',
        category: 'create',
        query: 'create a new component',
        confidence: 0.95,
        context: {},
        shouldRemember: true,
        shouldApprove: false,
        risk: 'low',
      };

      expect(intent.id).toBe('test-id');
      expect(intent.category).toBe('create');
      expect(intent.confidence).toBeGreaterThan(0);
      expect(intent.risk).toBeDefined();
    });
  });

  describe('IntentClassificationResult', () => {
    it('should have required structure', () => {
      const result: IntentClassificationResult = {
        intent: {
          id: 'test-id',
          type: 'command',
          category: 'deploy',
          query: 'deploy to production',
          confidence: 0.9,
          context: {},
          shouldRemember: false,
          shouldApprove: true,
          risk: 'high',
        },
        needsClarification: false,
      };

      expect(result.intent).toBeDefined();
      expect(typeof result.needsClarification).toBe('boolean');
    });

    it('should support clarification options', () => {
      const result: IntentClassificationResult = {
        intent: {
          id: 'test-id',
          type: 'question',
          category: 'unknown',
          query: 'hello',
          confidence: 0.3,
          context: {},
          shouldRemember: false,
          shouldApprove: false,
          risk: 'low',
        },
        needsClarification: true,
        suggestedOptions: [
          { label: 'Create', category: 'create', description: 'Create something' },
          { label: 'Explain', category: 'explain', description: 'Explain something' },
        ],
      };

      expect(result.needsClarification).toBe(true);
      expect(result.suggestedOptions).toBeDefined();
      expect(result.suggestedOptions!.length).toBe(2);
    });
  });
});
