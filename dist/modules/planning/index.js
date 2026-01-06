"use strict";
/**
 * VIBE-CLI v12 - Planning Module
 * Architecture planning, roadmap creation, and task breakdown
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanningModule = void 0;
const base_module_1 = require("../base.module");
const router_1 = require("../../providers/router");
class PlanningModule extends base_module_1.BaseModule {
    provider;
    constructor() {
        super({
            name: 'planning',
            version: '1.0.0',
            description: 'Architecture planning, roadmap creation, and task breakdown',
        });
        this.provider = new router_1.VibeProviderRouter();
    }
    async execute(params) {
        const action = params.action || params.type || 'plan';
        try {
            switch (action) {
                case 'plan':
                    return this.createPlan(params);
                case 'estimate':
                    return this.estimateTimeline(params);
                case 'breakdown':
                    return this.breakdownTask(params);
                case 'track':
                    return this.trackProgress(params);
                default:
                    return this.failure(`Unknown action: ${action}`);
            }
        }
        catch (error) {
            return this.failure(error instanceof Error ? error.message : 'Unknown error');
        }
    }
    async createPlan(params) {
        if (!params.prompt) {
            return this.failure('Missing required parameter: prompt');
        }
        this.logInfo('Creating project plan...');
        const response = await this.provider.chat([
            { role: 'system', content: 'You are a software architect. Create detailed project plans with phases, milestones, and tasks.' },
            { role: 'user', content: `Create a detailed project plan for: ${params.prompt}` },
        ]);
        return this.success({
            plan: response.content,
            provider: response.provider,
        }, { tokens: response.usage?.totalTokens || 0 });
    }
    async estimateTimeline(params) {
        if (!params.tasks) {
            return this.failure('Missing required parameter: tasks');
        }
        this.logInfo('Estimating timeline...');
        const response = await this.provider.chat([
            { role: 'system', content: 'You are a project manager. Estimate task durations realistically.' },
            { role: 'user', content: `Estimate timeline for these tasks (return as JSON): ${JSON.stringify(params.tasks)}` },
        ]);
        return this.success({ estimates: response.content });
    }
    async breakdownTask(params) {
        if (!params.task) {
            return this.failure('Missing required parameter: task');
        }
        this.logInfo('Breaking down task...');
        const response = await this.provider.chat([
            { role: 'system', content: 'You are a task breakdown expert. Create actionable subtasks.' },
            { role: 'user', content: `Break down this task into subtasks: ${params.task}` },
        ]);
        return this.success({ breakdown: response.content });
    }
    async trackProgress(params) {
        return this.success({
            message: 'Progress tracking requires integration with project management tools',
            status: 'available',
        });
    }
}
exports.PlanningModule = PlanningModule;
//# sourceMappingURL=index.js.map