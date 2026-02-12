/**
 * VIBE-CLI v0.0.1 - Workflow Automation Engine
 * Create, execute, and manage multi-step workflows
 */
import * as fs from 'fs';
export class VibeWorkflowEngine {
    workflows = new Map();
    executions = new Map();
    toolExecutor;
    approvalSystem;
    config;
    constructor(toolExecutor, approvalSystem, config) {
        this.toolExecutor = toolExecutor;
        this.approvalSystem = approvalSystem;
        this.config = {
            maxConcurrent: config?.maxConcurrent || 1,
            defaultTimeout: config?.defaultTimeout || 300000, // 5 min
            autoRetry: config?.autoRetry !== false,
            checkpointBeforeEach: config?.checkpointBeforeEach !== false,
        };
        this.loadBuiltinWorkflows();
    }
    /**
     * Load built-in workflow templates
     */
    loadBuiltinWorkflows() {
        // CI/CD Workflow
        this.register({
            id: 'cicd',
            name: 'CI/CD Pipeline',
            description: 'Build, test, and deploy',
            version: '1.0.0',
            steps: [
                {
                    id: 'install',
                    name: 'Install Dependencies',
                    tool: 'run_shell_command',
                    args: { command: 'npm ci' },
                    onSuccess: 'lint',
                },
                {
                    id: 'lint',
                    name: 'Run Linter',
                    tool: 'run_shell_command',
                    args: { command: 'npm run lint' },
                    onSuccess: 'test',
                },
                {
                    id: 'test',
                    name: 'Run Tests',
                    tool: 'run_shell_command',
                    args: { command: 'npm test' },
                    onSuccess: 'build',
                },
                {
                    id: 'build',
                    name: 'Build Project',
                    tool: 'run_shell_command',
                    args: { command: 'npm run build' },
                    onSuccess: 'deploy',
                },
                {
                    id: 'deploy',
                    name: 'Deploy',
                    tool: 'run_shell_command',
                    args: { command: 'npm run deploy' },
                    onFailure: 'rollback',
                },
                {
                    id: 'rollback',
                    name: 'Rollback',
                    tool: 'run_shell_command',
                    args: { command: 'npm run rollback' },
                },
            ],
            metadata: {
                author: 'Vibe',
                createdAt: new Date(),
                tags: ['ci', 'cd', 'deployment'],
            },
        });
        // Code Review Workflow
        this.register({
            id: 'code-review',
            name: 'Code Review',
            description: 'Analyze, test, and review changes',
            version: '1.0.0',
            steps: [
                {
                    id: 'analyze',
                    name: 'Code Analysis',
                    tool: 'analyze_code_quality',
                    args: { path: '.' },
                    onSuccess: 'security',
                },
                {
                    id: 'security',
                    name: 'Security Scan',
                    tool: 'security_scan',
                    args: { path: '.' },
                    onSuccess: 'test',
                },
                {
                    id: 'test',
                    name: 'Run Tests',
                    tool: 'run_tests',
                    args: {},
                    onSuccess: 'report',
                },
                {
                    id: 'report',
                    name: 'Generate Report',
                    tool: 'generate_report',
                    args: {},
                },
            ],
            metadata: {
                author: 'Vibe',
                createdAt: new Date(),
                tags: ['review', 'analysis'],
            },
        });
    }
    /**
     * Register a workflow
     */
    register(workflow) {
        this.workflows.set(workflow.id, workflow);
    }
    /**
     * Get a workflow by ID
     */
    get(id) {
        return this.workflows.get(id);
    }
    /**
     * List all workflows
     */
    list() {
        return Array.from(this.workflows.values()).map(w => ({
            id: w.id,
            name: w.name,
            description: w.description,
            stepCount: w.steps.length,
            tags: w.metadata?.tags || [],
        }));
    }
    /**
     * Execute a workflow
     */
    async execute(workflowId, params = {}, context = {}) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }
        const executionId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const execution = {
            workflowId,
            executionId,
            status: 'pending',
            results: new Map(),
            startedAt: new Date(),
        };
        this.executions.set(executionId, execution);
        // Start execution
        execution.status = 'running';
        try {
            for (const step of workflow.steps) {
                execution.currentStep = step.id;
                // Check if step should be skipped
                if (step.condition && !this.evaluateCondition(step.condition, params)) {
                    continue;
                }
                // Execute step
                const result = await this.executeStep(step, params, context);
                execution.results.set(step.id, result);
                if (!result.success) {
                    if (step.onFailure === 'abort') {
                        execution.status = 'failed';
                        execution.error = `Step ${step.id} failed: ${result.error}`;
                        break;
                    }
                    else if (step.onFailure === 'rollback') {
                        execution.status = 'failed';
                        execution.error = `Step ${step.id} failed, rollback triggered`;
                        break;
                    }
                    // Continue to next step or retry
                }
                // Handle parallel execution
                if (step.parallel && step.onSuccess === 'continue') {
                    // Handle parallel group
                }
            }
            execution.status = 'completed';
        }
        catch (error) {
            execution.status = 'failed';
            execution.error = error instanceof Error ? error.message : 'Unknown error';
        }
        execution.completedAt = new Date();
        return execution;
    }
    /**
     * Execute a single step
     */
    async executeStep(step, params, context) {
        // Build tool config
        const toolConfig = this.buildToolConfig(step.tool, step.args, params);
        // Apply retry logic
        let lastResult;
        const retries = step.retry || (this.config.autoRetry ? 3 : 0);
        for (let attempt = 0; attempt <= retries; attempt++) {
            lastResult = await this.toolExecutor.execute(toolConfig, {
                sessionId: 'workflow',
                approved: context.approved || false,
                dryRun: context.dryRun || false,
                sandbox: false,
            });
            if (lastResult.success) {
                break;
            }
        }
        return lastResult;
    }
    /**
     * Build tool config from step definition
     */
    buildToolConfig(tool, args, params) {
        // Substitute params in args
        const resolvedArgs = {};
        for (const [key, value] of Object.entries(args)) {
            if (typeof value === 'string' && value.startsWith('${')) {
                const paramName = value.slice(2, -1);
                resolvedArgs[key] = params[paramName] || value;
            }
            else {
                resolvedArgs[key] = value;
            }
        }
        return {
            name: tool,
            command: resolvedArgs.command || tool,
            args: resolvedArgs.args,
            workingDir: resolvedArgs.workingDir,
            env: resolvedArgs.env,
            timeout: resolvedArgs.timeout || this.config.defaultTimeout,
        };
    }
    /**
     * Evaluate a condition expression
     */
    evaluateCondition(condition, params) {
        // Simple condition evaluation (can be extended)
        if (condition.startsWith('${')) {
            const paramName = condition.slice(2, -1);
            return Boolean(params[paramName]);
        }
        return true;
    }
    /**
     * Get execution status
     */
    getExecution(executionId) {
        return this.executions.get(executionId);
    }
    /**
     * List executions
     */
    listExecutions() {
        return Array.from(this.executions.values());
    }
    /**
     * Load workflow from file
     */
    loadFromFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const workflow = JSON.parse(content);
        this.register(workflow);
    }
    /**
     * Save workflow to file
     */
    saveToFile(workflowId, filePath) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }
        fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2));
    }
}
//# sourceMappingURL=workflow.js.map