/**
 * VIBE CLI - Approvals Module
 *
 * Safety and approval system for destructive operations.
 * Provides interactive confirmation for risky operations.
 *
 * Version: 13.0.0
 */

// New v13 approval manager
export { ApprovalManager, VibeApprovalManager } from './manager.js';
export { approvalManager } from './manager.js';

// Types from the new manager
export type {
  VibeApprovalRequest as ApprovalRequest,
} from './manager.js';
