/**
 * VIBE-CLI v12 - Search Tools Module
 * Web search and code research capabilities
 */
import { BaseModule, ModuleResult } from '../base.module';
export declare class SearchToolsModule extends BaseModule {
    private provider;
    constructor();
    execute(params: Record<string, any>): Promise<ModuleResult>;
    private webSearch;
    private codeSearch;
    private searchDocs;
    private searchGitHub;
    private research;
}
//# sourceMappingURL=index.d.ts.map