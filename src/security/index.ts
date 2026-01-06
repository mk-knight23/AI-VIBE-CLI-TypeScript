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

import * as path from 'path';
import * as fs from 'fs';

// ============================================================================
// TYPES
// ============================================================================

export type SecurityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityIssue {
  type: SecurityIssueType;
  severity: SecurityLevel;
  message: string;
  location?: string;
  suggestion?: string;
}

export type SecurityIssueType =
  | 'dangerous_command'
  | 'secret_detected'
  | 'path_traversal'
  | 'shell_injection'
  | 'sql_injection'
  | 'xss_vulnerability'
  | 'weak_crypto'
  | 'dependency_vulnerability';

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

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: SecurityConfig = {
  enableCommandScanning: true,
  enableSecretScanning: true,
  enablePathTraversalCheck: true,
  allowShellCommands: false,
  blockedCommands: [
    'rm -rf',
    'mkfs',
    'dd if=',
    'chmod 777',
    'chmod -R 777',
    'useradd',
    'passwd',
    'sudo',
    'su ',
    'ssh ',
    'scp ',
    'ftp ',
    'telnet',
    'curl ',
    'wget ',
    'nc -',
    'netcat',
    'ncat',
    'bash -c',
    'sh -c',
    'eval ',
    '$(',
    '`',
  ],
  allowedPaths: [],
  secretPatterns: [
    // API Keys
    /sk-[a-zA-Z0-9]{20,}/g, // OpenAI
    /xoxb-[a-zA-Z0-9-]{22,}/g, // Slack
    /xoxp-[a-zA-Z0-9-]{22,}/g, // Slack
    /AKIA[0-9A-Z]{16}/g, // AWS
    /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, // JWT
    // Passwords in code
    /password\s*[:=]\s*["'][^"']+["']/gi,
    /passwd\s*[:=]\s*["'][^"']+["']/gi,
    /secret\s*[:=]\s*["'][^"']+["']/gi,
    /api_key\s*[:=]\s*["'][^"']+["']/gi,
    /apikey\s*[:=]\s*["'][^"']+["']/gi,
    // Connection strings
    /mongodb(\+srv)?:\/\/[^:]+:[^@]+@/g,
    /postgres:\/\/[^:]+:[^@]+@/g,
    /mysql:\/\/[^:]+:[^@]+@/g,
    // Private keys
    /-----BEGIN PRIVATE KEY-----/g,
    /-----BEGIN RSA PRIVATE KEY-----/g,
    /-----BEGIN OPENSSH PRIVATE KEY-----/g,
  ],
};

// ============================================================================
// SECURITY SCANNER
// ============================================================================

export class SecurityScanner {
  private config: SecurityConfig;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Update configuration
   */
  configure(updates: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Scan a command for security issues
   */
  scanCommand(command: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    if (!this.config.enableCommandScanning) {
      return issues;
    }

    // Check for dangerous commands
    for (const blocked of this.config.blockedCommands) {
      if (command.includes(blocked)) {
        issues.push({
          type: 'dangerous_command',
          severity: 'critical',
          message: `Potentially dangerous command detected: ${blocked}`,
          suggestion: 'Review the command and ensure it is intended.',
        });
      }
    }

    // Check for shell injection patterns
    const injectionPatterns = [
      /\|\s*sh\b/i,
      /\|\s*bash\b/i,
      /;\s*(sh|bash|exec)/i,
      /\$\(/,
      /`[^`]+`/,
      /\beval\s*\(/i,
      /2>&1/,
      />\s*\//,
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(command)) {
        issues.push({
          type: 'shell_injection',
          severity: 'high',
          message: 'Shell injection pattern detected',
          suggestion: 'Use parameterized commands instead of string concatenation.',
        });
      }
    }

    return issues;
  }

  /**
   * Scan content for secrets
   */
  scanForSecrets(content: string, filePath?: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    if (!this.config.enableSecretScanning) {
      return issues;
    }

    for (const pattern of this.config.secretPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          // Filter out false positives
          if (this.isFalsePositive(match)) {
            continue;
          }

          issues.push({
            type: 'secret_detected',
            severity: 'high',
            message: `Potential secret detected: ${this.maskSecret(match)}`,
            location: filePath,
            suggestion: 'Move secrets to environment variables or a secure vault.',
          });
        }
      }
    }

    return issues;
  }

  /**
   * Check if a path is safe
   */
  isPathSafe(filePath: string, baseDir?: string): { safe: boolean; issues: SecurityIssue[] } {
    const issues: SecurityIssue[] = [];
    const resolved = path.resolve(filePath);

    if (!this.config.enablePathTraversalCheck) {
      return { safe: true, issues };
    }

    // Check for path traversal
    if (resolved.includes('..')) {
      issues.push({
        type: 'path_traversal',
        severity: 'high',
        message: 'Path traversal detected',
        location: filePath,
        suggestion: 'Use path.resolve() and validate the result stays within allowed directories.',
      });
    }

    // Check against allowed paths
    if (this.config.allowedPaths.length > 0) {
      const isAllowed = this.config.allowedPaths.some(allowed =>
        resolved.startsWith(allowed) || resolved === allowed
      );

      if (!isAllowed) {
        issues.push({
          type: 'path_traversal',
          severity: 'medium',
          message: 'Path outside of allowed directories',
          location: filePath,
          suggestion: `Ensure the path is within one of: ${this.config.allowedPaths.join(', ')}`,
        });
      }
    }

    // Check sensitive paths
    const sensitivePatterns = [
      /^\/?etc\//i,
      /^\/?usr\/(?!local\/projects)/i,
      /^\/?root\//i,
      /^\/?home\/[^/]+\/\.ssh/i,
      /^\/?home\/[^/]+\/\.aws/i,
      /^\/?home\/[^/]+\/\.gcloud/i,
      /^\/?private\/etc/i,
      /^\/?private\/var/i,
    ];

    for (const pattern of sensitivePatterns) {
      if (pattern.test(resolved)) {
        issues.push({
          type: 'path_traversal',
          severity: 'critical',
          message: 'Access to sensitive system path detected',
          location: filePath,
          suggestion: 'Do not access system configuration files.',
        });
      }
    }

    return { safe: issues.length === 0, issues };
  }

  /**
   * Scan a file for security issues
   */
  scanFile(filePath: string): SecurityReport {
    const issues: SecurityIssue[] = [];

    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      // Scan for secrets
      issues.push(...this.scanForSecrets(content, filePath));

      // Check file permissions (on POSIX systems)
      try {
        const stats = fs.statSync(filePath);
        if (stats.mode & 0o777) {
          const worldReadable = (stats.mode & 0o444) !== 0;
          const worldWritable = (stats.mode & 0o222) !== 0;

          if (worldWritable) {
            issues.push({
              type: 'weak_crypto',
              severity: 'medium',
              message: 'File has write permissions for others',
              location: filePath,
              suggestion: 'Consider restricting file permissions to owner only.',
            });
          }
        }
      } catch {
        // Ignore stat errors
      }
    } catch (error) {
      issues.push({
        type: 'path_traversal',
        severity: 'low',
        message: `Could not read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        location: filePath,
      });
    }

