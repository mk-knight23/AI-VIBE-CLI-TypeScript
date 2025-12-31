/**
 * Tool Approval UI - Interactive tool permission management
 * Shows tool details, risk level, affected files, and approval options
 */

import pc from 'picocolors';
import inquirer from 'inquirer';
import { tools, ToolDefinition } from '../tools';
import { 
  PendingApproval, 
  getPendingApprovals, 
  approveOperation, 
  approveAll, 
  denyOperation, 
  denyAll,
  setPermission 
} from '../permissions';

// ============================================
// RISK LEVELS
// ============================================

export type RiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'blocked';

const RISK_INDICATORS: Record<RiskLevel, string> = {
  safe: pc.green('●'),
  low: pc.blue('●'),
  medium: pc.yellow('●'),
  high: pc.red('●'),
  blocked: pc.bgRed(pc.white(' BLOCKED '))
};

const RISK_LABELS: Record<RiskLevel, string> = {
  safe: pc.green('SAFE'),
  low: pc.blue('LOW'),
  medium: pc.yellow('MEDIUM'),
  high: pc.red('HIGH'),
  blocked: pc.bgRed(pc.white('BLOCKED'))
};

export function getToolRiskLevel(toolName: string, args?: Record<string, unknown>): RiskLevel {
  // Read-only tools are safe
  const readOnlyTools = [
    'list_directory', 'read_file', 'glob', 'search_file_content',
    'git_status', 'git_diff', 'git_log', 'git_blame',
    'get_file_info', 'get_project_info', 'check_dependency',
    'web_fetch', 'google_web_search'
  ];
  
  if (readOnlyTools.includes(toolName)) return 'safe';
  
  // High risk tools
  const highRiskTools = ['run_shell_command', 'delete_file'];
  if (highRiskTools.includes(toolName)) {
    // Check for dangerous patterns
    if (toolName === 'run_shell_command' && args?.command) {
      const cmd = String(args.command).toLowerCase();
      if (cmd.includes('rm -rf') || cmd.includes('sudo') || cmd.includes('chmod 777')) {
        return 'blocked';
      }
      if (cmd.includes('rm ') || cmd.includes('mv ') || cmd.includes('git push')) {
        return 'high';
      }
    }
    return 'high';
  }
  
  // Medium risk - write operations
  const mediumRiskTools = ['write_file', 'replace', 'append_to_file', 'create_directory', 'move_file', 'copy_file'];
  if (mediumRiskTools.includes(toolName)) return 'medium';
  
  // Low risk - everything else
  return 'low';
}

// ============================================
// APPROVAL PROMPT UI
// ============================================

export interface ApprovalPromptOptions {
  tool: ToolDefinition;
  args: Record<string, unknown>;
  sessionId: string;
  description?: string;
}

export interface ApprovalResult {
  approved: boolean;
  grantSession: boolean;
  denySession: boolean;
}

