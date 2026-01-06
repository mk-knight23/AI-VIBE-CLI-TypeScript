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

import * as readline from 'readline';
import * as crypto from 'crypto';
import chalk from 'chalk';
import type { ApprovalType, ApprovalRisk } from '../types.js';

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// USER INTERFACE
// ============================================================================

class ApprovalUI {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
  }

  async question(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  async yesNo(question: string, defaultYes: boolean = false): Promise<boolean> {
    const defaultStr = defaultYes ? '[Y/n]' : '[y/N]';
    const answer = await this.question(`${question} ${defaultStr} `);
    if (!answer) return defaultYes;
    return answer.toLowerCase().startsWith('y');
  }

  showBanner(risk: RiskLevel): void {
    const icons: Record<RiskLevel, string> = {
      low: '✓',
      medium: '⚠',
      high: '⚡',
      critical: '🚨',
    };

    const header = `${icons[risk]} ${risk.toUpperCase()} RISK OPERATION`;
    console.log('\n' + header);
    console.log(chalk.gray('─'.repeat(50)));
  }

  showOperation(operation: string, index: number): void {
    console.log(chalk.cyan(`  ${index + 1}. ${operation}`));
  }

  showDiff(filePath: string, oldContent: string, newContent: string): void {
    console.log(chalk.cyan(`\n─── Diff: ${filePath} ───\n`));

    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    const maxLines = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];

      if (oldLine === newLine) {
        console.log(chalk.gray(`    ${String(i + 1).padStart(3)} │ ${oldLine || ''}`));
      } else {
        if (oldLine !== undefined) {
          console.log(chalk.red(`   -${String(i + 1).padStart(3)} │ ${oldLine}`));
        }
        if (newLine !== undefined) {
          console.log(chalk.green(`   +${String(i + 1).padStart(3)} │ ${newLine}`));
        }
      }
    }
    console.log('');
  }

  showApprovalOptions(): void {
    console.log(chalk.cyan(`
  Options:
    [y] Yes, proceed
    [n] No, cancel
    [d] Yes, always for this type
    [N] No, never for this type
    [v] View details
    [c] Cancel request
    [?] Show help
    [q] Quit
    `));
  }

  showHelp(risk: RiskLevel): void {
    console.log(chalk.cyan(`
  Risk Assessment for ${risk.toUpperCase()} operations:

  - ${risk === 'low' ? 'Read-only or safe operations' : risk === 'medium' ? 'File modifications' : 'Shell commands, deployments, or deletions'}
  - Auto-approve: ${risk === 'low' ? 'Enabled' : risk === 'medium' ? 'Disabled' : 'Never'}
  - ${risk === 'critical' ? 'This operation could affect production systems!' : ''}
    `));
  }

  close(): void {
    this.rl.close();
  }
}

// ============================================================================
// APPROVAL MANAGER
// ============================================================================

export class ApprovalManager {
  private requests: Map<string, ApprovalRequest> = new Map();
  private policy: ApprovalPolicy;
  private ui: ApprovalUI;
  private autoApprove: boolean = false;

  constructor(config?: Partial<ApprovalConfig>) {
    this.policy = {
      autoApproveLowRisk: config?.autoApproveLowRisk ?? true,
      autoApproveMediumRisk: config?.autoApproveMediumRisk ?? false,
      confirmHighRisk: config?.requireExplicitApproval ?? true,
      confirmCriticalRisk: true,
      rememberPreferences: true,
      preferences: new Map(),
    };
    this.ui = new ApprovalUI();
  }

  // ============================================================================
  // IApprovalSystem interface methods
  // ============================================================================

  async requestApproval(details: { type: string; description: string; operations: string[]; risk: string }): Promise<boolean> {
    return this.request(
      details.description,
      details.operations,
      details.risk as RiskLevel,
      details.type as ApprovalType
    );
  }

  checkApproval(id: string): { id: string; type: ApprovalType; description: string; operations: string[]; risk: ApprovalRisk; status: 'pending' | 'approved' | 'denied'; requestedAt: Date } | undefined {
    const request = this.requests.get(id);
    if (!request) return undefined;
    return {
      id: request.id,
      type: request.type as ApprovalType,
      description: request.description,
      operations: request.operations,
      risk: request.risk as ApprovalRisk,
      status: request.status as 'pending' | 'approved' | 'denied',
      requestedAt: request.timestamp,
    };
  }

  listPending(): { id: string; type: ApprovalType; description: string; operations: string[]; risk: ApprovalRisk; status: 'pending' | 'approved' | 'denied'; requestedAt: Date }[] {
    return Array.from(this.requests.values())
      .filter(r => r.status === 'pending')
      .map(r => ({
        id: r.id,
        type: r.type as ApprovalType,
        description: r.description,
        operations: r.operations,
        risk: r.risk as ApprovalRisk,
        status: r.status as 'pending' | 'approved' | 'denied',
        requestedAt: r.timestamp,
      }));
  }

  // ============================================================================
  // Core request method
  // ============================================================================

  /**
   * Request approval for an operation
   */
  async request(
    description: string,
    operations: string[],
    risk: RiskLevel,
    type: ApprovalType = 'file-write'
  ): Promise<boolean> {
    // Check auto-approve setting
    if (this.autoApprove) {
      return true;
    }

    // Check policy preferences
    const preference = this.policy.preferences.get(type);
    if (preference === 'always') {
      return true;
    }
    if (preference === 'never') {
      return false;
    }

    // Check auto-approve rules
    if (risk === 'low' && this.policy.autoApproveLowRisk) {
      return true;
    }
    if (risk === 'medium' && this.policy.autoApproveMediumRisk) {
      return true;
    }

    // For critical/high risk, require explicit confirmation
    if (risk === 'critical' && !this.policy.confirmCriticalRisk) {
      return true;
    }
    if (risk === 'high' && !this.policy.confirmHighRisk) {
      return true;
    }

    // Create request
    const request: ApprovalRequest = {
      id: crypto.randomUUID(),
      type,
      description,
      operations,
      risk,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      status: 'pending',
    };

    this.requests.set(request.id, request);

    // Show interactive prompt
    return this.showPrompt(request);
  }

