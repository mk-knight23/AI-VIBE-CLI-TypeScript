/**
 * VIBE-CLI v0.0.2 - Checkpoint Commands
 * CLI commands for checkpoint and rollback operations
 */

import * as readline from 'readline';
import * as path from 'path';
import chalk from 'chalk';
import { checkpointManager, Checkpoint, RollbackOptions } from '../core/checkpoint-system/checkpoint-manager.js';

/**
 * Session ID for checkpoint operations
 */
let currentSessionId: string = `session-${Date.now()}`;

/**
 * Set the current session ID
 */
export function setCheckpointSession(sessionId: string): void {
  currentSessionId = sessionId;
}

/**
 * Create a checkpoint
 */
export async function createCheckpoint(
  name: string,
  options: {
    description?: string;
    priority?: string;
    tags?: string[];
  } = {}
): Promise<{ success: boolean; checkpoint?: Checkpoint; error?: string }> {
  try {
    const checkpoint = await checkpointManager.createCheckpoint(currentSessionId, {
      name,
      description: options.description,
      priority: (options.priority as any) || 'normal',
      tags: options.tags,
    });

    console.log(chalk.green(`\n✅ Checkpoint created: ${checkpoint.name}`));
    console.log(chalk.gray(`   ID: ${checkpoint.id}`));
    console.log(chalk.gray(`   Files: ${checkpoint.fileCount}`));
    console.log(chalk.gray(`   Size: ${checkpointManager.formatSize(checkpoint.compressedSize)}`));

    return { success: true, checkpoint };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.log(chalk.red(`\n❌ Failed to create checkpoint: ${message}`));
    return { success: false, error: message };
  }
}

/**
 * List checkpoints
 */
export function listCheckpoints(options: {
  sessionId?: string;
  status?: string;
  limit?: number;
  json?: boolean;
} = {}): void {
  const checkpoints = checkpointManager.listCheckpoints({
    sessionId: options.sessionId || currentSessionId,
    status: options.status as any,
    limit: options.limit,
  });

  if (options.json) {
    console.log(JSON.stringify(checkpoints, null, 2));
    return;
  }

  if (checkpoints.length === 0) {
    console.log(chalk.yellow('\n📋 No checkpoints found.'));
    console.log(chalk.gray('   Use "vibe checkpoint create <name>" to create one.'));
    return;
  }

  console.log(chalk.cyan('\n📋 Checkpoints'));
  console.log(chalk.gray('─'.repeat(60)));

  for (const cp of checkpoints) {
    const statusIcon = cp.status === 'active' ? '●' : cp.status === 'restored' ? '◉' : '○';
    const statusColor = cp.status === 'active' ? chalk.green :
                       cp.status === 'restored' ? chalk.yellow : chalk.gray;

    console.log(`${statusIcon} ${chalk.bold(cp.name)}`);
    console.log(`   ID: ${cp.id}`);
    console.log(`   ${cp.description ? `Desc: ${cp.description}` : 'No description'}`);
    console.log(`   ${cp.fileCount} files · ${cp.sizeFormatted} · ${cp.createdAtFormatted}`);
    console.log(chalk.gray('─'.repeat(60)));
  }

  // Show stats
  const stats = checkpointManager.getStats();
  console.log(chalk.gray(`\nTotal: ${stats.total} | Active: ${stats.active} | Restored: ${stats.restored}`));
}

/**
 * Rollback to a checkpoint
 */
