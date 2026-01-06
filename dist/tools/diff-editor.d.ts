/**
 * VIBE CLI - Diff-Based Editor
 *
 * Safe file editing with:
 * - Line-by-line diff generation
 * - Preview before apply
 * - Atomic multi-file edits
 * - Undo support via checkpoints
 *
 * Version: 13.0.0
 */
export type EditType = 'replace' | 'insert' | 'delete' | 'append' | 'patch';
export interface EditOperation {
    type: EditType;
    file: string;
    searchPattern?: string;
    replacement?: string;
    lineNumber?: number;
    endLineNumber?: number;
}
export interface EditResult {
    success: boolean;
    file: string;
    changes: {
        type: string;
        lineStart?: number;
        lineEnd?: number;
        content?: string;
    }[];
    error?: string;
    diff?: string;
}
export interface MultiEditResult {
    success: boolean;
    totalFiles: number;
    successfulFiles: number;
    failedFiles: number;
    results: EditResult[];
    checkpointId?: string;
}
export interface DiffOptions {
    contextLines: number;
    showLineNumbers: boolean;
    color: boolean;
}
export declare class DiffGenerator {
    /**
     * Generate unified diff between two strings
     */
    static generate(oldContent: string, newContent: string, filePath: string, options?: Partial<DiffOptions>): string;
    private static formatHunk;
    /**
     * Generate a simple side-by-side diff for display
     */
    static displayDiff(oldContent: string, newContent: string, filePath: string): string;
}
export declare class DiffEditor {
    private checkpointSystem;
    constructor(checkpointSystem?: CheckpointSystem);
    /**
     * Apply a single edit operation
     */
    applyEdit(operation: EditOperation, context?: {
        dryRun?: boolean;
        sessionId?: string;
    }): Promise<EditResult>;
    /**
     * Apply multiple edits atomically
     */
    applyMultiEdit(operations: EditOperation[], context?: {
        dryRun?: boolean;
        sessionId?: string;
    }): Promise<MultiEditResult>;
    /**
     * Replace all occurrences of a pattern
     */
    replaceAll(file: string, searchPattern: string, replacement: string, context?: {
        dryRun?: boolean;
    }): Promise<EditResult>;
    /**
     * Insert at specific line
     */
    insertAt(file: string, lineNumber: number, content: string, context?: {
        dryRun?: boolean;
    }): Promise<EditResult>;
    /**
     * Delete a range of lines
     */
    deleteLines(file: string, startLine: number, endLine: number, context?: {
        dryRun?: boolean;
    }): Promise<EditResult>;
    /**
     * Append content to file
     */
    append(file: string, content: string, context?: {
        dryRun?: boolean;
    }): Promise<EditResult>;
    /**
     * Perform the actual edit operation
     */
    private performEdit;
    /**
     * Show what an edit would do (preview)
     */
    previewEdit(operation: EditOperation, filePath: string): {
        diff: string;
        currentContent: string;
        newContent: string;
    };
}
export declare class CheckpointSystem {
    private checkpoints;
    create(sessionId: string, description: string): Promise<string>;
    restore(checkpointId: string): Promise<boolean>;
    list(sessionId?: string): Checkpoint[];
    /**
     * Create checkpoint synchronously (for TUI)
     */
    createSync(sessionId: string, description: string): string | null;
    /**
     * Restore checkpoint synchronously (for TUI)
     */
    restoreSync(checkpointId: string): boolean;
    private captureState;
}
interface Checkpoint {
    id: string;
    sessionId: string;
    description: string;
    createdAt: Date;
    files: FileState[];
}
interface FileState {
    path: string;
    type: 'created' | 'modified' | 'deleted';
    originalContent?: string;
}
export declare const diffEditor: DiffEditor;
export declare const checkpointSystem: CheckpointSystem;
export { DiffEditor as VibeDiffEditor };
export type { EditOperation as VibeEditOperation, };
//# sourceMappingURL=diff-editor.d.ts.map