/**
 * Session Storage - SQLite-backed session management
 */

import { getDb, generateId } from './database';

export interface Session {
  id: string;
  createdAt: number;
  updatedAt: number;
  parentId?: string;
  model?: string;
  provider?: string;
  tokenCount: number;
}

export function createSession(model?: string, provider?: string, parentId?: string): Session {
  const db = getDb();
  const now = Date.now();
  const session: Session = {
    id: generateId('sess-'),
    createdAt: now,
    updatedAt: now,
    parentId,
    model,
    provider,
    tokenCount: 0
  };

  db.prepare(`
    INSERT INTO sessions (id, created_at, updated_at, parent_id, model, provider, token_count)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(session.id, session.createdAt, session.updatedAt, session.parentId, session.model, session.provider, session.tokenCount);

  return session;
}

export function getSession(id: string): Session | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as any;
  if (!row) return null;
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    parentId: row.parent_id,
    model: row.model,
    provider: row.provider,
    tokenCount: row.token_count
  };
}

export function getLatestSession(): Session | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM sessions ORDER BY updated_at DESC LIMIT 1').get() as any;
  if (!row) return null;
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    parentId: row.parent_id,
    model: row.model,
    provider: row.provider,
    tokenCount: row.token_count
  };
}

export function updateSessionTokens(id: string, tokenCount: number): void {
  const db = getDb();
  db.prepare('UPDATE sessions SET token_count = ?, updated_at = ? WHERE id = ?')
    .run(tokenCount, Date.now(), id);
}

export function listSessions(limit: number = 20): Session[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM sessions ORDER BY updated_at DESC LIMIT ?').all(limit) as any[];
  return rows.map(row => ({
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    parentId: row.parent_id,
    model: row.model,
    provider: row.provider,
    tokenCount: row.token_count
  }));
}
