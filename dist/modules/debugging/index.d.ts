/**
 * VIBE-CLI v12 - Debugging Module
 * Error analysis, fix suggestions, and performance profiling
 */
import { BaseModule, ModuleResult } from '../base.module';
export declare class DebuggingModule extends BaseModule {
    private provider;
    private readonly errorPatterns;
    constructor();
    /**
     * Execute the module
     */
    execute(params: Record<string, any>): Promise<ModuleResult>;
    /**
     * Analyze an error from stack trace or message
     */
    private analyzeError;
    /**
     * Suggest fixes for an error
     */
    private suggestFix;
    /**
     * Profile code performance
     */
    private profileCode;
    /**
     * Trace code execution
     */
    private traceExecution;
    /**
     * Apply a fix to code
     */
    private fixIssue;
    /**
     * Parse stack trace to extract location
     */
    private parseStackTrace;
    /**
     * Detect error type from message
     */
    private detectErrorType;
    /**
     * Match error against known patterns
     */
    private matchErrorPattern;
    /**
     * Extract error message
     */
    private extractErrorMessage;
    /**
     * Find related errors
     */
    private findRelatedErrors;
    /**
     * Parse fixes from AI response
     */
    private parseFixes;
    /**
     * Apply a fix to code
     */
    private applyFix;
    /**
     * Parse performance issues from analysis
     */
    private parsePerformanceIssues;
}
//# sourceMappingURL=index.d.ts.map