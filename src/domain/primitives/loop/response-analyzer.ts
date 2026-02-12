/**
 * Response Analyzer
 *
 * Analyzes LLM responses to detect:
 * - Completion indicators (task is done)
 * - Exit signals (explicit request to stop)
 * - Action items (tasks to perform)
 * - Stuck indicators (loop is stuck)
 *
 * Uses dual-condition detection: requires BOTH completion indicators
 * AND explicit exit signal for reliable termination.
 */

export interface AnalysisResult {
  isComplete: boolean;
  hasExitSignal: boolean;
  confidence: number; // 0.0 to 1.0
  actionItems: string[];
  stuckIndicators: string[];
  reasons: string[];
}

export interface AnalyzerConfig {
  exitSignals: string[];
  completionPhrases: string[];
  stuckPhrases: string[];
  confidenceThreshold: number;
}

/**
 * Default exit signals that indicate the loop should stop
 */
const DEFAULT_EXIT_SIGNALS = [
  'EXIT_SIGNAL',
  'TASK_COMPLETE',
  'ALL_TASKS_COMPLETE',
  'MISSION_COMPLETE',
  'OBJECTIVES_ACHIEVED',
  'NO_MORE_WORK',
  'REACHED_GOAL',
];

/**
 * Default phrases that indicate task completion
 */
const DEFAULT_COMPLETION_PHRASES = [
  'all tasks have been completed',
  'all requirements have been implemented',
  'the implementation is complete',
  'all tests are passing',
  'all features are implemented',
  'all objectives have been met',
  'task is complete',
  'implementation complete',
  'done implementing',
  'finished all work',
  'no further changes needed',
  'nothing left to do',
  'complete and working',
  'all done',
];

/**
 * Default phrases that indicate the loop is stuck
 */
const DEFAULT_STUCK_PHRASES = [
  'i keep getting the same error',
  'stuck in a loop',
  'going in circles',
  'same issue keeps occurring',
  'unable to proceed',
  'cannot move forward',
  'blocked by',
  'waiting for',
  'unclear how to',
  'not sure what to do',
  'need more information',
  'cannot determine',
];

/**
 * Analyzes LLM responses for completion signals
 */
export class ResponseAnalyzer {
  private readonly config: AnalyzerConfig;

  constructor(config?: Partial<AnalyzerConfig>) {
    this.config = {
      exitSignals: config?.exitSignals ?? DEFAULT_EXIT_SIGNALS,
      completionPhrases: config?.completionPhrases ?? DEFAULT_COMPLETION_PHRASES,
      stuckPhrases: config?.stuckPhrases ?? DEFAULT_STUCK_PHRASES,
      confidenceThreshold: config?.confidenceThreshold ?? 0.7,
    };
  }

  /**
   * Analyze a response for completion and exit signals
   */
  analyze(response: string): AnalysisResult {
    const normalizedResponse = response.toLowerCase().trim();

    // Check for exit signals
    const exitSignals = this.findExitSignals(normalizedResponse);
    const hasExitSignal = exitSignals.length > 0;

    // Check for completion indicators
    const completionIndicators = this.findCompletionIndicators(normalizedResponse);
    const isComplete = completionIndicators.length > 0;

    // Check for stuck indicators
    const stuckIndicators = this.findStuckIndicators(normalizedResponse);

    // Extract action items
    const actionItems = this.extractActionItems(response);

    // Calculate confidence
    const confidence = this.calculateConfidence(
      hasExitSignal,
      isComplete,
      stuckIndicators.length,
      actionItems.length
    );

    // Build reasons
    const reasons = this.buildReasons(
      exitSignals,
      completionIndicators,
      stuckIndicators,
      actionItems
    );

    return {
      isComplete: isComplete && hasExitSignal, // Dual-condition detection
      hasExitSignal,
      confidence,
      actionItems,
      stuckIndicators,
      reasons,
    };
  }

  /**
   * Check if response should trigger loop exit
   */
  shouldExit(response: string): boolean {
    const result = this.analyze(response);
    return result.isComplete && result.confidence >= this.config.confidenceThreshold;
  }

  /**
   * Check if loop appears stuck
   */
  isStuck(response: string): boolean {
    const result = this.analyze(response);
    return result.stuckIndicators.length > 0;
  }

  /**
   * Find exit signals in response
   */
  private findExitSignals(response: string): string[] {
    const found: string[] = [];

    for (const signal of this.config.exitSignals) {
      if (response.includes(signal.toLowerCase())) {
        found.push(signal);
      }
    }

    return found;
  }

