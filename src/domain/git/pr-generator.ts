/**
 * VIBE CLI - PR Generator
 * Generates PR descriptions from commits and diffs
 */

import { simpleGit, SimpleGit } from 'simple-git';
import { createLogger } from '../../utils/pino-logger.js';
import { errors } from '../../utils/errors.js';
import { CompletionPrimitive } from '../primitives/completion.js';
import { GitIntelligence, FileChange } from './git-intelligence.js';

const logger = createLogger('pr-generator');

export interface PRDescription {
  title: string;
  body: string;
  summary: string;
  changes: string[];
  testing: string;
  checklist: string[];
}

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
  body?: string;
}

export interface PRTemplate {
  name: string;
  template: string;
}

// Default PR templates
export const DEFAULT_TEMPLATES: Record<string, string> = {
  standard: `## Summary
{{summary}}

## Changes
{{changes}}

## Testing
{{testing}}

## Checklist
{{checklist}}`,

  detailed: `## Overview
{{summary}}

## Motivation
<!-- Why are these changes needed? -->

## Changes Made
{{changes}}

## Testing Performed
{{testing}}

## Breaking Changes
<!-- List any breaking changes -->

## Related Issues
<!-- Link to related issues -->

## Checklist
{{checklist}}`,

  minimal: `{{summary}}

Changes:
{{changes}}`,
};

/**
 * PR Generator class
 */
export class PRGenerator {
  private git: SimpleGit;
  private completion: CompletionPrimitive;
  private gitIntel: GitIntelligence;

  constructor(completion: CompletionPrimitive, git?: SimpleGit) {
    this.completion = completion;
    this.git = git || simpleGit();
    this.gitIntel = new GitIntelligence(completion, this.git);
  }

  /**
   * Get commits between current branch and base
   */
  async getCommits(baseBranch: string = 'main'): Promise<CommitInfo[]> {
    try {
      // Get current branch
      const status = await this.git.status();
      const currentBranch = status.current;

      if (!currentBranch) {
        throw errors.commandFailed('getCommits', new Error('Not on a branch'));
      }

      // Fetch base branch first
      try {
        await this.git.fetch(['origin', baseBranch]);
      } catch {
        // Base might not exist on remote
      }

      // Get log between base and current
      const log = await this.git.log({
        from: `origin/${baseBranch}..${currentBranch}`,
      });

      return log.all.map((commit) => ({
        hash: commit.hash,
        message: commit.message,
        author: commit.author_name,
        date: commit.date,
        body: commit.body,
      }));
    } catch (error) {
      logger.error({ error, baseBranch }, 'Failed to get commits');
      throw errors.commandFailed('getCommits', error as Error);
    }
  }

  /**
   * Extract changes from commits
   */
  async extractChangesFromCommits(commits: CommitInfo[]): Promise<FileChange[]> {
    const allFiles = new Map<string, FileChange>();

    for (const commit of commits) {
      try {
        // Get diff for this commit
        const diff = await this.git.show([commit.hash, '--stat']);

        // Parse file changes from stat
        const lines = diff.split('\n');
        for (const line of lines) {
          const match = line.match(/^(\S+)\s+\|\s+(\d+)\s+([+-]+)$/);
          if (match) {
            const path = match[1];
            const changes = parseInt(match[2], 10);
            const signs = match[3];
            const additions = (signs.match(/\+/g) || []).length;
            const deletions = (signs.match(/-/g) || []).length;

            const existing = allFiles.get(path);
            if (existing) {
              existing.additions += additions;
              existing.deletions += deletions;
            } else {
              allFiles.set(path, {
                path,
                status: 'modified',
                additions,
                deletions,
              });
            }
          }
        }
      } catch (error) {
        logger.warn({ error, commit: commit.hash }, 'Failed to parse commit');
      }
    }

    return Array.from(allFiles.values());
  }

