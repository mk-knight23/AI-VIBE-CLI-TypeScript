/**
 * VIBE-CLI v12 - PLANNING Primitive
 *
 * Creates execution plans for complex tasks.
 * Breaks down user intents into actionable steps.
 */
import type { VibeIntent, Plan } from '../types';
import { CompletionPrimitive } from '../providers/completion';
export interface PlanningOptions {
    maxSteps?: number;
    includeRisks?: boolean;
    includeDependencies?: boolean;
}
export interface PlanningResult {
    plan: Plan;
    reasoning: string;
    suggestedModels: string[];
}
/**
 * PLANNING Primitive - Creates execution plans from intents
 */
export declare class PlanningPrimitive {
    private completion;
    constructor(completion: CompletionPrimitive);
    /**
     * Create a plan for the given intent
     */
    createPlan(intent: VibeIntent, _context: object, options?: PlanningOptions): Promise<PlanningResult>;
    /**
     * Refine an existing plan based on feedback
     */
    refinePlan(plan: Plan, feedback: string): Promise<Plan>;
    /**
     * Validate a plan for completeness and consistency
     */
    validatePlan(plan: Plan): {
        valid: boolean;
        issues: string[];
    };
    /**
     * Build planning prompt for LLM
     */
    private buildPlanningPrompt;
    /**
     * Parse plan steps from LLM response
     */
    private parsePlanSteps;
    /**
     * Extract risks from plan response
     */
    private extractRisks;
    /**
     * Infer risk from step description
     */
    private inferRiskFromDescription;
    /**
     * Estimate tokens for a step
     */
    private estimateStepTokens;
    /**
     * Calculate total risk from steps
     */
    private calculateTotalRisk;
    /**
     * Estimate total duration in minutes
     */
    private estimateDuration;
}
//# sourceMappingURL=planner.d.ts.map