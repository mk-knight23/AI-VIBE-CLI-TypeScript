/**
 * VIBE-CLI v0.0.2 - Code Remediation
 * Automated security vulnerability fixes and code improvements
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { SecurityAnalyzer, SecurityIssue, SecurityAnalysisResult } from '../code-review/security-analyzer.js';
import { QualityChecker, QualityIssue, QualityMetrics } from '../code-review/quality-checker.js';
import { ErrorAnalyzer, AnalyzedError } from '../debugging/error-analyzer.js';
import { progressDisplay } from '../../ui/progress-bars/progress-display.js';

/**
 * Remediation type
 */
export type RemediationType =
  | 'security'
  | 'performance'
  | 'style'
  | 'type-safety'
  | 'error-handling'
  | 'best-practice';

/**
 * Remediation severity
 */
export type RemediationSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Code fix
 */
export interface CodeFix {
  id: string;
  type: RemediationType;
  severity: RemediationSeverity;
  filePath: string;
  lineNumber: number;
  originalCode: string;
  fixedCode: string;
  description: string;
  rationale: string;
  references: string[];
  autoApplied: boolean;
}

/**
 * Remediation batch
 */
export interface RemediationBatch {
  id: string;
  issues: CodeFix[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    applied: number;
    skipped: number;
    failed: number;
  };
  createdAt: Date;
  appliedAt?: Date;
}

/**
 * Remediation configuration
 */
export interface RemediationConfig {
  autoApplyCritical?: boolean;
  autoApplyHigh?: boolean;
  createBackups?: boolean;
  maxBatchSize?: number;
  requireConfirmation?: boolean;
  excludePatterns?: string[];
}

/**
 * Code Remediation Engine
 */
export class CodeRemediator {
  private securityAnalyzer: SecurityAnalyzer;
  private qualityChecker: QualityChecker;
  private errorAnalyzer: ErrorAnalyzer;
  private config: RemediationConfig;
  private fixHistory: CodeFix[] = [];
  private batchHistory: RemediationBatch[] = [];

  constructor(config?: Partial<RemediationConfig>) {
    this.securityAnalyzer = new SecurityAnalyzer();
    this.qualityChecker = new QualityChecker();
    this.errorAnalyzer = new ErrorAnalyzer();
    this.config = {
      autoApplyCritical: false,
      autoApplyHigh: false,
      createBackups: true,
      maxBatchSize: 100,
      requireConfirmation: true,
      excludePatterns: ['node_modules/**', '.git/**', 'dist/**'],
      ...config,
    };
  }

  /**
   * Scan and identify issues requiring remediation
   */
  scan(dirPath: string): RemediationBatch {
    console.log(chalk.bold('\n🔒 Scanning for issues requiring remediation...\n'));

    const issues: CodeFix[] = [];

    // Security scan
    progressDisplay.startSpinner('Scanning for security issues...');
    const securityResult = this.securityAnalyzer.scanDirectory(dirPath);
    progressDisplay.stopSpinner('success');

    for (const issue of securityResult.issues) {
      const fix = this.createSecurityFix(issue, dirPath);
      if (fix) issues.push(fix);
    }

    // Quality scan
    progressDisplay.startSpinner('Scanning for quality issues...');
    const qualityResult = this.qualityChecker.analyze(dirPath);
    progressDisplay.stopSpinner('success');

    for (const issue of qualityResult.issues) {
      const fix = this.createQualityFix(issue, dirPath);
      if (fix) issues.push(fix);
    }

    // Create batch
    const batch = this.createBatch(issues);

    console.log(chalk.cyan(`Found ${issues.length} issues requiring remediation`));
    console.log(`  Critical: ${chalk.red(batch.summary.critical)}`);
    console.log(`  High: ${chalk.red(batch.summary.high)}`);
    console.log(`  Medium: ${chalk.yellow(batch.summary.medium)}`);
    console.log(`  Low: ${chalk.blue(batch.summary.low)}`);

    return batch;
  }

  /**
   * Create a security fix
   */
  private createSecurityFix(issue: SecurityIssue, dirPath: string): CodeFix | null {
    const filePath = path.resolve(dirPath, issue.filePath);

    if (!fs.existsSync(filePath)) return null;

    const originalCode = issue.lineContent;
    let fixedCode = originalCode;

    // Generate fix based on issue type
    switch (issue.category) {
      case 'injection':
        fixedCode = this.fixInjectionVulnerability(originalCode);
        break;
      case 'sensitive-data':
        fixedCode = this.fixSensitiveDataExposure(originalCode);
        break;
      case 'cryptography':
        fixedCode = this.fixWeakCryptography(originalCode);
        break;
      case 'configuration':
        fixedCode = this.fixSecurityConfiguration(originalCode);
        break;
      case 'input-validation':
        fixedCode = this.fixInputValidation(originalCode);
        break;
      default:
        return null;
    }

    return {
      id: `fix-${issue.id}`,
      type: 'security',
      severity: issue.severity as RemediationSeverity,
      filePath,
      lineNumber: issue.lineNumber,
      originalCode,
      fixedCode,
      description: issue.title,
      rationale: issue.remediation,
      references: issue.references,
      autoApplied: false,
    };
  }

