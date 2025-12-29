/**
 * Safe Agent System - Plan → Propose → WAIT → Execute → Verify → Report
 * All mutating actions require explicit approval
 */

import { AuditLogger, validateCommand, RiskLevel, getOperationType } from './security';
import pc from 'picocolors';

export interface AgentAction {
  id: string;
  type: 'read' | 'write' | 'shell' | 'git';
  tool: string;
  description: string;
  params: Record<string, unknown>;
  riskLevel: RiskLevel;
}

export interface AgentPlan {
  id: string;
  goal: string;
  steps: AgentAction[];
  createdAt: string;
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'cancelled' | 'failed';
}

export interface RollbackAction {
  actionId: string;
  type: 'file-restore' | 'file-delete' | 'shell-undo';
  data: unknown;
}

export interface SafeAgentConfig {
  autoApproveReads: boolean;
  maxSteps: number;
  timeout: number;
  dryRun: boolean;
}

const DEFAULT_CONFIG: SafeAgentConfig = {
  autoApproveReads: true,
  maxSteps: 20,
  timeout: 300000, // 5 minutes
  dryRun: false,
};

export class SafeAgent {
  private config: SafeAgentConfig;
  private rollbackStack: RollbackAction[] = [];
  private audit: AuditLogger;
  private cancelled = false;

  constructor(config: Partial<SafeAgentConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.audit = new AuditLogger();
  }

