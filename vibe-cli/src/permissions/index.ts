/**
 * Permission System - 4-level tool permission management
 * Supports: tool-level, path-based, and batch operation permissions
 */

import { getDb, generateId } from '../storage/database';

export type PermissionLevel = 'ask' | 'allow_once' | 'allow_session' | 'deny';

export interface PermissionRule {
  id: string;
  tool: string;
  pathPattern?: string;
  level: PermissionLevel;
  sessionId?: string;
  createdAt: number;
}

// Default rules for common tools
const DEFAULT_RULES: Record<string, PermissionLevel> = {
  'list_directory': 'allow_session',
  'read_file': 'allow_session',
  'glob': 'allow_session',
  'search_file_content': 'allow_session',
  'rg_search': 'allow_session',
  'git_status': 'allow_session',
  'git_diff': 'allow_session',
  'git_log': 'allow_session',
  'git_blame': 'allow_session',
  'get_file_info': 'allow_session',
  'get_project_info': 'allow_session',
  'check_dependency': 'allow_session',
  'write_file': 'ask',
  'replace': 'ask',
  'append_to_file': 'ask',
  'create_directory': 'ask',
  'delete_file': 'ask',
  'move_file': 'ask',
  'copy_file': 'ask',
  'run_shell_command': 'ask',
};

// Sensitive paths that always require approval
const SENSITIVE_PATHS = [
  /^\/etc\//,
  /^\/usr\//,
  /^\/var\//,
  /^~\/\./,
  /\.env/,
  /\.ssh/,
  /\.aws/,
  /credentials/i,
  /secrets?/i,
  /password/i,
  /\.git\/config/,
];

// In-memory cache for session permissions
const sessionCache: Map<string, Map<string, PermissionLevel>> = new Map();

// Path-based permission cache
const pathPermissionCache: Map<string, Map<string, PermissionLevel>> = new Map();

export function getPermission(tool: string, sessionId?: string, path?: string): PermissionLevel {
  // Check if path is sensitive - always ask
  if (path && isSensitivePath(path)) {
    return 'ask';
  }

  // Check path-specific permission
  if (path && sessionId) {
    const pathKey = `${tool}:${path}`;
    const pathPerms = pathPermissionCache.get(sessionId);
    if (pathPerms?.has(pathKey)) {
      return pathPerms.get(pathKey)!;
    }
  }

  // Check session cache
  if (sessionId) {
    const sessionPerms = sessionCache.get(sessionId);
    if (sessionPerms?.has(tool)) {
      return sessionPerms.get(tool)!;
    }
  }

  // Check database for persistent rules
  const db = getDb();
  const rule = db.prepare(`
    SELECT level FROM permissions 
    WHERE tool = ? AND (session_id IS NULL OR session_id = ?)
    ORDER BY session_id DESC NULLS LAST LIMIT 1
  `).get(tool, sessionId) as { level: PermissionLevel } | undefined;

  if (rule) return rule.level;

  // Fall back to defaults
  return DEFAULT_RULES[tool] || 'ask';
}

