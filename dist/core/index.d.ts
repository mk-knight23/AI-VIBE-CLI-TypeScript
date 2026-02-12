/**
 * VIBE-CLI v0.0.1 - Core Engine
 * Main initialization and orchestration
 */
import { EventEmitter } from 'events';
import { VibeMemoryManager } from '../memory/index.js';
import { VibeProviderRouter } from '../providers/router.js';
import { VibeApprovalManager } from '../approvals/index.js';
import type { VibeConfig, VibeSession } from '../types.js';
export declare class VibeCore {
    private config?;
    private sessionManager;
    private memory;
    private provider;
    private approvals;
    private eventEmitter;
    private initialized;
    constructor(config?: Partial<VibeConfig> | undefined);
    initialize(): Promise<void>;
    getSession(): VibeSession;
    getMemory(): VibeMemoryManager;
    getProvider(): VibeProviderRouter;
    getApprovals(): VibeApprovalManager;
    isInitialized(): boolean;
}
export declare class SessionManager {
    private config?;
    private sessions;
    private currentSession;
    constructor(config?: Partial<VibeConfig> | undefined);
    private createSession;
    getCurrentSession(): VibeSession;
    updateActivity(): void;
}
export { EventEmitter };
//# sourceMappingURL=index.d.ts.map