  /**
   * Show interactive approval prompt
   */
  private async showPrompt(request: ApprovalRequest): Promise<boolean> {
    this.ui.showBanner(request.risk);
    console.log(chalk.white(`  ${request.description}\n`));

    if (request.operations.length > 0) {
      console.log(chalk.gray('  Operations:'));
      request.operations.forEach((op, i) => this.ui.showOperation(op, i));
    }

    console.log('');

    // Get user choice
    while (true) {
      const answer = await this.ui.question(chalk.cyan('  Proceed? '));

      switch (answer.toLowerCase()) {
        case 'y':
        case 'yes':
          request.status = 'approved';
          return true;

        case 'n':
        case 'no':
          request.status = 'denied';
          return false;

        case 'd':
          // Remember "always" for this type
          this.policy.preferences.set(request.type, 'always');
          request.status = 'approved';
          return true;

        case 'N':
          // Remember "never" for this type
          this.policy.preferences.set(request.type, 'never');
          request.status = 'denied';
          return false;

        case 'v':
        case 'view':
          this.ui.showApprovalOptions();
          continue;

        case '?':
        case 'h':
        case 'help':
          this.ui.showHelp(request.risk);
          this.ui.showApprovalOptions();
          continue;

        case 'c':
        case 'cancel':
          request.status = 'denied';
          return false;

        case 'q':
        case 'quit':
          request.status = 'denied';
          return false;

        default:
          console.log(chalk.yellow('  Invalid option. Type ? for help.'));
          continue;
      }
    }
  }

  /**
   * Request with diff preview
   */
  async requestWithDiff(
    description: string,
    operations: Array<{ file: string; oldContent: string; newContent: string }>,
    risk: RiskLevel,
    type: ApprovalType = 'file-write'
  ): Promise<boolean> {
    // Check auto-approve
    if (this.autoApprove) {
      return true;
    }

    // Check preferences
    const preference = this.policy.preferences.get(type);
    if (preference === 'always') return true;
    if (preference === 'never') return false;

    // Check auto-approve rules
    if (risk === 'low' && this.policy.autoApproveLowRisk) return true;

    // Create request
    const request: ApprovalRequest = {
      id: crypto.randomUUID(),
      type,
      description,
      operations: operations.map(o => `Modify: ${o.file}`),
      risk,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      status: 'pending',
    };

    this.requests.set(request.id, request);

    // Show diff preview
    this.ui.showBanner(request.risk);
    console.log(chalk.white(`  ${description}\n`));

    for (const op of operations) {
      this.ui.showDiff(op.file, op.oldContent, op.newContent);
    }

    // Get confirmation
    const approved = await this.ui.yesNo('  Apply these changes?');

    if (approved) {
      request.status = 'approved';
    } else {
      request.status = 'denied';
    }

    return approved;
  }

  /**
   * Request shell command approval
   */
  async requestShell(
    command: string,
    risk: RiskLevel = 'high'
  ): Promise<boolean> {
    return this.request(
      'Execute shell command',
      [command],
      risk,
      'shell'
    );
  }

  /**
   * Request git approval
   */
  async requestGit(
    operation: string,
    details: string,
    risk: RiskLevel = 'medium'
  ): Promise<boolean> {
    return this.request(
      `Git: ${operation}`,
      [details],
      risk,
      'git-mutation' as ApprovalType
    );
  }

  /**
   * Request file delete approval
   */
  async requestDelete(
    filePath: string,
    risk: RiskLevel = 'high'
  ): Promise<boolean> {
    return this.request(
      'Delete file',
      [`rm ${filePath}`],
      risk,
      'delete' as ApprovalType
    );
  }

  /**
   * Set auto-approve mode
   */
  setAutoApprove(enabled: boolean): void {
    this.autoApprove = enabled;
  }

  /**
   * Configure policy
   */
  configurePolicy(updates: Partial<ApprovalPolicy>): void {
    Object.assign(this.policy, updates);
  }

  /**
   * Get request status
   */
  getRequest(id: string): ApprovalRequest | undefined {
    return this.requests.get(id);
  }

  /**
   * List all requests
   */
  listRequests(): ApprovalRequest[] {
    return Array.from(this.requests.values());
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

  /**
   * Show pending requests
   */
  showPending(): void {
    const pending = this.listRequests().filter(r => r.status === 'pending');

    if (pending.length === 0) {
      console.log(chalk.cyan('\n  No pending approvals.\n'));
      return;
    }

    console.log(chalk.cyan('\n  Pending Approvals:\n'));

    for (const request of pending) {
      console.log(`  ${request.risk.toUpperCase()} ${request.description}`);
      console.log(chalk.gray(`    Operations: ${request.operations.join(', ')}\n`));
    }
  }

  /**
   * Get status summary
   */
  getStatus(): {
    pending: number;
    approved: number;
    denied: number;
    autoApproved: number;
    preferences: Record<string, string>;
  } {
    const requests = this.listRequests();

    return {
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      denied: requests.filter(r => r.status === 'denied').length,
      autoApproved: requests.filter(r => r.autoApproved).length,
      preferences: Object.fromEntries(this.policy.preferences),
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const approvalManager = new ApprovalManager();
export { ApprovalManager as VibeApprovalManager };
export type {
  ApprovalRequest as VibeApprovalRequest,
};
