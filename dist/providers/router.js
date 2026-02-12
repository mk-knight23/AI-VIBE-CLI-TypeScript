/**
 * VIBE CLI - Provider Router
 *
 * Backward-compatible wrapper around UnifiedProviderRouter.
 * All consumers import from this file as `VibeProviderRouter`.
 * The actual implementation lives in unified.router.ts.
 */
import { UnifiedProviderRouter } from './unified.router.js';
/**
 * VibeProviderRouter — the canonical provider router for the VIBE CLI.
 *
 * Extends UnifiedProviderRouter with backward-compatible method aliases
 * that existing consumers depend on. New code should prefer the
 * UnifiedProviderRouter method names directly.
 */
export class VibeProviderRouter extends UnifiedProviderRouter {
    constructor(config) {
        super(config);
    }
    // ── Backward-compatible aliases ─────────────────────────────────────
    /**
     * @deprecated Use `selectModelForTask` instead
     */
    selectModel(task) {
        return this.selectModelForTask(task);
    }
    /**
     * Get provider status (legacy shape expected by older consumers)
     */
    getStatus() {
        const current = this.getCurrentProvider();
        const providers = this.listProviders();
        return {
            provider: current?.name || 'none',
            model: current?.model || 'none',
            available: providers.filter(p => p.available).length,
            configured: providers.filter(p => p.configured).length,
        };
    }
    /**
     * Get API key for a provider from env
     */
    getApiKey(provider) {
        const envMap = {
            openai: 'OPENAI_API_KEY',
            anthropic: 'ANTHROPIC_API_KEY',
            google: 'GOOGLE_API_KEY',
            ollama: '',
            minimax: 'MINIMAX_API_KEY',
            openrouter: 'OPENROUTER_API_KEY',
        };
        const envVar = envMap[provider];
        return envVar ? process.env[envVar] : undefined;
    }
    /**
     * Get usage statistics (legacy shape)
     */
    getUsage() {
        const stats = this.getStats();
        return { totalTokens: stats.totalTokens, totalCost: stats.totalCost };
    }
    /**
     * Get current model name
     */
    getCurrentModel() {
        return this.getCurrentProvider()?.model || 'unknown';
    }
    /**
     * Get available provider names
     */
    getAvailableProviders() {
        return this.listProviders()
            .filter(p => p.available)
            .map(p => p.id);
    }
    /**
     * Check if a specific provider is configured
     */
    isProviderAvailable(provider) {
        return this.isProviderConfigured(provider);
    }
}
//# sourceMappingURL=router.js.map