/**
 * VIBE CLI v12 - Security Utilities
 *
 * Input sanitization, secret masking, and security helpers.
 *
 * Version: 12.0.0
 */
/**
 * Sanitize user input to prevent injection attacks
 */
export declare function sanitizeInput(input: string): string;
/**
 * Sanitize file paths to prevent path traversal
 */
export declare function sanitizeFilePath(input: string, baseDir: string): string;
/**
 * Sanitize shell commands to prevent injection
 */
export declare function sanitizeShellCommand(input: string): string;
/**
 * Mask secrets in strings for logging/display
 */
export declare function maskSecrets(input: string): string;
/**
 * Create a safe log message by masking secrets
 */
export declare function safeLog(message: string, ...args: unknown[]): void;
/**
 * Mask secrets in an object (recursively)
 */
export declare function maskSecretsInObject(obj: unknown): unknown;
/**
 * Mask API keys in provider configuration display
 */
export declare function maskProviderConfig(config: Record<string, unknown>): Record<string, unknown>;
export interface RiskAssessment {
    level: 'low' | 'medium' | 'high' | 'critical';
    requiresApproval: boolean;
    reasons: string[];
}
/**
 * Assess risk level of an operation
 */
export declare function assessRisk(intent: string, context: {
    files?: string[];
}): RiskAssessment;
/**
 * Check if an operation requires explicit approval
 */
export declare function requiresApproval(intent: string): boolean;
//# sourceMappingURL=utilities.d.ts.map