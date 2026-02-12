/**
 * VIBE CLI - Git Intelligence Core
 * AI-powered git analysis for semantic commits, PRs, and code review
 */

import { simpleGit, SimpleGit } from 'simple-git';
import { createLogger } from '../../utils/pino-logger.js';
import { errors } from '../../utils/errors.js';
import { CompletionPrimitive } from '../primitives/completion.js';

const logger = createLogger('git-intelligence');

// Conventional commit types
export type CommitType =
  | 'feat'
  | 'fix'
  | 'docs'
  | 'style'
  | 'refactor'
  | 'perf'
  | 'test'
  | 'build'
  | 'ci'
  | 'chore'
  | 'revert';

export interface CommitTypeInfo {
  type: CommitType;
  description: string;
  emoji: string;
}

export const COMMIT_TYPES: Record<CommitType, CommitTypeInfo> = {
  feat: { type: 'feat', description: 'A new feature', emoji: '✨' },
  fix: { type: 'fix', description: 'A bug fix', emoji: '🐛' },
  docs: { type: 'docs', description: 'Documentation only changes', emoji: '📚' },
  style: { type: 'style', description: 'Code style changes (formatting, semicolons, etc)', emoji: '💎' },
  refactor: { type: 'refactor', description: 'Code refactoring', emoji: '♻️' },
  perf: { type: 'perf', description: 'Performance improvements', emoji: '🚀' },
  test: { type: 'test', description: 'Adding or updating tests', emoji: '🧪' },
  build: { type: 'build', description: 'Build system changes', emoji: '🔧' },
  ci: { type: 'ci', description: 'CI/CD changes', emoji: '🔨' },
  chore: { type: 'chore', description: 'Other changes', emoji: '⚙️' },
  revert: { type: 'revert', description: 'Reverting previous changes', emoji: '⏪' },
};

export interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  diff?: string;
}

export interface DiffAnalysis {
  files: FileChange[];
  totalAdditions: number;
  totalDeletions: number;
  summary: string;
  scope?: string;
}

export interface CommitSuggestion {
  type: CommitType;
  scope?: string;
  description: string;
  body?: string;
  breaking?: boolean;
  footer?: string;
}

export interface StagedFile {
  path: string;
  status: string;
  index: string;
  working_dir: string;
}

/**
 * Git Intelligence class for AI-powered git operations
 */
export class GitIntelligence {
  private git: SimpleGit;
  private completion: CompletionPrimitive;

  constructor(completion: CompletionPrimitive, git?: SimpleGit) {
    this.completion = completion;
    this.git = git || simpleGit();
  }

  /**
   * Get staged files
   */
  async getStagedFiles(): Promise<StagedFile[]> {
    try {
      const status = await this.git.status();
      return status.staged.map((file) => ({
        path: file,
        status: 'staged',
        index: 'M',
        working_dir: ' ',
      }));
    } catch (error) {
      logger.error({ error }, 'Failed to get staged files');
      throw errors.commandFailed('getStagedFiles', error as Error);
    }
  }

  /**
   * Get diff for staged files
   */
  async getStagedDiff(): Promise<string> {
    try {
      const diff = await this.git.diff(['--cached']);
      return diff;
    } catch (error) {
      logger.error({ error }, 'Failed to get staged diff');
      throw errors.commandFailed('getStagedDiff', error as Error);
    }
  }

  /**
   * Get diff for specific files
   */
  async getFileDiff(filePath: string, staged: boolean = true): Promise<string> {
    try {
      const args = staged ? ['--cached', filePath] : [filePath];
      const diff = await this.git.diff(args);
      return diff;
    } catch (error) {
      logger.error({ error, filePath }, 'Failed to get file diff');
      throw errors.fileReadError(filePath, error as Error);
    }
  }

  /**
   * Parse diff into structured format
   */
  parseDiff(diff: string): FileChange[] {
    const files: FileChange[] = [];
    const fileRegex = /^diff --git a\/(.+) b\/(.+)$/gm;

    let match;
    while ((match = fileRegex.exec(diff)) !== null) {
      const oldPath = match[1];
      const newPath = match[2];
      const path = newPath === '/dev/null' ? oldPath : newPath;

      // Find additions/deletions for this file
      const fileStart = match.index;
      const nextFileMatch = fileRegex.exec(diff);
      const fileEnd = nextFileMatch ? nextFileMatch.index : diff.length;
      fileRegex.lastIndex = fileStart + 1;

      const fileDiff = diff.slice(fileStart, fileEnd);

      let additions = 0;
      let deletions = 0;

      // Count +/- lines (excluding diff metadata)
      const lines = fileDiff.split('\n');
      for (const line of lines) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          additions++;
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          deletions++;
        }
      }

