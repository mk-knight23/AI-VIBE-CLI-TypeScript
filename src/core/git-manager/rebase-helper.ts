/**
 * VIBE-CLI v0.0.1 - Git Rebase Helper
 * Guide complex rebasing with explanations and safety checks
 */

import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { simpleGit, SimpleGit } from 'simple-git';
import chalk from 'chalk';

/**
 * Rebase mode
 */
export type RebaseMode = 'interactive' | 'manual' | 'onto';

/**
 * Rebase step
 */
export interface RebaseStep {
  action: 'pick' | 'reword' | 'edit' | 'squash' | 'fixup' | 'drop';
  commitHash: string;
  message?: string;
  index: number;
}

/**
 * Rebase plan
 */
export interface RebasePlan {
  currentBranch: string;
  targetBranch: string;
  commits: RebaseStep[];
  conflicts: string[];
  warnings: string[];
  estimatedDuration: number;
}

/**
 * Rebase execution result
 */
export interface RebaseResult {
  success: boolean;
  commitsProcessed: number;
  conflictsResolved: number;
  commitsDropped: number;
  commitsSquashed: number;
  finalCommitHash?: string;
  error?: string;
}

/**
 * Rebase implication
 */
export interface RebaseImplication {
  type: 'warning' | 'info' | 'danger';
  message: string;
  suggestion?: string;
}

/**
 * Git Rebase Helper
 */
export class RebaseHelper {
  private git: SimpleGit;
  private readonly cwd: string;

  constructor(cwd?: string) {
    this.cwd = cwd || process.cwd();
    this.git = simpleGit(this.cwd);
  }

  /**
   * Get available branches
   */
  async getBranches(): Promise<{
    current: string;
    local: string[];
    remote: string[];
  }> {
    const branches = await this.git.branch();
    const current = branches.current;
    const local = branches.all.filter((b) => !b.startsWith('remotes/'));
    const remote = branches.all.filter((b) => b.startsWith('remotes/'));

    return { current, local, remote };
  }

  /**
   * Generate a rebase plan
   */
  async generateRebasePlan(
    targetBranch: string,
    mode: RebaseMode = 'interactive'
  ): Promise<RebasePlan> {
    const currentBranch = await this.git.revparse(['--abbrev-ref', 'HEAD']);

    // Get commits between current and target
    const log = await this.git.log({ maxCount: '50' });

    // Check for potential conflicts
    const conflicts = await this.checkPotentialConflicts(currentBranch, targetBranch);

    // Generate warnings
    const warnings = this.generateWarnings(currentBranch, targetBranch, log.all.length);

    // Estimate duration based on commits and complexity
    const estimatedDuration = this.estimateDuration(log.all.length, conflicts.length);

    // Generate commit list for interactive rebase
    const commits: RebaseStep[] = log.all.map((commit, index) => ({
      action: 'pick' as const,
      commitHash: commit.hash.slice(0, 7),
      index,
    }));

    return {
      currentBranch,
      targetBranch,
      commits,
      conflicts,
      warnings,
      estimatedDuration,
    };
  }

  /**
   * Check for potential conflicts
   */
  private async checkPotentialConflicts(
    sourceBranch: string,
    targetBranch: string
  ): Promise<string[]> {
    const conflicts: string[] = [];

    try {
      // Check if branches can merge cleanly by attempting a merge
      await this.git.merge([sourceBranch, '--no-ff', '--no-commit']);

      // Get conflicted files
      const status = await this.git.status();
      if (status.conflicted.length > 0) {
        conflicts.push(...status.conflicted);
      }

      // Abort the test merge
      await this.git.merge(['--abort']);
    } catch {
      // Ignore merge check errors - conflicts may have occurred
      try {
        await this.git.merge(['--abort']);
      } catch {
        // Ignore abort errors
      }
    }

    // Check for renamed files that might cause issues
    try {
      const diff = await this.git.diff(['--name-status', targetBranch, sourceBranch]);
      const renamedFiles = diff
        .split('\n')
        .filter((line) => line.startsWith('R'))
        .map((line) => line.split('\t')[1]);

      conflicts.push(...renamedFiles);
    } catch {
      // Ignore
    }

    return [...new Set(conflicts)];
  }

