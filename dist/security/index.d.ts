/**
 * VIBE CLI - Security Module
 *
 * Comprehensive security features:
 * - Dangerous command detection
 * - Secret/key scanning
 * - Path traversal prevention
 * - Shell injection prevention
 * - Security audit reporting
 *
 * Version: 13.0.0
 */
export type SecurityLevel = 'low' | 'medium' | 'high' | 'critical';
export interface SecurityIssue {
    type: SecurityIssueType;
    severity: SecurityLevel;
    message: string;
    location?: string;
    suggestion?: string;
}
export type SecurityIssueType = 'dangerous_command' | 'secret_detected' | 'path_traversal' | 'shell_injection' | 'sql_injection' | 'xss_vulnerability' | 'weak_crypto' | 'dependency_vulnerability';
export interface SecurityConfig {
    enableCommandScanning: boolean;
    enableSecretScanning: boolean;
    enablePathTraversalCheck: boolean;
    allowShellCommands: boolean;
    blockedCommands: string[];
    allowedPaths: string[];
    secretPatterns: RegExp[];
}
export interface SecurityReport {
    safe: boolean;
    issues: SecurityIssue[];
    summary: {
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
    scannedAt: Date;
}
export declare class SecurityScanner {
    private config;
    constructor(config?: Partial<SecurityConfig>);
    /**
     * Update configuration
     */
    configure(updates: Partial<SecurityConfig>): void;
    /**
     * Scan a command for security issues
     */
    scanCommand(command: string): SecurityIssue[];
    /**
     * Scan content for secrets
     */
    scanForSecrets(content: string, filePath?: string): SecurityIssue[];
    /**
     * Check if a path is safe
     */
    isPathSafe(filePath: string, baseDir?: string): {
        safe: boolean;
        issues: SecurityIssue[];
    };
    /**
     * Scan a file for security issues
     */
    scanFile(filePath: string): SecurityReport;
    /**
     * Scan multiple files
     */
    scanFiles(filePaths: string[]): SecurityReport;
    /**
     * Create a security report
     */
    private createReport;
    /**
     * Check if a secret match is likely a false positive
     */
    private isFalsePositive;
    /**
     * Mask a secret for safe display
     */
    private maskSecret;
}
export declare class CommandValidator {
    private scanner;
    constructor(config?: Partial<SecurityConfig>);
    /**
     * Validate a command before execution
     */
    validate(command: string): {
        valid: boolean;
        issues: SecurityIssue[];
    };
    /**
     * Get security report for a command
     */
    getReport(command: string): SecurityReport;
}
export declare const securityScanner: SecurityScanner;
export declare const commandValidator: CommandValidator;
export { SecurityScanner as VibeSecurityScanner, CommandValidator as VibeCommandValidator };
export type { SecurityIssue as VibeSecurityIssue };
//# sourceMappingURL=index.d.ts.map