/**
 * VIBE-CLI v12 - Code Assistant Module
 * AI-powered code generation, completion, refactoring, and explanation
 */
import { BaseModule, ModuleResult } from '../base.module';
export declare class CodeAssistantModule extends BaseModule {
    private provider;
    private config;
    constructor();
    /**
     * Execute the module - routes to appropriate action
     */
    execute(params: Record<string, any>): Promise<ModuleResult>;
    /**
     * Generate code from a description
     */
    private generate;
    /**
     * Auto-complete code
     */
    private complete;
    /**
     * Explain code
     */
    private explain;
    /**
     * Refactor code
     */
    private refactor;
    /**
     * Translate code between languages
     */
    private translate;
    /**
     * Debug code
     */
    private debug;
    /**
     * Review code
     */
    private review;
    /**
     * Parse code blocks from LLM response
     */
    private parseCodeBlocks;
    /**
     * Write files to disk
     */
    private writeFiles;
    /**
     * Extract issues from analysis
     */
    private extractIssues;
}
//# sourceMappingURL=index.d.ts.map