  /**
   * Create execution plan from goal
   */
  createPlan(goal: string, actions: Omit<AgentAction, 'id'>[]): AgentPlan {
    return {
      id: `plan-${Date.now()}`,
      goal,
      steps: actions.map((a, i) => ({ ...a, id: `step-${i}` })),
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
  }

  /**
   * Display plan to user for review
   */
  showPlan(plan: AgentPlan): void {
    console.log();
    console.log(pc.cyan('═'.repeat(60)));
    console.log(pc.cyan(`📋 EXECUTION PLAN: ${plan.goal}`));
    console.log(pc.cyan('═'.repeat(60)));
    console.log();

    for (const step of plan.steps) {
      const icon = this.getRiskIcon(step.riskLevel);
      const typeIcon = step.type === 'read' ? '📖' : step.type === 'write' ? '✏️' : step.type === 'shell' ? '🔧' : '📦';
      
      console.log(`${icon} ${typeIcon} ${pc.bold(step.tool)}: ${step.description}`);
      if (Object.keys(step.params).length > 0) {
        console.log(pc.gray(`   params: ${JSON.stringify(step.params).slice(0, 80)}`));
      }
    }

    console.log();
    console.log(pc.cyan('─'.repeat(60)));
    
    const writeSteps = plan.steps.filter(s => s.type !== 'read');
    const highRisk = plan.steps.filter(s => s.riskLevel === 'high' || s.riskLevel === 'blocked');
    
    console.log(`Total steps: ${plan.steps.length}`);
    console.log(`Write operations: ${writeSteps.length}`);
    if (highRisk.length > 0) {
      console.log(pc.red(`⚠️  High-risk steps: ${highRisk.length}`));
    }
    console.log(pc.cyan('═'.repeat(60)));
    console.log();
  }

  /**
   * Wait for user approval
   */
  async waitForApproval(plan: AgentPlan, promptFn: () => Promise<boolean>): Promise<boolean> {
    // Auto-approve if all steps are reads and config allows
    const allReads = plan.steps.every(s => s.type === 'read');
    if (allReads && this.config.autoApproveReads) {
      console.log(pc.green('✓ Auto-approved (read-only operations)'));
      return true;
    }

    // Check for blocked actions
    const blocked = plan.steps.filter(s => s.riskLevel === 'blocked');
    if (blocked.length > 0) {
      console.log(pc.red('⛔ Plan contains blocked actions:'));
      blocked.forEach(s => console.log(pc.red(`   - ${s.description}`)));
      return false;
    }

    // Dry-run mode
    if (this.config.dryRun) {
      console.log(pc.yellow('🔍 DRY-RUN: Plan would execute but no changes will be made'));
      return false;
    }

    // Prompt user
    console.log(pc.yellow('⚠️  This plan contains write operations.'));
    return await promptFn();
  }

  /**
   * Execute a single step with rollback capture
   */
  async executeStep(
    step: AgentAction,
    executor: (tool: string, params: Record<string, unknown>) => Promise<unknown>
  ): Promise<{ success: boolean; result?: unknown; error?: string }> {
    
    if (this.cancelled) {
      return { success: false, error: 'Cancelled by user' };
    }

    this.audit.log({
      action: 'agent-step',
      command: `${step.tool}: ${step.description}`,
      riskLevel: step.riskLevel,
      approved: true,
      operationType: step.type === 'read' ? 'read' : 'write',
    });

    try {
      // Capture state for rollback (write operations only)
      if (step.type === 'write' && step.tool === 'write_file') {
        await this.captureFileState(step.params.file_path as string);
      }

      const result = await executor(step.tool, step.params);
      
      this.audit.log({
        action: 'agent-step-complete',
        command: step.tool,
        riskLevel: step.riskLevel,
        approved: true,
        result: 'success',
      });

      return { success: true, result };
    } catch (err) {
      const error = (err as Error).message;
      
      this.audit.log({
        action: 'agent-step-failed',
        command: step.tool,
        riskLevel: step.riskLevel,
        approved: true,
        result: 'failure',
      });

      return { success: false, error };
    }
  }

  /**
   * Capture file state for potential rollback
   */
  private async captureFileState(filePath: string): Promise<void> {
    const fs = await import('fs');
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        this.rollbackStack.push({
          actionId: `file-${Date.now()}`,
          type: 'file-restore',
          data: { path: filePath, content },
        });
      } else {
        this.rollbackStack.push({
          actionId: `file-${Date.now()}`,
          type: 'file-delete',
          data: { path: filePath },
        });
      }
    } catch {
      // Ignore capture errors
    }
  }

  /**
   * Rollback all changes
   */
  async rollback(): Promise<void> {
    console.log(pc.yellow('🔄 Rolling back changes...'));
    const fs = await import('fs');

    while (this.rollbackStack.length > 0) {
      const action = this.rollbackStack.pop()!;
      try {
        if (action.type === 'file-restore') {
          const { path, content } = action.data as { path: string; content: string };
          fs.writeFileSync(path, content);
          console.log(pc.green(`  ✓ Restored: ${path}`));
        } else if (action.type === 'file-delete') {
          const { path } = action.data as { path: string };
          if (fs.existsSync(path)) {
            fs.unlinkSync(path);
            console.log(pc.green(`  ✓ Deleted: ${path}`));
          }
        }
      } catch (err) {
        console.log(pc.red(`  ✗ Failed to rollback: ${(err as Error).message}`));
      }
    }

    this.audit.log({
      action: 'agent-rollback',
      riskLevel: 'low',
      approved: true,
      result: 'success',
    });
  }

  /**
   * Cancel execution
   */
  cancel(): void {
    this.cancelled = true;
    console.log(pc.yellow('⚠️  Agent execution cancelled'));
  }

  /**
   * Check if cancelled
   */
  isCancelled(): boolean {
    return this.cancelled;
  }

  /**
   * Get rollback stack size
   */
  getRollbackCount(): number {
    return this.rollbackStack.length;
  }

  private getRiskIcon(level: RiskLevel): string {
    switch (level) {
      case 'safe': return '🟢';
      case 'low': return '🟡';
      case 'medium': return '🟠';
      case 'high': return '🔴';
      case 'blocked': return '⛔';
    }
  }
}

/**
 * Classify action risk level
 */
export function classifyAction(tool: string, params: Record<string, unknown>): { type: AgentAction['type']; riskLevel: RiskLevel } {
  const opType = getOperationType(tool);
  
  // Read operations are safe
  if (opType === 'read') {
    return { type: 'read', riskLevel: 'safe' };
  }

  // Shell commands need validation
  if (tool === 'run_shell_command') {
    const cmd = params.command as string || '';
    const validation = validateCommand(cmd);
    return { type: 'shell', riskLevel: validation.riskLevel };
  }

  // Git operations
  if (tool.startsWith('git_')) {
    if (['git_status', 'git_log', 'git_diff', 'git_blame'].includes(tool)) {
      return { type: 'read', riskLevel: 'safe' };
    }
    return { type: 'git', riskLevel: 'medium' };
  }

  // Write operations
  if (opType === 'write') {
    return { type: 'write', riskLevel: 'low' };
  }

  return { type: 'write', riskLevel: 'low' };
}
