/**
 * VIBE-CLI v0.0.2 - Pattern Recognizer
 * Identify and refactor code patterns at scale
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { progressDisplay } from '../../ui/progress-bars/progress-display.js';

/**
 * Pattern category
 */
export type PatternCategory =
  | 'anti-pattern'
  | 'design-pattern'
  | 'code-smell'
  | 'performance'
  | 'security'
  | 'style'
  | 'architecture';

/**
 * Pattern severity
 */
export type PatternSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * Recognized pattern
 */
export interface RecognizedPattern {
  id: string;
  name: string;
  category: PatternCategory;
  severity: PatternSeverity;
  description: string;
  occurrences: PatternOccurrence[];
  suggestion: string;
  refactoredCode?: string;
}

/**
 * Pattern occurrence
 */
export interface PatternOccurrence {
  filePath: string;
  lineNumber: number;
  lineContent: string;
  context: string;
  matchScore: number;
}

/**
 * Refactoring suggestion
 */
export interface RefactoringSuggestion {
  patternId: string;
  filePath: string;
  lineNumber: number;
  originalCode: string;
  refactoredCode: string;
  rationale: string;
  confidence: number;
  risks: string[];
  effort: 'low' | 'medium' | 'high';
}

/**
 * Refactoring result
 */
export interface RefactoringResult {
  success: boolean;
  suggestions: RefactoringSuggestion[];
  applied: number;
  failed: number;
  backups: string[];
}

/**
 * Pattern definition
 */
interface PatternDefinition {
  id: string;
  name: string;
  category: PatternCategory;
  severity: PatternSeverity;
  description: string;
  pattern: RegExp;
  suggestion: string;
  getRefactoredCode?: (match: RegExpMatchArray) => string;
}

/**
 * Pattern Recognizer
 */
export class PatternRecognizer {
  private readonly patterns: Map<string, PatternDefinition>;
  private readonly recognizedPatterns: RecognizedPattern[] = [];

  constructor() {
    this.patterns = new Map();
    this.initializePatterns();
  }

