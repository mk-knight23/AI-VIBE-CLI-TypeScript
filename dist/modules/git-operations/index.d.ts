/**
 * VIBE-CLI v12 - Git Operations Module
 * Git workflow automation and repository management
 */
import { BaseModule, ModuleResult } from '../base.module';
export declare class GitOperationsModule extends BaseModule {
    private git;
    constructor();
    execute(params: Record<string, any>): Promise<ModuleResult>;
    private getStatus;
    private commit;
    private branch;
    private getLog;
    private push;
    private pull;
    private diff;
    private parseDiffFiles;
    private calculateDiffStats;
    private stash;
    private merge;
}
//# sourceMappingURL=index.d.ts.map