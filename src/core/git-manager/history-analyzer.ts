/**
 * VIBE-CLI v0.0.2 - Git History Analyzer
 * Analyze commit history for patterns and insights
 */

import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { simpleGit, SimpleGit, LogResult } from 'simple-git';
import chalk from 'chalk';

/**
 * Commit analysis
 */
export interface CommitAnalysis {
  hash: string;
  date: Date;
  message: string;
  author: string;
  type?: string;
  scope?: string;
  isMerge: boolean;
  filesChanged: number;
  insertions: number;
  deletions: number;
}

/**
 * Commit pattern
 */
export interface CommitPattern {
  name: string;
  description: string;
  frequency: number;
  commits: string[];
  suggestion?: string;
}

/**
 * Refactoring opportunity
 */
export interface RefactoringOpportunity {
  type: 'extract' | 'rename' | 'split' | 'merge' | 'inline' | 'general';
  files: string[];
  description: string;
  priority: 'low' | 'medium' | 'high';
  relatedCommits: string[];
}

/**
 * History analysis result
 */
export interface HistoryAnalysisResult {
  totalCommits: number;
  dateRange: { start: Date; end: Date };
  commitTypes: Record<string, number>;
  patterns: CommitPattern[];
  refactoringOpportunities: RefactoringOpportunity[];
  topContributors: { name: string; count: number }[];
  averageCommitSize: number;
  insights: string[];
}

/**
 * History analyzer options
 */
export interface HistoryAnalyzerOptions {
  since?: string;
  until?: string;
  maxCommits?: number;
  pattern?: string;
}

/**
 * Git History Analyzer
 */
export class HistoryAnalyzer {
  private git: SimpleGit;
  private readonly cwd: string;

  constructor(cwd?: string) {
    this.cwd = cwd || process.cwd();
    this.git = simpleGit(this.cwd);
  }

  /**
   * Analyze commit history
   */
  async analyzeHistory(options: HistoryAnalyzerOptions = {}): Promise<HistoryAnalysisResult> {
    const { since, until, maxCommits = 100, pattern } = options;

    // Get commit log
    const logOptions: any = { '--max-count': maxCommits };
    if (since) logOptions.since = since;
    if (until) logOptions.until = until;

    const log = await this.git.log(logOptions);

    if (log.total === 0) {
      return {
        totalCommits: 0,
        dateRange: { start: new Date(), end: new Date() },
        commitTypes: {},
        patterns: [],
        refactoringOpportunities: [],
        topContributors: [],
        averageCommitSize: 0,
        insights: ['No commits found in the specified range.'],
      };
    }

    // Parse commits
    const commits = this.parseCommits(log.all);

    // Analyze patterns
    const patterns = this.findPatterns(commits);

    // Find refactoring opportunities
    const refactoringOpportunities = this.findRefactoringOpportunities(commits);

    // Count commit types
    const commitTypes = this.countCommitTypes(commits);

    // Find top contributors
    const topContributors = this.findTopContributors(commits);

    // Calculate average commit size
    const averageCommitSize = this.calculateAverageCommitSize(commits);

    // Generate insights
    const insights = this.generateInsights(commits, patterns, commitTypes);

    return {
      totalCommits: log.total,
      dateRange: {
        start: commits[commits.length - 1].date,
        end: commits[0].date,
      },
      commitTypes,
      patterns,
      refactoringOpportunities,
      topContributors,
      averageCommitSize,
      insights,
    };
  }

  /**
   * Find patterns in commit history matching a query
   */
  async findPatternMatches(query: string): Promise<string[]> {
    const log = await this.git.log({ '--max-count': '200' });
    const matches: string[] = [];
    const lowerQuery = query.toLowerCase();

    for (const commit of log.all) {
      const message = commit.message || '';
      if (message.toLowerCase().includes(lowerQuery)) {
        matches.push(`${commit.hash.slice(0, 7)}: ${message}`);
      }
    }

    return matches;
  }

