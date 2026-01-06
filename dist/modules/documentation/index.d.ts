/**
 * VIBE-CLI v12 - Documentation Module
 * Generate and maintain project documentation
 */
import { BaseModule, ModuleResult } from '../base.module';
export declare class DocumentationModule extends BaseModule {
    private provider;
    constructor();
    execute(params: Record<string, any>): Promise<ModuleResult>;
    private generateDocs;
    private generateProjectDocs;
    private generateModuleDocs;
    private generateFileDocs;
    private generateReadme;
    private generateAPIDocs;
    private updateDocs;
    private analyzeProjectStructure;
    private collectFiles;
    private findAPIFiles;
}
//# sourceMappingURL=index.d.ts.map