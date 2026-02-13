/**
 * VIBE-CLI v0.0.2 - Error Analyzer
 * Stack trace parsing, error pattern recognition, and debugging assistance
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

/**
 * Error severity levels
 */
export type ErrorSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Error category
 */
export type ErrorCategory =
  | 'syntax'
  | 'type'
  | 'reference'
  | 'runtime'
  | 'network'
  | 'database'
  | 'authentication'
  | 'authorization'
  | 'configuration'
  | 'memory'
  | 'performance';

/**
 * Stack trace frame
 */
export interface StackFrame {
  filePath: string;
  lineNumber: number;
  columnNumber: number;
  functionName: string;
  methodName?: string;
  className?: string;
  isNative: boolean;
  isFramework: boolean;
}

/**
 * Analyzed error
 */
export interface AnalyzedError {
  id: string;
  timestamp: Date;
  message: string;
  name: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  stackFrames: StackFrame[];
  rootCause?: StackFrame;
  suggestions: string[];
  relatedFiles: string[];
  errorCode?: string;
  documentationLinks: string[];
}

/**
 * Error pattern for recognition
 */
export interface ErrorPattern {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  pattern: RegExp;
  title: string;
  description: string;
  suggestions: string[];
  documentationLinks: string[];
}

/**
 * Error analyzer result
 */
export interface ErrorAnalysisResult {
  errors: AnalyzedError[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    byCategory: Record<ErrorCategory, number>;
  };
  rootCauses: string[];
  fixes: string[];
}

/**
 * Error Analyzer
 */
export class ErrorAnalyzer {
  private readonly errorPatterns: ErrorPattern[];
  private readonly frameworkPatterns: string[];

  constructor() {
    this.errorPatterns = this.initializePatterns();
    this.frameworkPatterns = [
      'node_modules',
      '/node_modules/',
      '.next/',
      'node:',
      'internal/',
      'async_hooks',
      'events',
    ];
  }

  /**
   * Initialize error patterns
   */
  private initializePatterns(): ErrorPattern[] {
    return [
      {
        id: 'TYPE_ERROR',
        category: 'type',
        severity: 'high',
        pattern: /TypeError:\s*(.+)/i,
        title: 'Type Error',
        description: 'Runtime type mismatch or operation on undefined/null',
        suggestions: [
          'Add null/undefined checks before accessing properties',
          'Use optional chaining (?.) to safely access nested properties',
          'Ensure correct type annotations are used',
          'Check if the variable is properly initialized',
        ],
        documentationLinks: [
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Type_error',
        ],
      },
      {
        id: 'REFERENCE_ERROR',
        category: 'reference',
        severity: 'high',
        pattern: /ReferenceError:\s*(.+)/i,
        title: 'Reference Error',
        description: 'Accessing a variable that is not defined',
        suggestions: [
          'Check for typos in variable/function names',
          'Ensure the variable is declared before use',
          'Check import statements for missing exports',
          'Verify scope boundaries',
        ],
        documentationLinks: [
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Not_defined',
        ],
      },
      {
        id: 'SYNTAX_ERROR',
        category: 'syntax',
        severity: 'critical',
        pattern: /SyntaxError:\s*(.+)/i,
        title: 'Syntax Error',
        description: 'Invalid JavaScript/TypeScript syntax',
        suggestions: [
          'Check for missing parentheses, braces, or brackets',
          'Verify string literals are properly closed',
          'Check for invalid use of reserved keywords',
          'Run TypeScript compiler to get detailed error location',
        ],
        documentationLinks: [],
      },
      {
        id: 'RANGE_ERROR',
        category: 'runtime',
        severity: 'medium',
        pattern: /RangeError:\s*(.+)/i,
        title: 'Range Error',
        description: 'Value outside the range of valid values',
        suggestions: [
          'Check array indexing and length',
          'Verify recursion base cases',
          'Check number conversion limits',
        ],
        documentationLinks: [
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Range_error',
        ],
      },
      {
        id: 'NETWORK_ERROR',
        category: 'network',
        severity: 'high',
        pattern: /(?:fetch|axios|request|XMLHttpRequest).*(?:failed|error|timeout)/i,
        title: 'Network Error',
        description: 'Network request failed or timed out',
        suggestions: [
          'Check internet connectivity',
          'Verify API endpoint URL is correct',
          'Add retry logic for transient failures',
          'Check CORS configuration on server',
        ],
        documentationLinks: [],
      },
      {
        id: 'DATABASE_ERROR',
        category: 'database',
        severity: 'critical',
        pattern: /(?:database|query|mongodb|postgres|mysql|sequelize|typeorm).*(?:error|failed|exception)/i,
        title: 'Database Error',
        description: 'Database operation failed',
        suggestions: [
          'Check database connection string',
          'Verify database server is running',
          'Check query syntax and parameters',
          'Review transaction and connection pool settings',
        ],
        documentationLinks: [],
      },
      {
        id: 'AUTH_ERROR',
        category: 'authentication',
        severity: 'critical',
        pattern: /(?:authentication|auth|jwt|token|oauth).*(?:invalid|expired|unauthorized|forbidden)/i,
        title: 'Authentication/Authorization Error',
        description: 'Authentication or authorization failure',
        suggestions: [
          'Verify authentication token is valid and not expired',
          'Check user permissions and roles',
          'Ensure proper error handling for auth failures',
          'Review JWT configuration and secret keys',
        ],
        documentationLinks: [],
      },
      {
        id: 'CONFIG_ERROR',
        category: 'configuration',
        severity: 'high',
        pattern: /(?:config|environment|env|variable).*(?:missing|undefined|invalid)/i,
        title: 'Configuration Error',
        description: 'Missing or invalid configuration',
        suggestions: [
          'Check environment variables are set',
          'Verify .env file exists and has correct values',
          'Review configuration loading order',
          'Add default values for optional configs',
        ],
        documentationLinks: [],
      },
      {
        id: 'MEMORY_ERROR',
        category: 'memory',
        severity: 'critical',
        pattern: /(?:heap|memory|out of memory|allocation|gc)/i,
        title: 'Memory Error',
        description: 'Memory allocation or garbage collection issue',
        suggestions: [
          'Check for memory leaks in long-running processes',
          'Review object retention and closures',
          'Consider streaming large data instead of loading all at once',
          'Increase heap size with --max-old-space-size',
        ],
        documentationLinks: [],
      },
      {
        id: 'PROMISE_ERROR',
        category: 'runtime',
        severity: 'medium',
        pattern: /(?:unhandled promise|async).*(?:rejection|error)/i,
        title: 'Unhandled Promise Rejection',
        description: 'Promise was rejected without catch handler',
        suggestions: [
          'Add .catch() handler or try/catch for async/await',
          'Add global unhandled rejection handler',
          'Ensure all async functions properly await promises',
        ],
        documentationLinks: [],
      },
    ];
  }

