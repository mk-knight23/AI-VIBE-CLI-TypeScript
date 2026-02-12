/**
 * VIBE CLI - Provider Router
 *
 * Backward-compatible wrapper around UnifiedProviderRouter.
 * All consumers import from this file as `VibeProviderRouter`.
 * The actual implementation lives in unified.router.ts.
 */
import { UnifiedProviderRouter } from './unified.router.js';
import type { RouterConfig, UserConfig, FallbackStrategy, RouterStats } from './unified.router.js';
export type { RouterConfig, UserConfig, FallbackStrategy, RouterStats };
/**
 * VibeProviderRouter — the canonical provider router for the VIBE CLI.
 *
 * Extends UnifiedProviderRouter with backward-compatible method aliases
 * that existing consumers depend on. New code should prefer the
 * UnifiedProviderRouter method names directly.
 */
export declare class VibeProviderRouter extends UnifiedProviderRouter {
    constructor(config?: RouterConfig);
    /**
     * @deprecated Use `selectModelForTask` instead
     */
    selectModel(task: string): string;
    /**
     * Get provider status (legacy shape expected by older consumers)
     */
    getStatus(): {
        provider: string;
        model: string;
        available: number;
        configured: number;
    };
    /**
     * Get API key for a provider from env
     */
    getApiKey(provider: string): string | undefined;
    /**
     * Get usage statistics (legacy shape)
     */
    getUsage(): {
        totalTokens: number;
        totalCost: number;
    };
    /**
     * Get current model name
     */
    getCurrentModel(): string;
    /**
     * Get available provider names
     */
    getAvailableProviders(): string[];
    /**
     * Check if a specific provider is configured
     */
    isProviderAvailable(provider: string): boolean;
}
//# sourceMappingURL=router.d.ts.map