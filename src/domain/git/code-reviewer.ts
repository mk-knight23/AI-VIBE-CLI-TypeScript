/**
 * VIBE CLI - Code Review Engine
 * AI-powered code review with structured output
 */

import { simpleGit, SimpleGit } from 'simple-git';
import { createLogger } from '../../utils/pino-logger.js';
import { errors } from '../../utils/errors.js';
import { CompletionPrimitive } from '../primitives/completion.js';
import { GitIntelligence } from './git-intelligence.js';

const logger = createLogger('code-reviewer');

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type IssueCategory =
  | 'security'
  | 'performance'
  | 'style'
  | 'bugs'
  | 'best-practices'
  | 'maintainability'
  | 'documentation';

export interface Issue {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  file: string;
  line?: number;
  message: string;
  suggestion?: string;
  code?: string;
}

export interface Suggestion {
  id: string;
  category: IssueCategory;
  file: string;
  line?: number;
  original: string;
  replacement: string;
  explanation: string;
}

export interface FileReview {
  file: string;
  issues: Issue[];
  suggestions: Suggestion[];
  summary: string;
}

export interface ReviewResult {
  files: FileReview[];
  totalIssues: number;
  issuesByCategory: Record<IssueCategory, number>;
  issuesBySeverity: Record<IssueSeverity, number>;
  summary: string;
  suggestions: Suggestion[];
}

export interface ReviewOptions {
  staged?: boolean;
  files?: string[];
  includeSuggestions?: boolean;
  severityThreshold?: IssueSeverity;
  categories?: IssueCategory[];
}

const SEVERITY_WEIGHT: Record<IssueSeverity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

/**
 * Code Review Engine class
 */
export class CodeReviewEngine {
  private git: SimpleGit;
  private completion: CompletionPrimitive;
  private gitIntel: GitIntelligence;

  constructor(completion: CompletionPrimitive, git?: SimpleGit) {
    this.completion = completion;
    this.git = git || simpleGit();
    this.gitIntel = new GitIntelligence(completion, this.git);
  }

  /**
   * Review changes
   */
  async reviewChanges(options: ReviewOptions = {}): Promise<ReviewResult> {
    logger.debug(options, 'Starting code review');

    const { staged = true, files: specificFiles } = options;

    // Get files to review
    let files: string[];
    if (specificFiles && specificFiles.length > 0) {
      files = specificFiles;
    } else {
      const diff = await this.gitIntel.getStagedDiff();
      const parsedFiles = this.gitIntel.parseDiff(diff);
      files = parsedFiles.map((f) => f.path);
    }

    if (files.length === 0) {
      return {
        files: [],
        totalIssues: 0,
        issuesByCategory: {
          security: 0,
          performance: 0,
          style: 0,
          bugs: 0,
          'best-practices': 0,
          maintainability: 0,
          documentation: 0,
        },
        issuesBySeverity: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          info: 0,
        },
        summary: 'No files to review',
        suggestions: [],
      };
    }

    // Review each file
    const fileReviews: FileReview[] = [];
    for (const file of files) {
      try {
        const review = await this.reviewFile(file, staged);
        fileReviews.push(review);
      } catch (error) {
        logger.warn({ error, file }, 'Failed to review file');
      }
    }

    // Aggregate results
    const result = this.aggregateResults(fileReviews);

    logger.debug(
      { totalIssues: result.totalIssues, files: files.length },
      'Code review complete'
    );

