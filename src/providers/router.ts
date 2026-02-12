/**
 * VIBE CLI - Provider Router
 *
 * Backward-compatible wrapper around UnifiedProviderRouter.
 * All consumers import from this file as `VibeProviderRouter`.
 * The actual implementation lives in unified.router.ts.
 */

import { UnifiedProviderRouter } from './unified.router.js';
import type { RouterConfig, UserConfig, FallbackStrategy, RouterStats } from './unified.router.js';
import type { ProviderResponse } from '../types.js';
import type { ProviderOptions, StreamCallback } from './adapters/base.adapter.js';

// Re-export all types from unified
export type { RouterConfig, UserConfig, FallbackStrategy, RouterStats };

/**
 * VibeProviderRouter — the canonical provider router for the VIBE CLI.
 *
 * Extends UnifiedProviderRouter with backward-compatible method aliases
 * that existing consumers depend on. New code should prefer the
 * UnifiedProviderRouter method names directly.
 */
export class VibeProviderRouter extends UnifiedProviderRouter {
    constructor(config?: RouterConfig) {
        super(config);
    }

    // ── Backward-compatible aliases ─────────────────────────────────────

    /**
     * @deprecated Use `selectModelForTask` instead
     */
    selectModel(task: string): string {
        return this.selectModelForTask(task);
    }

    /**
     * Get provider status (legacy shape expected by older consumers)
     */
    getStatus(): { provider: string; model: string; available: number; configured: number } {
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
    getApiKey(provider: string): string | undefined {
        const envMap: Record<string, string> = {
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
    getUsage(): { totalTokens: number; totalCost: number } {
        const stats = this.getStats();
        return { totalTokens: stats.totalTokens, totalCost: stats.totalCost };
    }

    /**
     * Get current model name
     */
    getCurrentModel(): string {
        return this.getCurrentProvider()?.model || 'unknown';
    }

    /**
     * Get available provider names
     */
    getAvailableProviders(): string[] {
        return this.listProviders()
            .filter(p => p.available)
            .map(p => p.id);
    }

    /**
     * Check if a specific provider is configured
     */
    isProviderAvailable(provider: string): boolean {
        return this.isProviderConfigured(provider);
    }
}
