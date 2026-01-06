"use strict";
/**
 * VIBE CLI v13 - Main Export
 *
 * This is the canonical export point for v13.
 * All modules are exported from here for clean imports.
 *
 * Version: 13.0.0
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VibeCore = exports.VibeSecurityScanner = exports.CommandValidator = exports.SecurityScanner = exports.VibeContextManager = exports.VibeContext = exports.MemoryContextProvider = exports.TestsContextProvider = exports.OpenAPIContextProvider = exports.GitContextProvider = exports.FileSystemContextProvider = exports.MCPContextAggregator = exports.VibeMCPManager = exports.Orchestrator = exports.VibeMemoryManager = exports.approvalManager = exports.VibeApprovalManager = exports.ApprovalManager = exports.commandValidator = exports.securityScanner = exports.checkpointSystem = exports.CheckpointSystem = exports.VibeDiffEditor = exports.diffEditor = exports.DiffEditor = exports.VibeSandbox = exports.sandbox = exports.Sandbox = exports.VibeToolRegistry = exports.toolRegistry = exports.ToolRegistry = exports.agentExecutor = exports.VibeAgentSystem = exports.VibeAgentExecutor = exports.PlanningPrimitive = exports.CompletionPrimitive = exports.VibeProviderRouter = exports.unifiedRouter = exports.UnifiedProviderRouter = exports.getSystemPrompt = exports.VIBE_SYSTEM_PROMPT_VERSION = exports.VIBE_SYSTEM_PROMPT = exports.CommandLineArgs = exports.IntentRouter = exports.VIBE_VERSION = void 0;
// Version
exports.VIBE_VERSION = '13.0.0';
// Re-export types from single source
__exportStar(require("./types"), exports);
// Intent Router
var router_1 = require("./intent/router");
Object.defineProperty(exports, "IntentRouter", { enumerable: true, get: function () { return router_1.IntentRouter; } });
// CLI
var args_1 = require("./cli/args");
Object.defineProperty(exports, "CommandLineArgs", { enumerable: true, get: function () { return args_1.CommandLineArgs; } });
var system_prompt_1 = require("./cli/system-prompt");
Object.defineProperty(exports, "VIBE_SYSTEM_PROMPT", { enumerable: true, get: function () { return system_prompt_1.VIBE_SYSTEM_PROMPT; } });
Object.defineProperty(exports, "VIBE_SYSTEM_PROMPT_VERSION", { enumerable: true, get: function () { return system_prompt_1.VIBE_SYSTEM_PROMPT_VERSION; } });
Object.defineProperty(exports, "getSystemPrompt", { enumerable: true, get: function () { return system_prompt_1.getSystemPrompt; } });
// Providers (v13 - Unified Adapter System)
var unified_router_js_1 = require("./providers/unified.router.js");
Object.defineProperty(exports, "UnifiedProviderRouter", { enumerable: true, get: function () { return unified_router_js_1.UnifiedProviderRouter; } });
Object.defineProperty(exports, "unifiedRouter", { enumerable: true, get: function () { return unified_router_js_1.unifiedRouter; } });
// Backwards compatibility - Old router still exported
var router_2 = require("./providers/router");
Object.defineProperty(exports, "VibeProviderRouter", { enumerable: true, get: function () { return router_2.VibeProviderRouter; } });
var completion_1 = require("./providers/completion");
Object.defineProperty(exports, "CompletionPrimitive", { enumerable: true, get: function () { return completion_1.CompletionPrimitive; } });
// Agents (v13 - Full Pipeline)
var planner_1 = require("./agents/planner");
Object.defineProperty(exports, "PlanningPrimitive", { enumerable: true, get: function () { return planner_1.PlanningPrimitive; } });
var index_1 = require("./agents/index");
Object.defineProperty(exports, "VibeAgentExecutor", { enumerable: true, get: function () { return index_1.VibeAgentExecutor; } });
Object.defineProperty(exports, "VibeAgentSystem", { enumerable: true, get: function () { return index_1.VibeAgentSystem; } });
Object.defineProperty(exports, "agentExecutor", { enumerable: true, get: function () { return index_1.agentExecutor; } });
// Tools (v13 - Registry, Sandbox, Diff Editor)
var index_js_1 = require("./tools/registry/index.js");
Object.defineProperty(exports, "ToolRegistry", { enumerable: true, get: function () { return index_js_1.ToolRegistry; } });
Object.defineProperty(exports, "toolRegistry", { enumerable: true, get: function () { return index_js_1.toolRegistry; } });
Object.defineProperty(exports, "VibeToolRegistry", { enumerable: true, get: function () { return index_js_1.VibeToolRegistry; } });
var sandbox_js_1 = require("./tools/sandbox.js");
Object.defineProperty(exports, "Sandbox", { enumerable: true, get: function () { return sandbox_js_1.Sandbox; } });
Object.defineProperty(exports, "sandbox", { enumerable: true, get: function () { return sandbox_js_1.sandbox; } });
Object.defineProperty(exports, "VibeSandbox", { enumerable: true, get: function () { return sandbox_js_1.VibeSandbox; } });
var diff_editor_js_1 = require("./tools/diff-editor.js");
Object.defineProperty(exports, "DiffEditor", { enumerable: true, get: function () { return diff_editor_js_1.DiffEditor; } });
Object.defineProperty(exports, "diffEditor", { enumerable: true, get: function () { return diff_editor_js_1.diffEditor; } });
Object.defineProperty(exports, "VibeDiffEditor", { enumerable: true, get: function () { return diff_editor_js_1.VibeDiffEditor; } });
Object.defineProperty(exports, "CheckpointSystem", { enumerable: true, get: function () { return diff_editor_js_1.CheckpointSystem; } });
Object.defineProperty(exports, "checkpointSystem", { enumerable: true, get: function () { return diff_editor_js_1.checkpointSystem; } });
var index_js_2 = require("./tools/index.js");
Object.defineProperty(exports, "securityScanner", { enumerable: true, get: function () { return index_js_2.securityScanner; } });
Object.defineProperty(exports, "commandValidator", { enumerable: true, get: function () { return index_js_2.commandValidator; } });
// Approvals (v13 - Real Approval System)
var index_js_3 = require("./approvals/index.js");
Object.defineProperty(exports, "ApprovalManager", { enumerable: true, get: function () { return index_js_3.ApprovalManager; } });
Object.defineProperty(exports, "VibeApprovalManager", { enumerable: true, get: function () { return index_js_3.VibeApprovalManager; } });
Object.defineProperty(exports, "approvalManager", { enumerable: true, get: function () { return index_js_3.approvalManager; } });
// Memory
var index_2 = require("./memory/index");
Object.defineProperty(exports, "VibeMemoryManager", { enumerable: true, get: function () { return index_2.VibeMemoryManager; } });
// Orchestration
var index_3 = require("./orchestration/index");
Object.defineProperty(exports, "Orchestrator", { enumerable: true, get: function () { return index_3.Orchestrator; } });
// MCP
var index_4 = require("./mcp/index");
Object.defineProperty(exports, "VibeMCPManager", { enumerable: true, get: function () { return index_4.VibeMCPManager; } });
Object.defineProperty(exports, "MCPContextAggregator", { enumerable: true, get: function () { return index_4.MCPContextAggregator; } });
Object.defineProperty(exports, "FileSystemContextProvider", { enumerable: true, get: function () { return index_4.FileSystemContextProvider; } });
Object.defineProperty(exports, "GitContextProvider", { enumerable: true, get: function () { return index_4.GitContextProvider; } });
Object.defineProperty(exports, "OpenAPIContextProvider", { enumerable: true, get: function () { return index_4.OpenAPIContextProvider; } });
Object.defineProperty(exports, "TestsContextProvider", { enumerable: true, get: function () { return index_4.TestsContextProvider; } });
Object.defineProperty(exports, "MemoryContextProvider", { enumerable: true, get: function () { return index_4.MemoryContextProvider; } });
// Context
var index_5 = require("./context/index");
Object.defineProperty(exports, "VibeContext", { enumerable: true, get: function () { return index_5.VibeContext; } });
Object.defineProperty(exports, "VibeContextManager", { enumerable: true, get: function () { return index_5.VibeContextManager; } });
// Security (v13 - Comprehensive Scanner)
var index_js_4 = require("./security/index.js");
Object.defineProperty(exports, "SecurityScanner", { enumerable: true, get: function () { return index_js_4.SecurityScanner; } });
Object.defineProperty(exports, "CommandValidator", { enumerable: true, get: function () { return index_js_4.CommandValidator; } });
Object.defineProperty(exports, "VibeSecurityScanner", { enumerable: true, get: function () { return index_js_4.VibeSecurityScanner; } });
// Core
var index_6 = require("./core/index");
Object.defineProperty(exports, "VibeCore", { enumerable: true, get: function () { return index_6.VibeCore; } });
//# sourceMappingURL=index.js.map