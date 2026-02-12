/**
 * VIBE-CLI v0.0.1 - Auto Commit Generator
 * Semantic commit message generation based on staged changes
 */

import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { simpleGit, SimpleGit } from 'simple-git';
import chalk from 'chalk';

/**
 * Commit type according to Conventional Commits
 */
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

/**
 * Commit scope
 */
export interface CommitScope {
  name: string;
  files: string[];
}

/**
 * Generated commit message
 */
export interface CommitMessage {
  type: CommitType;
  scope?: string;
  shortDescription: string;
  fullMessage: string;
  breakingChanges: string[];
  issues: string[];
  confidence: number;
}

/**
 * Analyze staged changes result
 */
export interface StagedChangesAnalysis {
  files: StagedFile[];
  totalAdded: number;
  totalModified: number;
  totalDeleted: number;
  probableType: CommitType;
  probableScope?: string;
  hasBreakingChanges: boolean;
  hasTests: boolean;
  hasDocumentation: boolean;
}

/**
 * Staged file information
 */
export interface StagedFile {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  isTest: boolean;
  isDoc: boolean;
  isConfig: boolean;
}

/**
 * Auto-commit options
 */
export interface AutoCommitOptions {
  conventional?: boolean;
  maxLength?: number;
  includeIssues?: boolean;
  autoPush?: boolean;
  dryRun?: boolean;
}

/**
 * Auto-commit result
 */
export interface AutoCommitResult {
  success: boolean;
  message?: CommitMessage;
  commitHash?: string;
  error?: string;
  dryRun?: boolean;
}

/**
 * Auto-Commit Generator
 */
export class AutoCommitGenerator {
  private git: SimpleGit;
  private readonly typeDescriptions: Record<CommitType, string> = {
    feat: 'A new feature',
    fix: 'A bug fix',
    docs: 'Documentation only changes',
    style: 'Changes that do not affect the meaning of the code (white-space, formatting, etc)',
    refactor: 'A code change that neither fixes a bug nor adds a feature',
    perf: 'A code change that improves performance',
    test: 'Adding missing tests or correcting existing tests',
    build: 'Changes that affect the build system or external dependencies',
    ci: 'Changes to our CI configuration files and scripts',
    chore: 'Other changes that do not modify src or test files',
    revert: 'Reverts a previous commit',
  };

  constructor(cwd?: string) {
    this.git = simpleGit(cwd || process.cwd());
  }

  /**
   * Analyze staged changes
   */
  async analyzeStagedChanges(): Promise<StagedChangesAnalysis> {
    const status = await this.git.status();
    const stagedFiles = status.staged.filter(
      (f) => !['R', 'C'].includes(f[0])
    );

    const files: StagedFile[] = [];
    let totalAdded = 0;
    let totalModified = 0;
    let totalDeleted = 0;

    for (const file of stagedFiles) {
      const fileStatus = this.parseStatus(file);
      const diff = await this.getFileDiff(file);

      const isTest = this.isTestFile(file);
      const isDoc = this.isDocumentationFile(file);
      const isConfig = this.isConfigFile(file);

      files.push({
        path: file,
        status: fileStatus,
        additions: diff.additions,
        deletions: diff.deletions,
        isTest,
        isDoc,
        isConfig,
      });

      if (fileStatus === 'added') totalAdded++;
      else if (fileStatus === 'modified') totalModified++;
      else if (fileStatus === 'deleted') totalDeleted++;
    }

    const probableType = this.inferCommitType(files);
    const probableScope = this.inferScope(files);

    return {
      files,
      totalAdded,
      totalModified,
      totalDeleted,
      probableType,
      probableScope,
      hasBreakingChanges: this.detectBreakingChanges(files),
      hasTests: files.some((f) => f.isTest),
      hasDocumentation: files.some((f) => f.isDoc),
    };
  }

  /**
   * Generate a commit message from staged changes
   */
  async generateCommitMessage(
    options: AutoCommitOptions = {}
  ): Promise<CommitMessage> {
    const analysis = await this.analyzeStagedChanges();
    const { conventional = true, maxLength = 100 } = options;

    // Determine type and scope
    const type = analysis.probableType;
    const scope = analysis.probableScope;

    // Generate short description
    const shortDescription = this.generateShortDescription(analysis);

    // Generate full message
    const fullMessage = this.generateFullMessage(
      type,
      scope,
      shortDescription,
      analysis,
      options
    );

    // Extract issue references
    const issues = this.extractIssues(fullMessage);

    // Estimate confidence based on analysis
    const confidence = this.calculateConfidence(analysis);

    return {
      type,
      scope,
      shortDescription,
      fullMessage,
      breakingChanges: analysis.hasBreakingChanges ? ['Breaking changes detected'] : [],
      issues,
      confidence,
    };
  }

