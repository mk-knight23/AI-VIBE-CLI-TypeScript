/**
 * VIBE-CLI v12 - Tool Execution Engine
 * Safe, sandboxed execution with approval gates and rollback support
 */
import type { IApprovalSystem, MultiEditResult, EditOperation } from '../types';
export interface ToolResult {
    success: boolean;
    output: string;
    error?: string;
    exitCode?: number;
    duration: number;
    filesChanged?: string[];
}
export interface ToolConfig {
    name: string;
    command: string;
    args?: string[];
    workingDir?: string;
    env?: Record<string, string>;
    timeout?: number;
    requiresApproval?: boolean;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    allowedInSandbox?: boolean;
}
export interface ExecutionContext {
    sessionId: string;
    checkpointId?: string;
    approved: boolean;
    dryRun: boolean;
    sandbox: boolean;
    workingDir?: string;
}
export declare class VibeToolExecutor {
    private approvalSystem;
    private checkpointSystem;
    private history;
    constructor(approvalSystem?: IApprovalSystem);
    /**
     * Execute a shell command directly
     */
    executeShell(command: string): Promise<ToolResult>;
    /**
     * Execute a tool with safety checks
     */
    execute(config: ToolConfig, context: ExecutionContext): Promise<ToolResult>;
    /**
     * Run a shell command
     */
    private runCommand;
    /**
     * Request approval for execution
     */
    private requestApproval;
    /**
     * Format dry run output
     */
    private formatDryRun;
    /**
     * Get execution history
     */
    getHistory(): ToolResult[];
    /**
     * Clear execution history
     */
    clearHistory(): void;
    /**
     * Multi-edit: Perform multiple file edits atomically
     */
    multiEdit(operations: EditOperation[], context: ExecutionContext): Promise<MultiEditResult>;
    /**
     * Apply a single edit operation
     */
    private applyEdit;
    /**
     * Read a file
     */
    readFile(filePath: string): string | null;
    /**
     * Write a file with diff preview
     */
    writeFile(filePath: string, content: string, context: ExecutionContext, showDiff?: boolean): Promise<{
        success: boolean;
        checkpointId?: string;
    }>;
    /**
     * Show a diff between two strings
     */
    private showDiff;
}
/**
 * VIBE-CLI v12 - Checkpoint System
 * Version control for file system operations
 */
export declare class VibeCheckpointSystem {
    private checkpoints;
    private storageDir;
    constructor();
    private ensureStorageDir;
    /**
     * Create a checkpoint
     */
    create(sessionId: string, description: string): Promise<string>;
    /**
     * Restore to a checkpoint
     */
    restore(checkpointId: string): Promise<boolean>;
    /**
     * Get list of checkpoints for a session
     */
    list(sessionId: string): CheckpointInfo[];
    /**
     * Get files that have been modified
     */
    private getModifiedFiles;
    /**
     * Get all tracked files
     */
    private getAllTrackedFiles;
    /**
     * Capture current file contents for checkpoint
     * Returns the originalContent needed for restore
     */
    private captureDiffs;
}
interface CheckpointInfo {
    id: string;
    description: string;
    createdAt: Date;
    fileCount: number;
}
export {};
//# sourceMappingURL=executor.d.ts.map