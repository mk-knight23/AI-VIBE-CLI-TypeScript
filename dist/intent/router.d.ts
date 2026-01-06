/**
 * Intent Router - Classifies natural language into actionable intents
 *
 * This is the core of the intent-driven UX.
 * Users type naturally; the system infers what they want.
 */
import { IntentCategory, IntentPattern, VibeIntent, IntentContext, IProviderRouter } from '../types.js';
export type { IntentCategory, IntentPattern, IntentContext };
export interface ClarificationOption {
    label: string;
    category: IntentCategory;
    description: string;
}
export interface IntentClassificationResult {
    intent: VibeIntent;
    needsClarification: boolean;
    suggestedOptions?: ClarificationOption[];
}
/**
 * Intent Router - classifies natural language input
 */
export declare class IntentRouter {
    private patterns;
    private provider;
    private readonly LOW_CONFIDENCE_THRESHOLD;
    private readonly UNKNOWN_CONFIDENCE;
    constructor(provider: IProviderRouter);
    /**
     * Initialize keyword and phrase patterns for intent classification
     */
    private initializePatterns;
    /**
     * Classify natural language input into an intent
     * Returns classification result with optional clarification needs
     */
    classify(input: string): Promise<IntentClassificationResult>;
    /**
     * Detect module-specific commands
     */
    private detectModuleCommand;
    /**
     * Create intent for module command
     */
    private createModuleIntent;
    /**
     * Map module name to category
     */
    private moduleToCategory;
    /**
     * Route intent to module
     */
    routeToModule(intent: VibeIntent): {
        module: string;
        action: string;
        params: Record<string, any>;
    } | null;
    /**
     * Generate clarification options when confidence is low
     */
    private generateClarificationOptions;
    /**
     * Calculate score for a pattern against input
     */
    private calculatePatternScore;
    /**
     * Format category for display
     */
    private formatCategoryLabel;
    /**
     * Get description for category
     */
    private getCategoryDescription;
    /**
     * Clarify intent using LLM when confidence is very low
     */
    clarifyWithLLM(input: string): Promise<VibeIntent>;
    /**
     * Parse LLM response to create intent
     */
    private parseLLMResponse;
    /**
     * Parse category from LLM response
     */
    private parseCategoryFromResponse;
    /**
     * Create unknown intent
     */
    private createUnknownIntent;
    /**
     * Map category to IntentType enum
     */
    private mapCategoryToIntentType;
    /**
     * Check if input is a meta-command
     */
    private isMetaCommand;
    /**
     * Create a meta intent
     */
    private createMetaIntent;
    /**
     * Classify the category based on patterns
     */
    private classifyCategory;
    /**
     * Calculate confidence score
     */
    private calculateConfidence;
    /**
     * Extract context from input
     */
    private extractContext;
    /**
     * Assess risk level
     */
    private assessRisk;
    /**
     * Determine if this should be remembered
     */
    private shouldRememberThis;
}
//# sourceMappingURL=router.d.ts.map