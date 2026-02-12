/**
 * Response Analyzer
 *
 * Analyzes LLM responses for intelligent exit detection using dual-condition gate.
 * Adapted from Ralph-Claude-Code's response_analyzer.sh
 */

export interface ResponseAnalysis {
  hasExitSignal: boolean;
  hasCompletionIndicator: boolean;
  shouldExit: boolean; // Dual-condition: BOTH exit signal AND completion
  confidence: number; // 0.0 to 1.0
  completionIndicators: string[];
  exitSignals: string[];
  stuckIndicators: string[];
  actionItems: string[];
  jsonOutput?: any; // Parsed JSON if present
}

export interface AnalyzerConfig {
  exitSignals: string[];
  completionPhrases: string[];
  stuckPhrases: string[];
  jsonIndicators: string[];
  confidenceThreshold: number;
}

const DEFAULT_EXIT_SIGNALS = [
  'EXIT_SIGNAL',
  'TASK_COMPLETE',
  'ALL_TASKS_COMPLETE',
  'MISSION_COMPLETE',
  'NO_MORE_WORK',
];

const DEFAULT_COMPLETION_PHRASES = [
  'all tasks have been completed',
  'all requirements have been implemented',
  'the implementation is complete',
  'all tests are passing',
  'all objectives have been met',
];

const DEFAULT_STUCK_PHRASES = [
  'i keep getting the same error',
  'stuck in a loop',
  'going in circles',
  'same issue keeps occurring',
  'unable to proceed',
  'cannot move forward',
  'blocked by',
  'permission denied',
  'access denied',
  'authorization required',
];

const DEFAULT_JSON_INDICATORS = [
  '```json',
  '{"',
  '"exit":',
  '"complete":',
];

export class ResponseAnalyzer {
  private config: AnalyzerConfig;

  constructor(config?: Partial<AnalyzerConfig>) {
    this.config = {
      exitSignals: config?.exitSignals || DEFAULT_EXIT_SIGNALS,
      completionPhrases: config?.completionPhrases || DEFAULT_COMPLETION_PHRASES,
      stuckPhrases: config?.stuckPhrases || DEFAULT_STUCK_PHRASES,
      jsonIndicators: config?.jsonIndicators || DEFAULT_JSON_INDICATORS,
      confidenceThreshold: config?.confidenceThreshold || 0.7,
    };
  }

  /**
   * Analyze response for exit detection (dual-condition gate)
   */
  analyze(response: string): ResponseAnalysis {
    const normalized = response.toLowerCase().trim();

    // Check for exit signals (Condition 1)
    const exitSignals = this.findExitSignals(normalized);
    const hasExitSignal = exitSignals.length > 0;

    // Check for completion indicators (Condition 2)
    const completionIndicators = this.findCompletionIndicators(normalized);
    const hasCompletion = completionIndicators.length > 0;

    // Check for stuck indicators
    const stuckIndicators = this.findStuckIndicators(normalized);

    // Extract action items
    const actionItems = this.extractActionItems(response);

    // Try to parse JSON output
    const jsonOutput = this.tryParseJson(response);

    // Calculate confidence (dual-condition gate)
    let confidence = 0.0;
    if (hasExitSignal) confidence += 0.5;
    if (hasCompletion) confidence += 0.3;
    if (stuckIndicators.length === 0 && actionItems.length === 0) confidence += 0.2;
    if (jsonOutput && jsonOutput.complete) confidence += 0.3;
    if (stuckIndicators.length > 0) confidence -= stuckIndicators.length * 0.2;
    if (actionItems.length > 0) confidence -= actionItems.length * 0.05;

    // Clamp confidence
    confidence = Math.max(0.0, Math.min(1.0, confidence));

    // Dual-condition gate: BOTH conditions must be met
    const shouldExit = hasExitSignal && hasCompletion && confidence >= this.config.confidenceThreshold;

    return {
      hasExitSignal,
      hasCompletionIndicator: hasCompletion,
      shouldExit,
      confidence,
      completionIndicators,
      exitSignals,
      stuckIndicators,
      actionItems,
      jsonOutput,
    };
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
    const items: string[] = [];

    // Match bullet points
    const bulletPattern = /^\s*[-•*]\s+(.+)$/gm;
    let match;
    while ((match = bulletPattern.exec(response)) !== null) {
      const item = match[1].trim();
      if (item.length > 5 && item.length < 200) {
        items.push(item);
      }
    }

    // Match numbered lists
    const numberedPattern = /^\s*\d+\.\s+(.+)$/gm;
    while ((match = numberedPattern.exec(response)) !== null) {
      const item = match[1].trim();
      if (item.length > 5 && item.length < 200) {
        items.push(item);
      }
    }

    // Match "next step:" patterns
    const nextStepPattern = /(?:next\s+(?:step|action)?)[^:\n]*:\s*(.+)$/gim;
    while ((match = nextStepPattern.exec(response)) !== null) {
      const item = match[1].trim();
      if (item.length > 5 && item.length < 200) {
        items.push(item);
      }
    }

    return [...new Set(items)];
  }

  /**
   * Try to parse JSON output
   */
  private tryParseJson(response: string): any {
    // Look for JSON code blocks
    const jsonBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\n```|```json\s*([\s\S]*?)\s*```)/);
    if (jsonBlockMatch) {
      try {
        return JSON.parse(jsonBlockMatch[1] || jsonBlockMatch[2]);
      } catch {
        // Ignore parse errors
      }
    }

    // Look for JSON objects in the response
    const objectMatch = response.match(/\{[^{}]*"exit"[^{}]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        // Ignore parse errors
      }
    }

    return undefined;
  }

  /**
   * Check if response indicates completion (for single-condition checks)
   */
  isComplete(response: string): boolean {
    const analysis = this.analyze(response);
    return analysis.hasCompletionIndicator && analysis.confidence >= 0.5;
  }

  /**
   * Check if response is stuck
   */
  isStuck(response: string): boolean {
    const analysis = this.analyze(response);
    return analysis.stuckIndicators.length >= 2; // Multiple stuck indicators
  }

  /**
   * Get configuration
   */
  getConfig(): AnalyzerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AnalyzerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
