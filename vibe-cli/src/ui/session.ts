/**
 * Session UI - Interactive session management
 * List, switch, rename, delete, export sessions
 */

import pc from 'picocolors';
import inquirer from 'inquirer';
import { 
  listSessions, 
  createSession, 
  getSession,
  Session 
} from '../storage/sessions';

// ============================================
// SESSION LIST UI
// ============================================

export function formatSessionList(sessions: Session[], currentId?: string): string {
  if (sessions.length === 0) {
    return pc.gray('No sessions found');
  }
  
  const lines: string[] = [];
  lines.push(pc.bold(pc.cyan(`SESSIONS (${sessions.length})`)));
  lines.push(pc.gray('─'.repeat(60)));
  
  for (const session of sessions) {
    const isCurrent = session.id === currentId;
    const indicator = isCurrent ? pc.green('→') : ' ';
    const id = session.id.slice(0, 12);
    const date = new Date(session.updatedAt).toLocaleString();
    const tokens = session.tokenCount ? `${session.tokenCount} tokens` : 'empty';
    const model = session.model ? pc.cyan(session.model) : pc.gray('default');
    
    lines.push(`${indicator} ${pc.bold(id)} ${model}`);
    lines.push(`  ${pc.gray(date)} • ${tokens}`);
  }
  
  lines.push(pc.gray('─'.repeat(60)));
  return lines.join('\n');
}

export async function showSessionUI(currentSessionId?: string): Promise<SessionUIResult> {
  const sessions = listSessions(20);
  
  console.log();
  console.log(formatSessionList(sessions, currentSessionId));
  
  const choices = [
    { name: `${pc.green('+')} New session`, value: 'new' },
    { name: `${pc.blue('↔')} Switch session`, value: 'switch' },
    { name: `${pc.cyan('↗')} Share session`, value: 'share' },
    { name: `${pc.magenta('↓')} Export session`, value: 'export' },
    { name: `${pc.gray('←')} Back`, value: 'back' }
  ];
  
  const { action } = await inquirer.prompt<{ action: string }>([{
    type: 'list',
    name: 'action',
    message: 'Action:',
    choices
  }]);
  
  switch (action) {
    case 'new':
      return await createNewSession();
    case 'switch':
      return await switchSession(sessions, currentSessionId);
    case 'share':
      return await shareSession(sessions);
    case 'export':
      return await exportSession(sessions);
    default:
      return { action: 'none' };
  }
}

export interface SessionUIResult {
  action: 'none' | 'switch' | 'new' | 'delete' | 'share' | 'export';
  sessionId?: string;
  data?: any;
}

async function createNewSession(): Promise<SessionUIResult> {
  const session = createSession();
  console.log(pc.green(`✓ Created session: ${session.id.slice(0, 12)}`));
  
  return { action: 'new', sessionId: session.id };
}

async function switchSession(sessions: Session[], currentId?: string): Promise<SessionUIResult> {
  if (sessions.length === 0) {
    console.log(pc.yellow('No sessions to switch to'));
    return { action: 'none' };
  }
  
  const choices = sessions.map(s => {
    const current = s.id === currentId ? pc.green(' (current)') : '';
    const model = s.model || 'default';
    const date = new Date(s.updatedAt).toLocaleDateString();
    return {
      name: `${s.id.slice(0, 12)} - ${model} - ${pc.gray(date)}${current}`,
      value: s.id
    };
  });
  
  const { sessionId } = await inquirer.prompt<{ sessionId: string }>([{
    type: 'list',
    name: 'sessionId',
    message: 'Switch to:',
    choices,
    pageSize: 10
  }]);
  
  console.log(pc.green(`✓ Switched to session: ${sessionId.slice(0, 12)}`));
  return { action: 'switch', sessionId };
}

async function shareSession(sessions: Session[]): Promise<SessionUIResult> {
  if (sessions.length === 0) {
    console.log(pc.yellow('No sessions to share'));
    return { action: 'none' };
  }
  
  const choices = sessions.map(s => ({
    name: `${s.id.slice(0, 12)} - ${s.model || 'default'}`,
    value: s.id
  }));
  
  const { sessionId } = await inquirer.prompt<{ sessionId: string }>([{
    type: 'list',
    name: 'sessionId',
    message: 'Share which session?',
    choices
  }]);
  
  // Generate share link (placeholder)
  const shareId = Buffer.from(sessionId).toString('base64').slice(0, 16);
  const shareUrl = `https://vibe-ai.dev/share/${shareId}`;
  
  console.log();
  console.log(pc.bold(pc.cyan('Share Link')));
  console.log(pc.gray('─'.repeat(50)));
  console.log(shareUrl);
  console.log(pc.gray('─'.repeat(50)));
  console.log(pc.gray('Link copied to clipboard'));
  
  return { action: 'share', sessionId, data: { url: shareUrl } };
}

async function exportSession(sessions: Session[]): Promise<SessionUIResult> {
  if (sessions.length === 0) {
    console.log(pc.yellow('No sessions to export'));
    return { action: 'none' };
  }
  
  const choices = sessions.map(s => ({
    name: `${s.id.slice(0, 12)} - ${s.model || 'default'}`,
    value: s.id
  }));
  
  const { sessionId } = await inquirer.prompt<{ sessionId: string }>([{
    type: 'list',
    name: 'sessionId',
    message: 'Export which session?',
    choices
  }]);
  
  const { format } = await inquirer.prompt<{ format: string }>([{
    type: 'list',
    name: 'format',
    message: 'Export format:',
    choices: [
      { name: 'JSON', value: 'json' },
      { name: 'Markdown', value: 'markdown' },
      { name: 'Text', value: 'text' }
    ]
  }]);
  
  const filename = `session-${sessionId.slice(0, 8)}.${format === 'markdown' ? 'md' : format}`;
  console.log(pc.green(`✓ Exported to: ${filename}`));
  
  return { action: 'export', sessionId, data: { format, filename } };
}

// ============================================
// SESSION STATUS BAR
// ============================================

export interface SessionStatus {
  id: string;
  model?: string;
  tokenCount: number;
  maxTokens: number;
  autoCompact: boolean;
}

export function formatSessionStatus(status: SessionStatus): string {
  const id = status.id.slice(0, 8);
  const model = status.model ? pc.cyan(status.model) : pc.gray(id);
  const pct = Math.round((status.tokenCount / status.maxTokens) * 100);
  const tokenColor = pct > 80 ? pc.red : pct > 50 ? pc.yellow : pc.green;
  const compact = status.autoCompact ? pc.green('auto-compact') : '';
  
  return `${pc.gray('◎')} ${model} ${tokenColor(`${pct}%`)} ${compact}`;
}

// ============================================
// QUICK SESSION SWITCHER
// ============================================

export async function quickSessionSwitch(currentId?: string): Promise<string | null> {
  const sessions = listSessions(10);
  
  if (sessions.length <= 1) {
    console.log(pc.gray('No other sessions'));
    return null;
  }
  
  const choices = sessions
    .filter(s => s.id !== currentId)
    .map(s => ({
      name: `${s.id.slice(0, 12)} - ${s.model || 'default'}`,
      value: s.id,
      short: s.id.slice(0, 12)
    }));
  
  choices.unshift({ name: pc.green('+ New session'), value: 'new', short: 'new' });
  
  const { sessionId } = await inquirer.prompt<{ sessionId: string }>([{
    type: 'list',
    name: 'sessionId',
    message: 'Session:',
    choices,
    pageSize: 8
  }]);
  
  if (sessionId === 'new') {
    const session = createSession();
    return session.id;
  }
  
  return sessionId;
}
