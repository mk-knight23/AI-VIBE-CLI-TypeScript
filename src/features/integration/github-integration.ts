/**
 * VIBE-CLI v0.0.2 - GitHub Integration
 * PR reviews, issues, actions, and repository management
 */

import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import chalk from 'chalk';

/**
 * GitHub/GitLab provider type
 */
export type GitProvider = 'github' | 'gitlab';

/**
 * Pull request state
 */
export type PRState = 'open' | 'closed' | 'merged';

/**
 * GitHub PR information
 */
export interface PullRequest {
  number: number;
  title: string;
  description: string;
  state: PRState;
  author: string;
  baseBranch: string;
  headBranch: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
  additions: number;
  deletions: number;
  changedFiles: number;
  checksStatus: 'pending' | 'success' | 'failure' | 'none';
  reviewers: string[];
  labels: string[];
  comments: number;
  commits: number;
}

/**
 * Issue information
 */
export interface Issue {
  number: number;
  title: string;
  description: string;
  state: 'open' | 'closed';
  author: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
  labels: string[];
  assignees: string[];
  comments: number;
  isPR: boolean;
}

/**
 * Commit information
 */
export interface Commit {
  sha: string;
  message: string;
  author: string;
  date: Date;
  url: string;
  files: string[];
  additions: number;
  deletions: number;
}

/**
 * Repository information
 */
export interface Repository {
  name: string;
  fullName: string;
  description: string;
  url: string;
  defaultBranch: string;
  isPrivate: boolean;
  language: string;
  stars: number;
  forks: number;
  openIssues: number;
  openPRs: number;
}

/**
 * Review comment
 */
export interface ReviewComment {
  id: number;
  body: string;
  author: string;
  path: string;
  line: number;
  commitSha: string;
  createdAt: Date;
  isOutdated: boolean;
}

/**
 * GitHub integration config
 */
export interface GitHubConfig {
  provider: GitProvider;
  token?: string;
  apiUrl?: string;
  owner?: string;
  repo?: string;
}

/**
 * GitHub Integration
 */
export class GitHubIntegration {
  private config: GitHubConfig;
  private readonly cacheDir: string;

  constructor(config?: Partial<GitHubConfig>) {
    this.config = {
      provider: config?.provider || 'github',
      token: config?.token || process.env.GITHUB_TOKEN || process.env.GITLAB_TOKEN,
      apiUrl: config?.apiUrl || 'https://api.github.com',
      owner: config?.owner,
      repo: config?.repo,
    };
    this.cacheDir = path.join(process.cwd(), '.vibe-cache', 'github');
    this.ensureCacheDir();
  }