  /**
   * Suggest related commits
   */
  async suggestRelatedCommits(commitHash: string): Promise<string[]> {
    const commit = await this.git.show(commitHash);

    // Get files changed in this commit
    const files = this.extractFilesFromShow(commit);

    // Find other commits that changed similar files
    const log = await this.git.log({ '--max-count': '100' });
    const related: string[] = [];

    for (const c of log.all) {
      if (c.hash === commitHash) continue;

      const cShow = await this.git.show(c.hash);
      const cFiles = this.extractFilesFromShow(cShow);

      // Check for file overlap
      const overlap = files.filter((f) => cFiles.includes(f));
      if (overlap.length > 0) {
        related.push(`${c.hash.slice(0, 7)}: ${c.message} (${overlap.length} overlapping files)`);
      }
    }

    return related.slice(0, 10);
  }

  /**
   * Get commit statistics for a file
   */
  async getFileHistory(filePath: string): Promise<{
    commits: { hash: string; date: Date; message: string }[];
    authors: { name: string; count: number }[];
  }> {
    const log = await this.git.log({ '--follow': filePath, '--max-count': '50' });

    const commits = log.all.map((c) => ({
      hash: c.hash,
      date: new Date(c.date || Date.now()),
      message: c.message || '',
    }));

    const authorCounts = new Map<string, number>();
    for (const c of log.all) {
      const commitAny = c as any;
      const name = commitAny.author_name || commitAny.author || 'Unknown';
      authorCounts.set(name, (authorCounts.get(name) || 0) + 1);
    }

    const authors = Array.from(authorCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return { commits, authors };
  }

  /**
   * Parse commits from git log output
   */
  private parseCommits(rawCommits: LogResult['all']): CommitAnalysis[] {
    return rawCommits.map((commit) => {
      const { type, scope } = this.parseConventionalCommit(commit.message || '');
      const commitAny = commit as any;

      return {
        hash: commit.hash,
        date: new Date(commit.date || Date.now()),
        message: commit.message || '',
        author: commitAny.author_name || commitAny.author || 'Unknown',
        type,
        scope,
        isMerge: (commit.message || '').startsWith('Merge'),
        filesChanged: 0, // Would need diff stats
        insertions: 0,
        deletions: 0,
      };
    });
  }

  /**
   * Parse conventional commit message
   */
  private parseConventionalCommit(
    message: string
  ): { type?: string; scope?: string } {
    const match = message.match(/^(\w+)(?:\(([^)]+)\))?:/);
    if (match) {
      return { type: match[1], scope: match[2] };
    }
    return {};
  }

  /**
   * Find patterns in commits
   */
  private findPatterns(commits: CommitAnalysis[]): CommitPattern[] {
    const patterns: CommitPattern[] = [];

    // Find repeated commit types
    const typeGroups = new Map<string, string[]>();
    for (const commit of commits) {
      if (commit.type) {
        if (!typeGroups.has(commit.type)) {
          typeGroups.set(commit.type, []);
        }
        typeGroups.get(commit.type)!.push(commit.hash);
      }
    }

    for (const [type, hashes] of typeGroups) {
      if (hashes.length >= 3) {
        patterns.push({
          name: `${type} commits`,
          description: `Found ${hashes.length} ${type} commits`,
          frequency: hashes.length,
          commits: hashes.slice(0, 5),
          suggestion: `Consider if these ${type} commits could be batched together`,
        });
      }
    }

    // Find WIP commits
    const wipCommits = commits.filter(
      (c) =>
        c.message.toLowerCase().includes('wip') ||
        c.message.toLowerCase().includes('work in progress')
    );
    if (wipCommits.length > 0) {
      patterns.push({
        name: 'WIP commits',
        description: `${wipCommits.length} work-in-progress commits found`,
        frequency: wipCommits.length,
        commits: wipCommits.map((c) => c.hash),
        suggestion: 'Remove WIP markers before merging to main',
      });
    }

    // Find large commits
    const largeCommits = commits.filter((c) => c.filesChanged > 10);
    if (largeCommits.length > 0) {
      patterns.push({
        name: 'Large commits',
        description: `${largeCommits.length} commits with more than 10 files`,
        frequency: largeCommits.length,
        commits: largeCommits.map((c) => c.hash),
        suggestion: 'Consider splitting large commits into smaller ones',
      });
    }

    return patterns;
  }

