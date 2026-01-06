/**
 * VIBE-CLI v12 - Debugging Module
 * Error analysis, fix suggestions, and performance profiling
 */

import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import chalk from 'chalk';
import { BaseModule, ModuleResult } from '../base.module';
import { VibeProviderRouter } from '../../providers/router';

interface ErrorLocation {
  file: string;
  line: number;
  column?: number;
  function?: string;
}

interface DebugIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: ErrorLocation;
  description: string;
  suggestion: string;
  code?: string;
}

interface DebugResult {
  errorType: string;
  message: string;
  location: ErrorLocation | null;
  cause: string;
  suggestion: string;
  fixes: Array<{
    description: string;
    code: string;
    explanation: string;
  }>;
  relatedErrors: string[];
}

export class DebuggingModule extends BaseModule {
  private provider: VibeProviderRouter;

  // Common error patterns
  private readonly errorPatterns: Array<{
    pattern: RegExp;
    type: string;
    suggestion: string;
  }> = [
    { pattern: /Cannot read property '(\w+)' of undefined/, type: 'TypeError', suggestion: 'Check if the object exists before accessing its properties' },
    { pattern: /(\w+) is not a function/, type: 'TypeError', suggestion: 'Verify the function name and that the object has this method' },
    { pattern: /Cannot (\w+) property '(\w+)'/, type: 'TypeError', suggestion: 'Check if the property is writable or if the object exists' },
    { pattern: /Maximum call stack size exceeded/, type: 'RangeError', suggestion: 'Check for infinite recursion' },
    { pattern: /Invalid array length/, type: 'RangeError', suggestion: 'Check array assignment and length calculations' },
    { pattern: /JSON parse error/, type: 'SyntaxError', suggestion: 'Validate JSON syntax and encoding' },
    { pattern: /Unexpected token/, type: 'SyntaxError', suggestion: 'Check for typos, missing brackets, or wrong JavaScript syntax' },
    { pattern: /Callback was already called/, type: 'Error', suggestion: 'Remove extra return statements after callback invocation' },
    { pattern: /EACCES: permission denied/, type: 'Error', suggestion: 'Check file permissions or run with elevated privileges' },
    { pattern: /ENOENT: no such file or directory/, type: 'Error', suggestion: 'Verify the file path is correct and file exists' },
  ];

  constructor() {
    super({
      name: 'debugging',
      version: '1.0.0',
      description: 'Error analysis, fix suggestions, and performance profiling',
    });

    this.provider = new VibeProviderRouter();
  }

