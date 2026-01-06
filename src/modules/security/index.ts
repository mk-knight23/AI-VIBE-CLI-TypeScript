/**
 * VIBE-CLI v12 - Security Module
 * Vulnerability scanning, dependency auditing, and security fixes
 */

import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import chalk from 'chalk';
import { BaseModule, ModuleResult } from '../base.module';
import { VibeProviderRouter } from '../../providers/router';

interface Vulnerability {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: {
    file: string;
    line?: number;
    column?: number;
  };
  description: string;
  cve?: string;
  fix?: string;
  references?: string[];
}

interface SecurityScanResult {
  score: number;
  vulnerabilities: Vulnerability[];
  summary: string;
  filesScanned: number;
  issuesBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

interface DependencyVulnerability {
  package: string;
  currentVersion: string;
  vulnerableVersions: string;
  severity: string;
  cve?: string;
  fixVersion?: string;
  recommendation: string;
}

export class SecurityModule extends BaseModule {
  private provider: VibeProviderRouter;

  // Security patterns to scan for
  private readonly securityPatterns: Array<{
    name: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    pattern: RegExp;
    description: string;
    fix: string;
  }> = [
    {
      name: 'Hardcoded API Key',
      severity: 'critical',
      pattern: /(?:api[_-]?key|apikey|secret|token|auth)[^"'\n]{0,20}["'=:\s]+["']?(?:sk-[a-zA-Z0-9]{20,}|[a-zA-Z0-9-_]{20,})["']?/gi,
      description: 'Hardcoded API key detected',
      fix: 'Use environment variables: process.env.API_KEY',
    },
    {
      name: 'Hardcoded Password',
      severity: 'critical',
      pattern: /(?:password|passwd|pwd)[^"'\n]{0,20}["'=:\s]+["']?[^"'\s]{4,}["']?/gi,
      description: 'Hardcoded password detected',
      fix: 'Use environment variables or a secrets manager',
    },
    {
      name: 'SQL Injection',
      severity: 'critical',
      pattern: /(?:query|select|insert|update|delete).*(\$\{.*\}|\`.*\`).*(?:from|where|set|values)/gi,
      description: 'Potential SQL injection vulnerability',
      fix: 'Use parameterized queries or an ORM',
    },
    {
      name: 'Command Injection',
      severity: 'critical',
      pattern: /(?:exec|eval|execSync|spawn)\s*\(\s*(?:req\.|body\.|query\.|params\.)/gi,
      description: 'Potential command injection vulnerability',
      fix: 'Avoid using user input in system commands',
    },
    {
      name: 'XSS - InnerHTML',
      severity: 'high',
      pattern: /\.innerHTML\s*=\s*(?:req|body|query|params|user)/gi,
      description: 'Direct assignment to innerHTML with user input',
      fix: 'Use textContent or sanitize input',
    },
    {
      name: 'XSS - Dangerous HTML',
      severity: 'high',
      pattern: /(?:innerHTML|dangerouslySetInnerHTML)\s*=\s*\{[^}]*(?:user|req|body|query)/gi,
      description: 'Dangerous HTML assignment with user input',
      fix: 'Sanitize HTML before rendering',
    },
    {
      name: 'Insecure Random',
      severity: 'medium',
      pattern: /Math\.(?:random|rint)/g,
      description: 'Using Math.random() for security-sensitive operations',
      fix: 'Use crypto.randomBytes() or crypto.getRandomValues()',
    },
    {
      name: 'Debug Mode Enabled',
      severity: 'medium',
      pattern: /app\.use\s*\(\s*express\.debug\s*\)/g,
      description: 'Express debug mode enabled in production',
      fix: 'Set NODE_ENV=production',
    },
    {
      name: 'Missing Rate Limiting',
      severity: 'medium',
      pattern: /express\(\)|app\(\)/g,
      description: 'Express server without rate limiting',
      fix: 'Add rate limiting middleware',
    },
    {
      name: 'HTTP Without SSL',
      severity: 'high',
      pattern: /createServer\s*\(\s*(?!https)/g,
      description: 'HTTP server without SSL',
      fix: 'Use HTTPS or a reverse proxy with TLS',
    },
    {
      name: 'Path Traversal',
      severity: 'high',
      pattern: /(?:readFile|writeFile|readFileSync|writeFileSync)\s*\(\s*(?:req\.|body\.|query\.|params\.)/g,
      description: 'File operations with user-controlled paths',
      fix: 'Validate and sanitize file paths',
    },
    {
      name: 'JWT Without Expiration',
      severity: 'medium',
      pattern: /sign\s*\(\s*\{[^}]*expiresIn\s*:[^}]*\}/g,
      description: 'JWT token without expiration',
      fix: 'Add expiresIn to JWT payload',
    },
    {
      name: 'Weak JWT Algorithm',
      severity: 'high',
      pattern: /algorithm\s*:\s*['"]?(?:HS256|HS384|HS512)['"]?/g,
      description: 'Symmetric JWT algorithm used',
      fix: 'Use RS256 or ES256 for better security',
    },
    {
      name: 'Information Disclosure',
      severity: 'low',
      pattern: /console\.(?:log|error)\s*\(\s*(?:err|error|exception)/g,
      description: 'Error details logged that may expose sensitive info',
      fix: 'Use structured logging and error handling',
    },
    {
      name: 'Missing CSRF Protection',
      severity: 'high',
      pattern: /app\.use\s*\(\s*['"]\/['"]\s*\)/g,
      description: 'Express server without explicit CSRF protection',
      fix: 'Add CSRF middleware like csurf',
    },
  ];

  constructor() {
    super({
      name: 'security',
      version: '1.0.0',
      description: 'Vulnerability scanning, dependency auditing, and security fixes',
    });

    this.provider = new VibeProviderRouter();
  }

  /**
   * Execute the module
   */
  async execute(params: Record<string, any>): Promise<ModuleResult> {
    const action = params.action || params.type || 'scan';

    const startTime = Date.now();

    try {
      switch (action) {
        case 'scan':
          return this.scan(params, startTime);
        case 'audit':
          return this.auditDependencies(params, startTime);
        case 'fix':
          return this.autoFix(params, startTime);
        case 'report':
          return this.generateReport(params, startTime);
        default:
          return this.failure(`Unknown action: ${action}. Supported: scan, audit, fix, report`);
      }
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Scan code for vulnerabilities
   */
  private async scan(params: Record<string, any>, startTime: number): Promise<ModuleResult> {
    const { files = ['.'], pattern = '**/*.{js,ts,jsx,tsx,py,java}', ignore = ['node_modules', '.git', 'dist'] } = params;

    this.logInfo('Scanning for vulnerabilities...');

    const filesToScan = this.findFiles(pattern, ignore);
    const vulnerabilities: Vulnerability[] = [];

    for (const file of filesToScan) {
      const content = fs.readFileSync(file, 'utf-8');
      const fileVulns = this.scanContent(content, file);
      vulnerabilities.push(...fileVulns);
    }

    // Group by severity
    const issuesBySeverity = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const vuln of vulnerabilities) {
      issuesBySeverity[vuln.severity]++;
    }

    // Calculate security score (100 - deductions)
    let score = 100;
    score -= issuesBySeverity.critical * 25;
    score -= issuesBySeverity.high * 15;
    score -= issuesBySeverity.medium * 5;
    score -= issuesBySeverity.low * 1;
    score = Math.max(0, score);

    const duration = Date.now() - startTime;

    return this.success({
      action: 'scan',
      score,
      vulnerabilities,
      issuesBySeverity,
      filesScanned: filesToScan.length,
      summary: this.generateSummary(score, issuesBySeverity),
    }, {
      duration,
    });
  }

  /**
   * Audit dependencies for known vulnerabilities
   */
  private async auditDependencies(params: Record<string, any>, startTime: number): Promise<ModuleResult> {
    const { packageFile = 'package.json' } = params;

    this.logInfo('Auditing dependencies...');

    const packagePath = path.isAbsolute(packageFile) ? packageFile : path.join(process.cwd(), packageFile);

    if (!fs.existsSync(packagePath)) {
      return this.failure(`Package file not found: ${packagePath}`);
    }

    // Try npm audit first
    let npmAuditOutput: string;
    try {
      npmAuditOutput = child_process.execSync('npm audit --json 2>&1', {
        encoding: 'utf-8',
        timeout: 60000,
        cwd: process.cwd(),
      });
    } catch (error: any) {
      npmAuditOutput = error.stdout?.toString() || error.message;
    }

    // Parse npm audit output
    const vulnerabilities = this.parseNpmAudit(npmAuditOutput);

    // Also scan package.json for outdated packages
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    const outdatedPackages = this.checkOutdatedPackages(packageJson);

    const duration = Date.now() - startTime;

    // Calculate severity counts
    const issuesBySeverity = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const vuln of vulnerabilities) {
      const severity = vuln.severity.toLowerCase() as keyof typeof issuesBySeverity;
      if (issuesBySeverity[severity] !== undefined) {
        issuesBySeverity[severity]++;
      }
    }

    return this.success({
      action: 'audit',
      vulnerabilities,
      outdatedPackages,
      totalIssues: vulnerabilities.length + outdatedPackages.length,
      issuesBySeverity,
      npmOutput: npmAuditOutput.substring(0, 1000),
    }, {
      duration,
    });
  }

  /**
   * Auto-fix vulnerabilities
   */
  private async autoFix(params: Record<string, any>, startTime: number): Promise<ModuleResult> {
    const { vulnerability, code, file } = params;

    if (!vulnerability && !code) {
      return this.failure('Missing required parameter: vulnerability or code');
    }

    this.logInfo('Generating security fix...');

    // If code is provided, find and fix the issue
    if (code) {
      const scanResult = this.scanContent(code, file || 'code');

      if (scanResult.length === 0) {
        return this.success({
          action: 'fix',
          message: 'No vulnerabilities found',
          fixed: code,
        });
      }

      // Use AI to generate fix
      const prompt = `Fix this security vulnerability in the code:

Code:
\`\`\`
${code}
\`\`\`

Vulnerability: ${scanResult[0].description}
Location: ${scanResult[0].location.file}:${scanResult[0].location.line || 'unknown'}
Severity: ${scanResult[0].severity}

Suggested fix: ${scanResult[0].fix || 'Apply best security practices'}

Return ONLY the fixed code, no explanations.`;

      try {
        const response = await this.provider.chat(
          [{ role: 'user', content: prompt }],
          {
            model: 'claude-sonnet-4-20250514',
            maxTokens: 4096,
          }
      );

        const duration = Date.now() - startTime;

        return this.success({
          action: 'fix',
          vulnerability: scanResult[0],
          original: code,
          fixed: response.content,
        }, {
          tokens: response.usage?.totalTokens,
          duration,
          model: response.model,
        });

      } catch (error) {
        return this.failure(error instanceof Error ? error.message : 'Fix generation failed');
      }
    }

    // Fix by type
    const fix = this.getFixForVulnerability(vulnerability);
    if (!fix) {
      return this.failure(`No fix available for: ${vulnerability}`);
    }

    const duration = Date.now() - startTime;

    return this.success({
      action: 'fix',
      vulnerability,
      fix,
    }, {
      duration,
    });
  }

  /**
   * Generate security report
   */
  private async generateReport(params: Record<string, any>, startTime: number): Promise<ModuleResult> {
    const { format = 'markdown', includeFixes = true } = params;

    // Run a scan first
    const scanResult = await this.scan(params, startTime);
    const auditResult = await this.auditDependencies(params, startTime);

    if (!scanResult.success || !auditResult.success) {
      return this.failure('Failed to gather security data');
    }

    this.logInfo('Generating security report...');

    const prompt = `Generate a comprehensive security report in ${format} format:

Security Scan Results:
- Score: ${scanResult.data.score}/100
- Critical: ${scanResult.data.issuesBySeverity.critical}
- High: ${scanResult.data.issuesBySeverity.high}
- Medium: ${scanResult.data.issuesBySeverity.medium}
- Low: ${scanResult.data.issuesBySeverity.low}

Dependency Audit:
- Vulnerable packages: ${auditResult.data.vulnerabilities?.length || 0}
- Outdated packages: ${auditResult.data.outdatedPackages?.length || 0}

${includeFixes ? 'Include remediation steps for each finding.' : ''}

Provide:
1. Executive Summary
2. Findings (grouped by severity)
3. Risk Assessment
4. Recommendations
5. Remediation Steps`;

    try {
      const response = await this.provider.chat(
        [{ role: 'user', content: prompt }],
        {
          model: 'claude-sonnet-4-20250514',
          maxTokens: 4096,
        }
      );

      const duration = Date.now() - startTime;

      return this.success({
        action: 'report',
        report: response.content,
        format,
        scanData: scanResult.data,
        auditData: auditResult.data,
      }, {
        tokens: response.usage?.totalTokens,
        duration,
        model: response.model,
      });

    } catch (error) {
      return this.failure(error instanceof Error ? error.message : 'Report generation failed');
    }
  }

  /**
   * Scan content for security patterns
   */
  private scanContent(content: string, file: string): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    // Get line numbers for each match
    const lines = content.split('\n');

    for (const pattern of this.securityPatterns) {
      let match;
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);

      while ((match = regex.exec(content)) !== null) {
        // Find line number
        const lineIndex = content.substring(0, match.index).split('\n').length - 1;

        vulnerabilities.push({
          type: pattern.name,
          severity: pattern.severity,
          location: {
            file,
            line: lineIndex + 1,
          },
          description: pattern.description,
          fix: pattern.fix,
        });
      }
    }

    return vulnerabilities;
  }

  /**
   * Find files matching pattern
   */
  private findFiles(pattern: string, ignore: string[]): string[] {
    const files: string[] = [];
    const baseDir = process.cwd();

    // Simple recursive search
    const searchDir = (dir: string) => {
      if (!fs.existsSync(dir)) return;

      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Check ignore list
        const relativePath = path.relative(baseDir, fullPath);
        if (ignore.some(ig => relativePath.startsWith(ig))) {
          continue;
        }

        if (entry.isDirectory()) {
          searchDir(fullPath);
        } else if (entry.isFile()) {
          // Match pattern
          const regex = new RegExp(pattern.replace('**/', '').replace('*', '.*'));
          if (regex.test(entry.name)) {
            files.push(fullPath);
          }
        }
      }
    };

    searchDir(baseDir);
    return files;
  }

