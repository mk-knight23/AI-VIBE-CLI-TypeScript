/**
 * VIBE-CLI v0.0.2 - Suggestion Engine
 * Ranked suggestions with prioritized fixes
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

/**
 * Suggestion types
 */
export type SuggestionType =
  | 'performance'
  | 'security'
  | 'readability'
  | 'maintainability'
  | 'bug-risk'
  | 'best-practice';

/**
 * Suggestion priority
 */
export type SuggestionPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Code suggestion
 */
export interface CodeSuggestion {
  id: string;
  type: SuggestionType;
  priority: SuggestionPriority;
  title: string;
  description: string;
  filePath: string;
  lineNumber: number;
  lineContent: string;
  suggestion: string;
  codeExample?: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'quick' | 'moderate' | 'significant';
  references: string[];
}

/**
 * Suggestion summary
 */
export interface SuggestionSummary {
  total: number;
  byPriority: Record<SuggestionPriority, number>;
  byType: Record<SuggestionType, number>;
  topSuggestions: CodeSuggestion[];
}

/**
 * Suggestion Engine
 */
export class SuggestionEngine {
  private suggestions: CodeSuggestion[] = [];
  private readonly rules: SuggestionRule[];

  constructor() {
    this.rules = this.initializeRules();
  }

  /**
   * Initialize suggestion rules
   */
  private initializeRules(): SuggestionRule[] {
    return [
      {
        id: 'performance-async-await',
        type: 'performance',
        priority: 'medium',
        pattern: /\.then\s*\([^)]+\)\s*\.then\s*\([^)]+\)/g,
        title: 'Use async/await instead of promise chains',
        description: 'Promise chains can be hard to read and maintain',
        suggestion: 'Refactor to use async/await for better readability',
        codeExample: `// Instead of:
promise.then(a).then(b).then(c)

// Use:
const result = await promise;
const a = await step1(result);
const b = await step2(a);
const c = await step3(b);`,
        impact: 'medium',
        effort: 'moderate',
        references: ['https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Async_await'],
      },
      {
        id: 'performance-array-concat',
        type: 'performance',
        priority: 'low',
        pattern: /\[\s*\.\.\.(?:[^[\]]+)\s*\]\s*\.\s*concat\s*\(/g,
        title: 'Use spread operator instead of concat',
        description: 'Spread operator is more efficient than concat for arrays',
        suggestion: 'Replace concat with spread operator',
        codeExample: `// Instead of:
const result = [].concat(arr1, arr2);

// Use:
const result = [...arr1, ...arr2];`,
        impact: 'low',
        effort: 'quick',
        references: [],
      },
      {
        id: 'security-hardcoded-secrets',
        type: 'security',
        priority: 'critical',
        pattern: /(?:password|secret|api_key|token)\s*[:=]\s*['"`][^'"`]{8,}['"`]/gi,
        title: 'Remove hardcoded secrets',
        description: 'Hardcoded secrets should be in environment variables',
        suggestion: 'Move secrets to environment variables or .env file',
        codeExample: `// Instead of:
const apiKey = "sk-1234567890abcdef";

// Use:
const apiKey = process.env.API_KEY;`,
        impact: 'high',
        effort: 'quick',
        references: ['https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html'],
      },
      {
        id: 'readability-magic-numbers',
        type: 'readability',
        priority: 'medium',
        pattern: /(?<!const|let|var|return|=|:|\s)\s*[0-9]{2,}(?!\s*[*/%])/g,
        title: 'Replace magic numbers with named constants',
        description: 'Magic numbers make code harder to understand and maintain',
        suggestion: 'Define constants with descriptive names',
        codeExample: `// Instead of:
if (status === 404) { ... }

// Use:
const NOT_FOUND = 404;
if (status === NOT_FOUND) { ... }`,
        impact: 'medium',
        effort: 'quick',
        references: [],
      },
      {
        id: 'maintainability-deep-nesting',
        type: 'maintainability',
        priority: 'medium',
        pattern: /\bif\s*\([^)]+\)\s*\{\s*if\s*\([^)]+\)\s*\{/g,
        title: 'Reduce nested conditionals',
        description: 'Deeply nested code is hard to read and maintain',
        suggestion: 'Use early returns, guard clauses, or extract logic',
        codeExample: `// Instead of:
if (user) {
  if (user.isActive) {
    if (user.hasPermission) {
      // Do something
    }
  }
}

// Use:
if (!user || !user.isActive || !user.hasPermission) {
  return;
}
// Do something`,
        impact: 'medium',
        effort: 'moderate',
        references: [],
      },
      {
        id: 'bug-risk-null-check',
        type: 'bug-risk',
        priority: 'high',
        pattern: /\.(?:length|toLowerCase|toUpperCase|split|join|map|filter|forEach)\s*\([^)]*\)/g,
        title: 'Add null/undefined checks',
        description: 'Accessing properties on potentially null values can cause runtime errors',
        suggestion: 'Add optional chaining or null checks',
        codeExample: `// Instead of:
const name = user.name.toLowerCase();

// Use:
const name = user?.name?.toLowerCase();`,
        impact: 'high',
        effort: 'quick',
        references: [],
      },
      {
        id: 'best-practice-const-arrays',
        type: 'best-practice',
        priority: 'low',
        pattern: /let\s+\w+\s*=\s*\[[^\]]*\]\s*;(?!\s*\w+\s*=\s*)/g,
        title: 'Use const for arrays that are never reassigned',
        description: 'Using const prevents accidental reassignment',
        suggestion: 'Change let to const for arrays',
        codeExample: `// Instead of:
let items = [1, 2, 3];

// Use:
const items = [1, 2, 3];`,
        impact: 'low',
        effort: 'quick',
        references: [],
      },
      {
        id: 'performance-for-loop',
        type: 'performance',
        priority: 'low',
        pattern: /\.forEach\s*\(/g,
        title: 'Consider for loops for performance-critical code',
        description: 'forEach has slight overhead compared to for loops',
        suggestion: 'Use for loops in hot paths if performance is critical',
        codeExample: `// Consider:
for (let i = 0; i < items.length; i++) {
  // Process item
}

// Instead of:
items.forEach(item => { ... });`,
        impact: 'low',
        effort: 'moderate',
        references: [],
      },
    ];
  }

  /**
   * Analyze code and generate suggestions
   */
  analyze(filePath: string): CodeSuggestion[] {
    if (!fs.existsSync(filePath)) return [];

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const suggestions: CodeSuggestion[] = [];

      for (const rule of this.rules) {
        let match;
        const regex = new RegExp(rule.pattern.source, rule.pattern.flags);

        while ((match = regex.exec(content)) !== null) {
          const lineNumber = content.substring(0, match.index).split('\n').length;

          suggestions.push({
            id: `${rule.id}-${lineNumber}`,
            type: rule.type,
            priority: rule.priority,
            title: rule.title,
            description: rule.description,
            filePath,
            lineNumber,
            lineContent: lines[lineNumber - 1] || '',
            suggestion: rule.suggestion,
            codeExample: rule.codeExample,
            impact: rule.impact,
            effort: rule.effort,
            references: rule.references,
          });
        }
      }

      this.suggestions = suggestions;
      return suggestions;
    } catch (error) {
      console.error(`Failed to analyze file: ${filePath}`, error);
      return [];
    }
  }

  /**
   * Analyze a directory
   */
  analyzeDirectory(dirPath: string): CodeSuggestion[] {
    const { glob } = require('fast-glob');
    const files = glob.sync(['**/*.{ts,js,py}'], {
      cwd: dirPath,
      ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
    });

    const allSuggestions: CodeSuggestion[] = [];

    for (const file of files) {
      allSuggestions.push(...this.analyze(path.join(dirPath, file)));
    }

    this.suggestions = allSuggestions;
    return allSuggestions;
  }

  /**
   * Get summary of suggestions
   */
  getSummary(): SuggestionSummary {
    const byPriority: Record<SuggestionPriority, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    const byType: Record<SuggestionType, number> = {
      performance: 0,
      security: 0,
      readability: 0,
      maintainability: 0,
      'bug-risk': 0,
      'best-practice': 0,
    };

    for (const suggestion of this.suggestions) {
      byPriority[suggestion.priority]++;
      byType[suggestion.type]++;
    }

    // Sort by priority and take top 5
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const topSuggestions = [...this.suggestions]
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      .slice(0, 5);

    return {
      total: this.suggestions.length,
      byPriority,
      byType,
      topSuggestions,
    };
  }

  /**
   * Format suggestions for display
   */
  formatSuggestions(suggestions: CodeSuggestion[]): string {
    const lines: string[] = [];
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const sorted = [...suggestions].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    for (const suggestion of sorted) {
      const color = this.getPriorityColor(suggestion.priority);
      const impactIcon = this.getImpactIcon(suggestion.impact);
      const effortIcon = this.getEffortIcon(suggestion.effort);

      lines.push(color(`[${suggestion.priority.toUpperCase()}] ${suggestion.title}`));
      lines.push(chalk.gray(`   ${impactIcon} Impact: ${suggestion.impact} | ${effortIcon} Effort: ${suggestion.effort}`));
      lines.push(chalk.gray(`   File: ${path.basename(suggestion.filePath)}:${suggestion.lineNumber}`));
      lines.push(chalk.gray(`   ${suggestion.description}`));
      lines.push(chalk.cyan(`   💡 ${suggestion.suggestion}`));

      if (suggestion.codeExample) {
        lines.push(chalk.gray('\n   Example:'));
        lines.push(chalk.gray('   ```'));
        lines.push(chalk.gray(suggestion.codeExample.split('\n').map((l) => `   ${l}`).join('\n')));
        lines.push(chalk.gray('   ```'));
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Get color for priority
   */
  private getPriorityColor(priority: SuggestionPriority): (text: string) => string {
    switch (priority) {
      case 'critical':
        return chalk.red;
      case 'high':
        return chalk.red;
      case 'medium':
        return chalk.yellow;
      default:
        return chalk.blue;
    }
  }

  /**
   * Get impact icon
   */
  private getImpactIcon(impact: 'high' | 'medium' | 'low'): string {
    switch (impact) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      default:
        return '🟢';
    }
  }

  /**
   * Get effort icon
   */
  private getEffortIcon(effort: 'quick' | 'moderate' | 'significant'): string {
    switch (effort) {
      case 'quick':
        return '⚡';
      case 'moderate':
        return '⏱️';
      default:
        return '🔧';
    }
  }

  /**
   * Clear suggestions
   */
  clear(): void {
    this.suggestions = [];
  }
}

/**
 * Suggestion rule interface
 */
interface SuggestionRule {
  id: string;
  type: SuggestionType;
  priority: SuggestionPriority;
  pattern: RegExp;
  title: string;
  description: string;
  suggestion: string;
  codeExample?: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'quick' | 'moderate' | 'significant';
  references: string[];
}

/**
 * Singleton instance
 */
export const suggestionEngine = new SuggestionEngine();
