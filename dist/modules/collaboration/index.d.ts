/**
 * VIBE-CLI v12 - Collaboration Module
 * Team collaboration features and integrations
 */
import { BaseModule, ModuleResult } from '../base.module';
export declare class CollaborationModule extends BaseModule {
    private provider;
    constructor();
    execute(params: Record<string, any>): Promise<ModuleResult>;
    private shareCode;
    private requestReview;
    private addComment;
    private pairSession;
    private createTemplate;
}
//# sourceMappingURL=index.d.ts.map