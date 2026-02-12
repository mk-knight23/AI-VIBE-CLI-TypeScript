/**
 * VIBE-CLI v0.0.1 - Agents Module
 *
 * Multi-agent system for autonomous task execution:
 * - PLAN: Create execution plan
 * - PROPOSE: Propose changes with diff preview
 * - APPROVE: Request user approval for risky operations
 * - EXECUTE: Run tools and commands
 * - VERIFY: Validate results
 * - EXPLAIN: Provide explanation of actions
 * - DEBUG: Error analysis and debugging
 * - REFACTOR: Pattern recognition and code transformation
 * - LEARN: Knowledge acquisition and pattern learning
 * - CONTEXT: Semantic indexing and context management
 *
 * Version: 0.0.1
 */
import * as crypto from 'crypto';
import { VibeProviderRouter } from '../providers/router.js';
import { VibeMemoryManager } from '../memory/index.js';
import { toolRegistry, checkpointSystem, sandbox } from '../tools/index.js';
import { approvalManager } from '../approvals/index.js';
/**
 * Base agent with common functionality
 */
class BaseAgent {
    provider;
    constructor(provider) {
        this.provider = provider;
    }
    async execute(task, context) {
        const startTime = Date.now();
        const steps = [];
        try {
            const result = await this.run(task, context, steps);
            return {
                success: result.success,
                output: result.output,
                error: result.error,
                steps,
                artifacts: result.artifacts,
            };
        }
        catch (error) {
            return {
                success: false,
                output: '',
                error: error instanceof Error ? error.message : 'Unknown error',
                steps,
            };
        }
    }
}
// ============================================================================
// AGENT EXECUTION CONTEXT
// ============================================================================
export class AgentExecutionContext {
    workingDir;
    dryRun = false;
    sessionId;
    checkpointCreated = false;
    tools = new Map();
    results = [];
    constructor(options = {}) {
        this.workingDir = options.workingDir || process.cwd();
        this.sessionId = options.sessionId || crypto.randomUUID();
        this.dryRun = options.dryRun || false;
        // Load available tools
        for (const tool of toolRegistry.list()) {
            this.tools.set(tool.name, tool);
        }
    }
    getTool(name) {
        return this.tools.get(name);
    }
    async executeTool(name, args) {
        const tool = this.tools.get(name);
        if (!tool) {
            return { success: false, output: '', error: `Tool not found: ${name}`, duration: 0 };
        }
        const context = {
            workingDir: this.workingDir,
            dryRun: this.dryRun,
            sandbox: sandbox.getConfig().enabled,
            sessionId: this.sessionId,
            approvalSystem: {
                async request(description, operations, risk) {
                    return approvalManager.request(description, operations, risk);
                },
            },
        };
        const result = await tool.handler(args, context);
        this.results.push(result);
        return result;
    }
    async createCheckpoint(description) {
        return checkpointSystem.createSync(this.sessionId, description) || null;
    }
    async restoreCheckpoint(checkpointId) {
        return checkpointSystem.restoreSync(checkpointId);
    }
}
// ============================================================================
// PLANNER AGENT
// ============================================================================
export class PlannerAgent extends BaseAgent {
    name = 'planner';
    description = 'Creates execution plans for complex tasks';
    phases = ['plan', 'propose'];
    constructor(provider) {
        super(provider);
    }
    async run(task, context, steps) {
        const startTime = Date.now();
        // Generate plan using LLM
        const prompt = this.buildPlanningPrompt(task);
        const availableTools = this.getAvailableTools();
        const response = await this.provider.chat([
            { role: 'system', content: 'You are a planning agent. Create detailed execution plans.' },
            { role: 'user', content: prompt },
        ]);
        if (!response || response.provider === 'none') {
            return {
                success: false,
                output: '',
            };
        }
        // Parse the plan (simplified - in production would use structured output)
        const plan = this.parsePlan(response.content, availableTools);
        steps.push({
            id: crypto.randomUUID(),
            phase: 'plan',
            action: 'Generate execution plan',
            result: `Created plan with ${plan.steps.length} steps`,
            timestamp: new Date(),
            duration: Date.now() - startTime,
        });
        return {
            success: true,
            output: this.formatPlan(plan),
            artifacts: [JSON.stringify(plan, null, 2)],
        };
    }
    buildPlanningPrompt(task) {
        const availableTools = this.getAvailableTools();
        return `
Task: ${task.task}

Context:
${JSON.stringify(task.context, null, 2)}

Available Tools:
${availableTools}

Create an execution plan with the following structure:
1. Step-by-step breakdown
2. For each step, specify the tool to use and arguments
3. Identify any risky operations that need approval
4. Estimate overall risk level (low/medium/high/critical)

Respond with a JSON object containing:
- steps: array of {description, tool, args, reason}
- tools: array of tool names used
- estimatedRisk: risk level

Only respond with the JSON, no other text.
    `.trim();
    }
    getAvailableTools() {
        return toolRegistry.list()
            .map(t => `- ${t.name}: ${t.description} (risk: ${t.riskLevel})`)
            .join('\n');
    }
    parsePlan(content, availableTools) {
        try {
            // Try to extract JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        }
        catch {
            // Ignore parsing errors
        }
        // Fallback: return a basic plan
        return {
            steps: [{
                    description: `Execute: ${content.slice(0, 100)}...`,
                    tool: 'shell_exec',
                    args: { command: `echo "${content.slice(0, 200)}..."` },
                    reason: 'Fallback execution',
                }],
            tools: ['shell_exec'],
            estimatedRisk: 'medium',
        };
    }
    formatPlan(plan) {
        const lines = [
            `Execution Plan (Risk: ${plan.estimatedRisk.toUpperCase()})`,
            '',
            `Tools: ${plan.tools.join(', ')}`,
            '',
            'Steps:',
        ];
        for (let i = 0; i < plan.steps.length; i++) {
            const step = plan.steps[i];
            lines.push(`${i + 1}. ${step.description}`);
            lines.push(`   Tool: ${step.tool}`);
            lines.push(`   Reason: ${step.reason}`);
            lines.push('');
        }
        return lines.join('\n');
    }
}
// ============================================================================
// EXECUTOR AGENT
// ============================================================================
export class ExecutorAgent extends BaseAgent {
    router;
    name = 'executor';
    description = 'Executes tools and commands';
    phases = ['execute'];
    constructor(router) {
        super(router);
        this.router = router;
    }
    async run(task, context, steps) {
        const startTime = Date.now();
        // Create checkpoint if requested
        if (task.checkpoint !== false) {
            const checkpointId = await context.createCheckpoint(`Before: ${task.task.slice(0, 50)}`);
            if (checkpointId) {
                context.checkpointCreated = true;
            }
        }
        // Parse task to extract tool execution
        const execution = this.parseExecution(task);
        if (!execution.tool) {
            return {
                success: false,
                output: '',
                error: 'No tool specified in task',
            };
        }
        // Execute the tool
        const stepStart = Date.now();
        const result = await context.executeTool(execution.tool, execution.args);
        steps.push({
            id: crypto.randomUUID(),
            phase: 'execute',
            action: `Execute ${execution.tool}`,
            result: result.success ? result.output : `Error: ${result.error}`,
            approved: true, // Already approved by planner or auto-approved
            timestamp: new Date(),
            duration: Date.now() - stepStart,
        });
        if (!result.success) {
            return {
                success: false,
                output: result.output,
                error: result.error,
            };
        }
        return {
            success: true,
            output: result.output,
            artifacts: result.filesChanged,
        };
    }
    parseExecution(task) {
        // Try to extract tool info from task
        // This is simplified - in production would use structured parsing
        const taskLower = task.task.toLowerCase();
        // Detect common operations
        if (taskLower.includes('read') || taskLower.includes('cat')) {
            const pathMatch = task.task.match(/(?:read|cat)\s+([^\s]+)/i);
            return { tool: 'file_read', args: { path: pathMatch?.[1] || task.task } };
        }
        if (taskLower.includes('write') || taskLower.includes('create') || taskLower.includes('add')) {
            const pathMatch = task.task.match(/create\s+(?:file\s+)?([^\s]+)/i);
            const contentMatch = task.task.match(/with\s+`([^`]+)`/s) || task.task.match(/containing\s+["']([^"']+)["']/s);
            return {
                tool: 'file_write',
                args: {
                    path: pathMatch?.[1] || 'new-file.txt',
                    content: contentMatch?.[1] || '# New file\n',
                },
            };
        }
        if (taskLower.includes('run') || taskLower.includes('execute') || taskLower.includes('command')) {
            const cmdMatch = task.task.match(/(?:run|execute)\s+(.+)/i);
            return { tool: 'shell_exec', args: { command: cmdMatch?.[1] || task.task } };
        }
        if (taskLower.includes('search') || taskLower.includes('find')) {
            const patternMatch = task.task.match(/(?:search|find)\s+(?:for\s+)?["']?([^"'\n]+)["']?/i);
            return { tool: 'file_search', args: { pattern: patternMatch?.[1] || task.task } };
        }
        // Default: use shell for complex tasks
        return { tool: 'shell_exec', args: { command: task.task } };
    }
}
// ============================================================================
// REVIEWER AGENT
// ============================================================================
export class ReviewerAgent extends BaseAgent {
    router;
    name = 'reviewer';
    description = 'Reviews and validates code changes';
    phases = ['verify', 'explain'];
    constructor(router) {
        super(router);
        this.router = router;
    }
    async run(task, context, steps) {
        const startTime = Date.now();
        // Get recent results
        const results = context.results;
        const lastResult = results[results.length - 1];
        // Verify the result
        const verification = this.verifyResult(lastResult);
        steps.push({
            id: crypto.randomUUID(),
            phase: 'verify',
            action: 'Verify execution result',
            result: verification.message,
            timestamp: new Date(),
            duration: Date.now() - startTime,
        });
        // Generate explanation
        const explainStart = Date.now();
        const explanation = await this.explainResult(task, lastResult, verification);
        steps.push({
            id: crypto.randomUUID(),
            phase: 'explain',
            action: 'Explain actions taken',
            result: explanation,
            timestamp: new Date(),
            duration: Date.now() - explainStart,
        });
        return {
            success: verification.valid,
            output: `Verification: ${verification.message}\n\nExplanation:\n${explanation}`,
            error: verification.valid ? undefined : 'Verification failed',
        };
    }
    verifyResult(result) {
        if (!result) {
            return { valid: false, message: 'No results to verify' };
        }
        if (!result.success) {
            return { valid: false, message: `Execution failed: ${result.error}` };
        }
        if (!result.output || result.output.trim() === '') {
            return { valid: false, message: 'No output produced' };
        }
        return { valid: true, message: 'Execution completed successfully' };
    }
    async explainResult(task, result, verification) {
        const prompt = `
Task: ${task.task}

Result: ${JSON.stringify(result, null, 2)}

Verification: ${verification.message}

Explain what was done and why. Keep it concise and actionable.
    `.trim();
        const response = await this.router.chat([
            { role: 'system', content: 'You are a helpful assistant that explains code changes.' },
            { role: 'user', content: prompt },
        ]);
        return response?.content || 'Execution completed.';
    }
}
// ============================================================================
// AGENT EXECUTOR (ORCHESTRATOR)
// ============================================================================
export class VibeAgentExecutor {
    agents = new Map();
    defaultProvider;
    constructor(provider, memory) {
        this.defaultProvider = provider;
        // Register built-in agents
        this.registerAgent(new PlannerAgent(provider));
        this.registerAgent(new ExecutorAgent(provider));
        this.registerAgent(new ReviewerAgent(provider));
        this.registerAgent(new DebuggerAgent(provider));
        this.registerAgent(new RefactorAgent(provider));
        this.registerAgent(new LearningAgent(provider, memory || new VibeMemoryManager()));
        this.registerAgent(new ContextAgent(provider, memory || new VibeMemoryManager()));
    }
    /**
     * Register an agent
     */
    registerAgent(agent) {
        this.agents.set(agent.name, agent);
    }
    /**
     * Get an agent by name
     */
    getAgent(name) {
        return this.agents.get(name);
    }
    /**
     * Execute a task with the full pipeline
     */
    async execute(task, options = {}) {
        const context = new AgentExecutionContext({
            workingDir: options.workingDir,
            dryRun: options.dryRun,
        });
        const planner = this.agents.get('planner');
        const executor = this.agents.get('executor');
        const reviewer = this.agents.get('reviewer');
        if (!planner || !executor || !reviewer) {
            return {
                success: false,
                output: '',
                error: 'Required agents not registered',
                steps: [],
            };
        }
        // Phase 1: Plan
        const planResult = await planner.execute(task, context);
        if (!planResult.success) {
            return {
                success: false,
                output: planResult.output,
                error: planResult.error,
                steps: planResult.steps,
            };
        }
        // Phase 2: Execute
        const execTask = {
            ...task,
            context: {
                ...task.context,
                plan: planResult.artifacts?.[0],
            },
        };
        const execResult = await executor.execute(execTask, context);
        // Phase 3: Review (Verify + Explain)
        const reviewResult = await reviewer.execute(execTask, context);
        return {
            success: execResult.success && reviewResult.success,
            output: `Plan:\n${planResult.output}\n\nExecution:\n${execResult.output}\n\nReview:\n${reviewResult.output}`,
            error: execResult.error || reviewResult.error,
            steps: [...planResult.steps, ...execResult.steps, ...reviewResult.steps],
            artifacts: execResult.artifacts,
        };
    }
    /**
     * Execute with full pipeline (PLAN → PROPOSE → APPROVE → EXECUTE → VERIFY → EXPLAIN)
     */
    async executePipeline(task, options = {}) {
        const context = new AgentExecutionContext({
            workingDir: options.workingDir,
            dryRun: options.dryRun,
        });
        const planner = this.agents.get('planner');
        const executor = this.agents.get('executor');
        const reviewer = this.agents.get('reviewer');
        if (!planner || !executor || !reviewer) {
            return this.execute(task, options);
        }
        const allSteps = [];
        const startTime = Date.now();
        // Step 1: PLAN
        const planResult = await planner.execute(task, context);
        allSteps.push(...planResult.steps);
        if (!planResult.success) {
            return { success: false, output: planResult.output, steps: allSteps, error: planResult.error };
        }
        // Step 2: PROPOSE (show what will be done)
        const plan = planResult.artifacts?.[0] ? JSON.parse(planResult.artifacts[0]) : null;
        // Step 3: APPROVE (if needed)
        if (plan && plan.estimatedRisk !== 'low' && task.approvalMode === 'prompt') {
            const approved = await approvalManager.request(`Execute plan with ${plan.steps.length} steps`, plan.steps.map(s => `${s.tool}: ${s.description}`), plan.estimatedRisk);
            if (!approved) {
                allSteps.push({
                    id: crypto.randomUUID(),
                    phase: 'approve',
                    action: 'Request approval',
                    result: 'Operation cancelled by user',
                    approved: false,
                    timestamp: new Date(),
                    duration: Date.now() - startTime,
                });
                return {
                    success: false,
                    output: 'Operation cancelled',
                    steps: allSteps,
                    error: 'User declined approval',
                };
            }
        }
        // Step 4: EXECUTE
        const execTask = {
            ...task,
            checkpoint: true,
        };
        const execResult = await executor.execute(execTask, context);
        allSteps.push(...execResult.steps);
        if (!execResult.success) {
            return {
                success: false,
                output: execResult.output,
                steps: allSteps,
                error: execResult.error,
                artifacts: execResult.artifacts,
            };
        }
        // Step 5: VERIFY
        // Step 6: EXPLAIN
        const reviewResult = await reviewer.execute(execTask, context);
        allSteps.push(...reviewResult.steps);
        return {
            success: execResult.success && reviewResult.success,
            output: this.formatPipelineOutput(planResult, execResult, reviewResult),
            steps: allSteps,
            error: execResult.error || reviewResult.error,
            artifacts: execResult.artifacts,
        };
    }
    formatPipelineOutput(plan, exec, review) {
        return `
╔═══════════════════════════════════════════════════════════════════════╗
║  AGENT PIPELINE COMPLETE                                             ║
╚═══════════════════════════════════════════════════════════════════════╝

PLAN:
${plan.output}

EXECUTION:
${exec.output}

REVIEW:
${review.output}
    `.trim();
    }
    /**
     * Get list of all registered agents
     */
    listAgents() {
        return Array.from(this.agents.values());
    }
    /**
     * Get available tools from all agents
     */
    getAvailableTools() {
        return toolRegistry.list();
    }
}
export class DebuggerAgent extends BaseAgent {
    router;
    name = 'debugger';
    description = 'Analyzes errors and suggests fixes';
    phases = ['debug'];
    constructor(router) {
        super(router);
        this.router = router;
    }
    async run(task, context, steps) {
        const startTime = Date.now();
        const errorInfo = task.context.error || {};
        // Analyze the error
        const prompt = `
Analyze this error and provide debugging assistance:

Error: ${errorInfo.message || task.task}
${errorInfo.stack ? `Stack Trace:\n${errorInfo.stack}` : ''}
File: ${errorInfo.file || 'Unknown'}

Context:
${JSON.stringify(task.context, null, 2)}

Provide:
1. Root cause analysis
2. Suggested fix
3. List of relevant files that may need changes
4. Confidence level (0-1)

Respond with JSON: {rootCause, suggestedFix, relevantFiles: string[], fixConfidence}
    `.trim();
        const response = await this.router.chat([
            { role: 'system', content: 'You are an expert debugger. Analyze errors and provide clear fixes.' },
            { role: 'user', content: prompt },
        ]);
        // Parse the response
        let debugResult = {
            rootCause: 'Unable to determine root cause',
            suggestedFix: 'Manual investigation required',
            relevantFiles: [],
            fixConfidence: 0,
        };
        try {
            const jsonMatch = response?.content?.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                debugResult = { ...debugResult, ...JSON.parse(jsonMatch[0]) };
            }
        }
        catch {
            // Fallback to raw response
            debugResult.rootCause = response?.content || 'Unknown error';
        }
        steps.push({
            id: crypto.randomUUID(),
            phase: 'debug',
            action: 'Analyze error and suggest fix',
            result: `Root cause: ${debugResult.rootCause}\nFix: ${debugResult.suggestedFix}`,
            timestamp: new Date(),
            duration: Date.now() - startTime,
        });
        return {
            success: true,
            output: `Debug Analysis:\n\nRoot Cause: ${debugResult.rootCause}\n\nSuggested Fix: ${debugResult.suggestedFix}\n\nConfidence: ${(debugResult.fixConfidence * 100).toFixed(0)}%`,
            artifacts: [JSON.stringify(debugResult, null, 2)],
        };
    }
}
export class RefactorAgent extends BaseAgent {
    router;
    name = 'refactor';
    description = 'Identifies patterns and refactors code';
    phases = ['refactor'];
    constructor(router) {
        super(router);
        this.router = router;
    }
    async run(task, context, steps) {
        const startTime = Date.now();
        const targetFile = task.context.file || '';
        const patternType = task.context.pattern || 'general';
        const prompt = `
Refactor task: ${task.task}

Target file: ${targetFile}
Pattern type: ${patternType}

Analyze the code and identify refactoring opportunities:
1. Code smells or anti-patterns
2. Potential improvements
3. Breaking changes (if any)
4. Estimated complexity

Respond with JSON: {patterns: string[], changes: [{file, description, before, after, rationale}], estimatedComplexity, breakingChanges: string[]}
    `.trim();
        const response = await this.router.chat([
            { role: 'system', content: 'You are an expert code refactorer. Identify patterns and improve code quality.' },
            { role: 'user', content: prompt },
        ]);
        let refactorResult = {
            patterns: ['General code improvement'],
            changes: [],
            estimatedComplexity: 'medium',
            breakingChanges: [],
        };
        try {
            const jsonMatch = response?.content?.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                refactorResult = { ...refactorResult, ...JSON.parse(jsonMatch[0]) };
            }
        }
        catch {
            refactorResult.patterns = [response?.content || 'No patterns identified'];
        }
        steps.push({
            id: crypto.randomUUID(),
            phase: 'refactor',
            action: 'Identify refactoring patterns',
            result: `Found ${refactorResult.patterns.length} patterns, ${refactorResult.changes.length} changes proposed`,
            timestamp: new Date(),
            duration: Date.now() - startTime,
        });
        return {
            success: true,
            output: `Refactoring Analysis:\n\nPatterns Found:\n${refactorResult.patterns.map(p => `- ${p}`).join('\n')}\n\nProposed Changes: ${refactorResult.changes.length}\nComplexity: ${refactorResult.estimatedComplexity.toUpperCase()}`,
            artifacts: [JSON.stringify(refactorResult, null, 2)],
        };
    }
}
export class LearningAgent extends BaseAgent {
    router;
    memory;
    name = 'learn';
    description = 'Learns from interactions and improves over time';
    phases = ['learn'];
    constructor(router, memory) {
        super(router);
        this.router = router;
        this.memory = memory;
    }
    async run(task, context, steps) {
        const startTime = Date.now();
        // Extract learning from the task and context
        const prompt = `
Learn from this interaction and improve future responses:

Task: ${task.task}
Context: ${JSON.stringify(task.context, null, 2)}

What can be learned from this interaction?
Provide:
1. Key knowledge gained
2. Patterns observed
3. Suggestions for improvement
4. Confidence boost (0-1)

Respond with JSON: {knowledgeGained, patternsLearned: string[], suggestions: string[], confidenceBoost}
    `.trim();
        const response = await this.router.chat([
            { role: 'system', content: 'You are a learning agent that improves from interactions.' },
            { role: 'user', content: prompt },
        ]);
        let learningResult = {
            knowledgeGained: 'General pattern recognition',
            patternsLearned: [],
            suggestions: [],
            confidenceBoost: 0,
        };
        try {
            const jsonMatch = response?.content?.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                learningResult = { ...learningResult, ...JSON.parse(jsonMatch[0]) };
            }
        }
        catch {
            learningResult.knowledgeGained = response?.content || 'No new learning';
        }
        // Store the learning in memory
        this.memory.add({
            type: 'action',
            content: learningResult.knowledgeGained,
            tags: ['learning', ...learningResult.patternsLearned],
            source: 'inference',
        });
        steps.push({
            id: crypto.randomUUID(),
            phase: 'learn',
            action: 'Extract and store knowledge',
            result: `Learned: ${learningResult.knowledgeGained.slice(0, 100)}...`,
            timestamp: new Date(),
            duration: Date.now() - startTime,
        });
        return {
            success: true,
            output: `Learning Complete:\n\nKnowledge Gained: ${learningResult.knowledgeGained}\nPatterns: ${learningResult.patternsLearned.length}\nSuggestions: ${learningResult.suggestions.length}`,
            artifacts: [JSON.stringify(learningResult, null, 2)],
        };
    }
}
export class ContextAgent extends BaseAgent {
    router;
    memory;
    name = 'context';
    description = 'Manages semantic indexing and context retrieval';
    phases = ['context'];
    constructor(router, memory) {
        super(router);
        this.router = router;
        this.memory = memory;
    }
    async run(task, context, steps) {
        const startTime = Date.now();
        const query = task.context.query || task.task;
        // Retrieve relevant context from memory
        const relevantDocs = this.memory.search(query);
        const prompt = `
Given this query: ${query}

And these context documents:
${relevantDocs.map((d) => `- ${d.content.slice(0, 200)}...`).join('\n')}

Identify the most relevant context and provide:
1. Key context points
2. Files that should be indexed
3. Semantic matches
4. Context coverage score (0-1)

Respond with JSON: {relevantContext: string[], indexedFiles, semanticMatches: [{file, relevance, excerpt}], contextCoverage}
    `.trim();
        const response = await this.router.chat([
            { role: 'system', content: 'You are a context agent that manages semantic understanding.' },
            { role: 'user', content: prompt },
        ]);
        let contextResult = {
            relevantContext: relevantDocs.map((d) => d.content),
            indexedFiles: relevantDocs.length,
            semanticMatches: [],
            contextCoverage: 0.5,
        };
        try {
            const jsonMatch = response?.content?.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                contextResult = { ...contextResult, ...parsed };
            }
        }
        catch {
            // Use defaults
        }
        steps.push({
            id: crypto.randomUUID(),
            phase: 'context',
            action: 'Retrieve relevant context',
            result: `Found ${contextResult.relevantContext.length} context items, ${contextResult.indexedFiles} files indexed`,
            timestamp: new Date(),
            duration: Date.now() - startTime,
        });
        return {
            success: true,
            output: `Context Retrieval:\n\nRelevant Context: ${contextResult.relevantContext.length} items\nFiles Indexed: ${contextResult.indexedFiles}\nCoverage: ${(contextResult.contextCoverage * 100).toFixed(0)}%`,
            artifacts: [JSON.stringify(contextResult, null, 2)],
        };
    }
}
// ============================================================================
// EXPORTS
// ============================================================================
export const agentExecutor = new VibeAgentExecutor(new VibeProviderRouter(), new VibeMemoryManager());
export { VibeAgentExecutor as VibeAgentSystem };
//# sourceMappingURL=index.js.map