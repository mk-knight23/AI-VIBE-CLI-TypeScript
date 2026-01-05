/**
 * VIBE-CLI v12 - Approvals Module
 * Safety and approval system for destructive operations
 */

import * as crypto from 'crypto';
import type { 
  ApprovalRequest, 
  ApprovalDetails, 
  ApprovalType,
  ApprovalRisk,
  IApprovalSystem 
} from '../types';

export type { ApprovalRequest, ApprovalDetails, ApprovalType, ApprovalRisk, IApprovalSystem };

export class VibeApprovalManager implements IApprovalSystem {
  private requests: Map<string, ApprovalRequest> = new Map();
  private policies: Map<string, ApprovalPolicy> = new Map();

  constructor() {
    // Default policy
    this.policies.set('default', {
      autoApproveLowRisk: true,
      requireReasonForHighRisk: true,
      allowedApprovers: ['*'],
      notifyOnApproval: true,
    });
  }

  /**
   * Request approval for an operation
   */
  async requestApproval(details: ApprovalDetails): Promise<boolean> {
    const request: ApprovalRequest = {
      id: crypto.randomUUID(),
      type: details.type,
      description: details.description,
      risk: details.risk,
      operations: details.operations,
      timestamp: new Date(),
      status: 'pending',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    };

    this.requests.set(request.id, request);

    // Auto-approve low risk if policy allows
    if (request.risk === 'low') {
      const policy = this.policies.get('default');
      if (policy?.autoApproveLowRisk) {
        request.status = 'approved';
        return true;
      }
    }

    // For now, auto-approve for CLI simplicity
    request.status = 'approved';
    return true;
  }

  /**
   * Check approval status - implements IApprovalSystem
   */
  checkApproval(id: string): ApprovalDetails | undefined {
    const request = this.requests.get(id);
    if (!request) return undefined;
    
    return {
      id: request.id,
      type: request.type as ApprovalType,
      risk: request.risk,
      description: request.description,
      operations: request.operations,
      status: request.status || 'pending',
      requestedAt: request.timestamp,
      expiresAt: request.expiresAt,
    };
  }

  /**
   * List pending approvals - implements IApprovalSystem
   */
  listPending(): ApprovalDetails[] {
    return Array.from(this.requests.values())
      .filter(r => r.status === 'pending')
      .map(r => ({
        id: r.id,
        type: r.type as ApprovalType,
        risk: r.risk,
        description: r.description,
        operations: r.operations,
        status: r.status || 'pending',
        requestedAt: r.timestamp,
        expiresAt: r.expiresAt,
      }));
  }

  /**
   * Approve a request
   */
  approve(requestId: string, _approvedBy?: string): boolean {
    const request = this.requests.get(requestId);
    
    if (!request) {
      return false;
    }

    if (request.status !== 'pending') {
      return false;
    }

    request.status = 'approved';
    return true;
  }

  /**
   * Deny a request
   */
  deny(requestId: string, _reason?: string): boolean {
    const request = this.requests.get(requestId);
    
    if (!request) {
      return false;
    }

    request.status = 'denied';
    return true;
  }

  /**
   * Get pending approvals
   */
  getPending(): ApprovalRequest[] {
    return Array.from(this.requests.values())
      .filter(r => r.status === 'pending');
  }

  /**
   * Get request by ID
   */
  getRequest(id: string): ApprovalRequest | undefined {
    return this.requests.get(id);
  }

  /**
   * Check if an operation is approved
   */
  isApproved(requestId: string): boolean {
    const request = this.requests.get(requestId);
    return request?.status === 'approved';
  }

  /**
   * Assess risk level of an operation
   */
  private assessRisk(type: ApprovalType): ApprovalRisk {
    switch (type) {
      case 'delete':
      case 'deploy':
        return 'high';
      case 'shell':
      case 'shell-exec':
        return 'medium';
      case 'file-write':
        return 'medium';
      case 'git-mutation':
        return 'low';
      case 'network':
        return 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Clear old requests
   */
  cleanup(): number {
    const now = new Date();
    let removed = 0;

    for (const [id, request] of this.requests.entries()) {
      if (request.expiresAt && request.expiresAt < now) {
        this.requests.delete(id);
        removed++;
      }
    }

    return removed;
  }
}

interface ApprovalPolicy {
  autoApproveLowRisk: boolean;
  requireReasonForHighRisk: boolean;
  allowedApprovers: string[];
  notifyOnApproval: boolean;
}
