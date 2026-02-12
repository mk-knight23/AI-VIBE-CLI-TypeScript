/**
 * VIBE-CLI v0.0.1 - Git Manager
 * Unified git operations interface
 */

import { AutoCommitGenerator } from './auto-commit.js';
import { HistoryAnalyzer } from './history-analyzer.js';
import { ConflictResolver, DetectedConflict } from './conflict-resolver.js';
import { RebaseHelper } from './rebase-helper.js';

/**
 * Git Manager - unified interface for git operations
 */
export class GitManager {
  private autoCommit: AutoCommitGenerator;
  private history: HistoryAnalyzer;
  private conflicts: ConflictResolver;
  private rebase: RebaseHelper;

  constructor() {
    this.autoCommit = new AutoCommitGenerator();
    this.history = new HistoryAnalyzer();
    this.conflicts = new ConflictResolver();
    this.rebase = new RebaseHelper();
  }

  /**
   * Create semantic auto-commit
   */
  async createSemanticCommit(message?: string): Promise<{ message: string; success: boolean }> {
    try {
      const commitMsg = await this.autoCommit.generateCommitMessage({});
      return {
        message: commitMsg.fullMessage,
        success: true
      };
    } catch {
      return {
        message: message || 'Failed to generate commit message',
        success: false
      };
    }
  }

  /**
   * Analyze commit history
   */
  async analyzeCommitHistory(limit: number = 10): Promise<string> {
    const result = await this.history.analyzeHistory({ maxCommits: limit });
    return `History Analysis:\n` +
      `- Total commits: ${result.totalCommits}\n` +
      `- Commit types: ${Object.entries(result.commitTypes).map(([k, v]) => `${k}: ${v}`).join(', ')}\n` +
      `- Insights: ${result.insights.join(', ')}`;
  }

  /**
   * Detect and resolve conflicts
   */
  async detectConflicts(): Promise<string> {
    const detected = await this.conflicts.detectConflicts();
    if (detected.length === 0) {
      return 'No conflicts detected. Working tree is clean.';
    }
    return `Found ${detected.length} conflict(s):\n` +
      detected.map((c: DetectedConflict) => `  - ${c.file} (${c.regions.length} conflict regions)`).join('\n');
  }

  /**
   * Get rebase guidance
   */
  async getRebaseGuidance(step: number): Promise<string> {
    const plan = await this.rebase.generateRebasePlan('main');
    if (step >= 0 && step < plan.commits.length) {
      const commit = plan.commits[step];
      return `Rebase Step ${step + 1}:\n` +
        `- Commit: ${commit.commitHash}\n` +
        `- Action: ${commit.action}\n` +
        `- Warnings: ${plan.warnings.join(', ')}`;
    }
    return `Rebase Plan:\n` +
      `- Current branch: ${plan.currentBranch}\n` +
      `- Commits to rebase: ${plan.commits.length}\n` +
      `- Estimated duration: ${plan.estimatedDuration}`;
  }
}
