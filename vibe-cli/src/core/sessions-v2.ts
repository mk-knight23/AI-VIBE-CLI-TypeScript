/**
 * Session Manager - Multi-session support for parallel agents
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const SESSION_DIR = path.join(process.env.HOME || '.', '.vibe', 'sessions');

export interface Session {
  id: string;
  name: string;
  created: string;
  updated: string;
  model: string;
  provider: string;
  messageCount: number;
  projectPath: string;
  shareId?: string;
}

export interface SessionData extends Session {
  messages: any[];
  context?: any;
}

class SessionManager {
  private currentSession: string | null = null;

  init(): void {
    if (!fs.existsSync(SESSION_DIR)) {
      fs.mkdirSync(SESSION_DIR, { recursive: true });
    }
  }

  create(name?: string, projectPath?: string): Session {
    this.init();
    const id = crypto.randomBytes(8).toString('hex');
    const session: SessionData = {
      id,
      name: name || `session-${id.slice(0, 6)}`,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      model: '',
      provider: '',
      messageCount: 0,
      projectPath: projectPath || process.cwd(),
      messages: []
    };

    this.save(session);
    this.currentSession = id;
    return session;
  }

  get(id: string): SessionData | null {
    const file = path.join(SESSION_DIR, `${id}.json`);
    if (!fs.existsSync(file)) return null;
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return null;
    }
  }

  save(session: SessionData): void {
    this.init();
    session.updated = new Date().toISOString();
    session.messageCount = session.messages.length;
    fs.writeFileSync(
      path.join(SESSION_DIR, `${session.id}.json`),
      JSON.stringify(session, null, 2)
    );
  }

  list(): Session[] {
    this.init();
    const files = fs.readdirSync(SESSION_DIR).filter(f => f.endsWith('.json'));
    return files
      .map(f => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(SESSION_DIR, f), 'utf8'));
          const { messages, context, ...session } = data;
          return session as Session;
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b!.updated).getTime() - new Date(a!.updated).getTime()) as Session[];
  }

  delete(id: string): boolean {
    const file = path.join(SESSION_DIR, `${id}.json`);
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      return true;
    }
    return false;
  }

  getCurrent(): string | null {
    return this.currentSession;
  }

  setCurrent(id: string): void {
    this.currentSession = id;
  }

  // Generate shareable link data
  createShareLink(id: string): string | null {
    const session = this.get(id);
    if (!session) return null;

    const shareId = crypto.randomBytes(12).toString('base64url');
    session.shareId = shareId;
    this.save(session);

    // In production, this would upload to a server
    // For now, return a local reference
    return `vibe://share/${shareId}`;
  }

  addMessage(id: string, role: string, content: string): void {
    const session = this.get(id);
    if (!session) return;
    session.messages.push({ role, content, timestamp: new Date().toISOString() });
    this.save(session);
  }

  updateModel(id: string, provider: string, model: string): void {
    const session = this.get(id);
    if (!session) return;
    session.provider = provider;
    session.model = model;
    this.save(session);
  }
}

export const sessionManager = new SessionManager();