  /**
   * Ensure cache directory exists
   */
  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Generate a smart commit message using AI
   */
  async generateSmartCommitMessage(provider: any): Promise<string> {
    const status = this.getStatus();
    const changedFiles = [...status.modified, ...status.added, ...status.deleted];

    if (changedFiles.length === 0) {
      return 'No changes detected';
    }

    // Get diff summary
    const diff = this.runGitCommand('diff --cached') || this.runGitCommand('diff') || '';
    const diffLines = diff.split('\n').slice(0, 100).join('\n'); // Limit context

    const prompt = `Analyze these git changes and generate a concise, professional commit message in conventional commits format (e.g., feat: add X, fix: resolve Y).
    
Files: ${changedFiles.join(', ')}

Diff snapshot:
${diffLines}

Respond ONLY with the message.`;

    try {
      const response = await provider.chat([{ role: 'system', content: 'You are a senior developer.' }, { role: 'user', content: prompt }]);
      return response.content.trim().replace(/```/g, '');
    } catch {
      return `Update ${changedFiles.length} files`;
    }
  }

  /**
   * Get current repository info
   */
  getCurrentRepository(): Repository | null {
    try {
      const remotes = this.runGitCommand('remote -v');
      if (!remotes) return null;

      const ownerMatch = remotes.match(/github\.com[:\/]([^\/]+)\/([^\.]+)/);
      if (!ownerMatch) return null;

      const owner = ownerMatch[1];
      const repoName = ownerMatch[2].replace('.git', '');

      const branch = this.runGitCommand('rev-parse --abbrev-ref HEAD')?.trim();
      const defaultBranch = this.runGitCommand('rev-parse --origin/main')?.trim() ||
        this.runGitCommand('rev-parse --origin/master')?.trim() ||
        'main';

      return {
        name: repoName,
        fullName: `${owner}/${repoName}`,
        description: '',
        url: `https://github.com/${owner}/${repoName}`,
        defaultBranch: defaultBranch.split('/').pop() || 'main',
        isPrivate: false,
        language: 'TypeScript',
        stars: 0,
        forks: 0,
        openIssues: 0,
        openPRs: 0,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get recent commits
   */
  getRecentCommits(count = 10): Commit[] {
    try {
      const log = this.runGitCommand(
        `log -${count} --pretty=format:"%H|%an|%ad|%s" --date=iso`
      );

      if (!log) return [];

      return log.split('\n').filter(Boolean).map((line) => {
        const [sha, author, date, message] = line.split('|');
        return {
          sha: sha.trim(),
          author: author.trim(),
          date: new Date(date.trim()),
          message: message.trim(),
          url: '',
          files: [],
          additions: 0,
          deletions: 0,
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Get changed files in working directory
   */
  getChangedFiles(): string[] {
    try {
      const diff = this.runGitCommand('diff --name-only');
      const staged = this.runGitCommand('diff --cached --name-only');

      const changed = new Set<string>();

      if (diff) diff.split('\n').filter(Boolean).forEach((f) => changed.add(f));
      if (staged) staged.split('\n').filter(Boolean).forEach((f) => changed.add(f));

      return Array.from(changed);
    } catch {
      return [];
    }
  }

  /**
   * Get staged files
   */
  getStagedFiles(): string[] {
    try {
      const staged = this.runGitCommand('diff --cached --name-only');
      return staged ? staged.split('\n').filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  /**
   * Get diff for a file
   */
  getFileDiff(filePath: string): string {
    try {
      const diff = this.runGitCommand(`diff HEAD -- "${filePath}"`);
      return diff || '';
    } catch {
      return '';
    }
  }

  /**
   * Create a branch
   */
  createBranch(branchName: string): boolean {
    try {
      this.runGitCommand(`checkout -b ${branchName}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Switch to a branch
   */
  checkoutBranch(branchName: string): boolean {
    try {
      this.runGitCommand(`checkout ${branchName}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current branch
   */
  getCurrentBranch(): string {
    try {
      return this.runGitCommand('rev-parse --abbrev-ref HEAD')?.trim() || '';
    } catch {
      return '';
    }
  }

  /**
   * Get all branches
   */
  getBranches(): string[] {
    try {
      const branches = this.runGitCommand('branch -a');
      return branches ? branches.split('\n').map((b) => b.trim().replace(/^\*/, '').trim()) : [];
    } catch {
      return [];
    }
  }

  /**
   * Stage files
   */
  stageFiles(files: string[]): boolean {
    try {
      this.runGitCommand(`add ${files.join(' ')}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Commit changes
   */
  commit(message: string): boolean {
    try {
      this.runGitCommand(`commit -m "${message}"`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Push changes
   */
  push(remote = 'origin', branch?: string): boolean {
    try {
      const currentBranch = branch || this.getCurrentBranch();
      this.runGitCommand(`push ${remote} ${currentBranch}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Pull changes
   */
  pull(remote = 'origin', branch?: string): boolean {
    try {
      const currentBranch = branch || this.getCurrentBranch();
      this.runGitCommand(`pull ${remote} ${currentBranch}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get status
   */
  getStatus(): { modified: string[]; added: string[]; deleted: string[]; staged: string[] } {
    try {
      const status = this.runGitCommand('status --porcelain') || '';

      const modified: string[] = [];
      const added: string[] = [];
      const deleted: string[] = [];
      const staged: string[] = [];

      status.split('\n').filter(Boolean).forEach((line) => {
        const statusCode = line.substring(0, 2);
        const filePath = line.substring(3);

        if (statusCode.includes('M')) modified.push(filePath);
        if (statusCode.includes('A')) added.push(filePath);
        if (statusCode.includes('D')) deleted.push(filePath);
        if (statusCode.includes(' ')) staged.push(filePath);
      });

      return { modified, added, deleted, staged };
    } catch {
      return { modified: [], added: [], deleted: [], staged: [] };
    }
  }

  /**
   * Generate PR description template
   */
  generatePRTemplate(files: string[]): string {
    const template = [
      '## Summary',
      '<!-- Brief description of changes -->',
      '',
      '## Type of Change',
      '- [ ] Bug fix',
      '- [ ] New feature',
      '- [ ] Breaking change',
      '- [ ] Documentation update',
      '',
      '## Checklist',
      '- [ ] My code follows the project style guidelines',
      '- [ ] I have performed a self-review of my code',
      '- [ ] I have commented my code where necessary',
      '- [ ] I have made corresponding changes to the documentation',
      '- [ ] My changes generate no new warnings',
      '',
      '## Testing',
      '<!-- Describe how changes were tested -->',
      '',
      '## Screenshots (if applicable)',
      '<!-- Add screenshots for UI changes -->',
      '',
    ];

    if (files.length > 0) {
      template.push('## Changed Files');
      template.push('```');
      files.forEach((f) => template.push(`- ${f}`));
      template.push('```');
    }

    return template.join('\n');
  }

  /**
   * Analyze PR changes
   */
  analyzePRChanges(files: string[]): {
    types: Record<string, string[]>;
    stats: { total: number; additions: number; deletions: number };
  } {
    const types: Record<string, string[]> = {
      feature: [],
      fix: [],
      refactor: [],
      test: [],
      docs: [],
      config: [],
      other: [],
    };

    for (const file of files) {
      if (file.includes('.test.') || file.includes('.spec.') || file.includes('__tests__')) {
        types.test.push(file);
      } else if (file.includes('README') || file.includes('docs/')) {
        types.docs.push(file);
      } else if (file.includes('package.json') || file.includes('tsconfig')) {
        types.config.push(file);
      } else if (file.startsWith('src/feature') || file.startsWith('src/core')) {
        types.feature.push(file);
      } else if (file.startsWith('src/')) {
        types.refactor.push(file);
      } else {
        types.other.push(file);
      }
    }

    return {
      types,
      stats: {
        total: files.length,
        additions: 0,
        deletions: 0,
      },
    };
  }

  /**
   * Create a pull request (via gh CLI or template)
   */
  async createPullRequest(title: string, body: string, base = 'main'): Promise<{ success: boolean; url?: string; command?: string }> {
    const head = this.getCurrentBranch();

    // Check if gh CLI is available
    try {
      child_process.execSync('gh --version', { stdio: 'ignore' });
      const command = `gh pr create --title "${title}" --body "${body}" --base ${base} --head ${head}`;
      return { success: true, command };
    } catch {
      // Fallback to manual link
      const repo = this.getCurrentRepository();
      if (!repo) return { success: false };

      const url = `${repo.url}/compare/${base}...${head}?expand=1&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
      return { success: true, url };
    }
  }

  /**
   * Run GitHub Actions workflow
   */
  async runWorkflow(workflowName: string): Promise<boolean> {
    // This would integrate with GitHub CLI or API
    console.log(chalk.cyan(`Would run workflow: ${workflowName}`));
    return true;
  }

  /**
   * Get CI/CD status
   */
  getCIStatus(): { status: string; checks: Array<{ name: string; status: string }> } {
    return {
      status: 'unknown',
      checks: [],
    };
  }

  /**
   * Format git log for display
   */
  formatCommits(commits: Commit[]): string {
    const lines: string[] = [];

    lines.push(chalk.bold('\n📝 Recent Commits\n'));
    lines.push(chalk.gray('='.repeat(50)));
    lines.push('');

    for (const commit of commits) {
      const shortSha = commit.sha.substring(0, 7);
      lines.push(`${chalk.cyan(shortSha)} ${chalk.bold(commit.message)}`);
      lines.push(chalk.gray(`  ${commit.author} • ${commit.date.toLocaleDateString()}`));
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format status for display
   */
  formatStatus(status: { modified: string[]; added: string[]; deleted: string[]; staged: string[] }): string {
    const lines: string[] = [];

    lines.push(chalk.bold('\n📊 Git Status\n'));
    lines.push(chalk.gray('='.repeat(50)));
    lines.push('');

    if (status.staged.length > 0) {
      lines.push(chalk.green('Staged:'));
      status.staged.forEach((f) => lines.push(`  ${f}`));
      lines.push('');
    }

    if (status.modified.length > 0) {
      lines.push(chalk.yellow('Modified:'));
      status.modified.forEach((f) => lines.push(`  ${f}`));
      lines.push('');
    }

    if (status.added.length > 0) {
      lines.push(chalk.blue('Added:'));
      status.added.forEach((f) => lines.push(`  ${f}`));
      lines.push('');
    }

    if (status.deleted.length > 0) {
      lines.push(chalk.red('Deleted:'));
      status.deleted.forEach((f) => lines.push(`  ${f}`));
      lines.push('');
    }

    if (
      status.modified.length === 0 &&
      status.added.length === 0 &&
      status.deleted.length === 0 &&
      status.staged.length === 0
    ) {
      lines.push(chalk.gray('No changes'));
    }

    return lines.join('\n');
  }

  /**
   * Run a git command
   */
  private runGitCommand(command: string): string | null {
    try {
      const result = child_process.execSync(`git ${command}`, {
        encoding: 'utf-8',
        cwd: process.cwd(),
      });
      return result;
    } catch {
      return null;
    }
  }

  /**
   * Configure integration
   */
  configure(config: Partial<GitHubConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Singleton instance
 */
export const githubIntegration = new GitHubIntegration();