  /**
   * Find completion indicators in response
   */
  private findCompletionIndicators(response: string): string[] {
    const found: string[] = [];

    for (const phrase of this.config.completionPhrases) {
      if (response.includes(phrase)) {
        found.push(phrase);
      }
    }

    return found;
  }

  /**
   * Find stuck indicators in response
   */
  private findStuckIndicators(response: string): string[] {
    const found: string[] = [];

    for (const phrase of this.config.stuckPhrases) {
      if (response.includes(phrase)) {
        found.push(phrase);
      }
    }

    return found;
  }

  /**
   * Extract action items from response
   */
  private extractActionItems(response: string): string[] {
    const actionItems: string[] = [];

    // Common action item patterns
    const patterns = [
      /(?:next\s+(?:step|action)?(?:\s+is)?:?\s*)[-–—]?\s*(.+?)(?:\n|$)/gi,
      /(?:will|need\s+to|should|going\s+to)\s+(?:have\s+to\s+)?(.+?)(?:\n|$)/gi,
      /^\s*[-•*]\s*(.+?)(?:\n|$)/gmi,
      /^\s*\d+\.\s*(.+?)(?:\n|$)/gmi,
    ];

    for (const pattern of patterns) {
      const matches = response.matchAll(pattern);
      for (const match of matches) {
        const action = match[1]?.trim();
        if (action && action.length > 5 && action.length < 200) {
          // Filter out common non-action phrases
          if (!this.isNonActionPhrase(action)) {
            actionItems.push(action);
          }
        }
      }
    }

    // Deduplicate
    return [...new Set(actionItems)];
  }

  /**
   * Filter out non-action phrases
   */
  private isNonActionPhrase(phrase: string): boolean {
    const nonActions = [
      'thank you',
      'please let me know',
      'let me know if',
      'hope this helps',
      'feel free to',
      'if you have any questions',
      'i understand',
      'ok',
      'sure',
      'sounds good',
      'alright',
      'done',
      'completed',
    ];

    const lowerPhrase = phrase.toLowerCase();
    return nonActions.some(nonAction => lowerPhrase.includes(nonAction));
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    hasExitSignal: boolean,
    isComplete: boolean,
    stuckCount: number,
    actionItemCount: number
  ): number {
    let confidence = 0.0;

    // Base confidence from exit signal
    if (hasExitSignal) {
      confidence += 0.5;
    }

    // Add confidence from completion indicators
    if (isComplete) {
      confidence += 0.3;
    }

    // Reduce confidence if stuck
    if (stuckCount > 0) {
      confidence -= stuckCount * 0.2;
    }

    // Add confidence if no action items (means work is done)
    if (actionItemCount === 0 && hasExitSignal && isComplete) {
      confidence += 0.2;
    }

    // Reduce confidence if there are action items (means work remains)
    if (actionItemCount > 0) {
      confidence -= actionItemCount * 0.1;
    }

    // Clamp between 0 and 1
    return Math.max(0.0, Math.min(1.0, confidence));
  }

  /**
   * Build human-readable reasons
   */
  private buildReasons(
    exitSignals: string[],
    completionIndicators: string[],
    stuckIndicators: string[],
    actionItems: string[]
  ): string[] {
    const reasons: string[] = [];

    if (exitSignals.length > 0) {
      reasons.push(`Found exit signals: ${exitSignals.join(', ')}`);
    }

    if (completionIndicators.length > 0) {
      reasons.push(`Found completion indicators: ${completionIndicators.slice(0, 3).join(', ')}`);
    }

    if (stuckIndicators.length > 0) {
      reasons.push(`Found stuck indicators: ${stuckIndicators.slice(0, 3).join(', ')}`);
    }

    if (actionItems.length > 0) {
      reasons.push(`Found ${actionItems.length} action items remaining`);
    } else {
      reasons.push('No action items found (work appears complete)');
    }

    return reasons;
  }

  /**
   * Get current configuration
   */
  getConfig(): AnalyzerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AnalyzerConfig>): void {
    if (config.exitSignals) {
      this.config.exitSignals = config.exitSignals;
    }
    if (config.completionPhrases) {
      this.config.completionPhrases = config.completionPhrases;
    }
    if (config.stuckPhrases) {
      this.config.stuckPhrases = config.stuckPhrases;
    }
    if (config.confidenceThreshold !== undefined) {
      this.config.confidenceThreshold = config.confidenceThreshold;
    }
  }

  /**
   * Reset to default configuration
   */
  resetConfig(): void {
    this.config.exitSignals = DEFAULT_EXIT_SIGNALS;
    this.config.completionPhrases = DEFAULT_COMPLETION_PHRASES;
    this.config.stuckPhrases = DEFAULT_STUCK_PHRASES;
    this.config.confidenceThreshold = 0.7;
  }
}
