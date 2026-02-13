/**
 * VIBE-CLI v0.0.2 - Debug Manager
 * Stack trace analysis, error pattern detection, and debugging assistance
 */

import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import chalk from 'chalk';

/**
 * Debug result types
 */
export type DebugResultType = 'error' | 'warning' | 'info' | 'suggestion';

/**
 * Stack frame information
 */
export interface StackFrame {
  file: string;
  line: number;
  column: number;
  function?: string;
  context?: string;
}

/**
 * Error pattern match
 */
export interface ErrorPattern {
  pattern: RegExp;
  name: string;
  description: string;
  suggestion: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Debug result
 */
export interface DebugResult {
  type: DebugResultType;
  message: string;
  details?: string;
  stackFrames?: StackFrame[];
  suggestion?: string;
  file?: string;
  line?: number;
  severity?: 'low' | 'medium' | 'high';
}

/**
 * Debug Manager
 */
export class DebugManager {
  private readonly errorPatterns: ErrorPattern[];

  constructor() {
    this.errorPatterns = this.initializeErrorPatterns();
  }

  /**
   * Initialize error patterns for common errors
   */
  private initializeErrorPatterns(): ErrorPattern[] {
    return [
      {
        pattern: /TypeError: (.*) is not a function/,
        name: 'undefined-function',
        description: 'Calling a function that does not exist',
        suggestion: 'Check if the function is defined or imported correctly',
        severity: 'high',
      },
      {
        pattern: /TypeError: (.*) is undefined/,
        name: 'undefined-value',
        description: 'Using a variable that is undefined or null',
        suggestion: 'Add null checks or provide default values',
        severity: 'high',
      },
      {
        pattern: /ReferenceError: (.*) is not defined/,
        name: 'reference-error',
        description: 'Referencing a variable that is not in scope',
        suggestion: 'Ensure the variable is declared before use',
        severity: 'high',
      },
      {
        pattern: /SyntaxError: (.*)/,
        name: 'syntax-error',
        description: 'Invalid syntax in code',
        suggestion: 'Check for missing brackets, parentheses, or semicolons',
        severity: 'high',
      },
      {
        pattern: /Cannot read property '(.*)' of undefined/,
        name: 'undefined-property',
        description: 'Accessing a property on undefined value',
        suggestion: 'Add optional chaining (?.) or null checks',
        severity: 'high',
      },
      {
        pattern: /Maximum call stack size exceeded/,
        name: 'stack-overflow',
        description: 'Infinite recursion detected',
        suggestion: 'Check for recursive function calls without proper base cases',
        severity: 'high',
      },
      {
        pattern: /ECONNREFUSED/,
        name: 'connection-refused',
        description: 'Network connection was refused',
        suggestion: 'Check if the server is running and the port is correct',
        severity: 'medium',
      },
      {
        pattern: /ETIMEDOUT/,
        name: 'connection-timeout',
        description: 'Network connection timed out',
        suggestion: 'Check network connectivity or increase timeout settings',
        severity: 'medium',
      },
      {
        pattern: /ENOENT: no such file or directory/,
        name: 'file-not-found',
        description: 'File or directory does not exist',
        suggestion: 'Check the file path and ensure it exists',
        severity: 'medium',
      },
      {
        pattern: /EACCES: permission denied/,
        name: 'permission-denied',
        description: 'Permission denied to access file or resource',
        suggestion: 'Check file permissions or run with appropriate privileges',
        severity: 'medium',
      },
    ];
  }

  /**
   * Parse stack trace into structured frames
   */
  parseStackTrace(stackTrace: string): StackFrame[] {
    const frames: StackFrame[] = [];
    const lines = stackTrace.split('\n');

    for (const line of lines) {
      // Match patterns like "at Function.name (file:line:col)" or "at file:line:col"
      const atMatch = line.match(/at\s+(?:.*?\s+)?\(?(.+?):(\d+):(\d+)\)?/);
      const plainMatch = line.match(/at\s+(.+?):(\d+):(\d+)/);

      if (atMatch || plainMatch) {
        const match = atMatch || plainMatch;
        if (!match) continue;
        const location = match[1];
        const lineNum = parseInt(match[2], 10);
        const colNum = parseInt(match[3], 10);

        // Extract function name if present
        const funcMatch = line.match(/at\s+([^\s(]+)/);
        const funcName = funcMatch ? funcMatch[1] : undefined;

        frames.push({
          file: location,
          line: lineNum,
          column: colNum,
          function: funcName,
        });
      }
    }

    return frames;
  }

  /**
   * Analyze error and provide suggestions
   */
  analyzeError(error: string | Error): DebugResult {
    const errorStr = typeof error === 'string' ? error : error.message;

    // Check against known patterns
    for (const pattern of this.errorPatterns) {
      if (pattern.pattern.test(errorStr)) {
        const match = errorStr.match(pattern.pattern);
        return {
          type: 'error',
          message: `${pattern.name}: ${pattern.description}`,
          details: match ? match[1] : undefined,
          suggestion: pattern.suggestion,
          severity: pattern.severity,
        };
      }
    }

    // Generic error handling
    return {
      type: 'error',
      message: 'Unknown error occurred',
      details: errorStr,
      suggestion: 'Check the error details and stack trace for more information',
    };
  }

  /**
   * Get source code context around a line
   */
  getSourceContext(filePath: string, line: number, contextLines: number = 3): string[] {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const start = Math.max(0, line - contextLines - 1);
      const end = Math.min(lines.length, line + contextLines);

      return lines.slice(start, end).map((l, i) => {
        const lineNum = start + i + 1;
        const prefix = lineNum === line ? '>' : ' ';
        return `${prefix} ${lineNum.toString().padStart(4)} | ${l}`;
      });
    } catch {
      return [];
    }
  }

