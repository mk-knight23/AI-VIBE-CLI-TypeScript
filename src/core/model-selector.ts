import { VibeProviderRouter } from '../providers/router';
import { CostTracker } from './cost-tracker';

export class OptimalModelSelector {
    static select(prompt: string, budgetRemaining: number = 1.0): string {
        const complexity = this.evaluateComplexity(prompt);

        if (budgetRemaining < 0.01) return 'gpt-4o-mini'; // Emergency cheap mode

        if (complexity > 8) return 'claude-3-opus-20240229';
        if (complexity > 5) return 'gpt-4o';

        return 'gpt-4o-mini';
    }

    private static evaluateComplexity(prompt: string): number {
        let score = 0;
        if (prompt.length > 500) score += 2;
        if (prompt.includes('refactor') || prompt.includes('architect')) score += 3;
        if (prompt.includes('fix bug') || prompt.includes('debug')) score += 2;
        if (prompt.includes('explain')) score += 1;

        return Math.min(score, 10);
    }
}