  /**
   * Find refactoring opportunities
   */
  private findRefactoringOpportunities(
    commits: CommitAnalysis[]
  ): RefactoringOpportunity[] {
    const opportunities: RefactoringOpportunity[] = [];

    // Count file changes per file
    const fileChanges = new Map<string, string[]>();

    for (const commit of commits) {
      // This would need actual diff analysis
      // For now, we'll return general suggestions
    }

    // General refactoring suggestions based on commit patterns
    const featCount = commits.filter((c) => c.type === 'feat').length;
    const fixCount = commits.filter((c) => c.type === 'fix').length;

    if (fixCount > featCount * 2) {
      opportunities.push({
        type: 'general',
        files: [],
        description:
          'High ratio of bug fixes to new features - consider stability audit',
        priority: 'medium',
        relatedCommits: commits.filter((c) => c.type === 'fix').map((c) => c.hash),
      });
    }

    return opportunities;
  }

  /**
   * Count commit types
   */
  private countCommitTypes(commits: CommitAnalysis[]): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const commit of commits) {
      const type = commit.type || 'other';
      counts[type] = (counts[type] || 0) + 1;
    }

    return counts;
  }

  /**
   * Find top contributors
   */
  private findTopContributors(
    commits: CommitAnalysis[]
  ): { name: string; count: number }[] {
    const counts = new Map<string, number>();

    for (const commit of commits) {
      const name = commit.author;
      counts.set(name, (counts.get(name) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  /**
   * Calculate average commit size
   */
  private calculateAverageCommitSize(commits: CommitAnalysis[]): number {
    if (commits.length === 0) return 0;

    const totalFiles = commits.reduce((sum, c) => sum + c.filesChanged, 0);
    return Math.round(totalFiles / commits.length);
  }

  /**
   * Generate insights from analysis
   */
  private generateInsights(
    commits: CommitAnalysis[],
    patterns: CommitPattern[],
    commitTypes: Record<string, number>
  ): string[] {
    const insights: string[] = [];

    // Check commit frequency
    const days =
      (commits[0].date.getTime() - commits[commits.length - 1].date.getTime()) /
      (1000 * 60 * 60 * 24);
    const commitsPerDay = commits.length / Math.max(days, 1);

    if (commitsPerDay < 1) {
      insights.push('Low commit frequency - consider committing more often');
    } else if (commitsPerDay > 10) {
      insights.push('High commit frequency - good for tracking changes');
    }

    // Check for diverse commit types
    const typeCount = Object.keys(commitTypes).length;
    if (typeCount < 3 && commits.length > 10) {
      insights.push(
        'Limited commit type diversity - consider using conventional commits'
      );
    }

    // Check for merge commits
    const mergeCount = commits.filter((c) => c.isMerge).length;
    if (mergeCount > commits.length * 0.3) {
      insights.push(
        'High number of merge commits - consider using rebase instead'
      );
    }

    // Pattern-based insights
    for (const pattern of patterns) {
      if (pattern.name === 'WIP commits') {
        insights.push(pattern.suggestion || '');
      }
    }

    return insights.filter(Boolean);
  }

  /**
   * Extract files from git show output
   */
  private extractFilesFromShow(showOutput: string): string[] {
    return showOutput
      .split('\n')
      .filter((line) => line && !line.startsWith(':'))
      .map((line) => line.trim());
  }
}

/**
 * Singleton instance
 */
export const historyAnalyzer = new HistoryAnalyzer();
