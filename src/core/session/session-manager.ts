/**
 * Session Manager
 *
 * Orchestrates session lifecycle, persistence, and context management.
 */

import { v4 as uuidv4 } from 'uuid';
import { Session, Iteration, SessionStatus, SessionMetadata } from './session-types.js';
import { SessionStore } from './session-store.js';
import { ContextBuilder } from './context-builder.js';

export interface CreateSessionOptions {
  projectId: string;
  task: string;
  objectives?: string[];
  metadata?: SessionMetadata;
}

export interface AddIterationOptions {
  response: string;
  actionItems?: string[];
  completion?: number;
  durationMs?: number;
  errors?: string[];
}

export class SessionManager {
  private store: SessionStore;
  private contextBuilder: ContextBuilder;
  private currentSession?: Session;

  constructor(dataDir?: string) {
    this.store = new SessionStore({ dataDir });
    this.contextBuilder = new ContextBuilder();
  }

  /**
   * Create a new session
   */
  async createSession(options: CreateSessionOptions): Promise<Session> {
    const session: Session = {
      id: uuidv4(),
      projectId: options.projectId,
      startTime: new Date(),
      iterations: [],
      context: {
        task: options.task,
        objectives: options.objectives || [],
        completed: [],
        inProgress: [],
        blocked: [],
        tokenCount: 0,
      },
      status: SessionStatus.ACTIVE,
      metadata: options.metadata || {},
    };

    await this.store.save(session);
    this.currentSession = session;

    return session;
  }

  /**
   * Load an existing session
   */
  async loadSession(sessionId: string): Promise<Session | null> {
    const session = await this.store.load(sessionId);

    if (session) {
      this.currentSession = session;
    }

    return session;
  }

  /**
   * Get current session
   */
  getCurrentSession(): Session | undefined {
    return this.currentSession;
  }

  /**
   * Add iteration to current session
   */
  async addIteration(options: AddIterationOptions): Promise<Iteration> {
    if (!this.currentSession) {
      throw new Error('No active session. Call createSession or loadSession first.');
    }

    const iteration: Iteration = {
      number: this.currentSession.iterations.length + 1,
      timestamp: new Date(),
      response: options.response,
      actionItems: options.actionItems || [],
      completion: options.completion || 0,
      durationMs: options.durationMs || 0,
      errors: options.errors || [],
    };

    // Add to session
    const updatedSession = {
      ...this.currentSession,
      iterations: [...this.currentSession.iterations, iteration],
    };

    // Update context
    this.contextBuilder.updateContext(updatedSession, iteration);

    // Save
    await this.store.save(updatedSession);
    this.currentSession = updatedSession;

    return iteration;
  }

  /**
   * Complete the current session
   */
  async completeSession(summary?: string): Promise<Session> {
    if (!this.currentSession) {
      throw new Error('No active session to complete.');
    }

    const updatedSession = {
      ...this.currentSession,
      endTime: new Date(),
      status: SessionStatus.COMPLETED as SessionStatus,
      context: {
        ...this.currentSession.context,
        summary: summary || this.contextBuilder.generateSummary(this.currentSession),
      },
    };

    await this.store.save(updatedSession);
    this.currentSession = undefined;

    return updatedSession;
  }

  /**
   * Pause the current session
   */
  async pauseSession(): Promise<Session> {
    if (!this.currentSession) {
      throw new Error('No active session to pause.');
    }

    const updatedSession = {
      ...this.currentSession,
      status: SessionStatus.PAUSED as SessionStatus,
    };

    await this.store.save(updatedSession);
    this.currentSession = updatedSession;

    return updatedSession;
  }

  /**
   * Resume a paused session
   */
  async resumeSession(sessionId: string): Promise<Session> {
    const session = await this.loadSession(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found.`);
    }

    if (session.status !== SessionStatus.PAUSED) {
      throw new Error(`Session ${sessionId} is not paused.`);
    }

    const updatedSession = {
      ...session,
      status: SessionStatus.ACTIVE,
    };

    await this.store.save(updatedSession);
    this.currentSession = updatedSession;

    return updatedSession;
  }

  /**
   * Cancel the current session
   */
  async cancelSession(reason?: string): Promise<Session> {
    if (!this.currentSession) {
      throw new Error('No active session to cancel.');
    }

    const updatedSession = {
      ...this.currentSession,
      endTime: new Date(),
      status: SessionStatus.CANCELLED as SessionStatus,
      context: {
        ...this.currentSession.context,
        summary: reason || 'Session cancelled',
      },
    };

    await this.store.save(updatedSession);
    this.currentSession = undefined;

    return updatedSession;
  }

  /**
   * Mark task as completed
   */
  async markTaskCompleted(task: string): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session.');
    }

    const updatedSession = {
      ...this.currentSession,
      context: {
        ...this.currentSession.context,
        completed: [...this.currentSession.context.completed, task],
        inProgress: this.currentSession.context.inProgress.filter(t => t !== task),
      },
    };

    await this.store.save(updatedSession);
    this.currentSession = updatedSession;
  }

  /**
   * Mark task as blocked
   */
  async markTaskBlocked(task: string): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session.');
    }

    const updatedSession = {
      ...this.currentSession,
      context: {
        ...this.currentSession.context,
        blocked: [...this.currentSession.context.blocked, task],
        inProgress: this.currentSession.context.inProgress.filter(t => t !== task),
      },
    };

    await this.store.save(updatedSession);
    this.currentSession = updatedSession;
  }

  /**
   * Get context for current session
   */
  getContext(): string {
    if (!this.currentSession) {
      throw new Error('No active session.');
    }

    return this.contextBuilder.buildContext(this.currentSession);
  }

  /**
   * List all sessions
   */
  async listSessions(): Promise<Session[]> {
    return this.store.list();
  }

  /**
   * List active sessions
   */
  async listActiveSessions(): Promise<Session[]> {
    return this.store.getActiveSessions();
  }

  /**
   * List completed sessions
   */
  async listCompletedSessions(): Promise<Session[]> {
    return this.store.getCompletedSessions();
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.store.delete(sessionId);

    if (this.currentSession?.id === sessionId) {
      this.currentSession = undefined;
    }
  }

  /**
   * Cleanup old sessions
   */
  async cleanup(): Promise<number> {
    return this.store.cleanup();
  }

  /**
   * Get session store
   */
  getStore(): SessionStore {
    return this.store;
  }

  /**
   * Get context builder
   */
  getContextBuilder(): ContextBuilder {
    return this.contextBuilder;
  }
}
