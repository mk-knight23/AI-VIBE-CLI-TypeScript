"use strict";
/**
 * VIBE-CLI v12 - Automation Module
 * Workflow automation and task orchestration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationModule = void 0;
const base_module_1 = require("../base.module");
const router_1 = require("../../providers/router");
class AutomationModule extends base_module_1.BaseModule {
    provider;
    workflows = new Map();
    constructor() {
        super({
            name: 'automation',
            version: '1.0.0',
            description: 'Workflow automation and task orchestration',
        });
        this.provider = new router_1.VibeProviderRouter();
    }
    async execute(params) {
        const action = params.action || params.type || 'run';
        try {
            switch (action) {
                case 'workflow':
                    return this.defineWorkflow(params);
                case 'run':
                    return this.executeWorkflow(params);
                case 'schedule':
                    return this.scheduleTask(params);
                case 'cron':
                    return this.createCron(params);
                case 'parallel':
                    return this.parallelExecution(params);
                case 'chain':
                    return this.chainTasks(params);
                default:
                    return this.failure(`Unknown action: ${action}`);
            }
        }
        catch (error) {
            return this.failure(error instanceof Error ? error.message : 'Unknown error');
        }
    }
    async defineWorkflow(params) {
        const { name, steps } = params;
        if (!name || !steps) {
            return this.failure('Missing required parameters: name and steps');
        }
        this.logInfo(`Defining workflow: ${name}...`);
        const workflow = steps.map((step, index) => ({
            id: step.id || `step-${index + 1}`,
            name: step.name || `Step ${index + 1}`,
            action: step.action,
            params: step.params || {},
            condition: step.condition,
            onSuccess: step.onSuccess,
            onFailure: step.onFailure || 'abort',
            retryCount: step.retryCount || 0,
        }));
        this.workflows.set(name, workflow);
        return this.success({
            name,
            steps: workflow.length,
            workflow,
        });
    }
    async executeWorkflow(params) {
        const { name, variables = {} } = params;
        if (!name) {
            return this.failure('Missing required parameter: name');
        }
        const workflow = this.workflows.get(name);
        if (!workflow) {
            return this.failure(`Workflow not found: ${name}`);
        }
        this.logInfo(`Executing workflow: ${name}...`);
        const results = [];
        let stepIndex = 0;
        for (const step of workflow) {
            this.logInfo(`Executing step: ${step.name}...`);
            const result = await this.executeStep(step, variables, results);
            results.push(result);
            if (!result.success && step.onFailure === 'abort') {
                return this.success({
                    name,
                    status: 'aborted',
                    step: step.name,
                    results,
                });
            }
            stepIndex++;
        }
        return this.success({
            name,
            status: 'completed',
            steps: workflow.length,
            results,
        });
    }
    async executeStep(step, variables, previousResults) {
        let attempts = (step.retryCount || 0) + 1;
        let lastError = null;
        while (attempts > 0) {
            try {
                const response = await this.provider.chat([
                    { role: 'system', content: `You are executing a workflow step: ${step.name}. ${step.action}` },
                    { role: 'user', content: `Execute: ${JSON.stringify(step.params)}. Variables: ${JSON.stringify(variables)}. Previous results: ${JSON.stringify(previousResults)}` },
                ]);
                return {
                    stepId: step.id,
                    name: step.name,
                    success: true,
                    output: response.content,
                };
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                attempts--;
                if (attempts > 0) {
                    this.logInfo(`Retrying step (${(step.retryCount || 0) + 1 - attempts + 1}/${(step.retryCount || 0) + 1})...`);
                }
            }
        }
        return {
            stepId: step.id,
            name: step.name,
            success: false,
            error: lastError?.message || 'Unknown error',
        };
    }
    async scheduleTask(params) {
        const { task, time, interval } = params;
        if (!task) {
            return this.failure('Missing required parameter: task');
        }
        this.logInfo(`Scheduling task...`);
        return this.success({
            task,
            time,
            interval,
            status: 'scheduled',
            message: 'Configure cron or task scheduler for persistent scheduling',
        });
    }
    async createCron(params) {
        const { command, schedule, user } = params;
        if (!command || !schedule) {
            return this.failure('Missing required parameters: command and schedule');
        }
        this.logInfo('Generating cron entry...');
        const cronEntry = `${schedule} ${user ? `${user} ` : ''}${command}`;
        return this.success({
            schedule,
            command,
            user,
            cronEntry,
            instructions: `Add to crontab with: crontab -e`,
        });
    }
    async parallelExecution(params) {
        const { tasks = [] } = params;
        if (tasks.length === 0) {
            return this.failure('Missing required parameter: tasks');
        }
        this.logInfo(`Executing ${tasks.length} tasks in parallel...`);
        const results = await Promise.all(tasks.map(async (task) => {
            try {
                const response = await this.provider.chat([
                    { role: 'system', content: 'You are a task executor. Complete tasks efficiently.' },
                    { role: 'user', content: `Execute task: ${JSON.stringify(task)}` },
                ]);
                return { success: true, result: response.content };
            }
            catch (error) {
                return { success: false, error: error instanceof Error ? error.message : String(error) };
            }
        }));
        const successCount = results.filter(r => r.success).length;
        return this.success({
            total: tasks.length,
            completed: successCount,
            failed: tasks.length - successCount,
            results,
        });
    }
    async chainTasks(params) {
        const { tasks = [], passOutput = true } = params;
        if (tasks.length === 0) {
            return this.failure('Missing required parameter: tasks');
        }
        this.logInfo(`Chaining ${tasks.length} tasks...`);
        const results = [];
        let previousOutput = null;
        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            const input = passOutput && previousOutput ? { ...task.input, previousOutput } : task.input;
            try {
                const response = await this.provider.chat([
                    { role: 'system', content: `You are executing task ${i + 1}/${tasks.length}: ${task.name}` },
                    { role: 'user', content: `Execute: ${JSON.stringify(input)}` },
                ]);
                previousOutput = response.content;
                results.push({ index: i, name: task.name, success: true, output: response.content });
            }
            catch (error) {
                results.push({
                    index: i,
                    name: task.name,
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                });
                break;
            }
        }
        return this.success({
            total: tasks.length,
            completed: results.filter(r => r.success).length,
            chain: results,
        });
    }
}
exports.AutomationModule = AutomationModule;
//# sourceMappingURL=index.js.map