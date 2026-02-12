/**
 * VIBE CLI - Git Commands
 * Commands for semantic commits, PR generation, and code review
 */

import { simpleGit } from 'simple-git';
import chalk from 'chalk';
import { createLogger } from '../utils/pino-logger.js';
import { errors } from '../utils/errors.js';
import { progressManager } from '../ui/progress-manager.js';
import { CompletionPrimitive } from '../domain/primitives/completion.js';
import { GitIntelligence, CommitSuggestion } from '../domain/git/git-intelligence.js';
import { PRGenerator } from '../domain/git/pr-generator.js';
import { CodeReviewEngine, ReviewOptions } from '../domain/git/code-reviewer.js';

const logger = createLogger('git-commands');

interface GitCommandOptions {
  message?: string;
  dryRun?: boolean;
  noPush?: boolean;
  base?: string;
  draft?: boolean;
  title?: string;
  staged?: boolean;
  unstaged?: boolean;
  file?: string;
  fix?: boolean;
}

/**
 * Generate semantic commit message
 */
export async function generateCommit(
  args: string[],
  primitives: { completion: CompletionPrimitive },
  options: GitCommandOptions = {}
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const git = simpleGit();
    const gitIntel = new GitIntelligence(primitives.completion, git);

    // Check for staged changes
    const status = await git.status();
    if (status.staged.length === 0) {
      console.log(chalk.yellow('⚠️  No staged changes found. Run `git add` first.'));
      return { success: false, error: 'No staged changes' };
    }

    progressManager.startSpinner({ text: 'Analyzing changes...' });

    // Get diff
    const diff = await gitIntel.getStagedDiff();
    const files = gitIntel.parseDiff(diff);

    // Analyze and generate suggestion
    const analysis = await gitIntel.analyzeDiff(files);
    const suggestion = await gitIntel.generateCommitSuggestion(
      analysis,
      options.message
    );

    const commitMessage = gitIntel.formatCommitMessage(suggestion);

    progressManager.succeedSpinner('Commit message generated');

    // Display suggestion
    console.log(chalk.cyan('\n📝 Suggested commit message:\n'));
    console.log(chalk.white(commitMessage));
    console.log();

    // Show breakdown
    console.log(chalk.gray('Type: ') + chalk.yellow(suggestion.type));
    if (suggestion.scope) {
      console.log(chalk.gray('Scope: ') + chalk.yellow(suggestion.scope));
    }
    if (suggestion.breaking) {
      console.log(chalk.red('⚠️  Breaking change detected'));
    }
    console.log();

    if (options.dryRun) {
      return { success: true, message: commitMessage };
    }

    // Commit
    await git.commit(commitMessage);
    console.log(chalk.green('✅ Changes committed'));

    // Push if not disabled
    if (!options.noPush) {
      progressManager.startSpinner({ text: 'Pushing to remote...' });
      await git.push();
      progressManager.succeedSpinner('Pushed to remote');
    }

    return { success: true, message: commitMessage };
  } catch (error) {
    progressManager.failSpinner('Failed to commit');
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error }, 'Commit failed');
    return { success: false, error: message };
  }
}

/**
 * Generate PR description
 */
export async function generatePR(
  args: string[],
  primitives: { completion: CompletionPrimitive },
  options: GitCommandOptions = {}
): Promise<{ success: boolean; title?: string; body?: string; error?: string }> {
  try {
    const git = simpleGit();
    const prGen = new PRGenerator(primitives.completion, git);

    const baseBranch = options.base || 'main';

    progressManager.startSpinner({ text: 'Generating PR description...' });

    const pr = await prGen.generatePRDescription(baseBranch, 'standard');

    progressManager.succeedSpinner('PR description generated');

    // Display
    console.log(chalk.cyan('\n📋 PR Title:\n'));
    console.log(chalk.white(pr.title));
    console.log();

    console.log(chalk.cyan('📝 PR Body:\n'));
    console.log(pr.body);
    console.log();

    if (options.dryRun) {
      return { success: true, title: pr.title, body: pr.body };
    }

    // Create PR using gh CLI if available
    progressManager.startSpinner({ text: 'Creating PR...' });

    try {
      const { execSync } = require('child_process');
      const draftFlag = options.draft ? '--draft' : '';
      const titleFlag = options.title ? options.title : pr.title;

      execSync(
        `gh pr create --title "${titleFlag.replace(/"/g, '\\"')}" --body "${pr.body.replace(/"/g, '\\"')}" ${draftFlag} --base ${baseBranch}`,
        { stdio: 'inherit' }
      );

      progressManager.succeedSpinner('PR created');
      return { success: true, title: pr.title, body: pr.body };
    } catch {
      progressManager.stopSpinner();
      console.log(chalk.yellow('\n⚠️  Could not create PR automatically.'));
      console.log(chalk.gray('Please create manually using the title and body above.'));
      return { success: true, title: pr.title, body: pr.body };
    }
  } catch (error) {
    progressManager.failSpinner('Failed to generate PR');
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error }, 'PR generation failed');
    return { success: false, error: message };
  }
}