export async function showApprovalPrompt(options: ApprovalPromptOptions): Promise<ApprovalResult> {
  const { tool, args, sessionId, description } = options;
  const riskLevel = getToolRiskLevel(tool.name, args);
  
  // Blocked tools are never approved
  if (riskLevel === 'blocked') {
    console.log();
    console.log(pc.bgRed(pc.white(' BLOCKED ')));
    console.log(pc.red('This operation is blocked for safety reasons.'));
    return { approved: false, grantSession: false, denySession: true };
  }
  
  // Display tool info
  console.log();
  console.log(pc.gray('─'.repeat(60)));
  console.log(`${RISK_INDICATORS[riskLevel]} ${pc.bold(tool.displayName)} ${RISK_LABELS[riskLevel]}`);
  console.log(pc.gray('─'.repeat(60)));
  
  // Description
  if (description) {
    console.log(pc.cyan('Action:'), description);
  } else {
    console.log(pc.cyan('Action:'), tool.description);
  }
  
  // Parameters
  console.log(pc.cyan('Parameters:'));
  for (const [key, value] of Object.entries(args)) {
    const displayValue = typeof value === 'string' && value.length > 100 
      ? value.slice(0, 100) + '...' 
      : JSON.stringify(value);
    console.log(`  ${pc.yellow(key)}: ${displayValue}`);
  }
  
  // Affected files
  const affectedFiles = getAffectedFiles(tool.name, args);
  if (affectedFiles.length > 0) {
    console.log(pc.cyan('Affected files:'));
    for (const file of affectedFiles.slice(0, 5)) {
      console.log(`  ${pc.gray('•')} ${file}`);
    }
    if (affectedFiles.length > 5) {
      console.log(pc.gray(`  ... and ${affectedFiles.length - 5} more`));
    }
  }
  
  console.log(pc.gray('─'.repeat(60)));
  
  // Approval choices
  const choices = [
    { name: `${pc.green('✓')} Allow once`, value: 'once' },
    { name: `${pc.green('✓')} Allow for session`, value: 'session' },
    { name: `${pc.red('✗')} Deny once`, value: 'deny' },
    { name: `${pc.red('✗')} Deny for session`, value: 'deny-session' }
  ];
  
  // Add keyboard hint
  console.log(pc.gray('Shortcuts: Ctrl+A (allow) • Ctrl+D (deny) • Ctrl+S (allow session)'));
  
  const { decision } = await inquirer.prompt<{ decision: string }>([{
    type: 'list',
    name: 'decision',
    message: 'Approve this operation?',
    choices,
    default: 'once'
  }]);
  
  const result: ApprovalResult = {
    approved: decision === 'once' || decision === 'session',
    grantSession: decision === 'session',
    denySession: decision === 'deny-session'
  };
  
  // Update permissions
  if (result.grantSession) {
    setPermission(tool.name, 'allow_session', sessionId);
    console.log(pc.green(`✓ ${tool.displayName} allowed for this session`));
  } else if (result.denySession) {
    setPermission(tool.name, 'deny', sessionId);
    console.log(pc.yellow(`✗ ${tool.displayName} denied for this session`));
  }
  
  return result;
}

function getAffectedFiles(toolName: string, args: Record<string, unknown>): string[] {
  const files: string[] = [];
  
  if (args.file_path) files.push(String(args.file_path));
  if (args.path) files.push(String(args.path));
  if (args.source) files.push(String(args.source));
  if (args.destination) files.push(String(args.destination));
  if (args.dir_path) files.push(String(args.dir_path));
  
  return files;
}

// ============================================
// BATCH APPROVAL UI
// ============================================

export async function showBatchApprovalUI(sessionId: string): Promise<void> {
  const pending = getPendingApprovals(sessionId);
  
  if (pending.length === 0) {
    console.log(pc.gray('No pending approvals'));
    return;
  }
  
  console.log();
  console.log(pc.bold(pc.cyan(`PENDING APPROVALS (${pending.length})`)));
  console.log(pc.gray('─'.repeat(60)));
  
  // List all pending
  pending.forEach((op, i) => {
    const risk = RISK_INDICATORS[op.riskLevel];
    console.log(`  ${pc.cyan(`${i + 1}.`)} ${risk} ${pc.bold(op.tool)}`);
    console.log(`     ${pc.gray(op.description)}`);
    if (op.path) {
      console.log(`     ${pc.gray('Path:')} ${op.path}`);
    }
  });
  
  console.log(pc.gray('─'.repeat(60)));
  
  const choices = [
    { name: `${pc.green('✓')} Approve all (${pending.length})`, value: 'all' },
    { name: `${pc.green('✓')} Approve all for session`, value: 'all-session' },
    { name: `${pc.yellow('○')} Select individually`, value: 'select' },
    { name: `${pc.red('✗')} Deny all`, value: 'deny-all' },
    { name: `${pc.gray('→')} Skip (decide later)`, value: 'skip' }
  ];
  
  const { action } = await inquirer.prompt<{ action: string }>([{
    type: 'list',
    name: 'action',
    message: 'Action:',
    choices
  }]);
  
  switch (action) {
    case 'all':
      approveAll(sessionId, false);
      console.log(pc.green(`✓ Approved ${pending.length} operation(s)`));
      break;
      
    case 'all-session':
      approveAll(sessionId, true);
      console.log(pc.green(`✓ Approved ${pending.length} operation(s) for session`));
      break;
      
    case 'deny-all':
      denyAll(sessionId);
      console.log(pc.yellow(`✗ Denied ${pending.length} operation(s)`));
      break;
      
    case 'select':
      await showIndividualApprovalUI(sessionId, pending);
      break;
      
    case 'skip':
      console.log(pc.gray('Skipped - operations still pending'));
      break;
  }
}

