/**
 * Message Storage - SQLite-backed message persistence
 */

import { getDb, generateId } from './database';
import { updateSessionTokens } from './sessions';

export interface Message {
  id: string;
  sessionId: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tokens: number;
  toolCalls?: any[];
  createdAt: number;
}

export function addMessage(sessionId: string, role: Message['role'], content: string, tokens: number = 0, toolCalls?: any[]): Message {
  const db = getDb();
  const msg: Message = {
    id: generateId('msg-'),
    sessionId,
    role,
    content,
    tokens,
    toolCalls,
    createdAt: Date.now()
  };

  db.prepare(`
    INSERT INTO messages (id, session_id, role, content, tokens, tool_calls, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(msg.id, msg.sessionId, msg.role, msg.content, msg.tokens, toolCalls ? JSON.stringify(toolCalls) : null, msg.createdAt);

  // Update session token count
  const total = db.prepare('SELECT SUM(tokens) as total FROM messages WHERE session_id = ?').get(sessionId) as any;
  updateSessionTokens(sessionId, total?.total || 0);

  return msg;
}

export function getMessages(sessionId: string, limit?: number): Message[] {
  const db = getDb();
  const query = limit
    ? 'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC LIMIT ?'
    : 'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC';
  
  const rows = (limit ? db.prepare(query).all(sessionId, limit) : db.prepare(query).all(sessionId)) as any[];
  
  return rows.map(row => ({
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    content: row.content,
    tokens: row.tokens,
    toolCalls: row.tool_calls ? JSON.parse(row.tool_calls) : undefined,
    createdAt: row.created_at
  }));
}

export function getRecentMessages(sessionId: string, count: number): Message[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM messages WHERE session_id = ? 
    ORDER BY created_at DESC LIMIT ?
  `).all(sessionId, count) as any[];
  
  return rows.reverse().map(row => ({
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    content: row.content,
    tokens: row.tokens,
    toolCalls: row.tool_calls ? JSON.parse(row.tool_calls) : undefined,
    createdAt: row.created_at
  }));
}

export function getSessionTokenCount(sessionId: string): number {
  const db = getDb();
  const result = db.prepare('SELECT SUM(tokens) as total FROM messages WHERE session_id = ?').get(sessionId) as any;
  return result?.total || 0;
}

export function toApiMessages(messages: Message[]): { role: string; content: string; tool_calls?: any[] }[] {
  return messages.map(m => ({
    role: m.role,
    content: m.content,
    ...(m.toolCalls ? { tool_calls: m.toolCalls } : {})
  }));
}