export function setPermission(tool: string, level: PermissionLevel, sessionId?: string, path?: string): void {
  // Path-specific permission
  if (path && sessionId) {
    if (!pathPermissionCache.has(sessionId)) {
      pathPermissionCache.set(sessionId, new Map());
    }
    pathPermissionCache.get(sessionId)!.set(`${tool}:${path}`, level);
    return;
  }

  // Update session cache
  if (sessionId && (level === 'allow_session' || level === 'deny')) {
    if (!sessionCache.has(sessionId)) {
      sessionCache.set(sessionId, new Map());
    }
    sessionCache.get(sessionId)!.set(tool, level);
  }

  // Persist to database (except allow_once which is transient)
  if (level !== 'allow_once') {
    const db = getDb();
    db.prepare(`
      INSERT OR REPLACE INTO permissions (id, tool, level, session_id, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(generateId('perm-'), tool, level, sessionId, Date.now());
  }
}

export function clearSessionPermissions(sessionId: string): void {
  sessionCache.delete(sessionId);
  pathPermissionCache.delete(sessionId);
  const db = getDb();
  db.prepare('DELETE FROM permissions WHERE session_id = ?').run(sessionId);
}

export function shouldPrompt(tool: string, sessionId?: string, path?: string): boolean {
  const level = getPermission(tool, sessionId, path);
  return level === 'ask';
}

export function isDenied(tool: string, sessionId?: string, path?: string): boolean {
  return getPermission(tool, sessionId, path) === 'deny';
}

export function isAllowed(tool: string, sessionId?: string, path?: string): boolean {
  const level = getPermission(tool, sessionId, path);
  return level === 'allow_session' || level === 'allow_once';
}

export function isSensitivePath(path: string): boolean {
  return SENSITIVE_PATHS.some(pattern => pattern.test(path));
}

// Batch operation permission check
export interface BatchPermissionResult {
  allowed: string[];
  denied: string[];
  needsApproval: string[];
}

export function checkBatchPermissions(
  operations: Array<{ tool: string; path?: string }>,
  sessionId?: string
): BatchPermissionResult {
  const result: BatchPermissionResult = {
    allowed: [],
    denied: [],
    needsApproval: []
  };

  for (const op of operations) {
    const key = op.path ? `${op.tool}:${op.path}` : op.tool;
    
    if (isDenied(op.tool, sessionId, op.path)) {
      result.denied.push(key);
    } else if (isAllowed(op.tool, sessionId, op.path)) {
      result.allowed.push(key);
    } else {
      result.needsApproval.push(key);
    }
  }

  return result;
}

// Grant batch permissions
export function grantBatchPermissions(
  operations: Array<{ tool: string; path?: string }>,
  level: PermissionLevel,
  sessionId?: string
): void {
  for (const op of operations) {
    setPermission(op.tool, level, sessionId, op.path);
  }
}

// List all permissions for a session
export function listPermissions(sessionId?: string): Array<{ tool: string; level: PermissionLevel }> {
  const result: Array<{ tool: string; level: PermissionLevel }> = [];
  
  // From session cache
  if (sessionId && sessionCache.has(sessionId)) {
    for (const [tool, level] of sessionCache.get(sessionId)!) {
      result.push({ tool, level });
    }
  }

  // From database
  const db = getDb();
  const rows = db.prepare(`
    SELECT tool, level FROM permissions 
    WHERE session_id IS NULL OR session_id = ?
  `).all(sessionId) as Array<{ tool: string; level: PermissionLevel }>;

  for (const row of rows) {
    if (!result.find(r => r.tool === row.tool)) {
      result.push(row);
    }
  }

  return result;
}

// ============================================
// BATCH APPROVAL SYSTEM (v10.1)
// ============================================

export interface PendingApproval {
  id: string;
  tool: string;
  path?: string;
  args?: Record<string, unknown>;
  description: string;
  riskLevel: 'safe' | 'low' | 'medium' | 'high';
}

// Queue of pending approvals
const approvalQueue: Map<string, PendingApproval[]> = new Map();

/**
 * Add operation to approval queue
 */
export function queueForApproval(
  sessionId: string,
  tool: string,
  description: string,
  riskLevel: 'safe' | 'low' | 'medium' | 'high' = 'medium',
  path?: string,
  args?: Record<string, unknown>
): string {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  
  if (!approvalQueue.has(sessionId)) {
    approvalQueue.set(sessionId, []);
  }
  
  approvalQueue.get(sessionId)!.push({
    id,
    tool,
    path,
    args,
    description,
    riskLevel
  });
  
  return id;
}

/**
 * Get pending approvals for session
 */
export function getPendingApprovals(sessionId: string): PendingApproval[] {
  return approvalQueue.get(sessionId) || [];
}

/**
 * Approve specific operation
 */
export function approveOperation(sessionId: string, operationId: string, grantSession: boolean = false): boolean {
  const queue = approvalQueue.get(sessionId);
  if (!queue) return false;
  
  const idx = queue.findIndex(op => op.id === operationId);
  if (idx === -1) return false;
  
  const op = queue[idx];
  queue.splice(idx, 1);
  
  // Grant session permission if requested
  if (grantSession) {
    setPermission(op.tool, 'allow_session', sessionId, op.path);
  }
  
  return true;
}

/**
 * Approve all pending operations
 */
export function approveAll(sessionId: string, grantSession: boolean = false): number {
  const queue = approvalQueue.get(sessionId);
  if (!queue || queue.length === 0) return 0;
  
  const count = queue.length;
  
  if (grantSession) {
    for (const op of queue) {
      setPermission(op.tool, 'allow_session', sessionId, op.path);
    }
  }
  
  approvalQueue.set(sessionId, []);
  return count;
}

/**
 * Deny specific operation
 */
export function denyOperation(sessionId: string, operationId: string, denySession: boolean = false): boolean {
  const queue = approvalQueue.get(sessionId);
  if (!queue) return false;
  
  const idx = queue.findIndex(op => op.id === operationId);
  if (idx === -1) return false;
  
  const op = queue[idx];
  queue.splice(idx, 1);
  
  if (denySession) {
    setPermission(op.tool, 'deny', sessionId, op.path);
  }
  
  return true;
}

/**
 * Deny all pending operations
 */
export function denyAll(sessionId: string): number {
  const queue = approvalQueue.get(sessionId);
  if (!queue) return 0;
  
  const count = queue.length;
  approvalQueue.set(sessionId, []);
  return count;
}

/**
 * Clear approval queue for session
 */
export function clearApprovalQueue(sessionId: string): void {
  approvalQueue.delete(sessionId);
}

/**
 * Format pending approvals for display
 */
export function formatPendingApprovals(sessionId: string): string {
  const pending = getPendingApprovals(sessionId);
  if (pending.length === 0) return 'No pending approvals';
  
  const lines = [`${pending.length} operation(s) awaiting approval:\n`];
  
  pending.forEach((op, i) => {
    const risk = op.riskLevel === 'high' ? '🔴' : op.riskLevel === 'medium' ? '🟠' : '🟡';
    lines.push(`  ${i + 1}. ${risk} ${op.tool}: ${op.description}`);
    if (op.path) lines.push(`     Path: ${op.path}`);
  });
  
  lines.push('\nCommands: approve <n|all>, deny <n|all>, skip');
  return lines.join('\n');
}