/**
 * Review code changes
 */
export async function reviewCode(
  args: string[],
  primitives: { completion: CompletionPrimitive },
  options: ReviewOptions = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const git = simpleGit();
    const reviewer = new CodeReviewEngine(primitives.completion, git);

    const reviewOptions: ReviewOptions = {
      staged: options.staged !== false,
      files: options.files,
      includeSuggestions: true,
    };

    progressManager.startSpinner({ text: 'Reviewing code...' });

    const result = await reviewer.reviewChanges(reviewOptions);

    progressManager.succeedSpinner('Review complete');

    // Display formatted review
    const formatted = reviewer.formatReviewForDisplay(result);
    console.log('\n' + formatted);

    // Exit with error if critical issues found
    if (result.issuesBySeverity.critical > 0) {
      console.log(chalk.red('\n❌ Critical issues found. Please fix before proceeding.'));
      return { success: false, error: 'Critical issues found' };
    }

    return { success: true };
  } catch (error) {
    progressManager.failSpinner('Review failed');
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error }, 'Code review failed');
    return { success: false, error: message };
  }
}

/**
 * Show commit help
 */
export function showCommitHelp(): void {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║  VIBE Commit - Generate semantic commit messages              ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ${chalk.bold('Usage')}                                                       ║
║    vibe commit [options]                                      ║
║                                                               ║
║  ${chalk.bold('Options')}                                                     ║
║    --message, -m <msg>   Additional context for commit      ║
║    --dry-run            Show commit message without committing║
║    --no-push            Don't push after commit             ║
║                                                               ║
║  ${chalk.bold('Examples')}                                                    ║
║    vibe commit                                                ║
║    vibe commit -m "related to user authentication"            ║
║    vibe commit --dry-run                                      ║
║                                                               ║
║  ${chalk.bold('How It Works')}                                                ║
║    1. Analyzes staged changes                                 ║
║    2. Determines commit type (feat, fix, docs, etc.)          ║
║    3. Generates conventional commit message                   ║
║    4. Commits with generated message                          ║
║    5. Pushes to remote (unless --no-push)                     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `));
}

/**
 * Show PR help
 */
export function showPRHelp(): void {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║  VIBE PR - Generate PR descriptions                           ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ${chalk.bold('Usage')}                                                       ║
║    vibe pr [options]                                          ║
║                                                               ║
║  ${chalk.bold('Options')}                                                     ║
║    --base <branch>      Base branch (default: main)           ║
║    --draft              Create as draft PR                    ║
║    --title <title>      Custom PR title                       ║
║    --dry-run            Show description without creating     ║
║                                                               ║
║  ${chalk.bold('Examples')}                                                    ║
║    vibe pr                                                    ║
║    vibe pr --base develop                                     ║
║    vibe pr --draft --title "WIP: New feature"                 ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `));
}

/**
 * Show review help
 */
export function showReviewHelp(): void {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║  VIBE Review - AI-powered code review                         ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ${chalk.bold('Usage')}                                                       ║
║    vibe review [options]                                      ║
║                                                               ║
║  ${chalk.bold('Options')}                                                     ║
║    --staged             Review staged changes (default)       ║
║    --unstaged           Review unstaged changes               ║
║    --file <path>        Review specific file                  ║
║    --fix                Attempt to auto-fix issues            ║
║                                                               ║
║  ${chalk.bold('Examples')}                                                    ║
║    vibe review                                                ║
║    vibe review --unstaged                                     ║
║    vibe review --file src/utils/helpers.ts                    ║
║                                                               ║
║  ${chalk.bold('Issue Categories')}                                            ║
║    🔴 Critical  - Security vulnerabilities, crashes           ║
║    🟠 High      - Performance issues, error handling          ║
║    🟡 Medium    - Code quality, maintainability               ║
║    🔵 Low       - Style, documentation                        ║
║    ⚪ Info      - Suggestions, best practices                 ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `));
}