  /**
   * Generate PR title
   */
  async generateTitle(
    commits: CommitInfo[],
    files: FileChange[]
  ): Promise<string> {
    if (commits.length === 0) {
      return 'Update codebase';
    }

    // Use first commit as base
    const firstCommit = commits[0];
    let title = firstCommit.message.split('\n')[0];

    // If multiple commits, make it more generic
    if (commits.length > 1) {
      const types = new Set(
        commits
          .map((c) => c.message.split(':')[0])
          .filter((t) =>
            [
              'feat',
              'fix',
              'docs',
              'refactor',
              'test',
              'chore',
            ].includes(t.split('(')[0])
          )
      );

      if (types.size === 1) {
        const type = Array.from(types)[0];
        const scope = files.length > 0 ? this.inferScope(files) : '';
        const scopeStr = scope ? `(${scope})` : '';
        title = `${type}${scopeStr}: ${this.summarizeChanges(files)}`;
      } else {
        title = `Multiple updates: ${files.length} files changed`;
      }
    }

    // Ensure title isn't too long
    if (title.length > 72) {
      title = title.slice(0, 69) + '...';
    }

    return title;
  }

  /**
   * Generate PR summary
   */
  async generateSummary(
    commits: CommitInfo[],
    files: FileChange[]
  ): Promise<string> {
    const commitMessages = commits.map((c) => `- ${c.message}`).join('\n');
    const fileSummary = files
      .slice(0, 10)
      .map((f) => `- ${f.path} (+${f.additions}/-${f.deletions})`)
      .join('\n');

    const prompt = `Based on these commits and file changes, write a concise PR summary (2-3 sentences):

Commits:
${commitMessages}

Files changed:
${fileSummary}

Provide a clear summary of what this PR accomplishes.`;

    try {
      const result = await this.completion.execute({
        prompt,
        options: {
          systemPrompt:
            'You are a technical writer. Write clear, concise PR summaries that explain the purpose and impact of changes.',
          maxTokens: 150,
        },
      });

      return result.success
        ? result.data.trim()
        : this.fallbackSummary(commits, files);
    } catch (error) {
      logger.warn({ error }, 'AI summary generation failed');
      return this.fallbackSummary(commits, files);
    }
  }

