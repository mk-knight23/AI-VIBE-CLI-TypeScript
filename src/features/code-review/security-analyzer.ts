/**
 * VIBE-CLI v0.0.2 - Security Analyzer
 * OWASP vulnerability detection, secrets scanning, and security patterns
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

/**
 * Security issue severity
 */
export type SecuritySeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * Security issue category
 */
export type SecurityCategory =
  | 'injection'
  | 'authentication'
  | 'authorization'
  | 'cryptography'
  | 'sensitive-data'
  | 'configuration'
  | 'logging'
  | 'input-validation'
  | 'output-encoding'
  | 'access-control';

/**
 * Security issue
 */
export interface SecurityIssue {
  id: string;
  category: SecurityCategory;
  severity: SecuritySeverity;
  title: string;
  description: string;
  filePath: string;
  lineNumber: number;
  lineContent: string;
  remediation: string;
  references: string[];
  cwe?: string;
  owasp?: string;
}

/**
 * Secret pattern match
 */
export interface SecretMatch {
  type: string;
  filePath: string;
  lineNumber: number;
  lineContent: string;
  suggestion: string;
}

/**
 * Vulnerability pattern
 */
export interface VulnerabilityPattern {
  id: string;
  category: SecurityCategory;
  severity: SecuritySeverity;
  pattern: RegExp;
  title: string;
  description: string;
  remediation: string;
  references: string[];
  cwe?: string;
  owasp?: string;
}

/**
 * Security analysis result
 */
export interface SecurityAnalysisResult {
  issues: SecurityIssue[];
  secrets: SecretMatch[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  filesScanned: number;
  scanDuration: number;
}

/**
 * Security Analyzer
 */
export class SecurityAnalyzer {
  private readonly vulnerabilityPatterns: VulnerabilityPattern[];
  private readonly secretPatterns: RegExp[];

  constructor() {
    this.vulnerabilityPatterns = this.initializePatterns();
    this.secretPatterns = this.initializeSecretPatterns();
  }

