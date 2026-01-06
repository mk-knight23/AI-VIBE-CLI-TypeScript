/**
 * VIBE-CLI v12 - Code Search Module
 * Search and analyze code across the codebase
 */
import { BaseModule, ModuleResult } from '../base.module';
export declare class CodeSearchModule extends BaseModule {
    private provider;
    constructor();
    execute(params: Record<string, any>): Promise<ModuleResult>;
    private search;
    private performSearch;
    private walkDir;
    private findFiles;
    private findFilesByPattern;
    private matchPattern;
    private grep;
    private performGrep;
    private analyzeStructure;
    private analyzeDirStructure;
    private detectLanguages;
}
//# sourceMappingURL=index.d.ts.map