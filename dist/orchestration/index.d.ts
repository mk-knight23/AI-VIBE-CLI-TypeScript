/**
 * VIBE-CLI v12 Orchestrator
 * Multi-agent orchestration for intent-driven execution
 */
import type { VibeIntent, VibeSession, IProviderRouter } from '../types';
import { VibeMemoryManager } from '../memory';
import { VibeApprovalManager } from '../approvals';
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
 * V12 Orchestrator - manages agent execution
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
    private webGeneration;
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
    /**
     * Handle UI/web generation requests
     */
    private handleUI;
    /**
     * Handle API generation requests
     */
    private handleAPI;
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