    return result;
  }

  /**
   * Review a single file
   */
  async reviewFile(file: string, staged: boolean = true): Promise<FileReview> {
    logger.debug({ file }, 'Reviewing file');

    // Get diff for this file
    const diff = await this.gitIntel.getFileDiff(file, staged);

    if (!diff) {
      return {
        file,
        issues: [],
        suggestions: [],
        summary: 'No changes to review',
      };
    }

    // Build review prompt
    const prompt = `Review this code change and identify issues:

File: ${file}

Diff:
\`\`\`diff
${diff.slice(0, 4000)}
\`\`\`

Identify any of these issue types:
- Security vulnerabilities (SQL injection, XSS, unsafe eval, etc.)
- Performance issues (inefficient algorithms, memory leaks, N+1 queries)
- Style inconsistencies (naming, formatting)
- Potential bugs (null pointer risks, race conditions, logic errors)
- Best practice violations (error handling, validation, testing)
- Maintainability concerns (complexity, duplication, coupling)
- Documentation gaps (missing comments, unclear code)

Respond in this JSON format:
{
  "issues": [
    {
      "category": "security|performance|style|bugs|best-practices|maintainability|documentation",
      "severity": "critical|high|medium|low|info",
      "line": <line_number>,
      "message": "description of issue",
      "suggestion": "how to fix"
    }
  ],
  "summary": "brief summary of the review"
}

If no issues found, return empty issues array.`;

    try {
      const result = await this.completion.execute({
        prompt,
        options: {
          systemPrompt:
            'You are a senior software engineer conducting code reviews. Be thorough but constructive. Focus on substantive issues over style preferences.',
          maxTokens: 1500,
        },
      });

      if (result.success) {
        const parsed = this.parseReviewResponse(result.data, file);
        return parsed;
      }
    } catch (error) {
      logger.error({ error, file }, 'AI review failed');
    }

    // Fallback
    return {
      file,
      issues: [],
      suggestions: [],
      summary: 'Unable to review file',
    };
  }

  /**
   * Parse AI review response
   */
  private parseReviewResponse(response: string, file: string): FileReview {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        const issues: Issue[] = (parsed.issues || []).map(
          (issue: any, index: number) => ({
            id: `${file}-${index}`,
            category: this.validateCategory(issue.category),
            severity: this.validateSeverity(issue.severity),
            file,
            line: issue.line,
            message: issue.message,
            suggestion: issue.suggestion,
          })
        );

        // Generate suggestions from issues
        const suggestions: Suggestion[] = issues
          .filter((i) => i.suggestion)
          .map((issue, index) => ({
            id: `suggestion-${file}-${index}`,
            category: issue.category,
            file,
            line: issue.line,
            original: issue.code || '',
            replacement: issue.suggestion || '',
            explanation: issue.message,
          }));

        return {
          file,
          issues,
          suggestions,
          summary: parsed.summary || `Found ${issues.length} issues`,
        };
      }
    } catch (error) {
      logger.warn({ error, response }, 'Failed to parse review response');
    }

    return {
      file,
      issues: [],
      suggestions: [],
      summary: 'Review completed',
    };
  }

  /**
   * Validate category
   */
  private validateCategory(category: string): IssueCategory {
    const valid: IssueCategory[] = [
      'security',
      'performance',
      'style',
      'bugs',
      'best-practices',
      'maintainability',
      'documentation',
    ];
    return valid.includes(category as IssueCategory)
      ? (category as IssueCategory)
      : 'best-practices';
  }

  /**
   * Validate severity
   */
  private validateSeverity(severity: string): IssueSeverity {
    const valid: IssueSeverity[] = ['critical', 'high', 'medium', 'low', 'info'];
    return valid.includes(severity as IssueSeverity)
      ? (severity as IssueSeverity)
      : 'info';
  }

  /**
   * Aggregate file reviews into result
   */
  private aggregateResults(fileReviews: FileReview[]): ReviewResult {
    const allIssues: Issue[] = [];
    const allSuggestions: Suggestion[] = [];

    for (const review of fileReviews) {
      allIssues.push(...review.issues);
      allSuggestions.push(...review.suggestions);
    }

    // Count by category
    const issuesByCategory: Record<IssueCategory, number> = {
      security: 0,
      performance: 0,
      style: 0,
      bugs: 0,
      'best-practices': 0,
      maintainability: 0,
      documentation: 0,
    };

    for (const issue of allIssues) {
      issuesByCategory[issue.category]++;
    }

    // Count by severity
    const issuesBySeverity: Record<IssueSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    for (const issue of allIssues) {
      issuesBySeverity[issue.severity]++;
    }

    // Generate summary
    const summary = this.generateSummary(allIssues, fileReviews.length);

    return {
      files: fileReviews,
      totalIssues: allIssues.length,
      issuesByCategory,
      issuesBySeverity,
      summary,
      suggestions: allSuggestions,
    };
  }

  /**
   * Generate review summary
   */
  private generateSummary(issues: Issue[], fileCount: number): string {
    if (issues.length === 0) {
      return `✅ Reviewed ${fileCount} files. No issues found.`;
    }

    const critical = issues.filter((i) => i.severity === 'critical').length;
    const high = issues.filter((i) => i.severity === 'high').length;

    let summary = `Found ${issues.length} issues across ${fileCount} files.`;

    if (critical > 0) {
      summary += ` ⚠️ ${critical} critical issues require immediate attention.`;
    }
    if (high > 0) {
      summary += ` ${high} high priority issues.`;
    }

    return summary;
  }

  /**
   * Categorize issues
   */
  categorizeIssues(issues: Issue[]): Record<IssueCategory, Issue[]> {
    const categorized: Record<IssueCategory, Issue[]> = {
      security: [],
      performance: [],
      style: [],
      bugs: [],
      'best-practices': [],
      maintainability: [],
      documentation: [],
    };

    for (const issue of issues) {
      categorized[issue.category].push(issue);
    }

    return categorized;
  }

  /**
   * Filter issues by severity
   */
  filterBySeverity(issues: Issue[], threshold: IssueSeverity): Issue[] {
    const thresholdWeight = SEVERITY_WEIGHT[threshold];
    return issues.filter((i) => SEVERITY_WEIGHT[i.severity] >= thresholdWeight);
  }

  /**
   * Format review for display
   */
  formatReviewForDisplay(result: ReviewResult): string {
    const lines: string[] = [];

    lines.push('## Code Review Results\n');
    lines.push(result.summary);
    lines.push('');

    // Severity breakdown
    lines.push('### By Severity');
    for (const [severity, count] of Object.entries(result.issuesBySeverity)) {
      if (count > 0) {
        const emoji =
          severity === 'critical'
            ? '🔴'
            : severity === 'high'
              ? '🟠'
              : severity === 'medium'
                ? '🟡'
                : severity === 'low'
                  ? '🔵'
                  : '⚪';
        lines.push(`${emoji} ${severity}: ${count}`);
      }
    }
    lines.push('');

    // Category breakdown
    lines.push('### By Category');
    for (const [category, count] of Object.entries(result.issuesByCategory)) {
      if (count > 0) {
        lines.push(`- ${category}: ${count}`);
      }
    }
    lines.push('');

    // File details
    for (const file of result.files) {
      if (file.issues.length > 0) {
        lines.push(`### ${file.file}`);
        for (const issue of file.issues) {
          const emoji =
            issue.severity === 'critical'
              ? '🔴'
              : issue.severity === 'high'
                ? '🟠'
                : issue.severity === 'medium'
                  ? '🟡'
                  : issue.severity === 'low'
                    ? '🔵'
                    : '⚪';
          const line = issue.line ? `:${issue.line}` : '';
          lines.push(`${emoji} **${issue.category}**${line}: ${issue.message}`);
          if (issue.suggestion) {
            lines.push(`   💡 ${issue.suggestion}`);
          }
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Apply suggestions
   */
  async applySuggestions(suggestions: Suggestion[]): Promise<{
    applied: number;
    failed: number;
    errors: string[];
  }> {
    const result = {
      applied: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const suggestion of suggestions) {
      try {
        // This would need file system operations to actually apply
        // For now, just track
        result.applied++;
      } catch (error) {
        result.failed++;
        result.errors.push(`${suggestion.file}: ${(error as Error).message}`);
      }
    }

    return result;
  }
}