  /**
   * Parse npm audit output
   */
  private parseNpmAudit(output: string): DependencyVulnerability[] {
    const vulnerabilities: DependencyVulnerability[] = [];

    try {
      // Try to parse as JSON
      const data = JSON.parse(output);

      if (data.vulnerabilities) {
        for (const [name, vuln] of Object.entries(data.vulnerabilities)) {
          const v = vuln as any;
          vulnerabilities.push({
            package: name,
            currentVersion: v.version || 'unknown',
            vulnerableVersions: v.vulnerable_versions || 'unknown',
            severity: v.severity || 'unknown',
            cve: v.cves?.[0],
            fixVersion: v.fix_version,
            recommendation: `Update ${name} to ${v.fix_version || 'latest'}`,
          });
        }
      }
    } catch {
      // Fall back to text parsing
      const vulnMatch = output.match(/(\w+)\s+@\s+([\d.]+)\s+\|\s+(\w+)\s+\|\s+(?:cve-[\d-]+|NONE)/g);
      if (vulnMatch) {
        for (const line of vulnMatch) {
          const parts = line.split('|');
          vulnerabilities.push({
            package: parts[0].trim(),
            currentVersion: parts[1].trim(),
            vulnerableVersions: 'unknown',
            severity: parts[2].trim(),
            recommendation: `Update ${parts[0].trim()} to latest version`,
          });
        }
      }
    }

    return vulnerabilities;
  }

