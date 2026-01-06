/**
 * VIBE CLI - Providers Module
 *
 * Unified provider system with adapter pattern.
 *
 * Version: 13.0.0
 */
export * from './adapters/base.adapter.js';
export * from './adapters/openai.adapter.js';
export * from './adapters/anthropic.adapter.js';
export * from './adapters/google.adapter.js';
export * from './adapters/ollama.adapter.js';
export * from './adapters/openrouter.adapter.js';
export { UnifiedProviderRouter, unifiedRouter } from './unified.router.js';
//# sourceMappingURL=index.d.ts.map