  /**
   * Find relevant test file for a source file
   */
  findTestFile(sourceFile: string): string | null {
    const extensions = ['.test.ts', '.spec.ts', '.test.js', '.spec.js', '.test.tsx', '.spec.tsx'];
    const basePath = sourceFile.replace(/\.[^/.]+$/, '');

    for (const ext of extensions) {
      const testPath = `${basePath}.test${ext}`;
      if (fs.existsSync(testPath)) return testPath;

      const specPath = `${basePath}.spec${ext}`;
      if (fs.existsSync(specPath)) return specPath;

      const altPath = sourceFile.replace(/src/, '__tests__').replace(/\.[^/.]+$/, ext);
      if (fs.existsSync(altPath)) return altPath;
    }

    return null;
  }

  /**
   * Run tests related to a file
   */
  async runRelatedTests(filePath: string): Promise<string> {
    const testFile = this.findTestFile(filePath);
    if (!testFile) {
      return `No test file found for: ${filePath}`;
    }

    try {
      // Try to find package.json for test scripts
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

        if (packageJson.scripts?.test) {
          // Run specific test file
          const result = child_process.spawnSync('npm', ['test', '--', testFile], {
            cwd: process.cwd(),
            encoding: 'utf-8',
            shell: true,
          });

          return result.stdout || result.stderr || 'Test completed';
        }
      }

      // Try direct vitest run
      const result = child_process.spawnSync('npx', ['vitest', 'run', testFile], {
        cwd: process.cwd(),
        encoding: 'utf-8',
        shell: true,
      });

      return result.stdout || result.stderr || 'Test completed';
    } catch (error) {
      return `Failed to run tests: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Get debugging help for an error
   */
  getDebugHelp(error: string): DebugResult {
    const result = this.analyzeError(error);

    if (result.type === 'error' && result.stackFrames && result.stackFrames.length > 0) {
      const frame = result.stackFrames[0];

      // Try to get source context
      if (frame.file && fs.existsSync(frame.file)) {
        const context = this.getSourceContext(frame.file, frame.line);
        result.stackFrames = [
          {
            ...frame,
            context: context.join('\n'),
          },
        ];
      }
    }

    return result;
  }

  /**
   * Format debug result for display
   */
  formatDebugResult(result: DebugResult): string {
    const lines: string[] = [];

    switch (result.type) {
      case 'error':
        lines.push(chalk.red(`❌ ${result.message}`));
        break;
      case 'warning':
        lines.push(chalk.yellow(`⚠️  ${result.message}`));
        break;
      case 'info':
        lines.push(chalk.blue(`ℹ️  ${result.message}`));
        break;
      case 'suggestion':
        lines.push(chalk.cyan(`💡 ${result.message}`));
        break;
    }

    if (result.details) {
      lines.push(chalk.gray(`   Details: ${result.details}`));
    }

    if (result.stackFrames && result.stackFrames.length > 0) {
      lines.push(chalk.gray('\n   Stack trace:'));
      for (const frame of result.stackFrames.slice(0, 5)) {
        const func = frame.function ? `${frame.function} ` : '';
        lines.push(chalk.gray(`   at ${func}${frame.file}:${frame.line}`));

        if (frame.context) {
          lines.push(chalk.gray(frame.context));
        }
      }
    }

    if (result.suggestion) {
      lines.push(chalk.cyan(`\n   💡 Suggestion: ${result.suggestion}`));
    }

    return lines.join('\n');
  }
}

/**
 * Singleton instance
 */
export const debugManager = new DebugManager();
