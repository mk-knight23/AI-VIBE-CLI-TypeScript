"use strict";
/**
 * VIBE-CLI v12 - Core Engine
 * Main initialization and orchestration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventEmitter = exports.SessionManager = exports.VibeCore = void 0;
const events_1 = require("events");
Object.defineProperty(exports, "EventEmitter", { enumerable: true, get: function () { return events_1.EventEmitter; } });
const memory_1 = require("../memory");
const router_1 = require("../providers/router");
const approvals_1 = require("../approvals");
class VibeCore {
    config;
    sessionManager;
    memory;
    provider;
    approvals;
    eventEmitter;
    initialized = false;
    constructor(config) {
        this.config = config;
        this.eventEmitter = new events_1.EventEmitter();
    }
    async initialize() {
        if (this.initialized)
            return;
        this.provider = new router_1.VibeProviderRouter();
        this.memory = new memory_1.VibeMemoryManager();
        this.sessionManager = new SessionManager(this.config);
        this.approvals = new approvals_1.VibeApprovalManager();
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
exports.VibeCore = VibeCore;
class SessionManager {
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
exports.SessionManager = SessionManager;
//# sourceMappingURL=index.js.map