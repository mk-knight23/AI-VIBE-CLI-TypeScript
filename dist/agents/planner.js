"use strict";
/**
 * VIBE-CLI v12 - PLANNING Primitive
 *
 * Creates execution plans for complex tasks.
 * Breaks down user intents into actionable steps.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanningPrimitive = void 0;
/**
 * PLANNING Primitive - Creates execution plans from intents
 */
class PlanningPrimitive {
    completion;
    constructor(completion) {
        this.completion = completion;
    }
    /**
     * Create a plan for the given intent
     */
    async createPlan(intent, _context, options = {}) {
        const maxSteps = options.maxSteps || 10;
        // Use LLM to generate a detailed plan
        const planPrompt = this.buildPlanningPrompt(intent, maxSteps);
        const response = await this.completion.complete(planPrompt, {
            modelTier: 'reasoning',
            temperature: 0.2,
            systemPrompt: 'You are a planning agent that breaks down development tasks into actionable steps.',
        });
        // Parse the response into a structured plan
        const steps = this.parsePlanSteps(response.content, intent);
        const risks = options.includeRisks ? this.extractRisks(response.content) : [];
        const plan = {
            id: `plan-${Date.now()}`,
            intent,
            steps,
            risks,
            totalRisk: this.calculateTotalRisk(steps),
            estimatedDuration: this.estimateDuration(steps),
            createdAt: new Date(),
        };
        return {
            plan,
            reasoning: response.content,
            suggestedModels: ['gpt-4o', 'claude-sonnet-4-20250514'],
        };
    }
    /**
     * Refine an existing plan based on feedback
     */
    async refinePlan(plan, feedback) {
        const refinePrompt = `
      Current plan: ${plan.steps.map((s, i) => `${i + 1}. ${s.description}`).join('\n')}
      
      User feedback: ${feedback}
      
      Please revise the plan to address the feedback while maintaining the overall goal.
    `;
        const response = await this.completion.complete(refinePrompt, {
            modelTier: 'reasoning',
            temperature: 0.3,
        });
        // Parse refined steps
        const newSteps = this.parsePlanSteps(response.content, plan.intent);
        return {
            ...plan,
            steps: newSteps,
            risks: this.extractRisks(response.content),
            createdAt: new Date(),
        };
    }
    /**
     * Validate a plan for completeness and consistency
     */
    validatePlan(plan) {
        const issues = [];
        // Check for empty steps
        if (plan.steps.length === 0) {
            issues.push('Plan has no steps');
        }
        // Check for circular dependencies
        const stepIds = new Set(plan.steps.map(s => s.id));
        for (const step of plan.steps) {
            if (step.dependencies) {
                for (const dep of step.dependencies) {
                    if (!stepIds.has(dep)) {
                        issues.push(`Step "${step.id}" references non-existent dependency "${dep}"`);
                    }
                }
            }
        }
        // Check for missing high-risk approvals
        const hasHighRisk = plan.steps.some(s => s.risk === 'high' || s.risk === 'critical');
        if (hasHighRisk && !plan.risks.includes('Requires approval for high-risk operations')) {
            issues.push('High-risk operations require explicit approval');
        }
        return {
            valid: issues.length === 0,
            issues,
        };
    }
    /**
     * Build planning prompt for LLM
     */
    buildPlanningPrompt(intent, maxSteps) {
        return `
      Create a detailed execution plan for: "${intent.query}"
      
      Category: ${intent.category}
      Risk Level: ${intent.risk}
      
      Please create a step-by-step plan with:
      1. Clear, actionable steps (max ${maxSteps})
      2. Risk assessment for each step (low/medium/high/critical)
      3. Estimated token usage for each step
      
      Format your response as a numbered list with each step on its own line.
    `;
    }
    /**
     * Parse plan steps from LLM response
     */
    parsePlanSteps(response, intent) {
        const steps = [];
        const lines = response.split('\n');
        let stepId = 1;
        for (const line of lines) {
            // Match patterns like "1. description" or "Step 1: description"
            const match = line.match(/^\d+[\.\)]\s*(.+)$/) || line.match(/^Step\s+\d+[:\-]\s*(.+)$/i);
            if (match) {
                const description = match[1].trim();
                const risk = this.inferRiskFromDescription(description, intent.category);
                steps.push({
                    id: `step-${stepId}`,
                    description,
                    risk,
                    estimatedTokens: this.estimateStepTokens(description),
                });
                stepId++;
            }
        }
        // If no steps were parsed, create a single step
        if (steps.length === 0) {
            steps.push({
                id: 'step-1',
                description: intent.query,
                risk: intent.risk,
                estimatedTokens: 1000,
            });
        }
        return steps;
    }
    /**
     * Extract risks from plan response
     */
    extractRisks(response) {
        const risks = [];
        const riskPatterns = [
            /may\s+(?:break|cause|result\s+in)\s+(\w+)/gi,
            /could\s+affect\s+(\w+)/gi,
            /risk[:\s]+(\w+)/gi,
        ];
        for (const pattern of riskPatterns) {
            const matches = response.matchAll(pattern);
            for (const match of matches) {
                risks.push(`Potential impact on ${match[1]}`);
            }
        }
        return [...new Set(risks)];
    }
    /**
     * Infer risk from step description
     */
    inferRiskFromDescription(description, category) {
        const lowerDesc = description.toLowerCase();
        // Critical risk keywords
        const criticalRiskKeywords = ['delete all', 'drop database', 'production', 'rm -rf', 'sudo'];
        if (criticalRiskKeywords.some(kw => lowerDesc.includes(kw))) {
            return 'critical';
        }
        // High risk keywords
        const highRiskKeywords = ['delete', 'remove', 'deploy', 'database', 'migration', 'api-key', 'secret'];
        if (highRiskKeywords.some(kw => lowerDesc.includes(kw))) {
            return 'high';
        }
        // Medium risk keywords
        const mediumRiskKeywords = ['modify', 'change', 'update', 'refactor', 'api', 'endpoint', 'write'];
        if (mediumRiskKeywords.some(kw => lowerDesc.includes(kw))) {
            return 'medium';
        }
        // Default to category risk
        const highRiskCategories = ['deploy', 'infra', 'git', 'agent'];
        const mediumRiskCategories = ['code_generation', 'refactor', 'api', 'ui'];
        if (highRiskCategories.includes(category))
            return 'high';
        if (mediumRiskCategories.includes(category))
            return 'medium';
        return 'low';
    }
    /**
     * Estimate tokens for a step
     */
    estimateStepTokens(description) {
        // Rough estimate: 1 token per 4 characters
        return Math.ceil(description.length / 4) + 500; // Base overhead
    }
    /**
     * Calculate total risk from steps
     */
    calculateTotalRisk(steps) {
        const riskScores = { low: 1, medium: 2, high: 3, critical: 4 };
        const avgScore = steps.reduce((sum, s) => sum + (riskScores[s.risk] || 1), 0) / steps.length;
        if (avgScore >= 3)
            return 'high';
        if (avgScore >= 1.5)
            return 'medium';
        return 'low';
    }
    /**
     * Estimate total duration in minutes
     */
    estimateDuration(steps) {
        const timePerStep = {
            low: 2,
            medium: 5,
            high: 10,
            critical: 15,
        };
        return steps.reduce((total, s) => total + (timePerStep[s.risk] || 2), 0);
    }
}
exports.PlanningPrimitive = PlanningPrimitive;
//# sourceMappingURL=planner.js.map