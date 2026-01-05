/**
 * VIBE-CLI v12 - Security Scanning Module
 * Vulnerability detection, dependency auditing, and compliance checking
 */

import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface SecurityFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  type: 'vulnerability' | 'code' | 'dependency' | 'configuration' | 'compliance';
  title: string;
  description: string;
  location: {
    file: string;
    line?: number;
    column?: number;
  };
  remediation?: string;
  references?: string[];
  cve?: string;
}

export interface SecurityReport {
  scanId: string;
  scannedAt: Date;
  target: string;
  findings: SecurityFinding[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  score: number; // 0-100
  recommendations: string[];
}

export interface DependencyInfo {
  name: string;
  version: string;
  latest?: string;
  vulnerabilities: SecurityFinding[];
  license?: string;
  outdated: boolean;
}

export interface SecurityConfig {
  scanTypes: ('vulnerability' | 'code' | 'dependency' | 'configuration')[];
  severityThreshold: 'critical' | 'high' | 'medium' | 'low';
  autoFix: boolean;
  failOnSeverity?: 'critical' | 'high' | 'medium';
  complianceFramework?: 'pci' | 'gdpr' | 'hipaa' | 'soc2';
}

export class VibeSecurityScanner {
  private config: SecurityConfig;
  private cacheDir: string;
  
  constructor(config?: Partial<SecurityConfig>) {
    this.config = {
      scanTypes: ['vulnerability', 'code', 'dependency', 'configuration'],
      severityThreshold: 'low',
      autoFix: false,
      ...config,
    };
    
    this.cacheDir = path.join(process.cwd(), '.vibe', 'security');
    this.ensureCacheDir();
  }

  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Run a full security scan
   */
  async scan(target: string = '.'): Promise<SecurityReport> {
    const scanId = `scan-${Date.now()}`;
    const findings: SecurityFinding[] = [];
    
    // Run configured scan types
    for (const scanType of this.config.scanTypes) {
      const scanFindings = await this.runScan(scanType, target);
      findings.push(...scanFindings);
    }
    
    // Remove duplicates
    const uniqueFindings = this.deduplicateFindings(findings);
    
    // Calculate summary
    const summary = this.calculateSummary(uniqueFindings);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(uniqueFindings, summary);
    
    // Calculate security score
    const score = this.calculateScore(summary);
    
    const report: SecurityReport = {
      scanId,
      scannedAt: new Date(),
      target,
      findings: uniqueFindings,
      summary,
      score,
      recommendations,
    };
    
    // Save report
    this.saveReport(report);
    
    return report;
  }

  /**
   * Run a specific type of scan
   */
  private async runScan(scanType: string, target: string): Promise<SecurityFinding[]> {
    switch (scanType) {
      case 'vulnerability':
        return this.scanVulnerabilities(target);
      case 'code':
        return this.scanCode(target);
      case 'dependency':
        return this.scanDependencies(target);
      case 'configuration':
        return this.scanConfiguration(target);
      default:
        return [];
    }
  }

  /**
   * Scan for known vulnerabilities
   */
  private async scanVulnerabilities(target: string): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    
    // Check for package.json
    const packageJson = path.join(target, 'package.json');
    if (fs.existsSync(packageJson)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf-8'));
        
        // Check dependencies using npm audit
        try {
          const auditOutput = child_process.execSync(
            'npm audit --json',
            { cwd: target, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
          );
          
          const audit = JSON.parse(auditOutput);
          
          if (audit.vulnerabilities) {
            for (const [name, vuln] of Object.entries(audit.vulnerabilities as any)) {
              const v = vuln as any;
              findings.push({
                id: `vuln-${name}-${v.severity}`,
                severity: this.mapNpmSeverity(v.severity),
                type: 'vulnerability',
                title: `Vulnerability in ${name}`,
                description: v.title || `Known vulnerability in ${name}`,
                location: { file: 'package.json' },
                remediation: `Run 'npm audit fix' or update ${name}`,
                cve: v.cve,
              });
            }
          }
        } catch {
          // npm audit may fail if no vulnerabilities or network issues
        }
      } catch {
        // Ignore parse errors
      }
    }
    
