/**
 * VIBE CLI - Real Approval System
 *
 * Interactive approval system with:
 * - Diff previews for file changes
 * - Command previews for shell operations
 * - Risk-based confirmation levels
 * - Auto-approve configurable for low-risk ops
 * - Remember preferences per operation type
 *
 * Version: 13.0.0
 */
import type { ApprovalType, ApprovalRisk } from '../types.js';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export interface ApprovalRequest {
    id: string;
    type: ApprovalType;
    description: string;
    operations: string[];
    risk: RiskLevel;
    timestamp: Date;
    expiresAt: Date;
    status: 'pending' | 'approved' | 'denied';
    autoApproved?: boolean;
}
export interface ApprovalPolicy {
    autoApproveLowRisk: boolean;
    autoApproveMediumRisk: boolean;
    confirmHighRisk: boolean;
    confirmCriticalRisk: boolean;
    rememberPreferences: boolean;
    preferences: Map<ApprovalType, 'always' | 'never' | 'ask'>;
}
export interface ApprovalConfig {
    enabled: boolean;
    autoApproveLowRisk: boolean;
    autoApproveMediumRisk: boolean;
    requireExplicitApproval: boolean;
}
export declare class ApprovalManager {
    private requests;
    private policy;
    private ui;
    private autoApprove;
    constructor(config?: Partial<ApprovalConfig>);
    requestApproval(details: {
        type: string;
        description: string;
        operations: string[];
        risk: string;
    }): Promise<boolean>;
    checkApproval(id: string): {
        id: string;
        type: ApprovalType;
        description: string;
        operations: string[];
        risk: ApprovalRisk;
        status: 'pending' | 'approved' | 'denied';
        requestedAt: Date;
    } | undefined;
    listPending(): {
        id: string;
        type: ApprovalType;
        description: string;
        operations: string[];
        risk: ApprovalRisk;
        status: 'pending' | 'approved' | 'denied';
        requestedAt: Date;
    }[];
    /**
     * Request approval for an operation
     */
    request(description: string, operations: string[], risk: RiskLevel, type?: ApprovalType): Promise<boolean>;
    /**
     * Show interactive approval prompt
     */
    private showPrompt;
    /**
     * Request with diff preview
     */
    requestWithDiff(description: string, operations: Array<{
        file: string;
        oldContent: string;
        newContent: string;
    }>, risk: RiskLevel, type?: ApprovalType): Promise<boolean>;
    /**
     * Request shell command approval
     */
    requestShell(command: string, risk?: RiskLevel): Promise<boolean>;
    /**
     * Request git approval
     */
    requestGit(operation: string, details: string, risk?: RiskLevel): Promise<boolean>;
    /**
     * Request file delete approval
     */
    requestDelete(filePath: string, risk?: RiskLevel): Promise<boolean>;
    /**
     * Set auto-approve mode
     */
    setAutoApprove(enabled: boolean): void;
    /**
     * Configure policy
     */
    configurePolicy(updates: Partial<ApprovalPolicy>): void;
    /**
     * Get request status
     */
    getRequest(id: string): ApprovalRequest | undefined;
    /**
     * List all requests
     */
    listRequests(): ApprovalRequest[];
    /**
     * Clear old requests
     */
    cleanup(): number;
    /**
     * Show pending requests
     */
    showPending(): void;
    /**
     * Get status summary
     */
    getStatus(): {
        pending: number;
        approved: number;
        denied: number;
        autoApproved: number;
        preferences: Record<string, string>;
    };
}
export declare const approvalManager: ApprovalManager;
export { ApprovalManager as VibeApprovalManager };
export type { ApprovalRequest as VibeApprovalRequest, };
//# sourceMappingURL=manager.d.ts.map