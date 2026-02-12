/**
 * VIBE-CLI v0.0.1 Orchestrator
 * Multi-agent orchestration for intent-driven execution
 */
import type { VibeIntent, VibeSession, IProviderRouter } from '../types.js';
import { VibeMemoryManager } from '../memory/index.js';
import { VibeApprovalManager } from '../approvals/index.js';
export interface OrchestratorConfig {
    provider?: IProviderRouter;
    memory?: VibeMemoryManager;
    approvals?: VibeApprovalManager;
    session?: VibeSession;
}
export interface ExecutionPlan {
    steps: Array<{
        description: string;
        action: string;
        risk: 'low' | 'medium' | 'high' | 'critical';
        files?: string[];
        commands?: string[];
    }>;
    risks: string[];
}
export interface ExecutionResult {
    success: boolean;
    summary?: string;
    error?: string;
    changes?: Array<{
        file: string;
        type: 'created' | 'modified' | 'deleted';
    }>;
    suggestion?: string;
    output?: string;
}
/**
 * V0.0.1 Orchestrator - manages agent execution
 */
export declare class Orchestrator {
    private provider;
    private memory;
    private approvals;
    private session;
    private codeAssistant;
    private testing;
    private debugging;
    private security;
    private deployment;
    constructor(config?: OrchestratorConfig);
    /**
     * Create an execution plan from an intent
     */
    createPlan(intent: VibeIntent, _context: object): ExecutionPlan;
    /**
     * Execute an intent
     */
    execute(intent: VibeIntent, _context: object, approval: {
        approved: boolean;
    }): Promise<ExecutionResult>;
    private handleQuestion;
    private handleMemory;
    private handleCodeGeneration;
    private handleRefactor;
    private handleDebug;
    private handleTesting;
    private handleDeploy;
    private handleGit;
    private handleSecurity;
    private handleAnalysis;
    private handleGeneric;
    /**
     * Parse LLM response and write files
     */
    private parseAndWriteFiles;
}
//# sourceMappingURL=index.d.ts.map