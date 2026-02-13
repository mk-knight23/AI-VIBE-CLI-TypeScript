/**
 * VIBE-CLI v0.0.2 - Quality Checker
 * Code complexity, maintainability, and coverage analysis
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

/**
 * Quality metric types
 */
export type QualityMetricType = 'complexity' | 'duplication' | 'coverage' | 'maintainability' | 'style';

/**
 * Quality issue
 */
export interface QualityIssue {
  type: QualityMetricType;
  severity: 'error' | 'warning' | 'info';
  filePath: string;
  lineNumber?: number;
  message: string;
  suggestion: string;
  metric?: number;
  threshold?: number;
}

/**
 * Quality metrics result
 */
export interface QualityMetrics {
  overall: number;
  complexity: number;
  duplication: number;
  coverage: number;
  maintainability: number;
  issues: QualityIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

/**
 * Cyclomatic complexity result
 */
export interface ComplexityResult {
  filePath: string;
  functions: Array<{
    name: string;
    line: number;
    complexity: number;
    status: 'good' | 'warning' | 'critical';
  }>;
  fileComplexity: number;
}

/**
 * Quality Checker
 */
export class QualityChecker {
  private readonly config = {
    maxComplexity: 10,
    maxFileComplexity: 100,
    maxLineLength: 120,
    maxFunctionLength: 50,
    maxParameters: 5,
    maxNestedDepth: 4,
    minCoverage: 80,
  };

  /**
   * Analyze code quality for a directory
   */
  analyze(dirPath: string): QualityMetrics {
    const issues: QualityIssue[] = [];
    const { glob } = require('fast-glob');
    const files = glob.sync(['**/*.{ts,js,py}'], {
      cwd: dirPath,
      ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
    });

    let totalComplexity = 0;
    let fileCount = 0;

    for (const file of files) {
      const filePath = path.join(dirPath, file);

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        // Check line length
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].length > this.config.maxLineLength) {
            issues.push({
              type: 'style',
              severity: 'warning',
              filePath,
              lineNumber: i + 1,
              message: `Line exceeds ${this.config.maxLineLength} characters (${lines[i].length})`,
              suggestion: 'Break long lines into multiple lines',
            });
          }
        }

        // Calculate complexity
        const complexity = this.calculateComplexity(content);
        totalComplexity += complexity;
        fileCount++;

        if (complexity > this.config.maxFileComplexity) {
          issues.push({
            type: 'complexity',
            severity: 'warning',
            filePath,
            message: `File complexity ${complexity} exceeds threshold ${this.config.maxFileComplexity}`,
            suggestion: 'Consider splitting this file into smaller modules',
            metric: complexity,
            threshold: this.config.maxFileComplexity,
          });
        }

        // Check function complexity
        const functionComplexities = this.analyzeFunctionComplexity(content);
        for (const fc of functionComplexities) {
          if (fc.complexity > this.config.maxComplexity) {
            issues.push({
              type: 'complexity',
              severity: fc.complexity > this.config.maxComplexity * 2 ? 'error' : 'warning',
              filePath,
              lineNumber: fc.line,
              message: `Function "${fc.name}" has cyclomatic complexity ${fc.complexity}`,
              suggestion: `Refactor to reduce complexity (target: < ${this.config.maxComplexity})`,
              metric: fc.complexity,
              threshold: this.config.maxComplexity,
            });
          }
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    // Calculate overall metrics
    const avgComplexity = fileCount > 0 ? totalComplexity / fileCount : 0;
    const duplication = this.detectDuplication(files.map((f: string) => path.join(dirPath, f)));

    const duplicationIssues: Array<{ type: QualityMetricType; severity: 'error' | 'warning'; filePath: string; message: string; suggestion: string; metric: number }> = duplication.map((d) => ({
      type: 'duplication' as QualityMetricType,
      severity: d.percentage > 10 ? 'error' : 'warning',
      filePath: d.files[0],
      message: `Code duplication: ${d.percentage}% (${d.lines} lines duplicated)`,
      suggestion: 'Extract duplicated code into shared functions or utilities',
      metric: d.percentage,
    }));

    issues.push(...duplicationIssues);

    return {
      overall: this.calculateOverallScore(issues),
      complexity: Math.max(0, 100 - avgComplexity),
      duplication: Math.max(0, 100 - duplication.reduce((sum, d) => sum + d.percentage, 0) / duplication.length),
      coverage: 0, // Would be filled from coverage reports
      maintainability: this.calculateMaintainability(issues),
      issues,
      summary: {
        errors: issues.filter((i) => i.severity === 'error').length,
        warnings: issues.filter((i) => i.severity === 'warning').length,
        info: issues.filter((i) => i.severity === 'info').length,
      },
    };
  }

