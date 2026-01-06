/**
 * VIBE-CLI v13 - Interactive CLI Engine (Agent Mode)
 *
 * ENFORCES EXECUTION OVER EXPLANATION
 * - Mode system: agent/code/ask/debug
 * - Execution stages with animations
 * - File tree output, not code dumps
 * - Proper error handling
 * - Approval gates for risky operations
 * - Sandbox execution with checkpoint support
 */
import { VibeProviderRouter } from '../providers/router.js';
import { VibeMemoryManager } from '../memory/index.js';
export declare class CLIEngine {
    private provider;
    private memory;
    private running;
    private history;
    private historyFile;
    private configManager;
    private currentMode;
    constructor(provider: VibeProviderRouter, memory: VibeMemoryManager);
    start(): Promise<void>;
    private handleInput;
    private handleInternalCommand;
    private handleModeCommand;
    private showModeDescription;
    private handleModeSwitching;
    private getModeIndicator;
    private handleModelCommand;
    private handleUseCommand;
    private handleProviderModelSwitching;
    private callAI;
    private displayResponse;
    private displayExecutionResult;
    private showThinkingAnimation;
    private clearThinkingAnimation;
    private showExecutionStages;
    private displayWelcome;
    private showHelp;
    private showStatus;
    private showProviders;
    private showModules;
    private showModels;
    private showTools;
    private showPendingApprovals;
    private toggleSandbox;
    private createCheckpoint;
    private undoLastChange;
    private showRiskLevels;
    private toggleAutoApprove;
    private showMemory;
    private showProviderNotConfigured;
    private showAIError;
    private isErrorResponse;
    private getProjectContext;
    private tryFallbackProviders;
    private loadHistory;
    private saveHistory;
}
//# sourceMappingURL=index.d.ts.map