  /**
   * Initialize pattern definitions
   */
  private initializePatterns(): void {
    // Anti-patterns
    this.addPattern({
      id: 'GOD_OBJECT',
      name: 'God Object',
      category: 'anti-pattern',
      severity: 'high',
      description: 'A class that knows too much or does too much',
      pattern: /class\s+\w+\s*{[^}]{500,}/g,
      suggestion: 'Split this class into smaller, focused classes using Single Responsibility Principle',
    });

    this.addPattern({
      id: 'SPAGHETTI_CODE',
      name: 'Spaghetti Code',
      category: 'anti-pattern',
      severity: 'high',
      description: 'Code with tangled control flow and deep nesting',
      pattern: /\bif\s*\([^)]*\)\s*{[^}]{0,50}\s*if\s*\([^)]*\)\s*{[^}]{0,50}\s*if\s*\([^)]*\)\s*{/g,
      suggestion: 'Refactor nested conditionals using early returns, guard clauses, or strategy pattern',
    });

    this.addPattern({
      id: 'CUT_AND_PASTE',
      name: 'Copy-Paste Programming',
      category: 'anti-pattern',
      severity: 'medium',
      description: 'Duplicated code blocks across files',
      pattern: /\b(\w{30,})\b/g,
      suggestion: 'Extract duplicated code into shared functions or utilities',
    });

    // Code smells
    this.addPattern({
      id: 'LONG_METHOD',
      name: 'Long Method',
      category: 'code-smell',
      severity: 'medium',
      description: 'Method with too many lines of code',
      pattern: /(?:async\s+)?function\s+\w+\s*\([^)]*\)\s*{[^}]{100,}}/g,
      suggestion: 'Extract smaller functions from this method',
    });

    this.addPattern({
      id: 'LARGE_CLASS',
      name: 'Large Class',
      category: 'code-smell',
      severity: 'medium',
      description: 'Class with too many properties/methods',
      pattern: /class\s+\w+\s*{[^}]{300,}/g,
      suggestion: 'Consider splitting this class using Single Responsibility Principle',
    });

    this.addPattern({
      id: 'MAGIC_NUMBERS',
      name: 'Magic Numbers',
      category: 'code-smell',
      severity: 'low',
      description: 'Hardcoded numeric values without explanation',
      pattern: /(?<![a-zA-Z0-9_])([2-9]|\d{2,})(?![a-zA-Z0-9_])/g,
      suggestion: 'Replace magic numbers with named constants',
      getRefactoredCode: (match) => `/* ${match[0]} should be a constant */`,
    });

    this.addPattern({
      id: 'HARD_CODED_STRINGS',
      name: 'Hard-coded Strings',
      category: 'code-smell',
      severity: 'low',
      description: 'Strings that should be configurable',
      pattern: /"(?:error|success|warning|info|loading)"[:\s]/gi,
      suggestion: 'Extract strings into i18n files or constants',
    });

    // Performance patterns
    this.addPattern({
      id: 'N_PLUS_ONE',
      name: 'N+1 Query Problem',
      category: 'performance',
      severity: 'high',
      description: 'Database query inside a loop',
      pattern: /for\s*\([^)]*\)\s*{[^}]*query|forEach\s*\([^)]*\)\s*=>\s*[^}]*select/gi,
      suggestion: 'Use batch queries or eager loading instead of querying in loops',
    });

    this.addPattern({
      id: 'INEFFICIENT_STRING',
      name: 'Inefficient String Concatenation',
      category: 'performance',
      severity: 'medium',
      description: 'Using + for string concatenation in loops',
      pattern: /for\s*\([^)]*\)\s*{[^}]*\+=.*;/g,
      suggestion: 'Use array join or StringBuilder for string concatenation in loops',
    });

    this.addPattern({
      id: 'UNNECESSARY_OBJECT',
      name: 'Unnecessary Object Creation',
      category: 'performance',
      severity: 'low',
      description: 'Creating objects inside render or hot paths',
      pattern: /render\s*\([^)]*\)\s*{[^}]*new\s+\w+\(/g,
      suggestion: 'Move object creation outside of render methods',
    });

    // Security patterns
    this.addPattern({
      id: 'SQL_INJECTION',
      name: 'SQL Injection Vulnerability',
      category: 'security',
      severity: 'critical',
      description: 'Potential SQL injection via string concatenation',
      pattern: /(?:select|insert|update|delete).*?\+\s*(?:req|params|body|query)/gi,
      suggestion: 'Use parameterized queries instead of string concatenation',
    });

    this.addPattern({
      id: 'XSS_VULNERABILITY',
      name: 'XSS Vulnerability',
      category: 'security',
      severity: 'critical',
      description: 'Potential cross-site scripting via innerHTML',
      pattern: /innerHTML\s*=\s*(?!['"`]\s*['"`])/g,
      suggestion: 'Use textContent or sanitize user input before rendering',
    });

    this.addPattern({
      id: 'SENSITIVE_DATA_LOGGING',
      name: 'Sensitive Data in Logs',
      category: 'security',
      severity: 'high',
      description: 'Logging sensitive information',
      pattern: /(?:console\.(?:log|error|warn).*password|token|secret|key)/gi,
      suggestion: 'Remove sensitive data from log statements',
    });

    // Style patterns
    this.addPattern({
      id: 'VAR_USAGE',
      name: 'Deprecated Var Usage',
      category: 'style',
      severity: 'low',
      description: 'Using var instead of let/const',
      pattern: /\bvar\s+/g,
      suggestion: 'Replace var with let or const for better scoping',
    });

    this.addPattern({
      id: 'CONSOLE_LOG_REMAINING',
      name: 'Remaining Console Statements',
      category: 'style',
      severity: 'info',
      description: 'Console.log statements left in code',
      pattern: /console\.(?:log|debug)\s*\(/g,
      suggestion: 'Remove or replace with proper logging',
    });

    this.addPattern({
      id: 'PROMISE_NOT_HANDLED',
      name: 'Unhandled Promise',
      category: 'style',
      severity: 'medium',
      description: 'Promise without catch handler',
      pattern: /\.then\s*\([^)]*\)(?!\s*\.catch)/g,
      suggestion: 'Add .catch() handler or use try/catch with async/await',
    });
  }

  /**
   * Add a pattern definition
   */
  private addPattern(pattern: PatternDefinition): void {
    this.patterns.set(pattern.id, pattern);
  }

  /**
   * Scan a directory for patterns
   */
  scanDirectory(dirPath: string): RecognizedPattern[] {
    console.log(chalk.bold('\n🔍 Scanning for code patterns...\n'));
    this.recognizedPatterns.length = 0;

    const { glob } = require('fast-glob');
    const files = glob.sync(['**/*.{ts,js,py,java,go,rb,php}'], {
      cwd: dirPath,
      ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
    });

    progressDisplay.startProgress(files.length, 'Scanning patterns');

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      this.scanFile(filePath);
      progressDisplay.incrementProgress(1);
    }

    progressDisplay.completeProgress('Pattern scan complete');

    // Group and sort results
    this.aggregateResults();

    console.log(chalk.cyan(`\nFound ${this.recognizedPatterns.length} pattern types`));
    for (const pattern of this.recognizedPatterns) {
      console.log(`  ${pattern.name}: ${pattern.occurrences.length} occurrences`);
    }

    return this.recognizedPatterns;
  }

  /**
   * Scan a single file for patterns
   */
  scanFile(filePath: string): void {
    if (!fs.existsSync(filePath)) return;

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      for (const [id, pattern] of this.patterns) {
        let match;
        const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);

        while ((match = regex.exec(content)) !== null) {
          const lineNumber = content.substring(0, match.index).split('\n').length;
          const lineContent = lines[lineNumber - 1] || '';
          const context = this.getContext(lines, lineNumber - 1);

          // Find or create pattern entry
          let patternEntry = this.recognizedPatterns.find((p) => p.id === id);
          if (!patternEntry) {
            patternEntry = {
              id: pattern.id,
              name: pattern.name,
              category: pattern.category,
              severity: pattern.severity,
              description: pattern.description,
              occurrences: [],
              suggestion: pattern.suggestion,
            };
            this.recognizedPatterns.push(patternEntry);
          }

          patternEntry.occurrences.push({
            filePath,
            lineNumber,
            lineContent: lineContent.trim(),
            context,
            matchScore: this.calculateMatchScore(match),
          });
        }
      }
    } catch {
      // Skip unreadable files
    }
  }

  /**
   * Calculate match score for a pattern
   */
  private calculateMatchScore(match: RegExpMatchArray): number {
    // Simple scoring based on match length
    return Math.min(1.0, match[0].length / 100);
  }

  /**
   * Get context around a line
   */
  private getContext(lines: string[], lineIndex: number): string {
    const contextLines = 2;
    const start = Math.max(0, lineIndex - contextLines);
    const end = Math.min(lines.length, lineIndex + contextLines + 1);

    return lines.slice(start, end).join('\n');
  }

  /**
   * Aggregate and sort pattern results
   */
  private aggregateResults(): void {
    // Sort by severity then by occurrence count
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

    this.recognizedPatterns.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.occurrences.length - a.occurrences.length;
    });
  }

  /**
   * Generate refactoring suggestions
   */
  generateRefactoringSuggestions(): RefactoringSuggestion[] {
    const suggestions: RefactoringSuggestion[] = [];

    for (const pattern of this.recognizedPatterns) {
      for (const occurrence of pattern.occurrences) {
        const suggestion = this.createSuggestion(pattern, occurrence);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    }

    return suggestions;
  }

  /**
   * Create a refactoring suggestion
   */
  private createSuggestion(
    pattern: RecognizedPattern,
    occurrence: PatternOccurrence
  ): RefactoringSuggestion | null {
    const patternDef = this.patterns.get(pattern.id);
    if (!patternDef) return null;

    return {
      patternId: pattern.id,
      filePath: occurrence.filePath,
      lineNumber: occurrence.lineNumber,
      originalCode: occurrence.lineContent,
      refactoredCode: patternDef.getRefactoredCode
        ? patternDef.getRefactoredCode({ 0: occurrence.lineContent } as RegExpMatchArray)
        : pattern.suggestion,
      rationale: pattern.suggestion,
      confidence: occurrence.matchScore,
      risks: this.assessRisks(pattern, occurrence),
      effort: this.estimateEffort(pattern),
    };
  }

  /**
   * Assess risks for a refactoring
   */
  private assessRisks(pattern: RecognizedPattern, occurrence: PatternOccurrence): string[] {
    const risks: string[] = [];

    if (pattern.severity === 'critical' || pattern.severity === 'high') {
      risks.push('May affect application functionality');
    }

    if (pattern.category === 'architecture') {
      risks.push('May require changes to multiple modules');
    }

    if (occurrence.context.includes('test')) {
      risks.push('Test file - changes may affect test coverage');
    }

    return risks;
  }

  /**
   * Estimate refactoring effort
   */
  private estimateEffort(pattern: RecognizedPattern): 'low' | 'medium' | 'high' {
    if (pattern.category === 'style') return 'low';
    if (pattern.category === 'code-smell') return 'medium';
    if (pattern.category === 'security') return 'high';
    return 'medium';
  }

  /**
   * Apply refactoring suggestions
   */
  async applySuggestions(
    suggestions: RefactoringSuggestion[],
    options?: { createBackups?: boolean; autoApprove?: boolean }
  ): Promise<RefactoringResult> {
    const result: RefactoringResult = {
      success: true,
      suggestions,
      applied: 0,
      failed: 0,
      backups: [],
    };

    const createBackups = options?.createBackups ?? true;

    for (const suggestion of suggestions) {
      // Create backup
      if (createBackups) {
        const backupPath = `${suggestion.filePath}.bak`;
        if (!fs.existsSync(backupPath)) {
          fs.writeFileSync(backupPath, fs.readFileSync(suggestion.filePath, 'utf-8'));
          result.backups.push(backupPath);
        }
      }

      // Apply refactoring
      try {
        const content = fs.readFileSync(suggestion.filePath, 'utf-8');
        const lines = content.split('\n');

        if (lines[suggestion.lineNumber - 1]) {
          lines[suggestion.lineNumber - 1] = suggestion.refactoredCode;
          fs.writeFileSync(suggestion.filePath, lines.join('\n'));
          result.applied++;
        }
      } catch {
        result.failed++;
        result.success = false;
      }
    }

    return result;
  }

  /**
   * Identify architectural improvements
   */
  identifyArchitecturalImprovements(dirPath: string): string[] {
    const improvements: string[] = [];

    // Check for common architectural issues
    const issues = [
      {
        check: () => this.checkCircularDependencies(dirPath),
        message: 'Consider breaking circular dependencies using dependency injection',
      },
      {
        check: () => this.checkFeatureEnvy(dirPath),
        message: 'Some methods may have feature envy - accessing data from other classes',
      },
      {
        check: () => this.checkDataClumps(dirPath),
        message: 'Consider grouping related parameters into objects',
      },
      {
        check: () => this.checkShotgunSurgery(dirPath),
        message: 'Changes require modifications in many places - consider consolidating',
      },
    ];

    for (const issue of issues) {
      if (issue.check()) {
        improvements.push(issue.message);
      }
    }

    return improvements;
  }

  /**
   * Check for circular dependencies
   */
  private checkCircularDependencies(dirPath: string): boolean {
    // Simplified check - would use dependency graph in real implementation
    return false;
  }

  /**
   * Check for feature envy
   */
  private checkFeatureEnvy(dirPath: string): boolean {
    // Simplified check - would analyze method calls in real implementation
    return false;
  }

  /**
   * Check for data clumps
   */
  private checkDataClumps(dirPath: string): boolean {
    // Check for repeated parameter patterns
    return false;
  }

  /**
   * Check for shotgun surgery
   */
  private checkShotgunSurgery(dirPath: string): boolean {
    // Check for files that are modified together
    return false;
  }

  /**
   * Get recognized patterns
   */
  getRecognizedPatterns(): RecognizedPattern[] {
    return [...this.recognizedPatterns];
  }

  /**
   * Format pattern report
   */
  formatPatternReport(patterns: RecognizedPattern[]): string {
    const lines: string[] = [];

    lines.push(chalk.bold('\n📊 Pattern Recognition Report\n'));
    lines.push(chalk.gray('='.repeat(50)));
    lines.push('');

    // Group by category
    const byCategory = new Map<PatternCategory, RecognizedPattern[]>();
    for (const pattern of patterns) {
      if (!byCategory.has(pattern.category)) {
        byCategory.set(pattern.category, []);
      }
      byCategory.get(pattern.category)!.push(pattern);
    }

    for (const [category, categoryPatterns] of byCategory) {
      lines.push(chalk.bold(`\n${category.toUpperCase()}`));
      lines.push(chalk.gray('-'.repeat(30)));

      for (const pattern of categoryPatterns) {
        const severityColor = this.getSeverityColor(pattern.severity);
        lines.push(`${severityColor('●')} ${pattern.name} (${pattern.severity})`);
        lines.push(chalk.gray(`   ${pattern.description}`));
        lines.push(chalk.cyan(`   Occurrences: ${pattern.occurrences.length}`));
        lines.push(chalk.yellow(`   Suggestion: ${pattern.suggestion}`));
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Get severity color
   */
  private getSeverityColor(severity: PatternSeverity): (text: string) => string {
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
}

/**
 * Singleton instance
 */
export const patternRecognizer = new PatternRecognizer();
