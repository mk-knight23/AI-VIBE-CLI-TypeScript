/**
 * Auto-Compact - Token tracking and session summarization
 */

import { getDb, generateId } from '../storage/database';
import { createSession, getSession, Session } from '../storage/sessions';
import { getMessages, addMessage, Message } from '../storage/messages';
import { ApiClient } from '../core/api';

const DEFAULT_THRESHOLD = 0.8; // 80% of context window
const DEFAULT_CONTEXT_WINDOW = 128000;
const KEEP_RECENT_MESSAGES = 6;

export interface CompactConfig {
  threshold?: number;
  contextWindow?: number;
  keepRecent?: number;
}

export interface CompactResult {
  triggered: boolean;
  newSessionId?: string;
  summary?: string;
  oldTokenCount: number;
  newTokenCount: number;
}

export function shouldCompact(sessionId: string, config: CompactConfig = {}): boolean {
  const threshold = config.threshold || DEFAULT_THRESHOLD;
  const contextWindow = config.contextWindow || DEFAULT_CONTEXT_WINDOW;
  
  const session = getSession(sessionId);
  if (!session) return false;
  
  const usage = session.tokenCount / contextWindow;
  return usage >= threshold;
}

export async function compactSession(
  sessionId: string,
  client: ApiClient,
  model: string,
  config: CompactConfig = {}
): Promise<CompactResult> {
  const keepRecent = config.keepRecent || KEEP_RECENT_MESSAGES;
  
  const session = getSession(sessionId);
  if (!session) {
    return { triggered: false, oldTokenCount: 0, newTokenCount: 0 };
  }

  const messages = getMessages(sessionId);
  if (messages.length <= keepRecent + 1) {
    return { triggered: false, oldTokenCount: session.tokenCount, newTokenCount: session.tokenCount };
  }

  // Separate system message, old messages, and recent messages
  const systemMsg = messages.find(m => m.role === 'system');
  const oldMessages = messages.filter(m => m.role !== 'system').slice(0, -keepRecent);
  const recentMessages = messages.filter(m => m.role !== 'system').slice(-keepRecent);

  if (oldMessages.length === 0) {
    return { triggered: false, oldTokenCount: session.tokenCount, newTokenCount: session.tokenCount };
  }

  // Generate summary of old messages
  const summary = await generateSummary(client, model, oldMessages);

  // Store summary in database
  const db = getDb();
  db.prepare(`
    INSERT INTO summaries (id, session_id, content, from_message_id, to_message_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    generateId('sum-'),
    sessionId,
    summary,
    oldMessages[0].id,
    oldMessages[oldMessages.length - 1].id,
    Date.now()
  );

  // Create new session with parent reference
  const newSession = createSession(session.model, session.provider, sessionId);

  // Add system message with summary context
  const systemContent = systemMsg 
    ? `${systemMsg.content}\n\n# Previous Conversation Summary\n${summary}`
    : `# Previous Conversation Summary\n${summary}`;
  
  addMessage(newSession.id, 'system', systemContent, estimateTokens(systemContent));

  // Copy recent messages to new session
  for (const msg of recentMessages) {
    addMessage(newSession.id, msg.role, msg.content, msg.tokens, msg.toolCalls);
  }

  const newSessionData = getSession(newSession.id);

  return {
    triggered: true,
    newSessionId: newSession.id,
    summary,
    oldTokenCount: session.tokenCount,
    newTokenCount: newSessionData?.tokenCount || 0
  };
}

async function generateSummary(client: ApiClient, model: string, messages: Message[]): Promise<string> {
  const conversationText = messages
    .map(m => `${m.role.toUpperCase()}: ${m.content.slice(0, 500)}`)
    .join('\n\n');

  const summaryPrompt = `Summarize this conversation concisely, preserving:
1. Key decisions made
2. Important context established
3. Tasks completed or in progress
4. Any errors or blockers encountered

Conversation:
${conversationText}

Provide a concise summary (max 500 words):`;

  try {
    const response = await client.chat([
      { role: 'system', content: 'You are a conversation summarizer. Be concise and preserve key information.' },
      { role: 'user', content: summaryPrompt }
    ], model, { temperature: 0.3, maxTokens: 1000 });

    return response.choices?.[0]?.message?.content || 'Summary unavailable';
  } catch {
    // Fallback to simple summary
    return `Previous conversation: ${messages.length} messages exchanged. Topics: ${extractTopics(messages)}`;
  }
}

function extractTopics(messages: Message[]): string {
  const words = messages
    .map(m => m.content)
    .join(' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 5);
  
  const freq: Record<string, number> = {};
  words.forEach(w => freq[w] = (freq[w] || 0) + 1);
  
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w)
    .join(', ');
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function getSessionHistory(sessionId: string): Session[] {
  const history: Session[] = [];
  let current = getSession(sessionId);
  
  while (current) {
    history.unshift(current);
    current = current.parentId ? getSession(current.parentId) : null;
  }
  
  return history;
}