  /**
   * Check for outdated packages
   */
  private checkOutdatedPackages(packageJson: any): Array<{ package: string; current: string; latest: string }> {
    const outdated: Array<{ package: string; current: string; latest: string }> = [];

    try {
      const npmList = child_process.execSync('npm outdated --json 2>&1', {
        encoding: 'utf-8',
        timeout: 30000,
        cwd: process.cwd(),
      });

      const data = JSON.parse(npmList);
      for (const [pkg, info] of Object.entries(data as Record<string, any>)) {
        if (info.current && info.latest && info.current !== info.latest) {
          outdated.push({
            package: pkg,
            current: info.current,
            latest: info.latest,
          });
        }
      }
    } catch {
      // npm outdated returns non-zero when there are outdated packages
    }

    return outdated;
  }

  /**
   * Get fix for vulnerability type
   */
  private getFixForVulnerability(vulnerability: string): string | null {
    for (const pattern of this.securityPatterns) {
      if (vulnerability.toLowerCase().includes(pattern.name.toLowerCase())) {
        return pattern.fix;
      }
    }
    return null;
  }

  /**
   * Generate summary string
   */
  private generateSummary(score: number, issues: { critical: number; high: number; medium: number; low: number }): string {
    let summary = '';

    if (score >= 90) {
      summary = 'Excellent! Your code has minimal security issues.';
    } else if (score >= 70) {
      summary = 'Good security posture with some areas for improvement.';
    } else if (score >= 50) {
      summary = 'Moderate security concerns. Review high-priority issues.';
    } else {
      summary = 'Critical security issues found. Immediate action recommended.';
    }

    if (issues.critical > 0) {
      summary += ` ${issues.critical} critical issue(s) need immediate attention.`;
    }

    return summary;
  }
}
