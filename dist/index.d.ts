/**
 * VIBE CLI v13 - Main Export
 *
 * This is the canonical export point for v13.
 * All modules are exported from here for clean imports.
 *
 * Version: 13.0.0
 */
export declare const VIBE_VERSION = "13.0.0";
export * from './types';
export { IntentRouter } from './intent/router';
export type { IntentClassificationResult, ClarificationOption } from './intent/router';
export { CommandLineArgs } from './cli/args';
export { VIBE_SYSTEM_PROMPT, VIBE_SYSTEM_PROMPT_VERSION, getSystemPrompt } from './cli/system-prompt';
export { UnifiedProviderRouter, unifiedRouter } from './providers/unified.router.js';
export type { BaseProviderAdapter, ProviderResponse, ProviderOptions, ProviderError } from './providers/index.js';
export { VibeProviderRouter } from './providers/router';
export { CompletionPrimitive } from './providers/completion';
export { PlanningPrimitive } from './agents/planner';
export { VibeAgentExecutor, VibeAgentSystem, agentExecutor } from './agents/index';
export type { VibeAgentTask, VibeAgentResult, VibeAgentStep } from './agents/index';
export { ToolRegistry, toolRegistry, VibeToolRegistry } from './tools/registry/index.js';
export { Sandbox, sandbox, VibeSandbox } from './tools/sandbox.js';
export { DiffEditor, diffEditor, VibeDiffEditor, CheckpointSystem, checkpointSystem } from './tools/diff-editor.js';
export { securityScanner, commandValidator } from './tools/index.js';
export type { VibeSecurityIssue, EditOperation, EditResult, SandboxConfig, SandboxResult } from './tools/index.js';
export { ApprovalManager, VibeApprovalManager, approvalManager } from './approvals/index.js';
export type { ApprovalRequest } from './approvals/index.js';
export { VibeMemoryManager } from './memory/index';
export { Orchestrator } from './orchestration/index';
export { VibeMCPManager, MCPContextAggregator, FileSystemContextProvider, GitContextProvider, OpenAPIContextProvider, TestsContextProvider, MemoryContextProvider } from './mcp/index';
export { VibeContext, VibeContextManager } from './context/index';
export { SecurityScanner, CommandValidator, VibeSecurityScanner } from './security/index.js';
export { VibeCore } from './core/index';
//# sourceMappingURL=index.d.ts.map