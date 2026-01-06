/**
 * VIBE-CLI v12 - Core Engine
 * Main initialization and orchestration
 */
import { EventEmitter } from 'events';
import { VibeMemoryManager } from '../memory';
import { VibeProviderRouter } from '../providers/router';
import { VibeApprovalManager } from '../approvals';
import type { VibeConfig, VibeSession } from '../types';
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