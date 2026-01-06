/**
 * VIBE-CLI v12 - Core Engine
 * Main initialization and orchestration
 */

import { EventEmitter } from 'events';
import { VibeMemoryManager } from '../memory';
import { VibeProviderRouter } from '../providers/router';
import { VibeApprovalManager } from '../approvals';
import type { VibeConfig, VibeSession } from '../types';

export class VibeCore {
  private sessionManager!: SessionManager;
  private memory!: VibeMemoryManager;
  private provider!: VibeProviderRouter;
  private approvals!: VibeApprovalManager;
  private eventEmitter: EventEmitter;
  private initialized = false;

  constructor(private config?: Partial<VibeConfig>) {
    this.eventEmitter = new EventEmitter();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.provider = new VibeProviderRouter();
    this.memory = new VibeMemoryManager();
    this.sessionManager = new SessionManager(this.config);
    this.approvals = new VibeApprovalManager();

    this.initialized = true;
    this.eventEmitter.emit('initialized');
  }

  getSession(): VibeSession {
    return this.sessionManager.getCurrentSession();
  }

  getMemory(): VibeMemoryManager {
    return this.memory;
  }

  getProvider(): VibeProviderRouter {
    return this.provider;
  }

  getApprovals(): VibeApprovalManager {
    return this.approvals;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export class SessionManager {
  private sessions: Map<string, VibeSession> = new Map();
  private currentSession: VibeSession | null = null;

  constructor(private config?: Partial<VibeConfig>) {
    this.createSession();
  }

  private createSession(): VibeSession {
    const session: VibeSession = {
      id: `session-${Date.now()}`,
      projectRoot: process.cwd(),
      createdAt: new Date(),
      lastActivity: new Date(),
    };
    this.sessions.set(session.id, session);
    this.currentSession = session;
    return session;
  }

  getCurrentSession(): VibeSession {
    return this.currentSession || this.createSession();
  }

  updateActivity(): void {
    if (this.currentSession) {
      this.currentSession.lastActivity = new Date();
    }
  }
}

export { EventEmitter };
