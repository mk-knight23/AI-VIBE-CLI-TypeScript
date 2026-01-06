/**
 * VIBE-CLI v12 - Web Generation Module
 * Generate complete web applications and components
 */
import { BaseModule, ModuleResult } from '../base.module';
export declare class WebGenerationModule extends BaseModule {
    private provider;
    constructor();
    execute(params: Record<string, any>): Promise<ModuleResult>;
    private generateWeb;
    private generateComponent;
    private getComponentTemplate;
    private generatePage;
    private getPageTemplate;
    private generateLayout;
    private getLayoutTemplate;
    private generateAPI;
    private getAPITemplate;
    /**
     * Parse code blocks from LLM response
     */
    private parseCodeBlocks;
    /**
     * Write generated files to disk with verification
     */
    private writeGeneratedFiles;
}
//# sourceMappingURL=index.d.ts.map