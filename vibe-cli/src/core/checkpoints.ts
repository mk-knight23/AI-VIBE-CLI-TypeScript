/**
 * Checkpoint System - Track and restore file changes
 * Provides git-like checkpoint management for file edits
 */

import * as fs from 'fs';
import * as path from 'path';
import { getDb, generateId } from '../storage/database';

export interface FileChange {
  path: string;
  type: 'create' | 'modify' | 'delete';
  oldContent?: string;
  newContent?: string;
  timestamp: number;
}

export interface Checkpoint {
  id: string;
  sessionId: string;
  name?: string;
  changes: FileChange[];
  createdAt: number;
}

// In-memory tracking of pending changes (not yet checkpointed)
const pendingChanges: Map<string, FileChange[]> = new Map();

/**
 * Initialize checkpoint tables
 */
export function initCheckpointDb(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS checkpoints (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      name TEXT,
      changes TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_checkpoints_session ON checkpoints(session_id);
  `);
}

/**
 * Track a file change before it happens
 */
export function trackChange(sessionId: string, filePath: string, type: 'create' | 'modify' | 'delete'): void {
  const absPath = path.resolve(process.cwd(), filePath);
  
  const change: FileChange = {
    path: absPath,
    type,
    timestamp: Date.now()
  };

  // Capture old content for modify/delete
  if ((type === 'modify' || type === 'delete') && fs.existsSync(absPath)) {
    change.oldContent = fs.readFileSync(absPath, 'utf-8');
  }

  if (!pendingChanges.has(sessionId)) {
    pendingChanges.set(sessionId, []);
  }
  pendingChanges.get(sessionId)!.push(change);
}

/**
 * Update tracked change with new content after write
 */
export function updateChangeContent(sessionId: string, filePath: string, newContent: string): void {
  const absPath = path.resolve(process.cwd(), filePath);
  const changes = pendingChanges.get(sessionId);
  if (!changes) return;

  const change = changes.find(c => c.path === absPath);
  if (change) {
    change.newContent = newContent;
  }
}

/**
 * Create a checkpoint from pending changes
 */
export function createCheckpoint(sessionId: string, name?: string): Checkpoint | null {
  initCheckpointDb();
  
  const changes = pendingChanges.get(sessionId);
  if (!changes || changes.length === 0) return null;

  const checkpoint: Checkpoint = {
    id: generateId('ckpt-'),
    sessionId,
    name,
    changes: [...changes],
    createdAt: Date.now()
  };

  const db = getDb();
  db.prepare(`
    INSERT INTO checkpoints (id, session_id, name, changes, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(checkpoint.id, sessionId, name, JSON.stringify(changes), checkpoint.createdAt);

  // Clear pending changes
  pendingChanges.set(sessionId, []);

  return checkpoint;
}

/**
 * List checkpoints for a session
 */
export function listCheckpoints(sessionId: string): Checkpoint[] {
  initCheckpointDb();
  const db = getDb();
  
  const rows = db.prepare(`
    SELECT * FROM checkpoints WHERE session_id = ? ORDER BY created_at DESC
  `).all(sessionId) as any[];

  return rows.map(row => ({
    id: row.id,
    sessionId: row.session_id,
    name: row.name,
    changes: JSON.parse(row.changes),
    createdAt: row.created_at
  }));
}

/**
 * Get a specific checkpoint
 */
export function getCheckpoint(checkpointId: string): Checkpoint | null {
  initCheckpointDb();
  const db = getDb();
  
  const row = db.prepare('SELECT * FROM checkpoints WHERE id = ?').get(checkpointId) as any;
  if (!row) return null;

  return {
    id: row.id,
    sessionId: row.session_id,
    name: row.name,
    changes: JSON.parse(row.changes),
    createdAt: row.created_at
  };
}

/**
 * Revert a checkpoint (restore files to previous state)
 */
export function revertCheckpoint(checkpointId: string): { reverted: string[]; errors: string[] } {
  const checkpoint = getCheckpoint(checkpointId);
  if (!checkpoint) {
    return { reverted: [], errors: ['Checkpoint not found'] };
  }

  const reverted: string[] = [];
  const errors: string[] = [];

  // Process changes in reverse order
  for (const change of [...checkpoint.changes].reverse()) {
    try {
      if (change.type === 'create') {
        // Revert create = delete the file
        if (fs.existsSync(change.path)) {
          fs.unlinkSync(change.path);
          reverted.push(`Deleted: ${change.path}`);
        }
      } else if (change.type === 'modify' && change.oldContent !== undefined) {
        // Revert modify = restore old content
        fs.writeFileSync(change.path, change.oldContent, 'utf-8');
        reverted.push(`Restored: ${change.path}`);
      } else if (change.type === 'delete' && change.oldContent !== undefined) {
        // Revert delete = recreate file
        const dir = path.dirname(change.path);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(change.path, change.oldContent, 'utf-8');
        reverted.push(`Recreated: ${change.path}`);
      }
    } catch (err: any) {
      errors.push(`Failed to revert ${change.path}: ${err.message}`);
    }
  }

  return { reverted, errors };
}

/**
 * Get pending changes for a session
 */
export function getPendingChanges(sessionId: string): FileChange[] {
  return pendingChanges.get(sessionId) || [];
}

/**
 * Clear pending changes without checkpointing
 */
export function clearPendingChanges(sessionId: string): void {
  pendingChanges.delete(sessionId);
}

/**
 * Get diff summary for pending changes
 */
export function getDiffSummary(sessionId: string): string {
  const changes = pendingChanges.get(sessionId);
  if (!changes || changes.length === 0) {
    return 'No pending changes';
  }

  const lines: string[] = [`${changes.length} pending change(s):`];
  
  for (const change of changes) {
    const relPath = path.relative(process.cwd(), change.path);
    const icon = change.type === 'create' ? '+' : change.type === 'delete' ? '-' : '~';
    lines.push(`  ${icon} ${relPath}`);
  }

  return lines.join('\n');
}

/**
 * Auto-checkpoint after N changes
 */
export function autoCheckpointIfNeeded(sessionId: string, threshold: number = 5): Checkpoint | null {
  const changes = pendingChanges.get(sessionId);
  if (!changes || changes.length < threshold) return null;
  
  return createCheckpoint(sessionId, `auto-${Date.now()}`);
}

/**
 * Generate unified diff for a file change
 */
export function getUnifiedDiff(change: FileChange): string {
  const oldLines = (change.oldContent || '').split('\n');
  const newLines = (change.newContent || '').split('\n');
  const relPath = path.relative(process.cwd(), change.path);
  
  const lines: string[] = [
    `--- a/${relPath}`,
    `+++ b/${relPath}`
  ];

  // Simple diff: show removed and added lines
  let i = 0, j = 0;
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      lines.push(` ${oldLines[i]}`);
      i++; j++;
    } else if (i < oldLines.length && (j >= newLines.length || oldLines[i] !== newLines[j])) {
      lines.push(`-${oldLines[i]}`);
      i++;
    } else {
      lines.push(`+${newLines[j]}`);
      j++;
    }
  }

  return lines.join('\n');
}

/**
 * Get full diff for all pending changes
 */
export function getFullDiff(sessionId: string): string {
  const changes = pendingChanges.get(sessionId);
  if (!changes || changes.length === 0) return 'No pending changes';

  return changes.map(c => getUnifiedDiff(c)).join('\n\n');
}

/**
 * Get diff for a specific file
 */
export function getFileDiff(sessionId: string, filePath: string): string | null {
  const changes = pendingChanges.get(sessionId);
  if (!changes) return null;

  const absPath = path.resolve(process.cwd(), filePath);
  const change = changes.find(c => c.path === absPath);
  if (!change) return null;

  return getUnifiedDiff(change);
}