  /**
   * Initialize vulnerability patterns
   */
  private initializePatterns(): VulnerabilityPattern[] {
    return [
      // Injection vulnerabilities
      {
        id: 'SQL_INJECTION_1',
        category: 'injection',
        severity: 'critical',
        pattern: /(['"`])\s*(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)\s.*(?:WHERE|VALUES).*\+\s*['"`]/gi,
        title: 'SQL Injection - String Concatenation',
        description: 'User input is concatenated directly into SQL queries, allowing SQL injection attacks.',
        remediation: 'Use parameterized queries or an ORM. Example: `db.query("SELECT * FROM users WHERE id = ?", [userId])`',
        references: ['https://owasp.org/www-community/attacks/SQL_Injection'],
        cwe: 'CWE-89',
        owasp: 'A03:2021 - Injection',
      },
      {
        id: 'SQL_INJECTION_2',
        category: 'injection',
        severity: 'critical',
        pattern: /(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER).*["'`]\s*\+\s*(?:req\.|params\.|body\.|query\.|body)/gi,
        title: 'SQL Injection - Dynamic Query Building',
        description: 'SQL queries are built by concatenating user input.',
        remediation: 'Use parameterized queries or prepared statements.',
        references: ['https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html'],
        cwe: 'CWE-89',
        owasp: 'A03:2021 - Injection',
      },
      {
        id: 'COMMAND_INJECTION',
        category: 'injection',
        severity: 'critical',
        pattern: /(?:exec|execSync|spawn|execFile)\s*\(\s*(?:`|\$\()[^)]*(?:req\.|params\.|body\.|query\.|input)/gi,
        title: 'Command Injection',
        description: 'User input is passed to system commands without proper sanitization.',
        remediation: 'Avoid passing user input to shell commands. Use child_process.execFile() with array arguments.',
        references: ['https://owasp.org/www-community/attacks/Command_Injection'],
        cwe: 'CWE-78',
        owasp: 'A03:2021 - Injection',
      },
      {
        id: 'XSS_REFLECTED',
        category: 'output-encoding',
        severity: 'high',
        pattern: /(?:innerHTML|outerHTML|document\.write)\s*\([^)]*(?:req\.|params\.|body\.|query\.|user)/gi,
        title: 'Cross-Site Scripting (XSS) - Unsafe DOM Manipulation',
        description: 'User input is directly assigned to innerHTML, allowing XSS attacks.',
        remediation: 'Use textContent instead of innerHTML, or sanitize input with a library like DOMPurify.',
        references: ['https://owasp.org/www-community/attacks/xss/'],
        cwe: 'CWE-79',
        owasp: 'A03:2021 - Injection',
      },
      {
        id: 'XSS_TEMPLATE',
        category: 'output-encoding',
        severity: 'high',
        pattern: /\{\{\s*(?:req\.|params\.|body\.|query\.|user)[^}]*\}\}/gi,
        title: 'Cross-Site Scripting (XSS) - Template Injection',
        description: 'Template variables contain unsanitized user input.',
        remediation: 'Use auto-escaping template engines or sanitize data before rendering.',
        references: ['https://owasp.org/www-community/attacks/xss/'],
        cwe: 'CWE-79',
        owasp: 'A03:2021 - Injection',
      },
      // Authentication issues
      {
        id: 'HARDCODED_SECRET',
        category: 'sensitive-data',
        severity: 'critical',
        pattern: /(?:password|secret|api_key|apikey|auth_token|access_token)\s*[:=]\s*['"`][a-zA-Z0-9_\-]{20,}['"`]/gi,
        title: 'Hardcoded Secret',
        description: 'A secret or credential appears to be hardcoded in the source code.',
        remediation: 'Move secrets to environment variables or a secure secrets manager.',
        references: ['https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html'],
        cwe: 'CWE-798',
        owasp: 'A02:2021 - Cryptographic Failures',
      },
      {
        id: 'WEAK_CRYPTO',
        category: 'cryptography',
        severity: 'high',
        pattern: /(?:md5|sha1|des|3des|blowfish)\s*(?:\(|'|\"|`)/gi,
        title: 'Weak Cryptographic Hash',
        description: 'A weak hashing algorithm (MD5, SHA1) is used for password storage.',
        remediation: 'Use bcrypt, Argon2, or scrypt for password hashing.',
        references: ['https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html'],
        cwe: 'CWE-328',
        owasp: 'A02:2021 - Cryptographic Failures',
      },
      {
        id: 'EXPRESS_NO_RATE_LIMIT',
        category: 'configuration',
        severity: 'medium',
        pattern: /express\s*\(\s*\)\.use(?!\s*\([^)]*rateLimit)/gi,
        title: 'Missing Rate Limiting',
        description: 'Express server does not have rate limiting configured.',
        remediation: 'Add rate limiting middleware like express-rate-limit.',
        references: ['https://cheatsheetseries.owasp.org/cheatsheets/Rate_Limiting_Cheat_Sheet.html'],
        cwe: 'CWE-307',
        owasp: 'A07:2021 - Identification and Authentication Failures',
      },
      {
        id: 'NO_CORS_CONFIG',
        category: 'configuration',
        severity: 'medium',
        pattern: /cors\s*\(\s*\)(?!\s*\{[^}]*origin)/gi,
        title: 'Permissive CORS Configuration',
        description: 'CORS is enabled without restricting allowed origins.',
        remediation: 'Configure CORS with specific allowed origins: `cors({ origin: "https://yourdomain.com" })`',
        references: ['https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html'],
        cwe: 'CWE-942',
        owasp: 'A05:2021 - Security Misconfiguration',
      },
      {
        id: 'PATH_TRAVERSAL',
        category: 'input-validation',
        severity: 'high',
        pattern: /(?:fs\.(?:readFileSync|writeFileSync|unlinkSync|rmSync|mkdirSync|createReadStream)\s*\([^)]*(?:req|params|body|query|user)[^)]*\))/gi,
        title: 'Path Traversal',
        description: 'User input is used directly in file system operations without validation.',
        remediation: 'Validate and sanitize file paths. Use path.resolve() and check the result is within expected directory.',
        references: ['https://owasp.org/www-community/attacks/Path_Traversal'],
        cwe: 'CWE-22',
        owasp: 'A01:2021 - Broken Access Control',
      },
      {
        id: 'NO_HELMET',
        category: 'configuration',
        severity: 'medium',
        pattern: /express\s*\(\s*\)\.use(?!\s*\([^)]*helmet)/gi,
        title: 'Missing Security Headers',
        description: 'Express server does not use Helmet.js for security headers.',
        remediation: 'Add Helmet.js middleware: `app.use(helmet())`',
        references: ['https://cheatsheetseries.owasp.org/cheatsheets/Secure_Headers_Cheat_Sheet.html'],
        cwe: 'CWE-693',
        owasp: 'A05:2021 - Security Misconfiguration',
      },
      {
        id: 'JWT_NONE_ALGORITHM',
        category: 'authentication',
        severity: 'critical',
        pattern: /(?:jwt\.verify|jwt\.decode)\s*\([^)]*(?:algorithm\s*[:=]\s*['"]?none['"]?)/gi,
        title: 'JWT Algorithm Confusion',
        description: 'JWT verification allows "none" algorithm which bypasses signature verification.',
        remediation: 'Always specify the expected algorithm: jwt.verify(token, secret, { algorithms: ["HS256"] })',
        references: ['https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html'],
        cwe: 'CWE-347',
        owasp: 'A02:2021 - Cryptographic Failures',
      },
      {
        id: 'SOCKET_NO_ORIGIN',
        category: 'configuration',
        severity: 'medium',
        pattern: /(?:socket\.io|io)\s*\(\s*(?:server|httpServer)\s*\)(?!\s*\{[^}]*cors)/gi,
        title: 'Socket.io Without Origin Validation',
        description: 'Socket.io server does not validate the origin of connections.',
        remediation: 'Configure CORS for Socket.io: `io({ cors: { origin: "https://yourdomain.com" } })`',
        references: ['https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html'],
        cwe: 'CWE-942',
        owasp: 'A05:2021 - Security Misconfiguration',
      },
    ];
  }

  /**
   * Initialize secret patterns
   */
  private initializeSecretPatterns(): RegExp[] {
    return [
      // API Keys
      /api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9_\-]{20,}['"]/gi,
      /apikey\s*[:=]\s*['"][a-zA-Z0-9_\-]{20,}['"]/gi,
      // AWS Keys
      /AKIA[0-9A-Z]{16}/g,
      /aws[_-]?secret[_-]?access[_-]?key\s*[:=]\s*['"][a-zA-Z0-9/+=]{40}['"]/gi,
      // Private Keys
      /-----BEGIN\s*(?:RSA|EC|DSA|OPENSSH)?\s*PRIVATE KEY-----/g,
      // JWT Tokens
      /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
      // Database URLs
      /(?:mongodb|postgres|mysql|postgresql):\/\/[^\s"'<>]+/g,
      // Generic secrets
      /secret\s*[:=]\s*['"][a-zA-Z0-9_\-]{16,}['"]/gi,
      /password\s*[:=]\s*['"][^'"]{8,}['"]/gi,
      /token\s*[:=]\s*['"][a-zA-Z0-9_\-.]{20,}['"]/gi,
      // Slack tokens
      /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*/g,
      // GitHub tokens
      /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}/g,
    ];
  }

  /**
   * Scan a directory for security issues
   */
  scanDirectory(dirPath: string): SecurityAnalysisResult {
    const startTime = Date.now();
    const issues: SecurityIssue[] = [];
    const secrets: SecretMatch[] = [];
    const files = this.getSourceFiles(dirPath);

    for (const file of files) {
      const fileIssues = this.scanFile(file);
      issues.push(...fileIssues.issues);
      secrets.push(...fileIssues.secrets);
    }

    const scanDuration = Date.now() - startTime;

    return {
      issues,
      secrets,
      summary: {
        critical: issues.filter((i) => i.severity === 'critical').length,
        high: issues.filter((i) => i.severity === 'high').length,
        medium: issues.filter((i) => i.severity === 'medium').length,
        low: issues.filter((i) => i.severity === 'low').length,
        info: issues.filter((i) => i.severity === 'info').length,
      },
      filesScanned: files.length,
      scanDuration,
    };
  }

  /**
   * Scan a single file
   */
  scanFile(filePath: string): { issues: SecurityIssue[]; secrets: SecretMatch[] } {
    const issues: SecurityIssue[] = [];
    const secrets: SecretMatch[] = [];

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // Check for secrets
      for (let i = 0; i < lines.length; i++) {
        for (const pattern of this.secretPatterns) {
          const matches = lines[i].match(pattern);
          if (matches) {
            for (const match of matches) {
              secrets.push({
                type: this.detectSecretType(match),
                filePath,
                lineNumber: i + 1,
                lineContent: lines[i],
                suggestion: 'Remove this secret from code and use environment variables instead',
              });
            }
          }
        }
      }

      // Check for vulnerabilities
      for (const pattern of this.vulnerabilityPatterns) {
        let match;
        const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);

        while ((match = regex.exec(content)) !== null) {
          const lineNumber = content.substring(0, match.index).split('\n').length;

          issues.push({
            id: pattern.id,
            category: pattern.category,
            severity: pattern.severity,
            title: pattern.title,
            description: pattern.description,
            filePath,
            lineNumber,
            lineContent: lines[lineNumber - 1] || '',
            remediation: pattern.remediation,
            references: pattern.references,
            cwe: pattern.cwe,
            owasp: pattern.owasp,
          });
        }
      }
    } catch (error) {
      console.error(`Failed to scan file: ${filePath}`, error);
    }

    return { issues, secrets };
  }

  /**
   * Detect the type of secret
   */
  private detectSecretType(secret: string): string {
    if (secret.startsWith('AKIA')) return 'AWS Access Key';
    if (secret.startsWith('eyJ')) return 'JWT Token';
    if (secret.includes('mongodb') || secret.includes('postgres')) return 'Database URL';
    if (secret.includes('xox')) return 'Slack Token';
    if (secret.startsWith('ghp') || secret.startsWith('gho')) return 'GitHub Token';
    if (secret.includes('BEGIN')) return 'Private Key';
    return 'API Key / Secret';
  }

  /**
   * Get all source files in a directory
   */
  private getSourceFiles(dirPath: string): string[] {
    const { glob } = require('fast-glob');
    return glob.sync(['**/*.{ts,js,py,java,go,rb,php}'], {
      cwd: dirPath,
      ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**', '*.min.js'],
    }).map((f: string) => path.join(dirPath, f));
  }

  /**
   * Format security issues for display
   */
  formatIssues(issues: SecurityIssue[]): string {
    const lines: string[] = [];

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    for (const issue of issues) {
      const color = this.getSeverityColor(issue.severity);
      lines.push(color(`[${issue.severity.toUpperCase()}] ${issue.title}`));
      lines.push(chalk.gray(`   File: ${issue.filePath}:${issue.lineNumber}`));
      lines.push(chalk.gray(`   ${issue.description}`));
      lines.push(chalk.cyan(`   Remediation: ${issue.remediation}`));
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Get color for severity level
   */
  private getSeverityColor(severity: SecuritySeverity): (text: string) => string {
    switch (severity) {
      case 'critical':
        return chalk.red;
      case 'high':
        return chalk.red;
      case 'medium':
        return chalk.yellow;
      case 'low':
        return chalk.blue;
      default:
        return chalk.gray;
    }
  }

  /**
   * Generate security report
   */
  generateReport(result: SecurityAnalysisResult): string {
    const lines: string[] = [];

    lines.push(chalk.bold('\n🔒 Security Analysis Report\n'));
    lines.push(chalk.gray('='.repeat(50)));
    lines.push('');

    // Summary
    lines.push(chalk.bold('Summary:'));
    lines.push(`  Files Scanned: ${result.filesScanned}`);
    lines.push(`  Scan Duration: ${result.scanDuration}ms`);
    lines.push(`  Issues Found: ${result.issues.length}`);
    lines.push(`  Secrets Found: ${result.secrets.length}`);
    lines.push('');

    // Severity breakdown
    lines.push(chalk.bold('By Severity:'));
    lines.push(`  ${chalk.red('●')} Critical: ${result.summary.critical}`);
    lines.push(`  ${chalk.red('●')} High: ${result.summary.high}`);
    lines.push(`  ${chalk.yellow('●')} Medium: ${result.summary.medium}`);
    lines.push(`  ${chalk.blue('●')} Low: ${result.summary.low}`);
    lines.push('');

    // Secrets found
    if (result.secrets.length > 0) {
      lines.push(chalk.bold.red('⚠️  Secrets Detected:'));
      for (const secret of result.secrets) {
        lines.push(`  - ${secret.type} in ${secret.filePath}:${secret.lineNumber}`);
      }
      lines.push('');
    }

    // Issues by category
    const byCategory = new Map<string, SecurityIssue[]>();
    for (const issue of result.issues) {
      if (!byCategory.has(issue.category)) {
        byCategory.set(issue.category, []);
      }
      byCategory.get(issue.category)!.push(issue);
    }

    lines.push(chalk.bold('By Category:'));
    for (const [category, issues] of byCategory) {
      lines.push(`  ${category}: ${issues.length} issue(s)`);
    }
    lines.push('');

    // Detailed issues
    if (result.issues.length > 0) {
      lines.push(chalk.bold('Detailed Issues:'));
      lines.push(this.formatIssues(result.issues));
    }

    return lines.join('\n');
  }
}

/**
 * Singleton instance
 */
export const securityAnalyzer = new SecurityAnalyzer();
