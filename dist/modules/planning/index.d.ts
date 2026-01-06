/**
 * VIBE-CLI v12 - Planning Module
 * Architecture planning, roadmap creation, and task breakdown
 */
import { BaseModule, ModuleResult } from '../base.module';
export declare class PlanningModule extends BaseModule {
    private provider;
    constructor();
    execute(params: Record<string, any>): Promise<ModuleResult>;
    private createPlan;
    private estimateTimeline;
    private breakdownTask;
    private trackProgress;
}
//# sourceMappingURL=index.d.ts.map