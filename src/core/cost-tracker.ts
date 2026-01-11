import { stateManager } from './state-manager';

export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

export class CostTracker {
    private static readonly PRICES: Record<string, { prompt: number; completion: number }> = {
        'gpt-4o': { prompt: 5.0, completion: 15.0 }, // per 1M tokens
        'gpt-4o-mini': { prompt: 0.15, completion: 0.60 },
        'claude-3-5-sonnet-20240620': { prompt: 3.0, completion: 15.0 },
        'claude-3-opus-20240229': { prompt: 15.0, completion: 75.0 },
        'claude-3-haiku-20240307': { prompt: 0.25, completion: 1.25 },
        'gemini-1.5-pro': { prompt: 3.5, completion: 10.5 },
        'gemini-1.5-flash': { prompt: 0.35, completion: 1.05 },
    };

    static track(model: string, usage: TokenUsage): void {
        const price = this.PRICES[model] || { prompt: 0, completion: 0 };
        const cost = (usage.promptTokens * price.prompt + usage.completionTokens * price.completion) / 1000000;

        const currentTotal = stateManager.get<number>('total_cost') || 0;
        stateManager.set('total_cost', currentTotal + cost);

        const modelCosts = stateManager.get<Record<string, number>>('model_costs') || {};
        modelCosts[model] = (modelCosts[model] || 0) + cost;
        stateManager.set('model_costs', modelCosts);
    }

    static getTotalCost(): number {
        return stateManager.get<number>('total_cost') || 0;
    }

    static getModelCosts(): Record<string, number> {
        return stateManager.get<Record<string, number>>('model_costs') || {};
    }

    static reset(): void {
        stateManager.set('total_cost', 0);
        stateManager.set('model_costs', {});
    }
}
