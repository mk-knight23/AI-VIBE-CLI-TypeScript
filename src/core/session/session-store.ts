/**
 * Session Store
 *
 * Handles persistence of sessions to disk with compression and cleanup.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Session, SessionStoreConfig, SessionStatus } from './session-types.js';

const DEFAULT_CONFIG: SessionStoreConfig = {
  dataDir: '.ralph/sessions',
  maxSessions: 100,
  compressAfter: 50,
};

export class SessionStore {
  private config: SessionStoreConfig;

  constructor(config?: Partial<SessionStoreConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Save a session to disk
   */
  async save(session: Session): Promise<void> {
    await this.ensureDataDir();
    const filePath = this.getSessionPath(session.id);

    const data = JSON.stringify(session, this.dateReplacer, 2);
    await fs.writeFile(filePath, data, 'utf-8');
  }

  /**
   * Load a session from disk
   */
  async load(sessionId: string): Promise<Session | null> {
    const filePath = this.getSessionPath(sessionId);

    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const session = JSON.parse(data) as Session;
      return this.reviveDates(session);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Revive date strings in session object
   */
  private reviveDates(session: any): Session {
    const reviveValue = (value: any): any => {
      if (typeof value === 'string') {
        // Check if it's an ISO date string
        const date = new Date(value);
        if (!isNaN(date.getTime()) && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
          return date;
        }
      } else if (Array.isArray(value)) {
        return value.map(reviveValue);
      } else if (value && typeof value === 'object') {
        const revived: any = {};
        for (const [key, val] of Object.entries(value)) {
          revived[key] = reviveValue(val);
        }
        return revived;
      }
      return value;
    };

    return reviveValue(session);
  }

  /**
   * Delete a session from disk
   */
  async delete(sessionId: string): Promise<void> {
    const filePath = this.getSessionPath(sessionId);

    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * List all sessions
   */
  async list(): Promise<Session[]> {
    await this.ensureDataDir();

    try {
      const files = await fs.readdir(this.config.dataDir);
      const sessionFiles = files.filter(f => f.endsWith('.json'));

      const sessions: Session[] = [];
      for (const file of sessionFiles) {
        const sessionId = file.replace('.json', '');
        const session = await this.load(sessionId);
        if (session) {
          sessions.push(session);
        }
      }

      return sessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get active sessions
   */
  async getActiveSessions(): Promise<Session[]> {
    const sessions = await this.list();
    return sessions.filter(s => s.status === SessionStatus.ACTIVE);
  }

  /**
   * Get completed sessions
   */
  async getCompletedSessions(): Promise<Session[]> {
    const sessions = await this.list();
    return sessions.filter(s => s.status === SessionStatus.COMPLETED);
  }

  /**
   * Cleanup old sessions
   */
  async cleanup(): Promise<number> {
    const sessions = await this.list();

    if (sessions.length <= this.config.maxSessions) {
      return 0;
    }

    const toDelete = sessions.slice(this.config.maxSessions);
    let deleted = 0;

    for (const session of toDelete) {
      // Don't delete active sessions
      if (session.status !== SessionStatus.ACTIVE) {
        await this.delete(session.id);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Get session file path
   */
  private getSessionPath(sessionId: string): string {
    return path.join(this.config.dataDir, `${sessionId}.json`);
  }

  /**
   * Ensure data directory exists
   */
  private async ensureDataDir(): Promise<void> {
    try {
      await fs.mkdir(this.config.dataDir, { recursive: true });
    } catch (error) {
      // Ignore if already exists
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Date replacer for JSON serialization
   */
  private dateReplacer(key: string, value: any): any {
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    return value;
  }

  /**
   * Date reviver for JSON deserialization
   */
  private dateReviver(key: string, value: any): any {
    if (value && typeof value === 'object' && value.__type === 'Date') {
      return new Date(value.value);
    }
    if (typeof value === 'string' && key.match(/(Time|Date)$/i)) {
      // Try to parse ISO date strings for known date properties
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    return value;
  }

  /**
   * Get configuration
   */
  getConfig(): SessionStoreConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SessionStoreConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
