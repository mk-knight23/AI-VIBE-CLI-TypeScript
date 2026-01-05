/**
 * VIBE-CLI v12 - PLANNING Primitive
 * 
 * Creates execution plans for complex tasks.
 * Breaks down user intents into actionable steps.
 */

import type { VibeIntent, Plan, PlanStep } from '../types';
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
export class PlanningPrimitive {
  private completion: CompletionPrimitive;

  constructor(completion: CompletionPrimitive) {
    this.completion = completion;
  }

  /**
   * Create a plan for the given intent
   */
  async createPlan(
    intent: VibeIntent,
    _context: object,
    options: PlanningOptions = {}
  ): Promise<PlanningResult> {
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
    
    const plan: Plan = {
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
  async refinePlan(
    plan: Plan,
    feedback: string
  ): Promise<Plan> {
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
  validatePlan(plan: Plan): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
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
  private buildPlanningPrompt(
    intent: VibeIntent,
    maxSteps: number
  ): string {
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
  private parsePlanSteps(response: string, intent: VibeIntent): PlanStep[] {
    const steps: PlanStep[] = [];
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
  private extractRisks(response: string): string[] {
    const risks: string[] = [];
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
  private inferRiskFromDescription(description: string, category: string): 'low' | 'medium' | 'high' | 'critical' {
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
    
    if (highRiskCategories.includes(category)) return 'high';
    if (mediumRiskCategories.includes(category)) return 'medium';
    
    return 'low';
  }

  /**
   * Estimate tokens for a step
   */
  private estimateStepTokens(description: string): number {
    // Rough estimate: 1 token per 4 characters
    return Math.ceil(description.length / 4) + 500; // Base overhead
  }

  /**
   * Calculate total risk from steps
   */
  private calculateTotalRisk(steps: PlanStep[]): 'low' | 'medium' | 'high' {
    const riskScores: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
    const avgScore = steps.reduce((sum, s) => sum + (riskScores[s.risk] || 1), 0) / steps.length;
    
    if (avgScore >= 3) return 'high';
    if (avgScore >= 1.5) return 'medium';
    return 'low';
  }

  /**
   * Estimate total duration in minutes
   */
  private estimateDuration(steps: PlanStep[]): number {
    const timePerStep: Record<string, number> = {
      low: 2,
      medium: 5,
      high: 10,
      critical: 15,
    };
    
    return steps.reduce((total, s) => total + (timePerStep[s.risk] || 2), 0);
  }
}
