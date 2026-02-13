/**
 * VIBE-CLI v0.0.2 - Agents Module
 * Consolidated and modularized agent system
 */

export * from './types.js';
export * from './base-agent.js';
export * from './context.js';
export * from './planner.js';
export * from './executor.js';
export * from './reviewer.js';
export * from './debugger.js';
export * from './refactor.js';
export * from './learn.js';
export * from './context-agent.js';
export * from './orchestrator.js';

import { VibeAgentExecutor } from './orchestrator.js';
import { VibeProviderRouter } from '../providers/router.js';
import { VibeMemoryManager } from '../memory/index.js';

// Singleton instance for convenience
export const agentExecutor = new VibeAgentExecutor(new VibeProviderRouter(), new VibeMemoryManager());
export { VibeAgentExecutor as VibeAgentSystem };
