/**
 * VIBE-CLI v12 - Context Module
 * MCP-based context management for AI agents
 */
import type { ProjectContext, FileContext, GitContext, ContextEntry } from '../types';
export type { ProjectContext, FileContext, GitContext, ContextEntry };
export { VibeContextManager as VibeContext };
export declare class VibeContextManager {
    private projectRoot;
    private entries;
    constructor(projectRoot?: string);
    /**
     * Load project context
     */
    loadProjectContext(): Promise<ProjectContext>;
    /**
     * Load file contents
     */
    loadFiles(patterns: string[]): Promise<FileContext[]>;
    /**
     * Load git context
     */
    loadGitContext(): Promise<GitContext | undefined>;
    /**
     * Add a context entry
     */
    addContext(type: string, content: string): void;
    /**
     * Get context by type
     */
    getContext(type: string): ContextEntry[];
    /**
     * Get all context
     */
    getAllContext(): ContextEntry[];
    /**
     * Clear context
     */
    clear(): void;
    /**
     * Detect programming language from file extension
     */
    private detectLanguage;
    /**
     * Get project root
     */
    getProjectRoot(): string;
    /**
     * Check if file exists
     */
    fileExists(relativePath: string): boolean;
    /**
     * Read file content
     */
    readFile(relativePath: string): string | null;
    /**
     * Write file content
     */
    writeFile(relativePath: string, content: string): void;
    /**
     * Get MCP-compatible context
     */
    getMCPContext(): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=index.d.ts.map