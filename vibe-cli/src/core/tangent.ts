/**
 * Tangent Conversations - Isolated side chats
 * Inspired by Kiro CLI tangent feature
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const TANGENT_DIR = path.join(process.env.HOME || '.', '.vibe', 'tangents');

export interface Tangent {
  id: string;
  parentId?: string;
  created: string;
  messages: { role: string; content: string }[];
  summary?: string;
}

class TangentManager {
  private current: Tangent | null = null;
  private mainMessages: any[] = [];

  init(): void {
    if (!fs.existsSync(TANGENT_DIR)) {
      fs.mkdirSync(TANGENT_DIR, { recursive: true });
    }
  }

  // Start a new tangent conversation
  start(mainMessages: any[]): Tangent {
    this.init();
    this.mainMessages = mainMessages;
    
    const tangent: Tangent = {
      id: crypto.randomBytes(6).toString('hex'),
      created: new Date().toISOString(),
      messages: []
    };

    this.current = tangent;
    this.save(tangent);
    return tangent;
  }

  // End tangent and return to main
  end(): { summary: string; messages: any[] } | null {
    if (!this.current) return null;

    const summary = this.generateSummary(this.current);
    this.current.summary = summary;
    this.save(this.current);

    const result = {
      summary,
      messages: this.mainMessages
    };

    this.current = null;
    return result;
  }

  // Check if in tangent mode
  isActive(): boolean {
    return this.current !== null;
  }

  // Get current tangent
  getCurrent(): Tangent | null {
    return this.current;
  }

  // Add message to current tangent
  addMessage(role: string, content: string): void {
    if (this.current) {
      this.current.messages.push({ role, content });
      this.save(this.current);
    }
  }

  // Get tangent messages for AI context
  getMessages(): { role: string; content: string }[] {
    return this.current?.messages || [];
  }

  // List all tangents
  list(): Tangent[] {
    this.init();
    const files = fs.readdirSync(TANGENT_DIR).filter(f => f.endsWith('.json'));
    return files
      .map(f => {
        try {
          return JSON.parse(fs.readFileSync(path.join(TANGENT_DIR, f), 'utf8'));
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
  }

  // Load a specific tangent
  load(id: string): Tangent | null {
    const file = path.join(TANGENT_DIR, `${id}.json`);
    if (!fs.existsSync(file)) return null;
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return null;
    }
  }

  // Delete a tangent
  delete(id: string): boolean {
    const file = path.join(TANGENT_DIR, `${id}.json`);
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      return true;
    }
    return false;
  }

  private save(tangent: Tangent): void {
    this.init();
    fs.writeFileSync(
      path.join(TANGENT_DIR, `${tangent.id}.json`),
      JSON.stringify(tangent, null, 2)
    );
  }

  private generateSummary(tangent: Tangent): string {
    const userMessages = tangent.messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join(' ');
    
    // Simple summary - first 100 chars of user input
    return userMessages.slice(0, 100) + (userMessages.length > 100 ? '...' : '');
  }
}

export const tangentManager = new TangentManager();
