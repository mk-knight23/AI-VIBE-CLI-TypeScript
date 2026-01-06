/**
 * VIBE-CLI v12 - Automation Module
 * Workflow automation and task orchestration
 */
import { BaseModule, ModuleResult } from '../base.module';
export declare class AutomationModule extends BaseModule {
    private provider;
    private workflows;
    constructor();
    execute(params: Record<string, any>): Promise<ModuleResult>;
    private defineWorkflow;
    private executeWorkflow;
    private executeStep;
    private scheduleTask;
    private createCron;
    private parallelExecution;
    private chainTasks;
}
//# sourceMappingURL=index.d.ts.map