export async function rollbackToCheckpoint(
  checkpointId: string,
  options: {
    force?: boolean;
    dryRun?: boolean;
  } = {}
): Promise<{ success: boolean; result?: any; error?: string }> {
  const checkpoint = checkpointManager.getCheckpoint(checkpointId);

  if (!checkpoint) {
    console.log(chalk.red(`\n❌ Checkpoint not found: ${checkpointId}`));
    return { success: false, error: `Checkpoint not found: ${checkpointId}` };
  }

  // Show checkpoint info
  console.log(chalk.cyan('\n🔄 Rolling back to checkpoint...'));
  console.log(chalk.bold(`   Name: ${checkpoint.name}`));
  console.log(chalk.gray(`   Created: ${checkpoint.createdAt.toLocaleString()}`));
  console.log(chalk.gray(`   Files: ${checkpoint.fileCount}`));

  if (options.dryRun) {
    console.log(chalk.yellow('\n🔍 Dry run - no changes will be made'));
  }

  const rollbackOptions: RollbackOptions = {
    force: options.force,
    dryRun: options.dryRun,
  };

  try {
    const result = await checkpointManager.rollback(checkpointId, rollbackOptions);

    if (result.success) {
      if (options.dryRun) {
        console.log(chalk.green('\n✅ Rollback would succeed'));
        console.log(chalk.gray(`   Would restore ${result.filesRestored} files`));
      } else {
        console.log(chalk.green('\n✅ Rollback complete!'));
        console.log(chalk.gray(`   Files restored: ${result.filesRestored}`));
        console.log(chalk.gray(`   Files created: ${result.filesCreated}`));
        console.log(chalk.gray(`   Duration: ${result.duration}ms`));
      }
    } else {
      console.log(chalk.red(`\n❌ Rollback failed: ${result.error}`));
    }

    return { success: result.success, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.log(chalk.red(`\n❌ Rollback error: ${message}`));
    return { success: false, error: message };
  }
}

/**
 * Show diff between two checkpoints
 */
export async function showCheckpointDiff(
  checkpointId1: string,
  checkpointId2: string
): Promise<{ success: boolean; diff?: any; error?: string }> {
  const diff = await checkpointManager.getCheckpointDiff(checkpointId1, checkpointId2);

  if (!diff) {
    console.log(chalk.red('\n❌ Could not compute diff. Checkpoints may be missing data.'));
    return { success: false, error: 'Could not compute diff' };
  }

  console.log(chalk.cyan('\n📊 Checkpoint Diff'));
  console.log(chalk.gray('─'.repeat(60)));
  console.log(chalk.bold(`From: ${diff.checkpoint1.name} (${diff.checkpoint1.id})`));
  console.log(chalk.bold(`To:   ${diff.checkpoint2.name} (${diff.checkpoint2.id})`));
  console.log(chalk.gray('─'.repeat(60)));

  // Summary
  console.log(`\n${chalk.green(`+${diff.filesAdded.length} added`)}`);
  console.log(`${chalk.red(`-${diff.filesRemoved.length} removed`)}`);
  console.log(`${chalk.yellow(`~${diff.filesModified.length} modified`)}`);

  // Show changes
  if (diff.changes.length > 0) {
    console.log(chalk.gray('\n─── Changes ───'));

    const maxDisplay = 20;
    let displayed = 0;

    for (const change of diff.changes) {
      if (displayed >= maxDisplay) {
        console.log(chalk.gray(`\n... and ${diff.changes.length - displayed} more changes`));
        break;
      }

      const icon = change.type === 'added' ? '+' : change.type === 'removed' ? '-' : '~';
      const color = change.type === 'added' ? chalk.green :
                   change.type === 'removed' ? chalk.red : chalk.yellow;

      console.log(`${color(icon)} ${change.file}`);

      if (change.type === 'modified' && change.lineCount) {
        console.log(chalk.gray(`   ${change.lineCount} lines changed`));
      }

      displayed++;
    }
  }

  return { success: true, diff };
}

/**
 * Delete a checkpoint
 */
export function deleteCheckpoint(
  checkpointId: string
): { success: boolean; error?: string } {
  const deleted = checkpointManager.deleteCheckpoint(checkpointId);

  if (deleted) {
    console.log(chalk.green(`\n✅ Checkpoint ${checkpointId} deleted.`));
    return { success: true };
  } else {
    console.log(chalk.red(`\n❌ Checkpoint not found: ${checkpointId}`));
    return { success: false, error: `Checkpoint not found: ${checkpointId}` };
  }
}

/**
 * Interactive checkpoint creation
 */
export async function interactiveCreateCheckpoint(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = (question: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  };

  try {
    console.log(chalk.cyan('\n📸 Create Checkpoint'));
    console.log(chalk.gray('─'.repeat(30)));

    const name = await askQuestion('Checkpoint name: ');
    if (!name.trim()) {
      console.log(chalk.red('Name is required.'));
      return;
    }

    const description = await askQuestion('Description (optional): ');
    const priority = await askQuestion('Priority (low/normal/high/critical) [normal]: ');
    const tagsStr = await askQuestion('Tags (comma-separated, optional): ');

    const tags = tagsStr.split(',').map((t) => t.trim()).filter(Boolean);

    await createCheckpoint(name, {
      description: description || undefined,
      priority: priority || 'normal',
      tags: tags.length > 0 ? tags : undefined,
    });
  } finally {
    rl.close();
  }
}

/**
 * Interactive rollback selection
 */
export async function interactiveRollback(): Promise<void> {
  const checkpoints = checkpointManager.listCheckpoints({
    sessionId: currentSessionId,
  });

  if (checkpoints.length === 0) {
    console.log(chalk.yellow('\n📋 No checkpoints available.'));
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = (question: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  };

  try {
    console.log(chalk.cyan('\n🔄 Select Checkpoint to Rollback'));
    console.log(chalk.gray('─'.repeat(60)));

    for (let i = 0; i < checkpoints.length; i++) {
      const cp = checkpoints[i];
      console.log(`${chalk.bold(i + 1)}. ${cp.name} (${cp.id})`);
      console.log(`   ${cp.fileCount} files · ${cp.createdAtFormatted}`);
    }

    const selection = await askQuestion('\nEnter checkpoint number (or ID): ');

    let checkpointId: string | undefined;

    // Check if it's a number
    const num = parseInt(selection, 10);
    if (!isNaN(num) && num > 0 && num <= checkpoints.length) {
      checkpointId = checkpoints[num - 1].id;
    } else {
      // Check if it's an ID
      const found = checkpoints.find((cp) => cp.id === selection || cp.name === selection);
      if (found) {
        checkpointId = found.id;
      }
    }

    if (!checkpointId) {
      console.log(chalk.red('Invalid selection.'));
      return;
    }

    const confirm = await askQuestion('Rollback to this checkpoint? This will overwrite current changes (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log('Cancelled.');
      return;
    }

    await rollbackToCheckpoint(checkpointId, { force: true });
  } finally {
    rl.close();
  }
}

/**
 * Get checkpoint help text
 */
export function getCheckpointHelp(): string {
  return `
${chalk.bold('Checkpoint Commands')}

  ${chalk.bold('vibe checkpoint create <name>')}
    Create a new checkpoint with the given name.

  ${chalk.bold('vibe checkpoint create --interactive')}
    Interactively create a checkpoint with prompts.

  ${chalk.bold('vibe checkpoint list')}
    List all checkpoints for the current session.

  ${chalk.bold('vibe checkpoint list --json')}
    List checkpoints in JSON format.

  ${chalk.bold('vibe checkpoint list --limit 10')}
    Limit results to 10 checkpoints.

  ${chalk.bold('vibe checkpoint rollback <id>')}
    Rollback to the specified checkpoint.

  ${chalk.bold('vibe checkpoint rollback <id> --dry-run')}
    Preview rollback without making changes.

  ${chalk.bold('vibe checkpoint diff <id1> <id2>')}
    Show differences between two checkpoints.

  ${chalk.bold('vibe checkpoint delete <id>')}
    Delete a checkpoint.

  ${chalk.bold('vibe checkpoint --help')}
    Show this help message.
`;
}
