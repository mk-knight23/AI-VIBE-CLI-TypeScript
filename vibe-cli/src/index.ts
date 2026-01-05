/**
 * VIBE CLI v12 - Main Export
 * 
 * This is the canonical export point for v12.
 * All modules are exported from here for clean imports.
 * 
 * Version: 12.0.0
 */

// Version
export const VIBE_VERSION = '12.0.0';

// Re-export types from single source
export * from './types';

// Intent Router
export { IntentRouter } from './intent/router';
export type { IntentClassificationResult, ClarificationOption } from './intent/router';

// CLI
export { CommandLineArgs } from './cli/args';
export { VIBE_SYSTEM_PROMPT, VIBE_SYSTEM_PROMPT_VERSION, getSystemPrompt } from './cli/system-prompt';

// Providers
export { VibeProviderRouter } from './providers/router';
export { CompletionPrimitive } from './providers/completion';

// Agents
export { PlanningPrimitive } from './agents/planner';
export { VibeAgentExecutor } from './agents/index';

// Tools
export { VibeToolExecutor, VibeCheckpointSystem } from './tools/executor';

// Approvals
export { VibeApprovalManager } from './approvals/index';

// Memory
export { VibeMemoryManager } from './memory/index';

// Orchestration
export { Orchestrator } from './orchestration/index';

// MCP
export { 
  VibeMCPManager, 
  MCPContextAggregator, 
  FileSystemContextProvider, 
  GitContextProvider, 
  OpenAPIContextProvider, 
  TestsContextProvider, 
  MemoryContextProvider 
} from './mcp/index';

// Context
export { VibeContext, VibeContextManager } from './context/index';

// Security
export { VibeSecurityScanner } from './security/scanner';

// Core
export { VibeCore } from './core/index';
