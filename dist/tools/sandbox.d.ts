/**
 * VIBE CLI - Sandbox System
 *
 * Provides isolated execution environments for:
 * - Shell commands (with resource limits)
 * - File operations (with path restrictions)
 * - Network operations (with allowlist)
 *
 * Features:
 * - Resource limits (CPU, memory, time)
 * - Path restrictions (no access to sensitive files)
 * - Network allowlist
 * - Process isolation
 *
 * Version: 13.0.0
 */
export interface SandboxConfig {
    enabled: boolean;
    allowedPaths: string[];
    blockedPaths: string[];
    allowedCommands: string[];
    blockedCommands: string[];
    maxMemory: number;
    maxCpuTime: number;
    maxFileSize: number;
    allowNetwork: boolean;
    allowedDomains: string[];
    environmentVars: Record<string, string>;
}
export interface SandboxResult {
    success: boolean;
    output: string;
    error?: string;
    exitCode?: number;
    duration: number;
    resources?: {
        memoryUsed?: number;
        cpuTime?: number;
    };
}
export interface SandboxContext {
    workingDir: string;
    config: SandboxConfig;
    sessionId: string;
}
export declare class Sandbox {
    private config;
    private tempDir;
    constructor(config?: Partial<SandboxConfig>);
    private ensureTempDir;
    /**
     * Get current configuration
     */
    getConfig(): SandboxConfig;
    /**
     * Update configuration
     */
    updateConfig(updates: Partial<SandboxConfig>): void;
    /**
     * Enable/disable sandbox
     */
    setEnabled(enabled: boolean): void;
    /**
     * Check if a path is allowed
     */
    isPathAllowed(filePath: string): boolean;
    /**
     * Check if a path is allowed (extended result with issues)
     */
    checkPathWithSecurity(filePath: string): {
        safe: boolean;
        issues: Array<{
            message: string;
        }>;
    };
    /**
     * Check if a command is allowed
     */
    isCommandAllowed(command: string): boolean;
    /**
     * Execute a command in sandbox
     */
    executeCommand(command: string, options?: {
        cwd?: string;
        env?: Record<string, string>;
        timeout?: number;
        dryRun?: boolean;
    }): Promise<SandboxResult>;
    /**
     * Unsafe execution (when sandbox is disabled)
     */
    private executeUnsafe;
    /**
     * Read a file (with sandbox checks)
     */
    readFile(filePath: string): SandboxResult;
    /**
     * Write a file (with sandbox checks)
     */
    writeFile(filePath: string, content: string, options?: {
        dryRun?: boolean;
        createDirs?: boolean;
    }): SandboxResult;
    /**
     * Check if network access is allowed
     */
    isNetworkAllowed(url: string): boolean;
    /**
     * Cleanup temporary files
     */
    cleanup(): void;
    /**
     * Get sandbox status
     */
    getStatus(): {
        enabled: boolean;
        tempDir: string;
        config: Partial<SandboxConfig>;
    };
}
export declare const sandbox: Sandbox;
export { Sandbox as VibeSandbox };
export type { SandboxConfig as VibeSandboxConfig, };
//# sourceMappingURL=sandbox.d.ts.map