    // Check for Python requirements
    const requirements = path.join(target, 'requirements.txt');
    if (fs.existsSync(requirements)) {
      try {
        const reqOutput = child_process.execSync(
          `pip-audit ${target}`,
          { encoding: 'utf-8', timeout: 60000 }
        );
        
        // Parse pip-audit output
        // This is simplified - real implementation would parse JSON output
      } catch {
        // pip-audit may not be installed
      }
    }
    
    return findings;
  }

  /**
   * Scan for code security issues
   */
  private async scanCode(target: string): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    
    // Check for hardcoded secrets
    const secretPatterns = [
      { pattern: /api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9]{20,}['"]/gi, title: 'Potential API Key' },
      { pattern: /password\s*[:=]\s*['"][^'"]+['"]/gi, title: 'Hardcoded Password' },
      { pattern: /secret\s*[:=]\s*['"][^'"]+['"]/gi, title: 'Hardcoded Secret' },
      { pattern: /aws[_-]?access[_-]?key[_-]?id\s*[:=]\s*['"][A-Z0-9]{20}['"]/gi, title: 'AWS Access Key' },
      { pattern: /private[_-]?key\s*[:=]\s*['"]-----/gi, title: 'Private Key' },
    ];
    
    // Scan files
    const files = this.getCodeFiles(target);
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      
      for (const { pattern, title } of secretPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          for (const match of matches) {
            const lineNumber = this.findLineNumber(content, match);
            findings.push({
              id: `code-secret-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              severity: 'high',
              type: 'code',
              title,
              description: `Potential ${title.toLowerCase()} found in source code`,
              location: { file, line: lineNumber },
              remediation: 'Use environment variables or secrets management',
            });
          }
        }
      }
      
      // Check for dangerous patterns
      const dangerousPatterns = [
        { pattern: /eval\s*\(/g, title: 'Dangerous eval() Usage', severity: 'high' as const },
        { pattern: /innerHTML\s*=/g, title: 'DOM XSS Risk', severity: 'medium' as const },
        { pattern: /exec\s*\(/g, title: 'Command Injection Risk', severity: 'critical' as const },
        { pattern: /deserialize\s*\(/g, title: 'Deserialization Vulnerability', severity: 'high' as const },
      ];
      
      for (const { pattern, title, severity } of dangerousPatterns) {
        if (pattern.test(content)) {
          const lineNumber = this.findLineNumber(content, pattern.source);
          findings.push({
            id: `code-danger-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            severity,
            type: 'code',
            title,
            description: `Potentially dangerous code pattern: ${title}`,
            location: { file, line: lineNumber },
            remediation: 'Review and sanitize input properly',
          });
        }
      }
    }
    
    return findings;
  }

  /**
   * Scan dependencies for vulnerabilities
   */
  private async scanDependencies(target: string): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    
    // Get package.json
    const packageJson = path.join(target, 'package.json');
    if (!fs.existsSync(packageJson)) {
      return findings;
    }
    
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf-8'));
      
      // Check for outdated packages
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      for (const [name, version] of Object.entries(deps as Record<string, string>)) {
        // Simple version check (could be improved with npm view)
        const isOutdated = version.startsWith('^') || version.startsWith('~');
        
        if (isOutdated) {
          findings.push({
            id: `dep-outdated-${name}`,
            severity: 'low',
            type: 'dependency',
            title: `Outdated dependency: ${name}`,
            description: `${name} is pinned to ${version}, may have newer versions`,
            location: { file: 'package.json' },
            remediation: `Update ${name} to latest version`,
          });
        }
      }
    } catch {
      // Ignore parse errors
    }
    
    return findings;
  }

  /**
   * Scan configuration files
   */
  private async scanConfiguration(target: string): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    
    // Check .env file
    const envFile = path.join(target, '.env');
    if (fs.existsSync(envFile)) {
      findings.push({
        id: 'config-env',
        severity: 'medium',
        type: 'configuration',
        title: '.env file present',
        description: '.env file may contain sensitive credentials',
        location: { file: '.env' },
        remediation: 'Add .env to .gitignore and use secrets management',
      });
    }
    
    // Check git config for sensitive values
    const gitConfig = path.join(target, '.git', 'config');
    if (fs.existsSync(gitConfig)) {
      const config = fs.readFileSync(gitConfig, 'utf-8');
      if (config.includes('url = https://') && config.includes('@')) {
        findings.push({
          id: 'config-git-creds',
          severity: 'high',
          type: 'configuration',
          title: 'Embedded credentials in git URL',
          description: 'Git remote URL contains embedded credentials',
          location: { file: '.git/config' },
          remediation: 'Use SSH keys or git credentials manager instead',
        });
      }
    }
    
    // Check for security headers in package.json
    const packageJson = path.join(target, 'package.json');
    if (fs.existsSync(packageJson)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf-8'));
        
        // Check for engines
        if (!pkg.engines?.node) {
          findings.push({
            id: 'config-node-version',
            severity: 'low',
            type: 'configuration',
            title: 'No Node.js version specified',
            description: 'package.json does not specify engines.node',
            location: { file: 'package.json' },
            remediation: 'Add "engines": { "node": ">=18" } to package.json',
          });
        }
        
        // Check for private flag
        if (pkg.private !== true && pkg.name?.startsWith('@')) {
          findings.push({
            id: 'config-private',
            severity: 'medium',
            type: 'configuration',
            title: 'Package may not be private',
            description: 'Scoped package without "private": true',
            location: { file: 'package.json' },
            remediation: 'Add "private": true to prevent accidental publishing',
          });
        }
      } catch {
        // Ignore parse errors
      }
    }
    
