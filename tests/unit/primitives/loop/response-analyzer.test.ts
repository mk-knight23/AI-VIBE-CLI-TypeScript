/**
 * Response Analyzer Tests
 *
 * Test suite for the ResponseAnalyzer class that detects completion signals,
 * exit indicators, action items, and stuck loops in LLM responses.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ResponseAnalyzer, AnalysisResult, AnalyzerConfig } from '../../../../src/domain/primitives/loop/response-analyzer';

describe('ResponseAnalyzer', () => {
  let analyzer: ResponseAnalyzer;

  beforeEach(() => {
    analyzer = new ResponseAnalyzer();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const config = analyzer.getConfig();

      expect(config.exitSignals.length).toBeGreaterThan(0);
      expect(config.completionPhrases.length).toBeGreaterThan(0);
      expect(config.stuckPhrases.length).toBeGreaterThan(0);
      expect(config.confidenceThreshold).toBe(0.7);
    });

    it('should accept custom configuration', () => {
      const customConfig: Partial<AnalyzerConfig> = {
        exitSignals: ['CUSTOM_EXIT'],
        completionPhrases: ['all done'],
        stuckPhrases: ['cant continue'],
        confidenceThreshold: 0.8,
      };

      const customAnalyzer = new ResponseAnalyzer(customConfig);
      const config = customAnalyzer.getConfig();

      expect(config.exitSignals).toEqual(['CUSTOM_EXIT']);
      expect(config.completionPhrases).toEqual(['all done']);
      expect(config.stuckPhrases).toEqual(['cant continue']);
      expect(config.confidenceThreshold).toBe(0.8);
    });

    it('should handle partial configuration', () => {
      const partialAnalyzer = new ResponseAnalyzer({
        exitSignals: ['PARTIAL_EXIT'],
      });

      const config = partialAnalyzer.getConfig();
      expect(config.exitSignals).toEqual(['PARTIAL_EXIT']);
      expect(config.completionPhrases.length).toBeGreaterThan(0);
      expect(config.confidenceThreshold).toBe(0.7);
    });
  });

  describe('Exit Signal Detection', () => {
    it('should detect EXIT_SIGNAL', () => {
      const result = analyzer.analyze('The task is complete. EXIT_SIGNAL');

      expect(result.hasExitSignal).toBe(true);
    });

    it('should detect TASK_COMPLETE', () => {
      const result = analyzer.analyze('All done. TASK_COMPLETE');

      expect(result.hasExitSignal).toBe(true);
    });

    it('should detect ALL_TASKS_COMPLETE', () => {
      const result = analyzer.analyze('Implementation finished. ALL_TASKS_COMPLETE');

      expect(result.hasExitSignal).toBe(true);
    });

    it('should detect MISSION_COMPLETE', () => {
      const result = analyzer.analyze('Objectives achieved. MISSION_COMPLETE');

      expect(result.hasExitSignal).toBe(true);
    });

    it('should detect OBJECTIVES_ACHIEVED', () => {
      const result = analyzer.analyze('All goals met. OBJECTIVES_ACHIEVED');

      expect(result.hasExitSignal).toBe(true);
    });

    it('should detect NO_MORE_WORK', () => {
      const result = analyzer.analyze('Nothing left to do. NO_MORE_WORK');

      expect(result.hasExitSignal).toBe(true);
    });

    it('should detect REACHED_GOAL', () => {
      const result = analyzer.analyze('Target achieved. REACHED_GOAL');

      expect(result.hasExitSignal).toBe(true);
    });

    it('should be case-insensitive for exit signals', () => {
      const result1 = analyzer.analyze('EXIT_SIGNAL');
      const result2 = analyzer.analyze('exit_signal');
      const result3 = analyzer.analyze('Exit_Signal');

      expect(result1.hasExitSignal).toBe(true);
      expect(result2.hasExitSignal).toBe(true);
      expect(result3.hasExitSignal).toBe(true);
    });

    it('should detect exit signals in long text', () => {
      const longText = `
        I have implemented all the required features.
        The tests are passing and the code is clean.
        All requirements have been met.
        EXIT_SIGNAL
      `;

      const result = analyzer.analyze(longText);
      expect(result.hasExitSignal).toBe(true);
    });

    it('should return no exit signals when none present', () => {
      const result = analyzer.analyze('The work is ongoing.');

      expect(result.hasExitSignal).toBe(false);
    });

    it('should detect multiple exit signals', () => {
      const result = analyzer.analyze('TASK_COMPLETE and EXIT_SIGNAL');

      expect(result.hasExitSignal).toBe(true);
    });
  });

  describe('Completion Indicator Detection', () => {
    it('should detect completion indicators with exit signal', () => {
      const result = analyzer.analyze('All tests passing. All tasks have been completed. EXIT_SIGNAL');

      expect(result.isComplete).toBe(true);
    });

    it('should not complete without exit signal', () => {
      const result = analyzer.analyze('All tests passing. All tasks have been completed.');

      expect(result.isComplete).toBe(false);
    });

    it('should detect various completion phrases with exit', () => {
      const phrases = [
        'All requirements have been implemented. EXIT_SIGNAL',
        'The implementation is complete. EXIT_SIGNAL',
        'All tests are passing. EXIT_SIGNAL',
        'All features are implemented. EXIT_SIGNAL',
      ];

      phrases.forEach(phrase => {
        const result = analyzer.analyze(phrase);
        expect(result.hasExitSignal).toBe(true);
      });
    });
  });

  describe('Dual-Condition Detection', () => {
    it('should require both exit signal AND completion indicator', () => {
      const result1 = analyzer.analyze('EXIT_SIGNAL');
      const result2 = analyzer.analyze('All tasks have been completed.');
      const result3 = analyzer.analyze('All tasks have been completed. EXIT_SIGNAL');

      expect(result1.isComplete).toBe(false); // Only exit signal
      expect(result2.isComplete).toBe(false); // Only completion
      expect(result3.isComplete).toBe(true);  // Both
    });

    it('should detect completion with both conditions', () => {
      const response = `
        All tests are passing and all requirements have been implemented.
        The feature is complete and working correctly.
        EXIT_SIGNAL
      `;

      const result = analyzer.analyze(response);
      expect(result.isComplete).toBe(true);
      expect(result.hasExitSignal).toBe(true);
    });

    it('should not complete with only exit signal', () => {
      const response = 'EXIT_SIGNAL';

      const result = analyzer.analyze(response);
      expect(result.isComplete).toBe(false);
      expect(result.hasExitSignal).toBe(true);
    });

    it('should not complete with only completion indicator', () => {
      const response = 'All tasks have been completed.';

      const result = analyzer.analyze(response);
      expect(result.isComplete).toBe(false);
      expect(result.hasExitSignal).toBe(false);
    });
  });

  describe('Stuck Indicator Detection', () => {
    it('should detect "i keep getting the same error"', () => {
      const result = analyzer.analyze('I keep getting the same error when running tests.');

      expect(result.stuckIndicators).toContain('i keep getting the same error');
      expect(result.stuckIndicators.length).toBeGreaterThan(0);
    });

    it('should detect "stuck in a loop"', () => {
      const result = analyzer.analyze('I feel like I am stuck in a loop with this bug.');

      expect(result.stuckIndicators).toContain('stuck in a loop');
    });

    it('should detect "going in circles"', () => {
      const result = analyzer.analyze('We are going in circles with this approach.');

      expect(result.stuckIndicators).toContain('going in circles');
    });

    it('should detect "same issue keeps occurring"', () => {
      const result = analyzer.analyze('The same issue keeps occurring after each fix.');

      expect(result.stuckIndicators).toContain('same issue keeps occurring');
    });

    it('should detect "unable to proceed"', () => {
      const result = analyzer.analyze('I am unable to proceed without more information.');

      expect(result.stuckIndicators).toContain('unable to proceed');
    });

    it('should detect "cannot move forward"', () => {
      const result = analyzer.analyze('Cannot move forward with the current approach.');

      expect(result.stuckIndicators).toContain('cannot move forward');
    });

    it('should detect "blocked by"', () => {
      const result = analyzer.analyze('Progress is blocked by missing dependencies.');

      expect(result.stuckIndicators).toContain('blocked by');
    });

    it('should detect "waiting for"', () => {
      const result = analyzer.analyze('I am waiting for the API to be ready.');

      expect(result.stuckIndicators).toContain('waiting for');
    });

    it('should detect "unclear how to"', () => {
      const result = analyzer.analyze('It is unclear how to implement this feature.');

      expect(result.stuckIndicators).toContain('unclear how to');
    });

    it('should detect "not sure what to do"', () => {
      const result = analyzer.analyze('I am not sure what to do next.');

      expect(result.stuckIndicators).toContain('not sure what to do');
    });

    it('should detect "need more information"', () => {
      const result = analyzer.analyze('I need more information to continue.');

      expect(result.stuckIndicators).toContain('need more information');
    });

    it('should detect "cannot determine"', () => {
      const result = analyzer.analyze('Cannot determine the root cause of this issue.');

      expect(result.stuckIndicators).toContain('cannot determine');
    });

    it('should detect multiple stuck indicators', () => {
      const response = 'I keep getting the same error and cannot move forward. Stuck in a loop.';

      const result = analyzer.analyze(response);
      expect(result.stuckIndicators.length).toBeGreaterThan(1);
    });

    it('should return no stuck indicators when none present', () => {
      const result = analyzer.analyze('The implementation is progressing smoothly.');

      expect(result.stuckIndicators).toEqual([]);
    });
  });

  describe('Action Item Extraction', () => {
    it('should extract bullet point actions', () => {
      const response = `
        Next steps:
        - Implement the user authentication
        - Add unit tests for the API
        - Update the documentation
      `;

      const result = analyzer.analyze(response);
      expect(result.actionItems).toContain('Implement the user authentication');
      expect(result.actionItems).toContain('Add unit tests for the API');
      expect(result.actionItems).toContain('Update the documentation');
    });

    it('should extract numbered list actions', () => {
      const response = `
        Plan:
        1. Create database schema
        2. Implement REST endpoints
        3. Add error handling
      `;

      const result = analyzer.analyze(response);
      expect(result.actionItems).toContain('Create database schema');
      expect(result.actionItems).toContain('Implement REST endpoints');
      expect(result.actionItems).toContain('Add error handling');
    });

    it('should extract "will" actions', () => {
      const response = 'I will implement the feature and then add tests.';

      const result = analyzer.analyze(response);
      expect(result.actionItems.length).toBeGreaterThan(0);
    });

    it('should extract "need to" actions', () => {
      const response = 'I need to refactor the code and optimize performance.';

      const result = analyzer.analyze(response);
      expect(result.actionItems.length).toBeGreaterThan(0);
    });

    it('should extract "should" actions', () => {
      const response = 'We should add validation and improve error messages.';

      const result = analyzer.analyze(response);
      expect(result.actionItems.length).toBeGreaterThan(0);
    });

    it('should extract "going to" actions', () => {
      const response = 'I am going to implement the authentication system.';

      const result = analyzer.analyze(response);
      expect(result.actionItems.length).toBeGreaterThan(0);
    });

    it('should filter out short phrases', () => {
      const response = '- I\n- am\n- here';

      const result = analyzer.analyze(response);
      expect(result.actionItems.length).toBe(0);
    });

    it('should filter out long phrases', () => {
      const longAction = 'a'.repeat(201);
      const response = `- ${longAction}`;

      const result = analyzer.analyze(response);
      expect(result.actionItems.length).toBe(0);
    });

    it('should filter out non-action phrases', () => {
      const response = `
        - Thank you for the review
        - Please let me know if you need changes
        - Hope this helps
      `;

      const result = analyzer.analyze(response);
      expect(result.actionItems.length).toBe(0);
    });

    it('should deduplicate action items', () => {
      const response = `
        - Implement the feature
        - Add tests
        - Implement the feature
      `;

      const result = analyzer.analyze(response);
      const uniqueActions = result.actionItems.filter((item, index, arr) => arr.indexOf(item) === index);
      expect(result.actionItems.length).toBe(uniqueActions.length);
    });

    it('should return empty array when no actions found', () => {
      const response = 'The work is complete. All tasks have been completed. EXIT_SIGNAL';

      const result = analyzer.analyze(response);
      expect(result.actionItems).toEqual([]);
    });
  });

  describe('Confidence Calculation', () => {
    it('should have high confidence with both exit and completion', () => {
      const response = 'All tasks have been completed. EXIT_SIGNAL';

      const result = analyzer.analyze(response);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should have medium confidence with only exit signal', () => {
      const response = 'EXIT_SIGNAL';

      const result = analyzer.analyze(response);
      expect(result.confidence).toBeLessThan(0.8);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    it('should have low confidence with stuck indicators', () => {
      const response = 'I keep getting the same error. EXIT_SIGNAL';

      const result = analyzer.analyze(response);
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should reduce confidence with action items', () => {
      const response1 = 'All tasks have been completed. EXIT_SIGNAL';
      const response2 = `
        All tasks have been completed.
        Next step: Fix the bug.
        EXIT_SIGNAL
      `;

      const result1 = analyzer.analyze(response1);
      const result2 = analyzer.analyze(response2);

      expect(result2.confidence).toBeLessThan(result1.confidence);
    });

    it('should increase confidence with no action items', () => {
      const response = 'All tasks have been completed. No action items. EXIT_SIGNAL';

      const result = analyzer.analyze(response);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should clamp confidence between 0 and 1', () => {
      const response = 'EXIT_SIGNAL ' + 'stuck '.repeat(100);

      const result = analyzer.analyze(response);
      expect(result.confidence).toBeGreaterThanOrEqual(0.0);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });

    it('should have zero confidence with no signals', () => {
      const response = 'Working on the task.';

      const result = analyzer.analyze(response);
      expect(result.confidence).toBe(0.0);
    });
  });

  describe('shouldExit Method', () => {
    it('should return true when complete and above threshold', () => {
      const response = 'All tasks have been completed. EXIT_SIGNAL';

      expect(analyzer.shouldExit(response)).toBe(true);
    });

    it('should return false when below threshold', () => {
      const lowThresholdAnalyzer = new ResponseAnalyzer({ confidenceThreshold: 0.95 });
      const response = 'EXIT_SIGNAL';

      expect(lowThresholdAnalyzer.shouldExit(response)).toBe(false);
    });

    it('should return false when not complete', () => {
      const response = 'Working on implementation.';

      expect(analyzer.shouldExit(response)).toBe(false);
    });

    it('should respect custom confidence threshold', () => {
      const customAnalyzer = new ResponseAnalyzer({ confidenceThreshold: 0.9 });
      const response = 'All tasks have been completed. EXIT_SIGNAL';

      const result = customAnalyzer.analyze(response);
      expect(customAnalyzer.shouldExit(response)).toBe(result.confidence >= 0.9);
    });
  });

  describe('isStuck Method', () => {
    it('should return true when stuck indicators present', () => {
      const response = 'I keep getting the same error.';

      expect(analyzer.isStuck(response)).toBe(true);
    });

    it('should return false when no stuck indicators', () => {
      const response = 'The implementation is progressing well.';

      expect(analyzer.isStuck(response)).toBe(false);
    });

    it('should return true with multiple stuck indicators', () => {
      const response = 'Stuck in a loop and unable to proceed.';

      expect(analyzer.isStuck(response)).toBe(true);
    });
  });

  describe('Reason Generation', () => {
    it('should include exit signal reasons', () => {
      const result = analyzer.analyze('EXIT_SIGNAL');

      expect(result.reasons.some(r => r.includes('exit signals'))).toBe(true);
    });

    it('should include completion reasons', () => {
      const result = analyzer.analyze('All tasks have been completed.');

      expect(result.reasons.some(r => r.includes('completion'))).toBe(true);
    });

    it('should include stuck reasons', () => {
      const result = analyzer.analyze('I keep getting the same error.');

      expect(result.reasons.some(r => r.includes('stuck'))).toBe(true);
    });

    it('should include action item count', () => {
      const result = analyzer.analyze('- Implement feature\n- Add tests');

      expect(result.reasons.some(r => r.includes('action items'))).toBe(true);
    });

    it('should say no action items when none found', () => {
      const result = analyzer.analyze('EXIT_SIGNAL');

      expect(result.reasons.some(r => r.includes('No action items'))).toBe(true);
    });
  });

  describe('Configuration Management', () => {
    it('should update exit signals', () => {
      analyzer.updateConfig({ exitSignals: ['NEW_EXIT'] });

      const result = analyzer.analyze('NEW_EXIT');
      expect(result.hasExitSignal).toBe(true);
    });

    it('should update completion phrases', () => {
      analyzer.updateConfig({ completionPhrases: ['work is finished'] });

      const result = analyzer.analyze('The work is finished. EXIT_SIGNAL');
      expect(result.isComplete).toBe(true);
    });

    it('should update stuck phrases', () => {
      analyzer.updateConfig({ stuckPhrases: ['cant move'] });

      const result = analyzer.analyze('I cant move forward.');
      expect(result.stuckIndicators.length).toBeGreaterThan(0);
    });

    it('should update confidence threshold', () => {
      analyzer.updateConfig({ confidenceThreshold: 0.5 });

      expect(analyzer.getConfig().confidenceThreshold).toBe(0.5);
    });

    it('should reset to default configuration', () => {
      analyzer.updateConfig({ exitSignals: ['TEMP_EXIT'] });
      analyzer.resetConfig();

      const config = analyzer.getConfig();
      expect(config.exitSignals).not.toEqual(['TEMP_EXIT']);
    });

    it('should return immutable config', () => {
      const config1 = analyzer.getConfig();
      const config2 = analyzer.getConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty response', () => {
      const result = analyzer.analyze('');

      expect(result.isComplete).toBe(false);
      expect(result.hasExitSignal).toBe(false);
      expect(result.confidence).toBe(0.0);
    });

    it('should handle whitespace only', () => {
      const result = analyzer.analyze('   \n\t   ');

      expect(result.isComplete).toBe(false);
      expect(result.hasExitSignal).toBe(false);
    });

    it('should handle very long response', () => {
      const longResponse = 'All tasks have been completed. ' + 'a'.repeat(10000) + ' EXIT_SIGNAL';

      const result = analyzer.analyze(longResponse);
      expect(result.isComplete).toBe(true);
    });

    it('should handle special characters', () => {
      const response = 'All tasks have been completed! @#$% EXIT_SIGNAL';

      const result = analyzer.analyze(response);
      expect(result.hasExitSignal).toBe(true);
    });

    it('should handle unicode characters', () => {
      const response = 'All tasks have been completed 🎉 EXIT_SIGNAL';

      const result = analyzer.analyze(response);
      expect(result.hasExitSignal).toBe(true);
    });

    it('should handle mixed case', () => {
      const result = analyzer.analyze('ExIt_SiGnAl');

      expect(result.hasExitSignal).toBe(true);
    });

    it('should handle multiple lines', () => {
      const response = `
        Line 1
        Line 2
        EXIT_SIGNAL
        Line 3
      `;

      const result = analyzer.analyze(response);
      expect(result.hasExitSignal).toBe(true);
    });

    it('should handle malformed text', () => {
      const response = '!!!!All tasks have been completed??? EXIT_SIGNAL...';

      const result = analyzer.analyze(response);
      expect(result.isComplete).toBe(true);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should detect successful completion', () => {
      const response = `
        I have successfully implemented all the required features.
        All tests are passing with 100% coverage.
        The code has been documented and reviewed.
        All tasks have been completed.
        EXIT_SIGNAL
      `;

      const result = analyzer.analyze(response);
      expect(result.isComplete).toBe(true);
      expect(result.hasExitSignal).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.actionItems).toEqual([]);
    });

    it('should detect work in progress', () => {
      const response = `
        I have implemented the core features but still need to:
        - Add error handling
        - Write unit tests
        - Update documentation

        The main functionality is working but needs polish.
      `;

      const result = analyzer.analyze(response);
      expect(result.isComplete).toBe(false);
      expect(result.hasExitSignal).toBe(false);
      expect(result.actionItems.length).toBeGreaterThan(0);
    });

    it('should detect stuck situation', () => {
      const response = `
        I have tried multiple approaches but I keep getting the same error.
        I feel like I am stuck in a loop with this issue.
        Unable to proceed without clarification on the requirements.
        Cannot determine the root cause of the failing test.
      `;

      const result = analyzer.analyze(response);
      expect(result.stuckIndicators.length).toBeGreaterThan(2);
      expect(analyzer.isStuck(response)).toBe(true);
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should detect partial completion with next steps', () => {
      const response = `
        The authentication system is implemented and working.
        All tests are passing.

        Next steps:
        - Add authorization checks
        - Implement role-based access control
        - Add API rate limiting

        The core functionality is complete.
      `;

      const result = analyzer.analyze(response);
      expect(result.isComplete).toBe(false);
      expect(result.actionItems.length).toBe(3);
    });

    it('should handle confident completion', () => {
      const response = `
        Implementation is complete and all tests are passing.
        No further changes needed.
        The feature is complete and working correctly.
        EXIT_SIGNAL
      `;

      const result = analyzer.analyze(response);
      expect(analyzer.shouldExit(response)).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Performance', () => {
    it('should analyze short responses quickly', () => {
      const response = 'All tasks have been completed. EXIT_SIGNAL';

      const start = Date.now();
      analyzer.analyze(response);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should analyze long responses efficiently', () => {
      const response = 'a'.repeat(10000) + ' EXIT_SIGNAL ' + 'b'.repeat(10000);

      const start = Date.now();
      analyzer.analyze(response);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500);
    });
  });
});