  /**
   * Execute the module
   */
  async execute(params: Record<string, any>): Promise<ModuleResult> {
    const action = params.action || params.type || 'analyze';

    const startTime = Date.now();

    try {
      switch (action) {
        case 'analyze':
          return this.analyzeError(params, startTime);
        case 'suggest':
          return this.suggestFix(params, startTime);
        case 'profile':
          return this.profileCode(params, startTime);
        case 'trace':
          return this.traceExecution(params, startTime);
        case 'fix':
          return this.fixIssue(params, startTime);
        default:
          return this.failure(`Unknown action: ${action}. Supported: analyze, suggest, profile, trace, fix`);
      }
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Analyze an error from stack trace or message
   */
  private async analyzeError(params: Record<string, any>, startTime: number): Promise<ModuleResult> {
    const { error, stackTrace, code } = params;

    if (!error && !stackTrace) {
      return this.failure('Missing required parameter: error or stackTrace');
    }

    const errorInput = error || stackTrace || '';
    this.logInfo('Analyzing error...');

    // Parse error location from stack trace
    const location = this.parseStackTrace(errorInput);

    // Match error pattern
    const errorType = this.detectErrorType(errorInput);
    const patternMatch = this.matchErrorPattern(errorInput);

    // Generate analysis using AI
    const prompt = `Analyze this error and provide a detailed debugging report:

Error: ${errorInput}

${location ? `Location: ${location.file}:${location.line}${location.function ? ` in ${location.function}` : ''}` : ''}
${code ? `\nCode context:\n${code}` : ''}

Provide:
1. Root cause analysis
2. Why this error is occurring
3. Step-by-step debugging approach
4. Prevention tips`;

    try {
      const response = await this.provider.chat(
        [{ role: 'user', content: prompt }],
        {
          model: 'claude-sonnet-4-20250514',
          maxTokens: 2048,
        }
      );

      const result: DebugResult = {
        errorType: errorType || 'Unknown Error',
        message: this.extractErrorMessage(errorInput),
        location,
        cause: patternMatch?.suggestion || 'Unknown cause',
        suggestion: patternMatch?.suggestion || 'See analysis below',
        fixes: [],
        relatedErrors: this.findRelatedErrors(errorInput),
      };

      const duration = Date.now() - startTime;

      return this.success({
        action: 'analyze',
        ...result,
        analysis: response.content,
      }, {
        tokens: response.usage?.totalTokens,
        duration,
        model: response.model,
      });

    } catch (error) {
      return this.failure(error instanceof Error ? error.message : 'Analysis failed');
    }
  }

  /**
   * Suggest fixes for an error
   */
  private async suggestFix(params: Record<string, any>, startTime: number): Promise<ModuleResult> {
    const { error, code, language = 'typescript' } = params;

    if (!error) {
      return this.failure('Missing required parameter: error');
    }

    this.logInfo('Generating fix suggestions...');

    const prompt = `Suggest fixes for this error:

Error: ${error}
${code ? `Code:\n\`\`\`${language}\n${code}\n\`\`\`` : ''}

For each suggested fix:
1. Description of what to change
2. The actual code change
3. Explanation of why this fixes the error

Return in this format:
=== FIX 1 ===
Description: [brief description]
Code: [code to add/replace]
Explanation: [why this works]
=== END ===

=== FIX 2 ===
...
=== END ===`;

    try {
      const response = await this.provider.chat(
        [{ role: 'user', content: prompt }],
        {
          model: 'claude-opus-4-20250514',
          maxTokens: 4096,
        }
      );

      // Parse fixes
      const fixes = this.parseFixes(response.content);

      const duration = Date.now() - startTime;

      return this.success({
        action: 'suggest',
        error,
        fixes,
        fixCount: fixes.length,
      }, {
        tokens: response.usage?.totalTokens,
        duration,
        model: response.model,
      });

    } catch (error) {
      return this.failure(error instanceof Error ? error.message : 'Fix suggestion failed');
    }
  }

  /**
   * Profile code performance
   */
  private async profileCode(params: Record<string, any>, startTime: number): Promise<ModuleResult> {
    const { file, language } = params;

    if (!file) {
      return this.failure('Missing required parameter: file');
    }

    const filePath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
      return this.failure(`File not found: ${filePath}`);
    }

    const code = fs.readFileSync(filePath, 'utf-8');
    const ext = path.extname(filePath).replace('.', '');

    this.logInfo(`Profiling ${file}...`);

    const prompt = `Analyze this ${ext || language || 'code'} for performance issues:

\`\`\`${ext || language || 'text'}
${code}
\`\`\`

Identify:
1. Performance bottlenecks (O(n²) or worse, unnecessary loops, etc.)
2. Memory leaks or inefficient memory usage
3. Unnecessary computations that could be cached
4. I/O operations that could be optimized
5. Recommendations with specific code improvements`;

    try {
      const response = await this.provider.chat(
        [{ role: 'user', content: prompt }],
        {
          model: 'claude-sonnet-4-20250514',
          maxTokens: 4096,
        }
      );

      const issues = this.parsePerformanceIssues(response.content);

      const duration = Date.now() - startTime;

      return this.success({
        action: 'profile',
        file,
        issues,
        issueCount: issues.length,
        analysis: response.content,
      }, {
        tokens: response.usage?.totalTokens,
        duration,
        model: response.model,
      });

    } catch (error) {
      return this.failure(error instanceof Error ? error.message : 'Profiling failed');
    }
  }

  /**
   * Trace code execution
   */
  private async traceExecution(params: Record<string, any>, startTime: number): Promise<ModuleResult> {
    const { code, startFunction, endFunction, language } = params;

    if (!code) {
      return this.failure('Missing required parameter: code');
    }

    this.logInfo('Tracing execution path...');

    const prompt = `Trace the execution flow of this code:

\`\`\`${language || 'text'}
${code}
\`\`\`

${startFunction ? `Start tracing from: ${startFunction}` : 'Trace from the main entry point'}
${endFunction ? `End tracing at: ${endFunction}` : ''}

Provide:
1. Execution order of functions
2. Call stack at each step
3. Data flow between functions
4. Any potential issues in the execution path`;

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
        action: 'trace',
        startFunction,
        endFunction,
        trace: response.content,
      }, {
        tokens: response.usage?.totalTokens,
        duration,
        model: response.model,
      });

    } catch (error) {
      return this.failure(error instanceof Error ? error.message : 'Tracing failed');
    }
  }

  /**
   * Apply a fix to code
   */
  private async fixIssue(params: Record<string, any>, startTime: number): Promise<ModuleResult> {
    const { code, fix, language } = params;

    if (!code || !fix) {
      return this.failure('Missing required parameters: code, fix');
    }

    this.logInfo('Applying fix...');

    // Apply the fix
    const fixedCode = this.applyFix(code, fix);

    // Verify the fix makes sense
    const prompt = `Verify this fix is correct:

Original code:
\`\`\`${language || 'text'}
${code}
\`\`\`

Fix applied: ${fix}

Does this fix:
1. Solve the original problem?
2. Maintain the same functionality?
3. Follow best practices?
4. Introduce any new issues?

Provide a brief verification.`;

    try {
      const response = await this.provider.chat(
        [{ role: 'user', content: prompt }],
        {
          model: 'claude-sonnet-4-20250514',
          maxTokens: 512,
        }
      );

      const duration = Date.now() - startTime;

      return this.success({
        action: 'fix',
        original: code,
        fixed: fixedCode,
        verification: response.content,
      }, {
        duration,
      });

    } catch (error) {
      // Still return the fix even if verification fails
      const durationMs = Date.now() - startTime;
      return this.success({
        action: 'fix',
        original: code,
        fixed: fixedCode,
        verification: 'Could not verify automatically',
      }, {
        duration: durationMs,
      });
    }
  }

  /**
   * Parse stack trace to extract location
   */
  private parseStackTrace(stackTrace: string): ErrorLocation | null {
    // Node.js stack trace format
    const nodePattern = /\s+at\s+(?:.*\s+)?\(?(.+?):(\d+):(\d+)\)?/;
    const match = stackTrace.match(nodePattern);

    if (match) {
      return {
        file: match[1],
        line: parseInt(match[2], 10),
        column: parseInt(match[3], 10),
      };
    }

    // Browser stack trace format
    const browserPattern = /at\s+(?:.*@)?(.+?):(\d+):(\d+)/;
    const browserMatch = stackTrace.match(browserPattern);

    if (browserMatch) {
      return {
        file: browserMatch[1],
        line: parseInt(browserMatch[2], 10),
        column: parseInt(browserMatch[3], 10),
      };
    }

    return null;
  }

  /**
   * Detect error type from message
   */
  private detectErrorType(error: string): string {
    for (const pattern of this.errorPatterns) {
      if (pattern.pattern.test(error)) {
        return pattern.type;
      }
    }

    // Check for common error types
    if (error.includes('TypeError')) return 'TypeError';
    if (error.includes('ReferenceError')) return 'ReferenceError';
    if (error.includes('SyntaxError')) return 'SyntaxError';
    if (error.includes('RangeError')) return 'RangeError';
    if (error.includes('Error')) return 'Error';

    return 'Unknown Error';
  }

  /**
   * Match error against known patterns
   */
  private matchErrorPattern(error: string): { type: string; suggestion: string } | undefined {
    for (const pattern of this.errorPatterns) {
      if (pattern.pattern.test(error)) {
        return pattern;
      }
    }
    return undefined;
  }

  /**
   * Extract error message
   */
  private extractErrorMessage(error: string): string {
    // Try to extract the main error message
    const lines = error.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('at ') && !trimmed.startsWith('    at')) {
        return trimmed.substring(0, 200);
      }
    }
    return error.substring(0, 200);
  }

  /**
   * Find related errors
   */
  private findRelatedErrors(error: string): string[] {
    const related: string[] = [];

    // Common related errors
    if (error.includes('undefined')) {
      related.push('TypeError: Cannot read property of undefined');
      related.push('ReferenceError: x is not defined');
    }
    if (error.includes('null')) {
      related.push('TypeError: Cannot read property of null');
    }
    if (error.includes('async')) {
      related.push('UnhandledPromiseRejection');
      related.push('Promise was rejected');
    }

    return related;
  }

  /**
   * Parse fixes from AI response
   */
  private parseFixes(content: string): Array<{ description: string; code: string; explanation: string }> {
    const fixes: Array<{ description: string; code: string; explanation: string }> = [];
    const fixPattern = /=== FIX \d+ ===\s*Description:\s*([^\n]+)\s*Code:\s*([^\n]+)\s*Explanation:\s*([\s\S]*?)(?=== FIX \d+|=== END ===|$)/g;

    let match;
    while ((match = fixPattern.exec(content)) !== null) {
      fixes.push({
        description: match[1].trim(),
        code: match[2].trim(),
        explanation: match[3].trim(),
      });
    }

    return fixes;
  }

  /**
   * Apply a fix to code
   */
  private applyFix(code: string, fix: string): string {
    // Simple string replacement for now
    // In a real implementation, this would use AST parsing
    return `${code}\n\n// Fix applied:\n${fix}`;
  }

  /**
   * Parse performance issues from analysis
   */
  private parsePerformanceIssues(content: string): Array<{ type: string; description: string; line?: number }> {
    const issues: Array<{ type: string; description: string; line?: number }> = [];

    // Extract issues from response
    const lines = content.split('\n');
    let currentIssue: { type: string; description: string } | null = null;

    for (const line of lines) {
      if (line.match(/^\d+\./)) {
        if (currentIssue) {
          issues.push(currentIssue);
        }
        currentIssue = {
          type: 'performance',
          description: line.replace(/^\d+\.\s*/, ''),
        };
      } else if (currentIssue && line.trim()) {
        currentIssue.description += ' ' + line.trim();
      }
    }

    if (currentIssue) {
      issues.push(currentIssue);
    }

    return issues;
  }
}