  /**
   * Calculate cyclomatic complexity
   */
  calculateComplexity(content: string): number {
    let complexity = 1; // Base complexity

    // Decision points
    const decisionPoints = [
      /\bif\b/g,
      /\belseif\b/gi,
      /\belse\b/g,
      /\bcase\b/g,
      /\bdefault\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bdo\b/g,
      /\bcatch\b/g,
      /\b\?\s*.*\s*:/g, // Ternary operator
    ];

    for (const pattern of decisionPoints) {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  /**
   * Analyze function-level complexity
   */
  analyzeFunctionComplexity(content: string): Array<{ name: string; line: number; complexity: number }> {
    const results: Array<{ name: string; line: number; complexity: number }> = [];
    const lines = content.split('\n');

    // Match function definitions
    const funcRegex = /(?:async\s+)?function\s+(\w+)\s*\(/g;
    let match;

    while ((match = funcRegex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      const funcBody = this.extractFunctionBody(content, match.index);
      const complexity = this.calculateComplexity(funcBody);

      results.push({
        name: match[1],
        line,
        complexity,
      });
    }

    // Match arrow functions
    const arrowRegex = /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[^=]+)=>/g;
    while ((match = arrowRegex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      const funcBody = this.extractFunctionBody(content, match.index);
      const complexity = this.calculateComplexity(funcBody);

      results.push({
        name: match[1],
        line,
        complexity,
      });
    }

    // Match class methods
    const methodRegex = /(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?:{|=)/g;
    const classBody = this.extractClassBody(content);
    while ((match = methodRegex.exec(classBody)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      const methodBody = this.extractFunctionBody(classBody, match.index);
      const complexity = this.calculateComplexity(methodBody);

      results.push({
        name: match[1],
        line,
        complexity,
      });
    }

    return results;
  }

  /**
   * Extract function body
   */
  private extractFunctionBody(content: string, startIndex: number): string {
    let braceCount = 0;
    let foundStart = false;
    let endIndex = startIndex;

    for (let i = startIndex; i < content.length; i++) {
      if (content[i] === '{') {
        braceCount++;
        foundStart = true;
      } else if (content[i] === '}') {
        braceCount--;
        if (foundStart && braceCount === 0) {
          endIndex = i;
          break;
        }
      }
    }

    return content.substring(startIndex, endIndex + 1);
  }

  /**
   * Extract class body
   */
  private extractClassBody(content: string): string {
    const classMatch = content.match(/class\s+\w+\s*(?:extends\s+\w+)?\s*(?:implements\s+[^{]+)?\s*{/);
    if (!classMatch || classMatch.index === undefined) return '';

    return this.extractFunctionBody(content, classMatch.index + classMatch[0].length - 1);
  }

  /**
   * Detect code duplication
   */
  detectDuplication(filePaths: string[]): Array<{ files: string[]; lines: number; percentage: number }> {
    const duplicates: Array<{ files: string[]; lines: number; percentage: number }> = [];
    const contentMap = new Map<string, string>();

    // Read all files
    for (const filePath of filePaths) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        // Normalize content for comparison
        const normalized = content.replace(/\s+/g, ' ').trim().toLowerCase();
        contentMap.set(filePath, normalized);
      } catch {
        // Skip unreadable files
      }
    }

    // Compare files for duplication
    const files = Array.from(contentMap.keys());
    const minDuplicationLength = 5; // Minimum lines to consider as duplication

    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        const content1 = contentMap.get(files[i]) || '';
        const content2 = contentMap.get(files[j]) || '';

        const duplication = this.findLongestCommonSubstring(content1, content2);
        if (duplication.length >= minDuplicationLength * 10) {
          duplicates.push({
            files: [files[i], files[j]],
            lines: Math.floor(duplication.length / 10),
            percentage: Math.min(100, Math.floor((duplication.length / Math.max(content1.length, content2.length)) * 100)),
          });
        }
      }
    }

    return duplicates;
  }

  /**
   * Find longest common substring (simplified)
   */
  private findLongestCommonSubstring(str1: string, str2: string): string {
    const matrix: number[][] = Array(str1.length + 1)
      .fill(null)
      .map(() => Array(str2.length + 1).fill(0));

    let maxLength = 0;
    let endIndex = 0;

    for (let i = 1; i <= str1.length; i++) {
      for (let j = 1; j <= str2.length; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1] + 1;
          if (matrix[i][j] > maxLength) {
            maxLength = matrix[i][j];
            endIndex = i;
          }
        } else {
          matrix[i][j] = 0;
        }
      }
    }

    return str1.substring(endIndex - maxLength, endIndex);
  }

  /**
   * Calculate overall quality score
   */
  private calculateOverallScore(issues: QualityIssue[]): number {
    const weights = { error: 10, warning: 3, info: 1 };
    const totalDeduction = issues.reduce((sum, issue) => sum + weights[issue.severity], 0);

    return Math.max(0, Math.min(100, 100 - totalDeduction / 2));
  }

  /**
   * Calculate maintainability score
   */
  private calculateMaintainability(issues: QualityIssue[]): number {
    const complexityIssues = issues.filter((i) => i.type === 'complexity');
    const styleIssues = issues.filter((i) => i.type === 'style');

    const complexityPenalty = complexityIssues.length * 5;
    const stylePenalty = styleIssues.length * 1;

    return Math.max(0, Math.min(100, 100 - complexityPenalty - stylePenalty));
  }

  /**
   * Format quality report
   */
  formatReport(metrics: QualityMetrics): string {
    const lines: string[] = [];

    lines.push(chalk.bold('\n📊 Quality Analysis Report\n'));
    lines.push(chalk.gray('='.repeat(50)));
    lines.push('');

    // Overall score
    const scoreColor = metrics.overall > 80 ? 'green' : metrics.overall > 60 ? 'yellow' : 'red';
    lines.push(chalk.bold(`Overall Score: ${chalk[scoreColor](metrics.overall.toFixed(1))}/100`));
    lines.push('');

    // Metrics breakdown
    lines.push(chalk.bold('Metrics:'));
    lines.push(`  Complexity:     ${this.formatMetric(metrics.complexity)}/100`);
    lines.push(`  Duplication:    ${this.formatMetric(metrics.duplication)}/100`);
    lines.push(`  Coverage:       ${this.formatMetric(metrics.coverage)}/100`);
    lines.push(`  Maintainability: ${this.formatMetric(metrics.maintainability)}/100`);
    lines.push('');

    // Summary
    lines.push(chalk.bold('Summary:'));
    lines.push(`  Errors:   ${chalk.red(metrics.summary.errors)}`);
    lines.push(`  Warnings: ${chalk.yellow(metrics.summary.warnings)}`);
    lines.push(`  Info:     ${chalk.blue(metrics.summary.info)}`);
    lines.push('');

    // Issues
    if (metrics.issues.length > 0) {
      lines.push(chalk.bold('Top Issues:'));
      const topIssues = metrics.issues.slice(0, 10);

      for (const issue of topIssues) {
        const severityIcon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        lines.push(`${severityIcon} ${issue.message}`);
        lines.push(chalk.gray(`   File: ${path.basename(issue.filePath)}${issue.lineNumber ? `:${issue.lineNumber}` : ''}`));
        lines.push(chalk.cyan(`   Suggestion: ${issue.suggestion}`));
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Format metric with color
   */
  private formatMetric(value: number): string {
    if (value >= 80) return chalk.green(value.toFixed(1));
    if (value >= 60) return chalk.yellow(value.toFixed(1));
    return chalk.red(value.toFixed(1));
  }
}

/**
 * Singleton instance
 */
export const qualityChecker = new QualityChecker();