  /**
   * Create an auto commit
   */
  async autoCommit(
    options: AutoCommitOptions = {}
  ): Promise<AutoCommitResult> {
    const { conventional = true, dryRun = false, autoPush = false } = options;

    try {
      // Generate commit message
      const message = await this.generateCommitMessage(options);

      if (dryRun) {
        return {
          success: true,
          message,
          dryRun: true,
        };
      }

      // Create commit
      const result = await this.git.commit(message.fullMessage);

      if (autoPush) {
        await this.git.push();
      }

      const commitHash = typeof result === 'string' ? result : (result as any)?.commit?.hash;
      console.log(chalk.green(`\n✅ Commit created: ${commitHash?.slice(0, 7) || 'unknown'}`));
      console.log(chalk.gray(`   ${message.fullMessage}`));

      return {
        success: true,
        message,
        commitHash,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(chalk.red(`\n❌ Commit failed: ${errorMessage}`));

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Parse git status character to file status
   */
  private parseStatus(statusChar: string): StagedFile['status'] {
    switch (statusChar) {
      case 'A':
        return 'added';
      case 'M':
        return 'modified';
      case 'D':
        return 'deleted';
      case 'R':
        return 'renamed';
      default:
        return 'modified';
    }
  }

  /**
   * Get diff statistics for a file
   */
  private async getFileDiff(file: string): Promise<{
    additions: number;
    deletions: number;
  }> {
    try {
      const diff = await this.git.diff(['--cached', '--numstat', file]);
      const lines = diff.split('\n').filter(Boolean);

      if (lines.length > 0) {
        const lastLine = lines[lines.length - 1];
        const [additions, deletions] = lastLine.split('\t').map((n) => parseInt(n, 10) || 0);
        return { additions, deletions };
      }
    } catch {
      // Fallback to 0
    }

    return { additions: 0, deletions: 0 };
  }

  /**
   * Infer commit type from files
   */
  private inferCommitType(files: StagedFile[]): CommitType {
    const hasNewFeature = files.some(
      (f) => f.status === 'added' && !f.isTest && !f.isDoc && !f.isConfig
    );
    const hasBugFix = files.some(
      (f) =>
        f.status === 'modified' &&
        f.deletions > 0 &&
        !f.isTest &&
        !f.isDoc
    );
    const onlyDocs = files.every((f) => f.isDoc);
    const onlyTests = files.every((f) => f.isTest);
    const onlyConfig = files.every((f) => f.isConfig);

    if (hasNewFeature && !hasBugFix) return 'feat';
    if (hasBugFix && !hasNewFeature) return 'fix';
    if (onlyDocs) return 'docs';
    if (onlyTests) return 'test';
    if (onlyConfig) return 'chore';

    // Check for refactoring (many changes but few additions/deletions)
    const totalChanges = files.reduce(
      (sum, f) => sum + f.additions + f.deletions,
      0
    );
    const fileCount = files.length;
    if (totalChanges > 50 && fileCount > 3) return 'refactor';

    return 'feat';
  }

  /**
   * Infer scope from files
   */
  private inferScope(files: StagedFile[]): string | undefined {
    // Group files by directory
    const directories = new Map<string, number>();

    for (const file of files) {
      const dir = path.dirname(file.path).split('/')[0] || '.';
      directories.set(dir, (directories.get(dir) || 0) + 1);
    }

    // Find most common directory
    let maxCount = 0;
    let probableDir = '.';

    for (const [dir, count] of directories) {
      if (count > maxCount && dir !== '.') {
        maxCount = count;
        probableDir = dir;
      }
    }

    return probableDir !== '.' ? probableDir : undefined;
  }

  /**
   * Detect breaking changes
   */
  private detectBreakingChanges(files: StagedFile[]): boolean {
    // Check for package.json version bumps
    const hasMajorBump = files.some(
      (f) =>
        f.path === 'package.json' &&
        f.status === 'modified' &&
        this.isMajorVersionBump(f.path)
    );

    // Check for "BREAKING CHANGE" in commit message template
    // (would need to check diff content)

    return hasMajorBump;
  }

  /**
   * Check if file has major version bump
   */
  private isMajorVersionBump(filePath: string): boolean {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const pkg = JSON.parse(content);
      const version = pkg.version;
      const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
      if (match) {
        return parseInt(match[1], 10) > 1;
      }
    } catch {
      // Ignore
    }
    return false;
  }

  /**
   * Generate short description
   */
  private generateShortDescription(analysis: StagedChangesAnalysis): string {
    const { files, probableType } = analysis;

    if (files.length === 1) {
      const file = files[0];
      const description = this.summarizeFileChange(file);
      return description;
    }

    // Multiple files - summarize
    const scope = analysis.probableScope;
    const fileCount = files.length;

    if (probableType === 'feat') {
      return scope
        ? `${fileCount} files in ${scope}: new features and updates`
        : `${fileCount} files: new features and updates`;
    }

    if (probableType === 'fix') {
      return scope
        ? `${fileCount} files in ${scope}: bug fixes`
        : `${fileCount} files: bug fixes`;
    }

    return scope
      ? `${fileCount} files in ${scope}: updates`
      : `${fileCount} files: updates`;
  }

  /**
   * Summarize a single file change
   */
  private summarizeFileChange(file: StagedFile): string {
    const fileName = path.basename(file.path, path.extname(file.path));

    // Convert snake_case or kebab-case to readable text
    const readableName = fileName
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const capitalized = readableName.charAt(0).toUpperCase() + readableName.slice(1);

    switch (file.status) {
      case 'added':
        return `add ${readableName}`;
      case 'deleted':
        return `remove ${readableName}`;
      case 'modified':
        return `update ${readableName}`;
      default:
        return `change ${readableName}`;
    }
  }

  /**
   * Generate full commit message
   */
  private generateFullMessage(
    type: CommitType,
    scope: string | undefined,
    shortDescription: string,
    analysis: StagedChangesAnalysis,
    options: AutoCommitOptions
  ): string {
    const { conventional = true, includeIssues = true } = options;

    if (!conventional) {
      return shortDescription;
    }

    // Build conventional commit message
    let message = `${type}`;

    if (scope) {
      message += `(${scope})`;
    }

    message += `: ${shortDescription}`;

    // Add body if there are breaking changes
    if (analysis.hasBreakingChanges) {
      message += '\n\nBREAKING CHANGE: ';
    }

    return message;
  }

  /**
   * Extract issue references from message
   */
  private extractIssues(message: string): string[] {
    const issueRegex = /(?:fixes?|closes?|resolves?)\s+#(\d+)/gi;
    const issues: string[] = [];
    let match;

    while ((match = issueRegex.exec(message)) !== null) {
      issues.push(match[1]);
    }

    return [...new Set(issues)];
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(analysis: StagedChangesAnalysis): number {
    let confidence = 0.5; // Base confidence

    // More files = higher confidence for type inference
    confidence += Math.min(analysis.files.length * 0.05, 0.3);

    // Clear type indicators
    if (analysis.hasTests && analysis.probableType === 'feat') {
      confidence += 0.1;
    }

    // Documentation indicates clear intent
    if (analysis.hasDocumentation) {
      confidence += 0.1;
    }

    return Math.min(confidence, 0.95);
  }

  /**
   * Check if file is a test file
   */
  private isTestFile(file: string): boolean {
    return (
      /\.(test|spec)\.(js|ts|jsx|tsx)$/.test(file) ||
      file.includes('__tests__') ||
      file.includes('.test.') ||
      file.includes('.spec.')
    );
  }

  /**
   * Check if file is documentation
   */
  private isDocumentationFile(file: string): boolean {
    return /\.(md|rst|txt|adoc)$/.test(file) || file.toLowerCase().includes('readme');
  }

  /**
   * Check if file is configuration
   */
  private isConfigFile(file: string): boolean {
    const configFiles = [
      'package.json',
      'package-lock.json',
      'tsconfig.json',
      'eslintrc',
      '.eslintrc',
      'prettierrc',
      '.prettierrc',
      'jest.config',
      'vite.config',
      'webpack.config',
    ];

    return configFiles.some((cf) => file.endsWith(cf));
  }
}

/**
 * Singleton instance
 */
export const autoCommitGenerator = new AutoCommitGenerator();