    return this.createReport(issues);
  }

  /**
   * Scan multiple files
   */
  scanFiles(filePaths: string[]): SecurityReport {
    const allIssues: SecurityIssue[] = [];

    for (const filePath of filePaths) {
      allIssues.push(...this.scanFile(filePath).issues);
    }

    return this.createReport(allIssues);
  }

  /**
   * Create a security report
   */
  private createReport(issues: SecurityIssue[]): SecurityReport {
    return {
      safe: issues.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0,
      issues,
      summary: {
        critical: issues.filter(i => i.severity === 'critical').length,
        high: issues.filter(i => i.severity === 'high').length,
        medium: issues.filter(i => i.severity === 'medium').length,
        low: issues.filter(i => i.severity === 'low').length,
      },
      scannedAt: new Date(),
    };
  }

  /**
   * Check if a secret match is likely a false positive
   */
  private isFalsePositive(match: string): boolean {
    // Skip if too short to be a real secret
    if (match.length < 8) return true;

    // Skip if it's a placeholder or example
    if (match.toLowerCase().includes('example') ||
        match.toLowerCase().includes('test') ||
        match.toLowerCase().includes('placeholder') ||
        match.toLowerCase().includes('your_')) {
      return true;
    }

    // Skip if it's all lowercase or all uppercase
    const hasLower = /[a-z]/.test(match);
    const hasUpper = /[A-Z]/.test(match);
    const hasDigit = /[0-9]/.test(match);

    if (!hasLower && !hasUpper) return true;
    if (hasLower && !hasUpper && !hasDigit) return true;

    return false;
  }

  /**
   * Mask a secret for safe display
   */
  private maskSecret(secret: string): string {
    if (secret.length <= 8) {
      return '*'.repeat(secret.length);
    }

    const prefix = secret.slice(0, 4);
    const suffix = secret.slice(-4);
    const masked = '*'.repeat(secret.length - 8);

    return `${prefix}${masked}${suffix}`;
  }
}

// ============================================================================
// COMMAND VALIDATOR
// ============================================================================

export class CommandValidator {
  private scanner: SecurityScanner;

  constructor(config?: Partial<SecurityConfig>) {
    this.scanner = new SecurityScanner(config);
  }

  /**
   * Validate a command before execution
   */
  validate(command: string): { valid: boolean; issues: SecurityIssue[] } {
    const issues = this.scanner.scanCommand(command);
    return {
      valid: issues.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0,
      issues,
    };
  }

  /**
   * Get security report for a command
   */
  getReport(command: string): SecurityReport {
    const issues = this.scanner.scanCommand(command);
    return {
      safe: true,
      issues,
      summary: {
        critical: issues.filter(i => i.severity === 'critical').length,
        high: issues.filter(i => i.severity === 'high').length,
        medium: issues.filter(i => i.severity === 'medium').length,
        low: issues.filter(i => i.severity === 'low').length,
      },
      scannedAt: new Date(),
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const securityScanner = new SecurityScanner();
export const commandValidator = new CommandValidator();
export { SecurityScanner as VibeSecurityScanner, CommandValidator as VibeCommandValidator };
export type { SecurityIssue as VibeSecurityIssue };