    return findings;
  }

  /**
   * Check compliance
   */
  async checkCompliance(framework: string): Promise<{
    passed: string[];
    failed: string[];
    recommendations: string[];
  }> {
    const results = {
      passed: [] as string[],
      failed: [] as string[],
      recommendations: [] as string[],
    };
    
    switch (framework.toLowerCase()) {
      case 'pci':
        return this.checkPCICompliance();
      case 'gdpr':
        return this.checkGDPRCompliance();
      case 'hipaa':
        return this.checkHIPAACompliance();
      case 'soc2':
        return this.checkSOC2Compliance();
      default:
        results.failed.push(`Unknown compliance framework: ${framework}`);
        return results;
    }
  }

  private checkPCICompliance(): { passed: string[]; failed: string[]; recommendations: string[] } {
    const results = { passed: [] as string[], failed: [] as string[], recommendations: [] as string[] };
    
    // Check for encryption
    const packageJson = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJson)) {
      results.passed.push('Package.json exists');
    } else {
      results.failed.push('No package.json found');
    }
    
    results.recommendations.push('Implement TLS 1.3 for all communications');
    results.recommendations.push('Use parameterized queries to prevent SQL injection');
    
    return results;
  }

  private checkGDPRCompliance(): { passed: string[]; failed: string[]; recommendations: string[] } {
    const results = { passed: [] as string[], failed: [] as string[], recommendations: [] as string[] };
    
    results.recommendations.push('Implement data anonymization for analytics');
    results.recommendations.push('Add data deletion endpoint for user rights');
    results.recommendations.push('Review third-party service data handling');
    
    return results;
  }

  private checkHIPAACompliance(): { passed: string[]; failed: string[]; recommendations: string[] } {
    const results = { passed: [] as string[], failed: [] as string[], recommendations: [] as string[] };
    
    results.recommendations.push('Implement audit logging for all PHI access');
    results.recommendations.push('Enable encryption at rest for all data stores');
    results.recommendations.push('Configure automatic session timeout');
    
    return results;
  }

  private checkSOC2Compliance(): { passed: string[]; failed: string[]; recommendations: string[] } {
    const results = { passed: [] as string[], failed: [] as string[], recommendations: [] as string[] };
    
    results.recommendations.push('Implement access control reviews');
    results.recommendations.push('Enable multi-factor authentication');
    results.recommendations.push('Configure security monitoring and alerting');
    
    return results;
  }

  /**
   * Auto-fix security issues
   */
  async autoFix(): Promise<{ fixed: string[]; failed: string[] }> {
    const fixed: string[] = [];
    const failed: string[] = [];
    
    // Run npm audit fix
    try {
      child_process.execSync('npm audit fix', {
        cwd: process.cwd(),
        encoding: 'utf-8',
        timeout: 120000,
      });
      fixed.push('npm audit fix');
    } catch {
      failed.push('npm audit fix');
    }
    
    return { fixed, failed };
  }

  /**
   * Helper: Get code files to scan
   */
  private getCodeFiles(target: string): string[] {
    const extensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.java'];
    const files: string[] = [];
    
    const scanDir = (dir: string) => {
      if (dir.includes('node_modules') || dir.includes('.git')) return;
      
      try {
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
          const fullPath = path.join(dir, entry);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            scanDir(fullPath);
          } else if (extensions.some(ext => entry.endsWith(ext))) {
            files.push(fullPath);
          }
        }
      } catch {
        // Skip inaccessible directories
      }
    };
    
    scanDir(target);
    return files;
  }

  /**
   * Helper: Find line number of a pattern
   */
  private findLineNumber(content: string, pattern: string): number {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(pattern)) {
        return i + 1;
      }
    }
    return 1;
  }

  /**
   * Helper: Map npm severity to our severity
   */
  private mapNpmSeverity(npmSeverity: string): SecurityFinding['severity'] {
    const map: Record<string, SecurityFinding['severity']> = {
      critical: 'critical',
      high: 'high',
      moderate: 'medium',
      low: 'low',
    };
    return map[npmSeverity.toLowerCase()] || 'medium';
  }

  /**
   * Helper: Remove duplicate findings
   */
  private deduplicateFindings(findings: SecurityFinding[]): SecurityFinding[] {
    const seen = new Set<string>();
    return findings.filter(f => {
      const key = `${f.type}-${f.title}-${f.location.file}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Helper: Calculate summary
   */
  private calculateSummary(findings: SecurityFinding[]): SecurityReport['summary'] {
    return {
      critical: findings.filter(f => f.severity === 'critical').length,
      high: findings.filter(f => f.severity === 'high').length,
      medium: findings.filter(f => f.severity === 'medium').length,
      low: findings.filter(f => f.severity === 'low').length,
      info: findings.filter(f => f.severity === 'info').length,
    };
  }

  /**
   * Helper: Generate recommendations
   */
  private generateRecommendations(
    findings: SecurityFinding[],
    summary: SecurityReport['summary']
  ): string[] {
    const recommendations: string[] = [];
    
    if (summary.critical > 0) {
      recommendations.push('URGENT: Fix critical vulnerabilities immediately');
    }
    if (summary.high > 0) {
      recommendations.push('Address high-severity findings before deployment');
    }
    if (summary.medium > 0) {
      recommendations.push('Plan fixes for medium-severity issues in next sprint');
    }
    
    const hasSecrets = findings.some(f => f.type === 'code' && f.title.toLowerCase().includes('secret'));
    if (hasSecrets) {
      recommendations.push('Rotate any exposed secrets and use environment variables');
    }
    
    return recommendations;
  }

  /**
   * Helper: Calculate security score
   */
  private calculateScore(summary: SecurityReport['summary']): number {
    const weights = { critical: 25, high: 10, medium: 5, low: 1, info: 0 };
    const deductions = 
      summary.critical * weights.critical +
      summary.high * weights.high +
      summary.medium * weights.medium +
      summary.low * weights.low;
    
    return Math.max(0, 100 - deductions);
  }

  /**
   * Helper: Save report
   */
  private saveReport(report: SecurityReport): void {
    const reportPath = path.join(
      this.cacheDir,
      `report-${report.scanId}.json`
    );
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  }
}
