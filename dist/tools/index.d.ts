/**
 * VIBE CLI - Tools Module
 *
 * Unified tool system with:
 * - Tool registry with risk-based execution
 * - Sandboxed execution environment
 * - Diff-based file editing
 * - Checkpoint/undo support
 * - Security scanning
 *
 * Version: 13.0.0
 */
export { ToolRegistry, toolRegistry, VibeToolRegistry } from './registry/index.js';
export { Sandbox, sandbox } from './sandbox.js';
export type { SandboxConfig, SandboxResult, SandboxContext } from './sandbox.js';
export { DiffEditor, diffEditor, DiffGenerator, CheckpointSystem, checkpointSystem } from './diff-editor.js';
export { SecurityScanner as VibeSecurityScanner, securityScanner, CommandValidator as VibeCommandValidator, commandValidator } from '../security/index.js';
export type { SecurityIssue as VibeSecurityIssue } from '../security/index.js';
export type { EditOperation, EditResult, MultiEditResult } from './diff-editor.js';
//# sourceMappingURL=index.d.ts.map