      // Determine status
      let status: FileChange['status'] = 'modified';
      if (fileDiff.includes('new file mode')) {
        status = 'added';
      } else if (fileDiff.includes('deleted file mode')) {
        status = 'deleted';
      } else if (oldPath !== newPath && !newPath.includes('/dev/null')) {
        status = 'renamed';
      }

      files.push({
        path,
        status,
        additions,
        deletions,
        diff: fileDiff,
      });
    }

    return files;
  }

  /**
   * Analyze diff using AI
   */
  async analyzeDiff(files: FileChange[]): Promise<DiffAnalysis> {
    logger.debug({ fileCount: files.length }, 'Analyzing diff');

    const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
    const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

    // Build prompt for AI analysis
    const fileSummaries = files
      .map((f) => `${f.path} (${f.status}: +${f.additions}/-${f.deletions})`)
      .join('\n');

    const prompt = `Analyze these file changes and provide a brief summary:

Files changed:
${fileSummaries}

Provide a one-sentence summary of what these changes accomplish.`;

    try {
      const result = await this.completion.execute({
        prompt,
        options: {
          systemPrompt:
            'You are a git expert. Summarize code changes concisely. Focus on the purpose and impact.',
          maxTokens: 100,
        },
      });

      const summary = result.success
        ? result.data.trim()
        : `Changed ${files.length} files (+${totalAdditions}/-${totalDeletions})`;

      // Infer scope from file paths
      const scope = this.inferScope(files);

      return {
        files,
        totalAdditions,
        totalDeletions,
        summary,
        scope,
      };
    } catch (error) {
      logger.error({ error }, 'AI analysis failed');
      return {
        files,
        totalAdditions,
        totalDeletions,
        summary: `Changed ${files.length} files (+${totalAdditions}/-${totalDeletions})`,
      };
    }
  }

  /**
   * Summarize changes for commit message
   */
  async summarizeChanges(analysis: DiffAnalysis): Promise<string> {
    const { files, summary } = analysis;

    if (files.length === 0) {
      return 'No changes';
    }

    if (files.length === 1) {
      const file = files[0];
      return `${file.path}: ${summary}`;
    }

    return summary;
  }

  /**
   * Suggest commit type based on changes
   */
  async suggestCommitType(files: FileChange[]): Promise<CommitType> {
    // Heuristic-based suggestion
    const filePaths = files.map((f) => f.path);

    // Check for test files
    const hasTests = filePaths.some(
      (p) => p.includes('.test.') || p.includes('.spec.') || p.includes('__tests__')
    );
    const onlyTests = filePaths.every(
      (p) => p.includes('.test.') || p.includes('.spec.') || p.includes('__tests__')
    );
    if (onlyTests) return 'test';

    // Check for documentation
    const hasDocs = filePaths.some(
      (p) =>
        p.endsWith('.md') ||
        p.includes('docs/') ||
        p.includes('README') ||
        p.includes('CHANGELOG')
    );
    const onlyDocs = filePaths.every(
      (p) =>
        p.endsWith('.md') ||
        p.includes('docs/') ||
        p.includes('README') ||
        p.includes('CHANGELOG')
    );
    if (onlyDocs) return 'docs';

    // Use AI for more accurate suggestion
    const fileList = filePaths.join('\n');
    const prompt = `Based on these changed files, what type of commit is this?

Files:
${fileList}

Choose one: feat, fix, docs, style, refactor, perf, test, build, ci, chore

Respond with just the type.`;

    try {
      const result = await this.completion.execute({
        prompt,
        options: {
          systemPrompt:
            'You are a git expert. Classify changes into conventional commit types. Respond with just the type word.',
          maxTokens: 20,
        },
      });

      if (result.success) {
        const type = result.data.trim().toLowerCase() as CommitType;
        if (COMMIT_TYPES[type]) {
          return type;
        }
      }
    } catch (error) {
      logger.warn({ error }, 'AI type suggestion failed, using heuristics');
    }

    // Fallback heuristics
    if (hasTests && files.length <= 2) return 'test';

    // Check for config/build files
    const configFiles = [
      'package.json',
      'tsconfig.json',
      'webpack.config',
      'vite.config',
      'rollup.config',
      'Dockerfile',
      '.github/workflows',
      '.gitlab-ci',
    ];
    const hasConfig = filePaths.some((p) =>
      configFiles.some((cf) => p.includes(cf))
    );
    if (hasConfig) return 'chore';

    return 'feat'; // Default
  }

  /**
   * Generate commit suggestion
   */
  async generateCommitSuggestion(
    analysis: DiffAnalysis,
    context?: string
  ): Promise<CommitSuggestion> {
    const { files, summary, scope } = analysis;

    const type = await this.suggestCommitType(files);

    // Generate description
    let description = summary;
    if (description.length > 72) {
      description = description.slice(0, 69) + '...';
    }

    // Check for breaking changes
    const hasBreaking = files.some(
      (f) =>
        f.diff?.includes('BREAKING CHANGE') ||
        f.diff?.includes('breaking-change') ||
        f.path.includes('deprecated')
    );

    // Generate body for complex changes
    let body: string | undefined;
    if (files.length > 5 || hasBreaking) {
      body = this.generateCommitBody(analysis);
    }

    return {
      type,
      scope,
      description,
      body,
      breaking: hasBreaking,
    };
  }

  /**
   * Format commit message
   */
  formatCommitMessage(suggestion: CommitSuggestion): string {
    const { type, scope, description, body, breaking, footer } = suggestion;

    let message = type;
    if (scope) {
      message += `(${scope})`;
    }
    if (breaking) {
      message += '!';
    }
    message += `: ${description}`;

    if (body) {
      message += `\n\n${body}`;
    }

    if (breaking) {
      message += '\n\nBREAKING CHANGE: This change may break existing functionality';
    }

    if (footer) {
      message += `\n\n${footer}`;
    }

    return message;
  }

  /**
   * Generate semantic commit message (legacy API compatibility)
   */
  async generateSemanticCommit(): Promise<string> {
    const diff = await this.getStagedDiff();
    if (!diff) {
      return 'No staged changes';
    }

    const files = this.parseDiff(diff);
    const analysis = await this.analyzeDiff(files);
    const suggestion = await this.generateCommitSuggestion(analysis);

    return this.formatCommitMessage(suggestion);
  }

  /**
   * Analyze commit history
   */
  async analyzeHistory(limit: number = 10): Promise<string> {
    try {
      const log = await this.git.log({ maxCount: limit });
      const history = log.all
        .map((c) => `${c.date} - ${c.author_name}: ${c.message}`)
        .join('\n');

      const prompt = `Analyze the recent project history and summarize the current direction:

${history}`;

      const result = await this.completion.execute({
        prompt,
        options: {
          systemPrompt:
            'You are a project analyst. Summarize development trends and focus areas.',
          maxTokens: 200,
        },
      });

      return result.success ? result.data : 'History analysis unavailable';
    } catch (error) {
      logger.error({ error }, 'Failed to analyze history');
      return 'History analysis unavailable';
    }
  }

  /**
   * Infer scope from file paths
   */
  private inferScope(files: FileChange[]): string | undefined {
    if (files.length === 0) return undefined;

    // Get common directory
    const paths = files.map((f) => f.path.split('/'));
    if (paths.length === 1) {
      // Single file - use parent directory
      const parts = paths[0];
      return parts.length > 1 ? parts[parts.length - 2] : undefined;
    }

    // Find common prefix
    let common = paths[0];
    for (let i = 1; i < paths.length; i++) {
      const current = paths[i];
      const minLength = Math.min(common.length, current.length);
      const newCommon: string[] = [];
      for (let j = 0; j < minLength; j++) {
        if (common[j] === current[j]) {
          newCommon.push(common[j]);
        } else {
          break;
        }
      }
      common = newCommon;
    }

    // Use last common directory as scope
    return common.length > 0 ? common[common.length - 1] : undefined;
  }

  /**
   * Generate commit body for complex changes
   */
  private generateCommitBody(analysis: DiffAnalysis): string {
    const { files } = analysis;

    const lines: string[] = [];

    // List significant changes
    for (const file of files.slice(0, 10)) {
      const change =
        file.status === 'added'
          ? 'added'
          : file.status === 'deleted'
            ? 'removed'
            : 'updated';
      lines.push(`- ${change} ${file.path}`);
    }

    if (files.length > 10) {
      lines.push(`- and ${files.length - 10} more files`);
    }

    return lines.join('\n');
  }
}