  /**
   * Generate changes description
   */
  generateChangesDescription(files: FileChange[]): string {
    const lines: string[] = [];

    // Group by type
    const added = files.filter((f) => f.status === 'added');
    const modified = files.filter((f) => f.status === 'modified');
    const deleted = files.filter((f) => f.status === 'deleted');
    const renamed = files.filter((f) => f.status === 'renamed');

    if (added.length > 0) {
      lines.push('### Added');
      for (const file of added.slice(0, 10)) {
        lines.push(`- \`${file.path}\``);
      }
      if (added.length > 10) {
        lines.push(`- and ${added.length - 10} more`);
      }
      lines.push('');
    }

    if (modified.length > 0) {
      lines.push('### Modified');
      for (const file of modified.slice(0, 10)) {
        lines.push(`- \`${file.path}\` (+${file.additions}/-${file.deletions})`);
      }
      if (modified.length > 10) {
        lines.push(`- and ${modified.length - 10} more`);
      }
      lines.push('');
    }

    if (deleted.length > 0) {
      lines.push('### Removed');
      for (const file of deleted.slice(0, 10)) {
        lines.push(`- \`${file.path}\``);
      }
      if (deleted.length > 10) {
        lines.push(`- and ${deleted.length - 10} more`);
      }
      lines.push('');
    }

    if (renamed.length > 0) {
      lines.push('### Renamed');
      for (const file of renamed.slice(0, 10)) {
        lines.push(`- \`${file.path}\``);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate testing section
   */
  generateTestingSection(files: FileChange[]): string {
    const hasTests = files.some(
      (f) =>
        f.path.includes('.test.') ||
        f.path.includes('.spec.') ||
        f.path.includes('__tests__')
    );

    if (hasTests) {
      return `- [x] Added/updated tests\n- [x] All tests passing\n- [x] Manual testing performed`;
    }

    return `- [ ] Tests added\n- [ ] Tests passing\n- [ ] Manual testing performed`;
  }

  /**
   * Generate checklist
   */
  generateChecklist(commits: CommitInfo[], files: FileChange[]): string[] {
    const checklist: string[] = [];

    // Code quality
    checklist.push('- [ ] Code follows project style guidelines');
    checklist.push('- [ ] Self-review completed');

    // Testing
    const hasTests = files.some(
      (f) =>
        f.path.includes('.test.') ||
        f.path.includes('.spec.') ||
        f.path.includes('__tests__')
    );
    checklist.push(hasTests ? '- [x] Tests added/updated' : '- [ ] Tests added');

    // Documentation
    const hasDocs = files.some(
      (f) =>
        f.path.endsWith('.md') ||
        f.path.includes('docs/') ||
        f.path.includes('README')
    );
    checklist.push(hasDocs ? '- [x] Documentation updated' : '- [ ] Documentation updated (if needed)');

    // Breaking changes
    const hasBreaking = commits.some(
      (c) =>
        c.message.includes('BREAKING') ||
        c.message.includes('breaking-change') ||
        c.body?.includes('BREAKING')
    );
    if (hasBreaking) {
      checklist.push('- [x] Breaking changes documented');
    }

    return checklist;
  }

  /**
   * Format PR description using template
   */
  formatPRDescription(
    template: string,
    data: {
      summary: string;
      changes: string;
      testing: string;
      checklist: string[];
    }
  ): string {
    let result = template;

    result = result.replace('{{summary}}', data.summary);
    result = result.replace('{{changes}}', data.changes);
    result = result.replace('{{testing}}', data.testing);
    result = result.replace(
      '{{checklist}}',
      data.checklist.join('\n')
    );

    return result;
  }

  /**
   * Generate complete PR description
   */
  async generatePRDescription(
    baseBranch: string = 'main',
    templateName: string = 'standard'
  ): Promise<PRDescription> {
    logger.debug({ baseBranch, templateName }, 'Generating PR description');

    // Get commits
    const commits = await this.getCommits(baseBranch);

    // Get current diff
    const diff = await this.gitIntel.getStagedDiff();
    const files = diff ? this.gitIntel.parseDiff(diff) : [];

    // Generate components
    const title = await this.generateTitle(commits, files);
    const summary = await this.generateSummary(commits, files);
    const changes = this.generateChangesDescription(files);
    const testing = this.generateTestingSection(files);
    const checklist = this.generateChecklist(commits, files);

    // Get template
    const template =
      DEFAULT_TEMPLATES[templateName] || DEFAULT_TEMPLATES.standard;

    // Format body
    const body = this.formatPRDescription(template, {
      summary,
      changes,
      testing,
      checklist,
    });

    return {
      title,
      body,
      summary,
      changes: files.map((f) => f.path),
      testing,
      checklist,
    };
  }

  /**
   * Fallback summary when AI fails
   */
  private fallbackSummary(
    commits: CommitInfo[],
    files: FileChange[]
  ): string {
    const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
    const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

    return `This PR includes ${commits.length} commits with changes to ${files.length} files (+${totalAdditions}/-${totalDeletions}).`;
  }

  /**
   * Infer scope from files
   */
  private inferScope(files: FileChange[]): string {
    if (files.length === 0) return '';

    const paths = files.map((f) => f.path.split('/'));
    const common = paths.reduce((acc, curr) => {
      const result: string[] = [];
      for (let i = 0; i < Math.min(acc.length, curr.length); i++) {
        if (acc[i] === curr[i]) {
          result.push(acc[i]);
        } else {
          break;
        }
      }
      return result;
    });

    return common.length > 0 ? common[common.length - 1] : '';
  }

  /**
   * Summarize changes
   */
  private summarizeChanges(files: FileChange[]): string {
    const dirs = new Set(files.map((f) => f.path.split('/')[0]));
    if (dirs.size === 1) {
      return `update ${Array.from(dirs)[0]}`;
    }
    return `update ${files.length} files`;
  }
}
