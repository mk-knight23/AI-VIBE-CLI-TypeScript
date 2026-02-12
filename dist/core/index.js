/**
 * VIBE-CLI v0.0.1 - Core Engine
 * Main initialization and orchestration
 */
import { EventEmitter } from 'events';
import { VibeMemoryManager } from '../memory/index.js';
import { VibeProviderRouter } from '../providers/router.js';
import { VibeApprovalManager } from '../approvals/index.js';
export class VibeCore {
    config;
    sessionManager;
    memory;
    provider;
    approvals;
    eventEmitter;
    initialized = false;
    constructor(config) {
        this.config = config;
        this.eventEmitter = new EventEmitter();
    }
    async initialize() {
        if (this.initialized)
            return;
        this.provider = new VibeProviderRouter();
        this.memory = new VibeMemoryManager();
        this.sessionManager = new SessionManager(this.config);
        this.approvals = new VibeApprovalManager();
        this.initialized = true;
        this.eventEmitter.emit('initialized');
    }
    getSession() {
        return this.sessionManager.getCurrentSession();
    }
    getMemory() {
        return this.memory;
    }
    getProvider() {
        return this.provider;
    }
    getApprovals() {
        return this.approvals;
    }
    isInitialized() {
        return this.initialized;
    }
}
export class SessionManager {
    config;
    sessions = new Map();
    currentSession = null;
    constructor(config) {
        this.config = config;
        this.createSession();
    }
    createSession() {
        const session = {
            id: `session-${Date.now()}`,
            projectRoot: process.cwd(),
            createdAt: new Date(),
            lastActivity: new Date(),
        };
        this.sessions.set(session.id, session);
        this.currentSession = session;
        return session;
    }
    getCurrentSession() {
        return this.currentSession || this.createSession();
    }
    updateActivity() {
        if (this.currentSession) {
            this.currentSession.lastActivity = new Date();
        }
    }
}
export { EventEmitter };
//# sourceMappingURL=index.js.map