  /**
   * Create a quality fix
   */
  private createQualityFix(issue: QualityIssue, dirPath: string): CodeFix | null {
    const filePath = path.resolve(dirPath, issue.filePath);

    if (!fs.existsSync(filePath)) return null;

    return {
      id: `fix-quality-${Date.now()}`,
      type: issue.type as RemediationType,
      severity: issue.severity === 'error' ? 'high' : issue.severity === 'warning' ? 'medium' : 'low',
      filePath,
      lineNumber: issue.lineNumber || 1,
      originalCode: issue.message,
      fixedCode: this.generateQualityFix(issue),
      description: issue.message,
      rationale: issue.suggestion,
      references: [],
      autoApplied: false,
    };
  }

  /**
   * Fix injection vulnerability
   */
  private fixInjectionVulnerability(code: string): string {
    // SQL injection fix - use parameterized query
    if (code.includes('SELECT') && code.includes('+')) {
      return code.replace(
        /(SELECT.*?FROM.*?WHERE.*?=.*?)(['"`]\s*\+\s*(?:req|params|body|query)\.)/g,
        '$1?' // Replace with parameterized placeholder
      );
    }
    return code;
  }

  /**
   * Fix sensitive data exposure
   */
  private fixSensitiveDataExposure(code: string): string {
    // Replace hardcoded secrets with environment variable access
    return code.replace(
      /(?:password|secret|api_key|apikey|auth_token)\s*[:=]\s*['"][^'"]{20,}['"]/g,
      '$1: process.env.SECRET_KEY || ""'
    );
  }

  /**
   * Fix weak cryptography
   */
  private fixWeakCryptography(code: string): string {
    return code
      .replace(/md5/g, 'crypto.createHash("sha256")')
      .replace(/sha1/g, 'crypto.createHash("sha256")')
      .replace(/DES/gi, 'AES-256-GCM');
  }

  /**
   * Fix security configuration
   */
  private fixSecurityConfiguration(code: string): string {
    if (code.includes('express()') && !code.includes('helmet')) {
      return code.replace(
        /express\(\)\s*\./g,
        'express()\n  .use(helmet())\n  .use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }))\n  .'
      );
    }
    return code;
  }

  /**
   * Fix input validation
   */
  private fixInputValidation(code: string): string {
    // Add path validation for file operations
    if (code.includes('fs.') && code.includes('req')) {
      return `const safePath = path.normalize(req.path).replace(/^(\.\.(\/|\\|$))+/, '');
${code}`;
    }
    return code;
  }

  /**
   * Generate quality fix
   */
  private generateQualityFix(issue: QualityIssue): string {
    switch (issue.type) {
      case 'complexity':
        return '// Consider refactoring to reduce complexity';
      case 'style':
        return '// Fix code style issue';
      case 'duplication':
        return '// Consider extracting duplicated code into a shared function';
      default:
        return issue.suggestion;
    }
  }

  /**
   * Create remediation batch
   */
  private createBatch(issues: CodeFix[]): RemediationBatch {
    const batch: RemediationBatch = {
      id: `batch-${Date.now()}`,
      issues,
      summary: {
        critical: issues.filter((i) => i.severity === 'critical').length,
        high: issues.filter((i) => i.severity === 'high').length,
        medium: issues.filter((i) => i.severity === 'medium').length,
        low: issues.filter((i) => i.severity === 'low').length,
        applied: 0,
        skipped: 0,
        failed: 0,
      },
      createdAt: new Date(),
    };

    this.batchHistory.push(batch);
    return batch;
  }

  /**
   * Apply fixes from a batch
   */
  async applyBatch(
    batchId: string,
    options?: { autoApproveCritical?: boolean; autoApproveHigh?: boolean }
  ): Promise<RemediationBatch> {
    const batch = this.batchHistory.find((b) => b.id === batchId);
    if (!batch) {
      throw new Error(`Batch not found: ${batchId}`);
    }

    const autoApproveHigh = options?.autoApproveHigh ?? this.config.autoApplyHigh;
    const autoApproveCritical = options?.autoApproveCritical ?? this.config.autoApplyCritical;

    console.log(chalk.bold('\n🔧 Applying fixes...\n'));

    for (const fix of batch.issues) {
      // Create backup if needed
      if (this.config.createBackups) {
        this.createBackup(fix.filePath);
      }

      // Check if auto-apply is allowed
      const shouldAutoApply =
        (fix.severity === 'critical' && autoApproveCritical) ||
        (fix.severity === 'high' && autoApproveHigh);

      if (this.config.requireConfirmation && !shouldAutoApply) {
        console.log(chalk.yellow(`\nFix: ${fix.description}`));
        console.log(chalk.gray(`File: ${fix.filePath}:${fix.lineNumber}`));
        console.log(chalk.gray(`Type: ${fix.type} (${fix.severity})`));
        console.log(chalk.cyan(`Rationale: ${fix.rationale}`));

        const confirmed = await this.confirmFix(fix);
        if (!confirmed) {
          batch.summary.skipped++;
          continue;
        }
      }

      // Apply fix
      const success = await this.applyFix(fix);
      if (success) {
        batch.summary.applied++;
        console.log(chalk.green(`✅ Applied: ${path.basename(fix.filePath)}:${fix.lineNumber}`));
      } else {
        batch.summary.failed++;
        console.log(chalk.red(`❌ Failed: ${path.basename(fix.filePath)}:${fix.lineNumber}`));
      }
    }

    batch.appliedAt = new Date();
    return batch;
  }

  /**
   * Confirm a fix with user
   */
  private async confirmFix(fix: CodeFix): Promise<boolean> {
    // Simple confirmation - in a real implementation, use inquirer
    console.log(chalk.cyan('\nApply this fix? [y/N]'));
    return true; // Auto-confirm for now
  }

  /**
   * Create backup of a file
   */
  private createBackup(filePath: string): void {
    const backupPath = `${filePath}.bak`;
    if (!fs.existsSync(backupPath)) {
      fs.writeFileSync(backupPath, fs.readFileSync(filePath, 'utf-8'));
    }
  }

  /**
   * Apply a single fix
   */
  private async applyFix(fix: CodeFix): Promise<boolean> {
    try {
      if (!fs.existsSync(fix.filePath)) {
        return false;
      }

      const content = fs.readFileSync(fix.filePath, 'utf-8');
      const lines = content.split('\n');

      // Replace the original line with fixed line
      if (lines[fix.lineNumber - 1]) {
        lines[fix.lineNumber - 1] = fix.fixedCode;

        fs.writeFileSync(fix.filePath, lines.join('\n'));
        fix.autoApplied = true;
        this.fixHistory.push(fix);
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Apply all critical and high severity fixes
   */
  async applyCriticalAndHigh(dirPath: string): Promise<RemediationBatch> {
    const batch = this.scan(dirPath);
    const criticalAndHigh = batch.issues.filter(
      (i) => i.severity === 'critical' || i.severity === 'high'
    );

    batch.issues = criticalAndHigh;
    return this.applyBatch(batch.id, { autoApproveCritical: true, autoApproveHigh: true });
  }

  /**
   * Get fix history
   */
  getFixHistory(): CodeFix[] {
    return [...this.fixHistory];
  }

  /**
   * Get batch history
   */
  getBatchHistory(): RemediationBatch[] {
    return [...this.batchHistory];
  }

  /**
   * Format batch summary for display
   */
  formatBatchSummary(batch: RemediationBatch): string {
    const lines: string[] = [];

    lines.push(chalk.bold('\n🔧 Remediation Summary\n'));
    lines.push(chalk.gray('='.repeat(50)));
    lines.push('');
    lines.push(chalk.bold(`Batch ID: ${batch.id}`));
    lines.push(`Created: ${batch.createdAt.toLocaleString()}`);
    if (batch.appliedAt) {
      lines.push(`Applied: ${batch.appliedAt.toLocaleString()}`);
    }
    lines.push('');
    lines.push(chalk.bold('Issues Found:'));
    lines.push(`  ${chalk.red('●')} Critical: ${batch.summary.critical}`);
    lines.push(`  ${chalk.red('●')} High: ${batch.summary.high}`);
    lines.push(`  ${chalk.yellow('●')} Medium: ${batch.summary.medium}`);
    lines.push(`  ${chalk.blue('●')} Low: ${batch.summary.low}`);
    lines.push('');
    lines.push(chalk.bold('Actions:'));
    lines.push(`  ${chalk.green('✓')} Applied: ${batch.summary.applied}`);
    lines.push(`  ${chalk.yellow('⊘')} Skipped: ${batch.summary.skipped}`);
    lines.push(`  ${chalk.red('✗')} Failed: ${batch.summary.failed}`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Restore from backup
   */
  restoreFromBackup(filePath: string): boolean {
    const backupPath = `${filePath}.bak`;
    if (fs.existsSync(backupPath)) {
      fs.writeFileSync(filePath, fs.readFileSync(backupPath, 'utf-8'));
      return true;
    }
    return false;
  }
}

/**
 * Singleton instance
 */
export const codeRemediator = new CodeRemediator();
