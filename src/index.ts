/**
 * VIBE CLI v13 - Main Export
 *
 * This is the canonical export point for v13.
 * All modules are exported from here for clean imports.
 *
 * Version: 13.0.0
 */

// Version
export const VIBE_VERSION = '13.0.0';

// Re-export types from single source
export * from './types';

// Intent Router
export { IntentRouter } from './intent/router';
export type { IntentClassificationResult, ClarificationOption } from './intent/router';

// CLI
export { CommandLineArgs } from './cli/args';
export { VIBE_SYSTEM_PROMPT, VIBE_SYSTEM_PROMPT_VERSION, getSystemPrompt } from './cli/system-prompt';

// Providers (v13 - Unified Adapter System)
export { UnifiedProviderRouter, unifiedRouter } from './providers/unified.router.js';
export type { BaseProviderAdapter, ProviderResponse, ProviderOptions, ProviderError } from './providers/index.js';

// Backwards compatibility - Old router still exported
export { VibeProviderRouter } from './providers/router';
export { CompletionPrimitive } from './providers/completion';

// Agents (v13 - Full Pipeline)
export { PlanningPrimitive } from './agents/planner';
export { VibeAgentExecutor, VibeAgentSystem, agentExecutor } from './agents/index';
export type { VibeAgentTask, VibeAgentResult, VibeAgentStep } from './agents/index';

// Tools (v13 - Registry, Sandbox, Diff Editor)
export { ToolRegistry, toolRegistry, VibeToolRegistry } from './tools/registry/index.js';
export { Sandbox, sandbox, VibeSandbox } from './tools/sandbox.js';
export { DiffEditor, diffEditor, VibeDiffEditor, CheckpointSystem, checkpointSystem } from './tools/diff-editor.js';
export { securityScanner, commandValidator } from './tools/index.js';
export type { VibeSecurityIssue, EditOperation, EditResult, SandboxConfig, SandboxResult } from './tools/index.js';

// Approvals (v13 - Real Approval System)
export { ApprovalManager, VibeApprovalManager, approvalManager } from './approvals/index.js';
export type { ApprovalRequest } from './approvals/index.js';

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

// Security (v13 - Comprehensive Scanner)
export { SecurityScanner, CommandValidator, VibeSecurityScanner } from './security/index.js';

// Core
export { VibeCore } from './core/index';
