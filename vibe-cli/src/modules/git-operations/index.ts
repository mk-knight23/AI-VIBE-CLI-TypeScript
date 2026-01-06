/**
 * VIBE-CLI v12 - Git Operations Module
 * Git workflow automation and repository management
 */

import * as fs from 'fs';
import * as path from 'path';
import simpleGit from 'simple-git';
import { BaseModule, ModuleResult } from '../base.module';

export class GitOperationsModule extends BaseModule {
  private git: ReturnType<typeof simpleGit>;

  constructor() {
    super({
      name: 'git_operations',
      version: '1.0.0',
      description: 'Git workflow automation and repository management',
    });
    this.git = simpleGit();
  }

  async execute(params: Record<string, any>): Promise<ModuleResult> {
    const action = params.action || params.type || 'status';

    try {
      switch (action) {
        case 'status':
          return this.getStatus();
        case 'commit':
          return this.commit(params);
        case 'branch':
          return this.branch(params);
        case 'log':
          return this.getLog(params);
        case 'push':
          return this.push(params);
        case 'pull':
          return this.pull(params);
        case 'diff':
          return this.diff(params);
        case 'stash':
          return this.stash(params);
        case 'merge':
          return this.merge(params);
        default:
          return this.failure(`Unknown action: ${action}`);
      }
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async getStatus(): Promise<ModuleResult> {
    this.logInfo('Getting git status...');

    try {
      const status = await this.git.status();
      const diff = await this.git.diff();

      return this.success({
        current: status.current,
        tracking: status.tracking,
        ahead: status.ahead,
        behind: status.behind,
        files: {
          created: status.created,
          deleted: status.deleted,
          modified: status.modified,
          renamed: status.renamed,
        },
        isClean: status.isClean(),
        diffSummary: diff.substring(0, 1000),
      });
    } catch (error) {
      return this.failure(`Git error: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async commit(params: Record<string, any>): Promise<ModuleResult> {
    const { message, all = false } = params;

    if (!message) {
      return this.failure('Missing required parameter: message');
    }

    this.logInfo(`Creating commit: "${message}"...`);

    try {
      if (all) {
        await this.git.add('.');
      }

      const result = await this.git.commit(message);

      return this.success({
        commit: result.commit,
        summary: `Created commit ${result.commit.substring(0, 8)}`,
      });
    } catch (error) {
      return this.failure(`Commit failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async branch(params: Record<string, any>): Promise<ModuleResult> {
    const { create, delete: deleteBranch, switch: switchBranch } = params;

    try {
      if (create) {
        this.logInfo(`Creating branch: ${create}`);
        await this.git.checkoutLocalBranch(create);
        return this.success({ branch: create, action: 'created' });
      }

      if (deleteBranch) {
        this.logInfo(`Deleting branch: ${deleteBranch}`);
        await this.git.deleteLocalBranch(deleteBranch);
        return this.success({ branch: deleteBranch, action: 'deleted' });
      }

      if (switchBranch) {
        this.logInfo(`Switching to branch: ${switchBranch}`);
        await this.git.checkout(switchBranch);
        return this.success({ branch: switchBranch, action: 'switched' });
      }

      const branches = await this.git.branch();
      return this.success({
        current: branches.current,
        branches: branches.all,
        detailed: branches.branches,
      });
    } catch (error) {
      return this.failure(`Branch operation failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async getLog(params: Record<string, any>): Promise<ModuleResult> {
    const { limit = 10, format = 'simple' } = params;

    this.logInfo('Getting git log...');

    try {
      const log = await this.git.log({ maxCount: limit });

      const commits = log.all.map((entry) => ({
        hash: entry.hash,
        message: entry.message,
        date: entry.date,
        author_name: entry.author_name,
        author_email: entry.author_email,
      }));

      return this.success({
        count: commits.length,
        commits,
      });
    } catch (error) {
      return this.failure(`Log error: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async push(params: Record<string, any>): Promise<ModuleResult> {
    const { remote = 'origin', branch } = params;

    this.logInfo(`Pushing to ${remote}${branch ? `/${branch}` : ''}...`);

    try {
      const result = await this.git.push(remote, branch);
      return this.success({
        remote,
        branch,
        result: 'Push successful',
      });
    } catch (error) {
      return this.failure(`Push failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async pull(params: Record<string, any>): Promise<ModuleResult> {
    const { remote = 'origin', branch } = params;

    this.logInfo(`Pulling from ${remote}${branch ? `/${branch}` : ''}...`);

    try {
      const result = await this.git.pull(remote, branch);
      return this.success({
        remote,
        branch,
        result: 'Pull successful',
        summary: result.summary,
      });
    } catch (error) {
      return this.failure(`Pull failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async diff(params: Record<string, any>): Promise<ModuleResult> {
    const { staged = false, target } = params;

    this.logInfo('Getting diff...');

    try {
      let diff;
      if (target) {
        diff = await this.git.diff(target);
      } else if (staged) {
        diff = await this.git.diff(['--cached']);
      } else {
        diff = await this.git.diff();
      }

      const files = this.parseDiffFiles(diff);

      return this.success({
        staged,
        diff,
        files,
        stats: this.calculateDiffStats(diff),
      });
    } catch (error) {
      return this.failure(`Diff error: ${error instanceof Error ? error.message : error}`);
    }
  }

  private parseDiffFiles(diff: string): any[] {
    const files: any[] = [];
    const lines = diff.split('\n');
    let currentFile: any = null;

    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        if (currentFile) files.push(currentFile);
        currentFile = { name: line.split('b/')[1] || line, changes: [] };
      } else if (line.startsWith('+++') || line.startsWith('---')) {
        // Skip
      } else if (line.startsWith('@@')) {
        // Skip hunk headers
      } else if (line.startsWith('+') || line.startsWith('-')) {
        if (currentFile) {
          currentFile.changes.push({ type: line[0], content: line.slice(1) });
        }
      }
    }

    if (currentFile) files.push(currentFile);
    return files;
  }

  private calculateDiffStats(diff: string): any {
    const lines = diff.split('\n');
    let added = 0;
    let deleted = 0;

    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) added++;
      if (line.startsWith('-') && !line.startsWith('---')) deleted++;
    }

    return { added, deleted, total: added + deleted };
  }

  private async stash(params: Record<string, any>): Promise<ModuleResult> {
    const { pop = false, apply = false, list = false, save = false } = params;

    try {
      if (list) {
        const stashList = await this.git.stashList();
        return this.success({ stashes: stashList.all });
      }

      if (save) {
        const message = params.message || `Stash at ${new Date().toISOString()}`;
        await this.git.stash(message);
        return this.success({ action: 'saved', message });
      }

      if (apply) {
        const index = params.index || 0;
        await this.git.stash(['apply', `stash@{${index}}`]);
        return this.success({ action: 'applied', index });
      }

      if (pop) {
        await this.git.stash(['pop']);
        return this.success({ action: 'popped' });
      }

      return this.failure('No stash action specified');
    } catch (error) {
      return this.failure(`Stash error: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async merge(params: Record<string, any>): Promise<ModuleResult> {
    const { branch, abort = false } = params;

    if (abort) {
      this.logInfo('Aborting merge...');
      await this.git.merge(['--abort']);
      return this.success({ action: 'aborted' });
    }

    if (!branch) {
      return this.failure('Missing required parameter: branch');
    }

    this.logInfo(`Merging ${branch}...`);

    try {
      const result = await this.git.merge([branch]);
      return this.success({
        branch,
        result: 'Merge completed',
        summary: result.summary,
      });
    } catch (error) {
      return this.failure(`Merge failed: ${error instanceof Error ? error.message : error}`);
    }
  }
}
