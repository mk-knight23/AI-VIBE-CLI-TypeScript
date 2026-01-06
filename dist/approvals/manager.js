"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VibeApprovalManager = exports.approvalManager = exports.ApprovalManager = void 0;
const readline = __importStar(require("readline"));
const crypto = __importStar(require("crypto"));
const chalk_1 = __importDefault(require("chalk"));
// ============================================================================
// USER INTERFACE
// ============================================================================
class ApprovalUI {
    rl;
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: true,
        });
    }
    async question(question) {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer.trim());
            });
        });
    }
    async yesNo(question, defaultYes = false) {
        const defaultStr = defaultYes ? '[Y/n]' : '[y/N]';
        const answer = await this.question(`${question} ${defaultStr} `);
        if (!answer)
            return defaultYes;
        return answer.toLowerCase().startsWith('y');
    }
    showBanner(risk) {
        const icons = {
            low: '✓',
            medium: '⚠',
            high: '⚡',
            critical: '🚨',
        };
        const header = `${icons[risk]} ${risk.toUpperCase()} RISK OPERATION`;
        console.log('\n' + header);
        console.log(chalk_1.default.gray('─'.repeat(50)));
    }
    showOperation(operation, index) {
        console.log(chalk_1.default.cyan(`  ${index + 1}. ${operation}`));
    }
    showDiff(filePath, oldContent, newContent) {
        console.log(chalk_1.default.cyan(`\n─── Diff: ${filePath} ───\n`));
        const oldLines = oldContent.split('\n');
        const newLines = newContent.split('\n');
        const maxLines = Math.max(oldLines.length, newLines.length);
        for (let i = 0; i < maxLines; i++) {
            const oldLine = oldLines[i];
            const newLine = newLines[i];
            if (oldLine === newLine) {
                console.log(chalk_1.default.gray(`    ${String(i + 1).padStart(3)} │ ${oldLine || ''}`));
            }
            else {
                if (oldLine !== undefined) {
                    console.log(chalk_1.default.red(`   -${String(i + 1).padStart(3)} │ ${oldLine}`));
                }
                if (newLine !== undefined) {
                    console.log(chalk_1.default.green(`   +${String(i + 1).padStart(3)} │ ${newLine}`));
                }
            }
        }
        console.log('');
    }
    showApprovalOptions() {
        console.log(chalk_1.default.cyan(`
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
    showHelp(risk) {
        console.log(chalk_1.default.cyan(`
  Risk Assessment for ${risk.toUpperCase()} operations:

  - ${risk === 'low' ? 'Read-only or safe operations' : risk === 'medium' ? 'File modifications' : 'Shell commands, deployments, or deletions'}
  - Auto-approve: ${risk === 'low' ? 'Enabled' : risk === 'medium' ? 'Disabled' : 'Never'}
  - ${risk === 'critical' ? 'This operation could affect production systems!' : ''}
    `));
    }
    close() {
        this.rl.close();
    }
}
// ============================================================================
// APPROVAL MANAGER
// ============================================================================
class ApprovalManager {
    requests = new Map();
    policy;
    ui;
    autoApprove = false;
    constructor(config) {
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
    async requestApproval(details) {
        return this.request(details.description, details.operations, details.risk, details.type);
    }
    checkApproval(id) {
        const request = this.requests.get(id);
        if (!request)
            return undefined;
        return {
            id: request.id,
            type: request.type,
            description: request.description,
            operations: request.operations,
            risk: request.risk,
            status: request.status,
            requestedAt: request.timestamp,
        };
    }
    listPending() {
        return Array.from(this.requests.values())
            .filter(r => r.status === 'pending')
            .map(r => ({
            id: r.id,
            type: r.type,
            description: r.description,
            operations: r.operations,
            risk: r.risk,
            status: r.status,
            requestedAt: r.timestamp,
        }));
    }
    // ============================================================================
    // Core request method
    // ============================================================================
    /**
     * Request approval for an operation
     */
    async request(description, operations, risk, type = 'file-write') {
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
        const request = {
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
    async showPrompt(request) {
        this.ui.showBanner(request.risk);
        console.log(chalk_1.default.white(`  ${request.description}\n`));
        if (request.operations.length > 0) {
            console.log(chalk_1.default.gray('  Operations:'));
            request.operations.forEach((op, i) => this.ui.showOperation(op, i));
        }
        console.log('');
        // Get user choice
        while (true) {
            const answer = await this.ui.question(chalk_1.default.cyan('  Proceed? '));
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
                    console.log(chalk_1.default.yellow('  Invalid option. Type ? for help.'));
                    continue;
            }
        }
    }
    /**
     * Request with diff preview
     */
    async requestWithDiff(description, operations, risk, type = 'file-write') {
        // Check auto-approve
        if (this.autoApprove) {
            return true;
        }
        // Check preferences
        const preference = this.policy.preferences.get(type);
        if (preference === 'always')
            return true;
        if (preference === 'never')
            return false;
        // Check auto-approve rules
        if (risk === 'low' && this.policy.autoApproveLowRisk)
            return true;
        // Create request
        const request = {
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
        console.log(chalk_1.default.white(`  ${description}\n`));
        for (const op of operations) {
            this.ui.showDiff(op.file, op.oldContent, op.newContent);
        }
        // Get confirmation
        const approved = await this.ui.yesNo('  Apply these changes?');
        if (approved) {
            request.status = 'approved';
        }
        else {
            request.status = 'denied';
        }
        return approved;
    }
    /**
     * Request shell command approval
     */
    async requestShell(command, risk = 'high') {
        return this.request('Execute shell command', [command], risk, 'shell');
    }
    /**
     * Request git approval
     */
    async requestGit(operation, details, risk = 'medium') {
        return this.request(`Git: ${operation}`, [details], risk, 'git-mutation');
    }
    /**
     * Request file delete approval
     */
    async requestDelete(filePath, risk = 'high') {
        return this.request('Delete file', [`rm ${filePath}`], risk, 'delete');
    }
    /**
     * Set auto-approve mode
     */
    setAutoApprove(enabled) {
        this.autoApprove = enabled;
    }
    /**
     * Configure policy
     */
    configurePolicy(updates) {
        Object.assign(this.policy, updates);
    }
    /**
     * Get request status
     */
    getRequest(id) {
        return this.requests.get(id);
    }
    /**
     * List all requests
     */
    listRequests() {
        return Array.from(this.requests.values());
    }
    /**
     * Clear old requests
     */
    cleanup() {
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
    showPending() {
        const pending = this.listRequests().filter(r => r.status === 'pending');
        if (pending.length === 0) {
            console.log(chalk_1.default.cyan('\n  No pending approvals.\n'));
            return;
        }
        console.log(chalk_1.default.cyan('\n  Pending Approvals:\n'));
        for (const request of pending) {
            console.log(`  ${request.risk.toUpperCase()} ${request.description}`);
            console.log(chalk_1.default.gray(`    Operations: ${request.operations.join(', ')}\n`));
        }
    }
    /**
     * Get status summary
     */
    getStatus() {
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
exports.ApprovalManager = ApprovalManager;
exports.VibeApprovalManager = ApprovalManager;
// ============================================================================
// EXPORTS
// ============================================================================
exports.approvalManager = new ApprovalManager();
//# sourceMappingURL=manager.js.map