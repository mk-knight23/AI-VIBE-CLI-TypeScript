/**
 * Storage module - SQLite-backed persistence
 */

export { getDb, closeDb, generateId } from './database';
export { createSession, getSession, getLatestSession, updateSessionTokens, listSessions } from './sessions';
export type { Session } from './sessions';
export { addMessage, getMessages, getRecentMessages, getSessionTokenCount, toApiMessages } from './messages';
export type { Message } from './messages';
