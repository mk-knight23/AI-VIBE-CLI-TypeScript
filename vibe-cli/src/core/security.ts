/**
 * Security utilities for VIBE CLI
 * Provides command validation, secret masking, and audit logging
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// COMMAND ALLOW/DENY LISTS
// ============================================

// ALLOW LIST - Commands that are always safe (read-only)
const ALLOWED_COMMANDS = [
  'ls', 'cat', 'head', 'tail', 'grep', 'find', 'echo', 'pwd', 
  'whoami', 'date', 'which', 'wc', 'sort', 'uniq', 'diff',
  'git status', 'git log', 'git diff', 'git branch', 'git show',
  'npm list', 'npm outdated', 'npm audit', 'npm view',
  'node --version', 'npm --version', 'python --version',
  'env', 'printenv', 'hostname', 'uname'
];

// DENY LIST - Commands that are NEVER allowed
const BLOCKED_COMMANDS = [
  /rm\s+-rf\s+[\/~]/,           // rm -rf / or ~
  /rm\s+-rf\s+\*/,              // rm -rf *
  /mkfs/,                        // Format filesystem
  /dd\s+if=/,                    // Direct disk write
  /:\(\)\{.*:\|:.*\};:/,        // Fork bomb
  /chmod\s+777/,                 // Overly permissive
  /chmod\s+-R\s+777/,
  />\s*\/dev\/sd/,              // Write to disk device
  /curl.*\|\s*(ba)?sh/,         // Pipe to shell
  /wget.*\|\s*(ba)?sh/,
  /eval\s*\(/,                   // Eval injection
  /sudo\s+rm/,                   // Sudo rm
  /format\s+[a-z]:/i,           // Windows format
  /shutdown/,                    // System shutdown
  /reboot/,                      // System reboot
  /init\s+0/,                    // Halt system
  />\s*\/etc\//,                // Write to /etc
  /rm\s+.*\/etc\//,             // Delete from /etc
];