  /**
   * Parse stack trace
   */
  parseStackTrace(stackTrace: string): StackFrame[] {
    const frames: StackFrame[] = [];
    const lines = stackTrace.split('\n');

    // Chrome/V8 stack trace format
    const chromeRegex = /^\s+at\s+(?:(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?)?/;

    for (const line of lines) {
      const match = line.match(chromeRegex);
      if (match) {
        const functionName = match[1] || '(anonymous)';
        const filePath = match[2] || '';
        const lineNumber = parseInt(match[3]) || 0;
        const columnNumber = parseInt(match[4]) || 0;

        // Determine if it's a framework or native call
        const isFramework = this.frameworkPatterns.some(
          (p) => filePath.includes(p) || functionName.includes(p)
        );
        const isNative = functionName.includes('native');

        // Extract class and method names
        let className: string | undefined;
        let methodName: string | undefined;

        if (functionName.includes('.')) {
          const parts = functionName.split('.');
          className = parts[0];
          methodName = parts.slice(1).join('.');
        }

        frames.push({
          filePath,
          lineNumber,
          columnNumber,
          functionName,
          methodName,
          className,
          isNative,
          isFramework,
        });
      }
    }

    return frames;
  }

  /**
   * Analyze an error with AI assistance
   */
  async analyzeWithAI(error: Error | string, provider: any): Promise<AnalyzedError> {
    const baseAnalysis = this.analyzeError(error);
    const message = typeof error === 'string' ? error : error.message;
    const stack = typeof error === 'string' ? '' : error.stack || '';

    const prompt = `Analyze this error and provide deep insights:
    
Error: ${message}
Stack Trace:
${stack}

Initial Analysis Category: ${baseAnalysis.category}
Initial Analysis Severity: ${baseAnalysis.severity}

Respond with a JSON object: {
  category: string,
  severity: string,
  rootCauseDescription: string,
  suggestions: string[],
  relatedFiles: string[],
  documentationLinks: string[]
}`;

    try {
      const response = await provider.chat([{ role: 'system', content: 'You are an expert debugger.' }, { role: 'user', content: prompt }]);
      const aiResults = JSON.parse(response.content.trim().replace(/```json/g, '').replace(/```/g, ''));

      return {
        ...baseAnalysis,
        category: aiResults.category as any || baseAnalysis.category,
        severity: aiResults.severity as any || baseAnalysis.severity,
        message: aiResults.rootCauseDescription || baseAnalysis.message,
        suggestions: aiResults.suggestions || baseAnalysis.suggestions,
        relatedFiles: [...new Set([...baseAnalysis.relatedFiles, ...(aiResults.relatedFiles || [])])],
        documentationLinks: [...new Set([...baseAnalysis.documentationLinks, ...(aiResults.documentationLinks || [])])],
      };
    } catch {
      return baseAnalysis;
    }
  }

  /**
   * Analyze a single error
   */
  analyzeError(error: Error | string): AnalyzedError {
    const message = typeof error === 'string' ? error : error.message;
    const stackTrace = typeof error === 'string' ? '' : error.stack || '';
    const name = typeof error === 'string' ? 'Unknown' : error.name || 'Error';

    // Parse stack trace
    const stackFrames = stackTrace ? this.parseStackTrace(stackTrace) : [];

    // Find matching pattern
    let matchedPattern: ErrorPattern | undefined;
    for (const pattern of this.errorPatterns) {
      if (pattern.pattern.test(message)) {
        matchedPattern = pattern;
        break;
      }
    }

    // Determine category and severity
    let category: ErrorCategory = 'runtime';
    let severity: ErrorSeverity = 'medium';

    if (matchedPattern) {
      category = matchedPattern.category;
      severity = matchedPattern.severity;
    } else {
      // Try to infer from message content
      if (/typeerror/i.test(message)) category = 'type';
      else if (/referenceerror/i.test(message)) category = 'reference';
      else if (/syntaxerror/i.test(message)) category = 'syntax';
      else if (/network|fetch|axios/i.test(message)) category = 'network';
      else if (/database|query|mongo/i.test(message)) category = 'database';
    }

    // Find root cause (first non-framework frame)
    const rootCause = stackFrames.find((f) => !f.isFramework && !f.isNative);

    // Generate suggestions
    const suggestions = matchedPattern?.suggestions || [
      'Review the error message and stack trace',
      'Check the line and column number in the stack trace',
      'Add error handling for this operation',
    ];

    // Find related files
    const relatedFiles = stackFrames
      .filter((f) => f.filePath && !f.isFramework)
      .map((f) => f.filePath);

    return {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      message,
      name,
      category,
      severity,
      stackFrames,
      rootCause,
      suggestions,
      relatedFiles,
      documentationLinks: matchedPattern?.documentationLinks || [],
    };
  }

  /**
   * Analyze multiple errors from logs
   */
  analyzeLogs(logContent: string): ErrorAnalysisResult {
    const errors: AnalyzedError[] = [];
    const lines = logContent.split('\n');

    // Collect error lines
    let currentError: string[] = [];
    let inErrorBlock = false;

    for (const line of lines) {
      // Detect error patterns
      const isErrorLine = /(?:error|exception|failed|fatal|critical):/i.test(line) ||
        /\berror\b/i.test(line) ||
        /TypeError|ReferenceError|SyntaxError|RangeError/i.test(line);

      if (isErrorLine) {
        if (currentError.length > 0) {
          // Analyze accumulated error
          const errorText = currentError.join('\n');
          const analyzed = this.analyzeError(errorText);
          errors.push(analyzed);
        }
        currentError = [line];
        inErrorBlock = true;
      } else if (inErrorBlock && (line.trim() || line.startsWith('    at'))) {
        currentError.push(line);
      } else if (inErrorBlock && line.trim() === '') {
        // Empty line might end error block
        if (currentError.length > 3) {
          const errorText = currentError.join('\n');
          const analyzed = this.analyzeError(errorText);
          errors.push(analyzed);
        }
        currentError = [];
        inErrorBlock = false;
      }
    }

    // Process remaining error
    if (currentError.length > 0) {
      const errorText = currentError.join('\n');
      const analyzed = this.analyzeError(errorText);
      errors.push(analyzed);
    }

    // Generate summary
    const summary = {
      critical: errors.filter((e) => e.severity === 'critical').length,
      high: errors.filter((e) => e.severity === 'high').length,
      medium: errors.filter((e) => e.severity === 'medium').length,
      low: errors.filter((e) => e.severity === 'low').length,
      byCategory: {} as Record<ErrorCategory, number>,
    };

    // Count by category
    for (const error of errors) {
      summary.byCategory[error.category] = (summary.byCategory[error.category] || 0) + 1;
    }

    // Find root causes
    const rootCauses = [...new Set(errors
      .filter((e) => e.rootCause)
      .map((e) => `${e.rootCause!.filePath}:${e.rootCause!.lineNumber}`))];

    // Collect all suggestions
    const fixes = [...new Set(errors.flatMap((e) => e.suggestions))];

    return {
      errors,
      summary,
      rootCauses,
      fixes,
    };
  }

  /**
   * Analyze a file for common errors
   */
  analyzeSourceFile(filePath: string): AnalyzedError[] {
    if (!fs.existsSync(filePath)) return [];

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const errors: AnalyzedError[] = [];

      // Check for common anti-patterns
      const issues = [
        {
          pattern: /\.catch\s*\(\s*\)/,
          message: 'Empty catch block - errors are being silently ignored',
          category: 'runtime' as ErrorCategory,
          severity: 'high' as ErrorSeverity,
        },
        {
          pattern: /JSON\.parse\s*\([^)]*\)/,
          message: 'JSON.parse without try/catch - will throw on invalid JSON',
          category: 'runtime' as ErrorCategory,
          severity: 'medium' as ErrorSeverity,
        },
        {
          pattern: /eval\s*\(/,
          message: 'Use of eval() is dangerous and can lead to code injection',
          category: 'security' as ErrorCategory,
          severity: 'critical' as ErrorSeverity,
        },
        {
          pattern: /process\.env(?!\.[a-zA-Z_])/,
          message: 'Direct access to process.env without property access',
          category: 'configuration' as ErrorCategory,
          severity: 'low' as ErrorSeverity,
        },
      ];

      for (const issue of issues) {
        if (issue.pattern.test(content)) {
          errors.push({
            id: `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            message: issue.message,
            name: 'CodeSmell',
            category: issue.category,
            severity: issue.severity,
            stackFrames: [],
            suggestions: ['Review and fix this pattern'],
            relatedFiles: [filePath],
            documentationLinks: [],
          });
        }
      }

      return errors;
    } catch {
      return [];
    }
  }

  /**
   * Format error for display
   */
  formatError(error: AnalyzedError): string {
    const lines: string[] = [];

    const severityColor = this.getSeverityColor(error.severity);
    lines.push(severityColor(`[${error.severity.toUpperCase()}] ${error.name}`));
    lines.push(chalk.red(error.message));
    lines.push('');

    if (error.rootCause) {
      lines.push(chalk.bold('Root Cause:'));
      lines.push(chalk.gray(`  File: ${path.basename(error.rootCause.filePath)}:${error.rootCause.lineNumber}`));
      lines.push(chalk.gray(`  Function: ${error.rootCause.functionName}`));
      lines.push('');
    }

    if (error.stackFrames.length > 0) {
      lines.push(chalk.bold('Stack Trace:'));
      const relevantFrames = error.stackFrames
        .filter((f) => !f.isFramework && !f.isNative)
        .slice(0, 5);

      for (const frame of relevantFrames) {
        lines.push(chalk.gray(`  at ${frame.functionName} (${path.basename(frame.filePath)}:${frame.lineNumber})`));
      }
      lines.push('');
    }

    if (error.suggestions.length > 0) {
      lines.push(chalk.bold('Suggestions:'));
      for (const suggestion of error.suggestions) {
        lines.push(chalk.cyan(`  • ${suggestion}`));
      }
      lines.push('');
    }

    if (error.documentationLinks.length > 0) {
      lines.push(chalk.gray('Documentation:'));
      for (const link of error.documentationLinks) {
        lines.push(chalk.gray(`  ${link}`));
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate error report
   */
  generateReport(result: ErrorAnalysisResult): string {
    const lines: string[] = [];

    lines.push(chalk.bold('\n🔍 Error Analysis Report\n'));
    lines.push(chalk.gray('='.repeat(50)));
    lines.push('');

    // Summary
    lines.push(chalk.bold('Summary:'));
    lines.push(`  Total Errors: ${result.errors.length}`);
    lines.push(`  ${chalk.red('●')} Critical: ${result.summary.critical}`);
    lines.push(`  ${chalk.red('●')} High: ${result.summary.high}`);
    lines.push(`  ${chalk.yellow('●')} Medium: ${result.summary.medium}`);
    lines.push(`  ${chalk.blue('●')} Low: ${result.summary.low}`);
    lines.push('');

    // By Category
    lines.push(chalk.bold('By Category:'));
    for (const [category, count] of Object.entries(result.summary.byCategory)) {
      lines.push(`  ${category}: ${count}`);
    }
    lines.push('');

    // Root Causes
    if (result.rootCauses.length > 0) {
      lines.push(chalk.bold('Root Causes:'));
      for (const cause of result.rootCauses) {
        lines.push(chalk.red(`  • ${cause}`));
      }
      lines.push('');
    }

    // Detailed Errors
    if (result.errors.length > 0) {
      lines.push(chalk.bold('Detailed Analysis:'));
      for (const error of result.errors.slice(0, 10)) {
        lines.push(this.formatError(error));
        lines.push(chalk.gray('-'.repeat(40)));
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Get color for severity
   */
  private getSeverityColor(severity: ErrorSeverity): (text: string) => string {
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
export const errorAnalyzer = new ErrorAnalyzer();