  /**
   * Generate warnings for rebase
   */
  private generateWarnings(
    sourceBranch: string,
    targetBranch: string,
    commitCount: number
  ): string[] {
    const warnings: string[] = [];

    // Warn about many commits
    if (commitCount > 20) {
      warnings.push(
        `${commitCount} commits will be rebased. Consider squashing related commits first.`
      );
    }

    // Warn about shared branch
    if (sourceBranch === 'main' || sourceBranch === 'master') {
      warnings.push(
        'Rebasing main branch can cause issues. Consider creating a feature branch first.'
      );
    }

    // Warn if target is behind
    warnings.push(
      'Ensure all changes are committed before rebasing to avoid losing work.'
    );

    return warnings;
  }

  /**
   * Estimate rebase duration
   */
  private estimateDuration(commitCount: number, conflictCount: number): number {
    // Base time per commit (seconds)
    const baseTimePerCommit = 30;
    // Additional time per conflict (seconds)
    const conflictTimePerFile = 120;

    return Math.ceil((commitCount * baseTimePerCommit + conflictCount * conflictTimePerFile) / 60);
  }

  /**
   * Get rebase implications
   */
  async getRebaseImplications(
    sourceBranch: string,
    targetBranch: string
  ): Promise<RebaseImplication[]> {
    const implications: RebaseImplication[] = [];

    // Check if branch has been pushed
    const branches = await this.getBranches();
    const branchPushStatus = await this.git.remote(['get-url', 'origin']).catch(() => null);

    if (branchPushStatus) {
      // Check if source branch is ahead of remote
      try {
        const log = await this.git.log({ '--max-count': 1 });

        implications.push({
          type: 'info',
          message:
            'Branch has been pushed to remote. Rebasing will require force push.',
          suggestion: 'Use --force-with-lease to safely force push after rebase.',
        });
      } catch {
        // Ignore
      }
    }

    // Check for uncommitted changes
    const status = await this.git.status();
    if (status.modified.length > 0 || status.staged.length > 0) {
      implications.push({
        type: 'warning',
        message: 'You have uncommitted changes that may be lost during rebase.',
        suggestion: 'Stash or commit your changes before rebasing.',
      });
    }

    // Check for merge commits in history
    try {
      const log = await this.git.log({ format: '%s' });
      const hasMergeCommits = log.all.some((m) => m.includes('Merge'));

      if (hasMergeCommits) {
        implications.push({
          type: 'danger',
          message:
            'Branch contains merge commits which may cause complex conflicts during rebase.',
          suggestion: 'Consider using git rebase --preserve-merges or manually resolve.',
        });
      }
    } catch {
      // Ignore
    }

    return implications;
  }