// Commands requiring explicit approval (high risk)
const APPROVAL_REQUIRED = [
  /npm\s+publish/,
  /git\s+push.*--force/,
  /git\s+reset.*--hard/,
  /docker\s+rm/,
  /kubectl\s+delete/,
  /aws\s+.*--recursive/,
  /aws\s+.*delete/,
  /rm\s+-r/,
  /DROP\s+TABLE/i,
  /DELETE\s+FROM/i,
  /TRUNCATE/i,
  /\$\([^)]+\)/,                 // Command substitution $(...)
  /`[^`]+`/,                     // Backtick substitution `...`
];

// ============================================
// READ vs WRITE SEPARATION
// ============================================

// Read-only operations (no side effects)
const READ_OPERATIONS = [
  'list_directory', 'read_file', 'glob', 'search_file_content',
  'git_status', 'git_diff', 'git_log', 'git_blame',
  'rg_search', 'list_files_rg', 'get_file_info',
  'check_dependency', 'get_project_info',
  'analyze_code_quality', 'security_scan', 'performance_benchmark'
];

// Write operations (have side effects)
const WRITE_OPERATIONS = [
  'write_file', 'replace', 'create_directory', 'delete_file',
  'move_file', 'copy_file', 'append_to_file',
  'run_shell_command', 'run_tests', 'run_lint',
  'smart_refactor', 'generate_tests', 'generate_documentation', 'migrate_code'
];

// ============================================
// SECRET PATTERNS
// ============================================

const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/g,                    // OpenAI-style keys
  /ghp_[a-zA-Z0-9]{36}/g,                    // GitHub tokens
  /gho_[a-zA-Z0-9]{36}/g,
  /github_pat_[a-zA-Z0-9_]{22,}/g,
  /xox[baprs]-[a-zA-Z0-9-]+/g,               // Slack tokens
  /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*/g,   // JWTs
  /AKIA[0-9A-Z]{16}/g,                        // AWS Access Keys
  /[a-zA-Z0-9+/]{40}/g,                       // Generic 40-char secrets
  /password\s*[=:]\s*['"][^'"]+['"]/gi,      // password = "..."
  /api[_-]?key\s*[=:]\s*['"][^'"]+['"]/gi,   // api_key = "..."
  /secret\s*[=:]\s*['"][^'"]+['"]/gi,        // secret = "..."
  /Bearer\s+[a-zA-Z0-9._-]+/g,               // Bearer tokens
  /private_key.*-----/gi,                     // Private keys
];

// ============================================
// TYPES
// ============================================

export type RiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'blocked';
export type OperationType = 'read' | 'write' | 'unknown';

export interface CommandValidation {
  allowed: boolean;
  riskLevel: RiskLevel;
  reason?: string;
  requiresApproval: boolean;
  operationType: OperationType;
}

export interface AuditEntry {
  timestamp: string;
  action: string;
  command?: string;
  riskLevel: RiskLevel;
  approved: boolean;
  user?: string;
  result?: 'success' | 'failure' | 'blocked';
  operationType?: OperationType;
  dryRun?: boolean;
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Check if a tool is read-only
 */
export function isReadOnlyTool(toolName: string): boolean {
  return READ_OPERATIONS.includes(toolName);
}

/**
 * Check if a tool has write side effects
 */
export function isWriteTool(toolName: string): boolean {
  return WRITE_OPERATIONS.includes(toolName);
}

/**
 * Get operation type for a tool
 */
export function getOperationType(toolName: string): OperationType {
  if (READ_OPERATIONS.includes(toolName)) return 'read';
  if (WRITE_OPERATIONS.includes(toolName)) return 'write';
  return 'unknown';
}

/**
 * Check if command is in allow list
 */
export function isAllowedCommand(command: string): boolean {
  const trimmed = command.trim().toLowerCase();
  return ALLOWED_COMMANDS.some(allowed => 
    trimmed === allowed || trimmed.startsWith(allowed + ' ')
  );
}

/**
 * Validate a shell command for safety
 */
export function validateCommand(command: string): CommandValidation {
  const trimmed = command.trim().toLowerCase();
  
  // Check blocked patterns first (DENY LIST)
  for (const pattern of BLOCKED_COMMANDS) {
    if (pattern.test(command)) {
      return {
        allowed: false,
        riskLevel: 'blocked',
        reason: `Blocked: matches dangerous pattern`,
        requiresApproval: false,
        operationType: 'write'
      };
    }
  }
  
  // Check approval-required patterns BEFORE allow list
  // (command substitution in safe commands is still dangerous)
  for (const pattern of APPROVAL_REQUIRED) {
    if (pattern.test(command)) {
      return {
        allowed: true,
        riskLevel: 'high',
        reason: 'Requires explicit approval',
        requiresApproval: true,
        operationType: 'write'
      };
    }
  }
  
  // Check allow list (always safe - only if no dangerous patterns)
  if (isAllowedCommand(command)) {
    return {
      allowed: true,
      riskLevel: 'safe',
      requiresApproval: false,
      operationType: 'read'
    };
  }
  
  // Check for write operations
  if (/\b(rm|mv|cp|chmod|chown|write|delete|drop|truncate)\b/.test(trimmed)) {
    return {
      allowed: true,
      riskLevel: 'medium',
      requiresApproval: true,
      operationType: 'write'
    };
  }
  
  // Read-only operations are safe
  if (/^(ls|cat|head|tail|grep|find|echo|pwd|whoami|date|which)\b/.test(trimmed)) {
    return {
      allowed: true,
      riskLevel: 'safe',
      requiresApproval: false,
      operationType: 'read'
    };
  }
  
  // Default: low risk, approval recommended
  return {
    allowed: true,
    riskLevel: 'low',
    requiresApproval: true,
    operationType: 'unknown'
  };
}

/**
 * Validate tool execution based on operation type
 */
export function validateToolExecution(toolName: string, dryRun: boolean = false): {
  allowed: boolean;
  reason?: string;
  riskLevel: RiskLevel;
} {
  const opType = getOperationType(toolName);
  
  // In dry-run mode, block all write operations
  if (dryRun && opType === 'write') {
    return {
      allowed: false,
      reason: 'Write operations blocked in dry-run mode',
      riskLevel: 'medium'
    };
  }
  
  // Read operations are always allowed
  if (opType === 'read') {
    return { allowed: true, riskLevel: 'safe' };
  }
  
  // Write operations need approval
  return {
    allowed: true,
    riskLevel: opType === 'write' ? 'medium' : 'low'
  };
}

// ============================================
// SECRET HANDLING
// ============================================

/**
 * Mask secrets in text for safe logging
 */
export function maskSecrets(text: string): string {
  let masked = text;
  
  for (const pattern of SECRET_PATTERNS) {
    masked = masked.replace(pattern, (match) => {
      if (match.length <= 8) return '***';
      return match.slice(0, 4) + '***' + match.slice(-4);
    });
  }
  
  return masked;
}

/**
 * Check if text contains potential secrets
 */
export function containsSecrets(text: string): boolean {
  return SECRET_PATTERNS.some(pattern => pattern.test(text));
}

// ============================================
// AUDIT LOGGING
// ============================================

export interface AuditStats {
  totalCalls: number;
  byTool: Record<string, number>;
  byRisk: Record<RiskLevel, number>;
  approved: number;
  denied: number;
  blocked: number;
}

export class AuditLogger {
  private logPath: string;
  private enabled: boolean;
  private sessionStats: AuditStats;
  
  constructor(workspaceDir: string = process.cwd()) {
    this.logPath = path.join(workspaceDir, '.vibe', 'audit.log');
    this.enabled = process.env.VIBE_AUDIT !== 'false';
    this.sessionStats = this.initStats();
  }

  private initStats(): AuditStats {
    return {
      totalCalls: 0,
      byTool: {},
      byRisk: { safe: 0, low: 0, medium: 0, high: 0, blocked: 0 },
      approved: 0,
      denied: 0,
      blocked: 0
    };
  }
  
  log(entry: Omit<AuditEntry, 'timestamp'>): void {
    // Update session stats
    this.sessionStats.totalCalls++;
    if (entry.action) {
      this.sessionStats.byTool[entry.action] = (this.sessionStats.byTool[entry.action] || 0) + 1;
    }
    this.sessionStats.byRisk[entry.riskLevel]++;
    if (entry.approved) this.sessionStats.approved++;
    else if (entry.result === 'blocked') this.sessionStats.blocked++;
    else this.sessionStats.denied++;

    if (!this.enabled) return;
    
    const fullEntry: AuditEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      dryRun: isDryRun()
    };
    
    try {
      const dir = path.dirname(this.logPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Mask any secrets in the command
      if (fullEntry.command) {
        fullEntry.command = maskSecrets(fullEntry.command);
      }
      
      fs.appendFileSync(this.logPath, JSON.stringify(fullEntry) + '\n');
    } catch {
      // Silently fail - don't break execution for audit logging
    }
  }

  getStats(): AuditStats {
    return { ...this.sessionStats };
  }

  resetStats(): void {
    this.sessionStats = this.initStats();
  }
  
  getRecent(count: number = 50): AuditEntry[] {
    try {
      if (!fs.existsSync(this.logPath)) return [];
      
      const content = fs.readFileSync(this.logPath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      
      return lines
        .slice(-count)
        .map(line => JSON.parse(line))
        .reverse();
    } catch {
      return [];
    }
  }

  getByTool(toolName: string, count: number = 20): AuditEntry[] {
    return this.getRecent(500).filter(e => e.action === toolName).slice(0, count);
  }

  getByRisk(level: RiskLevel, count: number = 20): AuditEntry[] {
    return this.getRecent(500).filter(e => e.riskLevel === level).slice(0, count);
  }

  exportLog(format: 'json' | 'csv' = 'json'): string {
    const entries = this.getRecent(1000);
    if (format === 'csv') {
      const header = 'timestamp,action,command,riskLevel,approved,result\n';
      const rows = entries.map(e => 
        `${e.timestamp},${e.action},${(e.command || '').replace(/,/g, ';')},${e.riskLevel},${e.approved},${e.result || ''}`
      ).join('\n');
      return header + rows;
    }
    return JSON.stringify(entries, null, 2);
  }
  
  clear(): void {
    try {
      if (fs.existsSync(this.logPath)) {
        fs.unlinkSync(this.logPath);
      }
      this.resetStats();
    } catch {
      // Ignore
    }
  }
}

// Singleton audit logger
let _auditLogger: AuditLogger | null = null;
export function getAuditLogger(): AuditLogger {
  if (!_auditLogger) {
    _auditLogger = new AuditLogger();
  }
  return _auditLogger;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Dry-run mode checker
 */
export function isDryRun(): boolean {
  return process.env.VIBE_DRY_RUN === 'true' || process.argv.includes('--dry-run');
}

/**
 * Get risk indicator emoji
 */
export function getRiskIndicator(level: RiskLevel): string {
  switch (level) {
    case 'safe': return '🟢';
    case 'low': return '🟡';
    case 'medium': return '🟠';
    case 'high': return '🔴';
    case 'blocked': return '⛔';
  }
}

/**
 * Format security summary for display
 */
export function formatSecuritySummary(validation: CommandValidation): string {
  const indicator = getRiskIndicator(validation.riskLevel);
  const opType = validation.operationType === 'read' ? '📖 READ' : 
                 validation.operationType === 'write' ? '✏️ WRITE' : '❓ UNKNOWN';
  
  let summary = `${indicator} Risk: ${validation.riskLevel.toUpperCase()} | ${opType}`;
  
  if (validation.requiresApproval) {
    summary += ' | ⚠️ Approval required';
  }
  
  if (!validation.allowed) {
    summary += ' | ⛔ BLOCKED';
  }
  
  if (isDryRun()) {
    summary += ' | 🔍 DRY-RUN';
  }
  
  return summary;
}

/**
 * Get lists for display
 */
export function getSecurityLists() {
  return {
    allowedCommands: ALLOWED_COMMANDS,
    readOperations: READ_OPERATIONS,
    writeOperations: WRITE_OPERATIONS
  };
}