async function showIndividualApprovalUI(sessionId: string, pending: PendingApproval[]): Promise<void> {
  for (const op of pending) {
    console.log();
    console.log(pc.gray('─'.repeat(60)));
    console.log(`${RISK_INDICATORS[op.riskLevel]} ${pc.bold(op.tool)} ${RISK_LABELS[op.riskLevel]}`);
    console.log(pc.gray(op.description));
    if (op.path) console.log(pc.gray(`Path: ${op.path}`));
    console.log(pc.gray('─'.repeat(60)));
    
    const { decision } = await inquirer.prompt<{ decision: string }>([{
      type: 'list',
      name: 'decision',
      message: 'Approve?',
      choices: [
        { name: pc.green('✓ Allow'), value: 'allow' },
        { name: pc.green('✓ Allow for session'), value: 'allow-session' },
        { name: pc.red('✗ Deny'), value: 'deny' },
        { name: pc.red('✗ Deny for session'), value: 'deny-session' }
      ]
    }]);
    
    switch (decision) {
      case 'allow':
        approveOperation(sessionId, op.id, false);
        console.log(pc.green('✓ Approved'));
        break;
      case 'allow-session':
        approveOperation(sessionId, op.id, true);
        console.log(pc.green('✓ Approved for session'));
        break;
      case 'deny':
        denyOperation(sessionId, op.id, false);
        console.log(pc.yellow('✗ Denied'));
        break;
      case 'deny-session':
        denyOperation(sessionId, op.id, true);
        console.log(pc.yellow('✗ Denied for session'));
        break;
    }
  }
}

// ============================================
// INLINE APPROVAL (for streaming)
// ============================================

export function formatInlineApproval(tool: ToolDefinition, args: Record<string, unknown>): string {
  const riskLevel = getToolRiskLevel(tool.name, args);
  const risk = RISK_INDICATORS[riskLevel];
  
  let preview = '';
  if (args.file_path) preview = String(args.file_path);
  else if (args.path) preview = String(args.path);
  else if (args.command) preview = String(args.command).slice(0, 40);
  
  return `${risk} ${pc.bold(tool.displayName)} ${pc.gray(preview)} ${pc.gray('[y/n/s]')}`;
}

export async function quickApproval(tool: ToolDefinition, args: Record<string, unknown>): Promise<boolean> {
  const line = formatInlineApproval(tool, args);
  
  const { approve } = await inquirer.prompt<{ approve: boolean }>([{
    type: 'confirm',
    name: 'approve',
    message: line,
    default: true
  }]);
  
  return approve;
}

// ============================================
// TOOL EXECUTION DISPLAY
// ============================================

export function showToolExecution(tool: ToolDefinition, args: Record<string, unknown>, success: boolean, duration?: number): void {
  const status = success ? pc.green('✓') : pc.red('✗');
  const time = duration ? pc.gray(` (${duration}ms)`) : '';
  
  let preview = '';
  if (args.file_path) preview = String(args.file_path);
  else if (args.path) preview = String(args.path);
  else if (args.command) preview = String(args.command).slice(0, 50);
  
  console.log(`  ${status} ${tool.displayName} ${pc.gray(preview)}${time}`);
}

export function showFileOperation(type: 'read' | 'write' | 'delete', path: string, success: boolean): void {
  const icons = { read: '📖', write: '✏️', delete: '🗑️' };
  const status = success ? pc.green('✓') : pc.red('✗');
  console.log(`  ${status} ${icons[type]} ${path}`);
}

export function showCommandExecution(command: string, success: boolean, duration?: number): void {
  const status = success ? pc.green('✓') : pc.red('✗');
  const time = duration ? pc.gray(` (${duration}ms)`) : '';
  const cmd = command.length > 60 ? command.slice(0, 60) + '...' : command;
  console.log(`  ${status} ${pc.cyan('$')} ${cmd}${time}`);
}