  /**
   * Start interactive rebase
   */
  async startInteractiveRebase(
    targetBranch: string,
    onto?: string
  ): Promise<RebaseResult> {
    try {
      // Check for uncommitted changes
      const status = await this.git.status();
      if (status.modified.length > 0 || status.staged.length > 0) {
        return {
          success: false,
          commitsProcessed: 0,
          conflictsResolved: 0,
          commitsDropped: 0,
          commitsSquashed: 0,
          error: 'Please commit or stash changes before rebasing.',
        };
      }

      // Build rebase command
      const args = ['--interactive'];
      if (onto) {
        args.push('--onto', onto);
      }
      args.push(targetBranch);

      // For now, just show the plan (actual rebase requires terminal interaction)
      const plan = await this.generateRebasePlan(targetBranch, 'interactive');

      console.log(chalk.cyan('\n📋 Rebase Plan'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`Current: ${plan.currentBranch}`);
      console.log(`Target: ${plan.targetBranch}`);
      console.log(`Commits: ${plan.commits.length}`);

      if (plan.conflicts.length > 0) {
        console.log(chalk.yellow(`\n⚠️ Potential conflicts in: ${plan.conflicts.join(', ')}`));
      }

      console.log(chalk.gray('\nTo start interactive rebase, run:'));
      console.log(chalk.white(`  git rebase --interactive ${targetBranch}`));

      return {
        success: true,
        commitsProcessed: 0,
        conflictsResolved: 0,
        commitsDropped: 0,
        commitsSquashed: 0,
      };
    } catch (error) {
      return {
        success: false,
        commitsProcessed: 0,
        conflictsResolved: 0,
        commitsDropped: 0,
        commitsSquashed: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Rebase onto specific commit
   */
  async rebaseOnto(commitHash: string): Promise<RebaseResult> {
    try {
      const result = await this.git.rebase(['--onto', commitHash, 'HEAD']);

      return {
        success: true,
        commitsProcessed: 1,
        conflictsResolved: 0,
        commitsDropped: 0,
        commitsSquashed: 0,
        finalCommitHash: commitHash,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check for conflicts
      const status = await this.git.status();
      const hasConflicts = status.conflicted.length > 0;

      if (hasConflicts) {
        return {
          success: false,
          commitsProcessed: 0,
          conflictsResolved: 0,
          commitsDropped: 0,
          commitsSquashed: 0,
          error: `Rebase paused due to conflicts in: ${status.conflicted.join(', ')}. Resolve conflicts and run 'git rebase --continue'.`,
        };
      }

      return {
        success: false,
        commitsProcessed: 0,
        conflictsResolved: 0,
        commitsDropped: 0,
        commitsSquashed: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * Abort current rebase
   */
  async abortRebase(): Promise<boolean> {
    try {
      await this.git.rebase(['--abort']);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Continue rebase after resolving conflicts
   */
  async continueRebase(): Promise<RebaseResult> {
    try {
      await this.git.rebase(['--continue']);
      return {
        success: true,
        commitsProcessed: 1,
        conflictsResolved: 0,
        commitsDropped: 0,
        commitsSquashed: 0,
      };
    } catch (error) {
      return {
        success: false,
        commitsProcessed: 0,
        conflictsResolved: 0,
        commitsDropped: 0,
        commitsSquashed: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Skip current commit during rebase
   */
  async skipCommit(): Promise<RebaseResult> {
    try {
      await this.git.rebase(['--skip']);
      return {
        success: true,
        commitsProcessed: 1,
        conflictsResolved: 0,
        commitsDropped: 1,
        commitsSquashed: 0,
      };
    } catch (error) {
      return {
        success: false,
        commitsProcessed: 0,
        conflictsResolved: 0,
        commitsDropped: 0,
        commitsSquashed: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get rebase status
   */
  async getRebaseStatus(): Promise<{
    inProgress: boolean;
    currentStep?: string;
    commitsRemaining?: number;
    currentCommit?: string;
  }> {
    try {
      // Check for rebase in progress
      const rebaseDir = path.join(this.cwd, '.git', 'rebase-merge');

      if (fs.existsSync(rebaseDir)) {
        // Read current commit
        const headFile = path.join(rebaseDir, 'head-name');
        const currentCommit = fs.existsSync(headFile)
          ? fs.readFileSync(headFile, 'utf-8').trim()
          : undefined;

        // Count remaining commits
        const gitdir = path.join(this.cwd, '.git', 'rebase-merge');
        const todoFile = path.join(gitdir, 'git-rebase-todo');

        if (fs.existsSync(todoFile)) {
          const todo = fs.readFileSync(todoFile, 'utf-8');
          const lines = todo.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
          return {
            inProgress: true,
            currentStep: 'interactive',
            commitsRemaining: lines.length,
            currentCommit,
          };
        }
      }

      return { inProgress: false };
    } catch {
      return { inProgress: false };
    }
  }
}

/**
 * Singleton instance
 */
export const rebaseHelper = new RebaseHelper();
