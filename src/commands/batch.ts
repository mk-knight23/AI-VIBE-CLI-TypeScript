/**
 * VIBE CLI - Batch Commands
 * Commands for batch processing operations
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import fg from 'fast-glob';
import { createLogger } from '../utils/pino-logger.js';
import { errors } from '../utils/errors.js';
import { progressManager } from '../ui/progress-manager.js';
import { BatchProcessor } from '../domain/batch/batch-processor.js';
import { BatchConfig, BatchOperation } from '../types/batch.js';
import { SearchPrimitive } from '../domain/primitives/search.js';
import { CompletionPrimitive } from '../domain/primitives/completion.js';
import { generateTests } from './test.js';
import { fix } from './fix.js';

const logger = createLogger('batch-commands');

interface BatchCommandOptions {
  concurrency?: number;
  framework?: 'vitest' | 'jest';
  dryRun?: boolean;
  pattern?: string;
  strategy?: string;
  autoFix?: boolean;
}

/**
 * Find files matching pattern
 */
async function findFiles(pattern: string): Promise<string[]> {
  const files = await fg(pattern, {
    ignore: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**', '.git/**'],
    onlyFiles: true,
  });
  return files;
}

/**
 * Batch test generation
 */
export async function batchTest(
  args: string[],
  primitives: {
    search: SearchPrimitive;
    completion: CompletionPrimitive;
  },
  options: BatchCommandOptions = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const pattern = args[0] || 'src/**/*.{ts,tsx,js,jsx}';
    const files = await findFiles(pattern);

    if (files.length === 0) {
      console.log(chalk.yellow('No files found matching pattern'));
      return { success: false, error: 'No files found' };
    }

    console.log(chalk.cyan(`\n🧪 Batch Test Generation\n`));
    console.log(chalk.gray(`Found ${files.length} files to process\n`));

    if (options.dryRun) {
      console.log(chalk.yellow('Dry run mode - no files will be created\n'));
      for (const file of files.slice(0, 10)) {
        console.log(chalk.gray(`Would process: ${file}`));
      }
      if (files.length > 10) {
        console.log(chalk.gray(`... and ${files.length - 10} more`));
      }
      return { success: true };
    }

    const config: BatchConfig = {
      concurrency: options.concurrency || 5,
      retryAttempts: 2,
      retryDelayMs: 1000,
      timeoutMs: 60000,
      continueOnError: true,
      dryRun: options.dryRun || false,
    };

    const processor = new BatchProcessor(config);

    const operation: BatchOperation = {
      name: 'test-generation',
      execute: async (filePath) => {
        const result = await generateTests(
          [filePath],
          {
            search: primitives.search,
            completion: primitives.completion,
            multiEdit: {} as any, // TODO: Add proper multiEdit
          },
          {
            framework: options.framework || 'vitest',
            update: false,
          }
        );
        return result;
      },
    };

    const result = await processor.processBatch(files, operation);

    console.log(processor.formatResults(result));

    return {
      success: result.failed === 0,
      error: result.errors.length > 0 ? result.errors.join('\n') : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error }, 'Batch test failed');
    return { success: false, error: message };
  }
}

/**
 * Batch fix
 */
export async function batchFix(
  args: string[],
  primitives: {
    search: SearchPrimitive;
    completion: CompletionPrimitive;
    planning: any;
    execution: any;
    multiEdit: any;
  },
  options: BatchCommandOptions = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const pattern = args[0] || 'src/**/*.{ts,tsx,js,jsx}';
    const files = await findFiles(pattern);

    if (files.length === 0) {
      console.log(chalk.yellow('No files found matching pattern'));
      return { success: false, error: 'No files found' };
    }

    console.log(chalk.cyan(`\n🔧 Batch Fix\n`));
    console.log(chalk.gray(`Found ${files.length} files to process\n`));

    const config: BatchConfig = {
      concurrency: options.concurrency || 3, // Lower concurrency for fixes
      retryAttempts: 1,
      retryDelayMs: 1000,
      timeoutMs: 120000,
      continueOnError: true,
      dryRun: options.dryRun || false,
    };

    const processor = new BatchProcessor(config);

    const operation: BatchOperation = {
      name: 'fix',
      execute: async (filePath) => {
        const result = await fix(
          [filePath],
          {
            search: primitives.search,
            completion: primitives.completion,
            planning: primitives.planning,
            execution: primitives.execution,
            multiEdit: primitives.multiEdit,
          },
          {
            dryRun: options.dryRun || false,
            test: !options.autoFix,
            rollback: true,
          }
        );
        return result;
      },
    };

    const result = await processor.processBatch(files, operation);

    console.log(processor.formatResults(result));

    return {
      success: result.failed === 0,
      error: result.errors.length > 0 ? result.errors.join('\n') : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error }, 'Batch fix failed');
    return { success: false, error: message };
  }
}

/**
 * Show batch help
 */
export function showBatchHelp(): void {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║  VIBE Batch - Batch process files                             ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ${chalk.bold('Usage')}                                                       ║
║    vibe batch <command> [pattern] [options]                   ║
║                                                               ║
║  ${chalk.bold('Commands')}                                                    ║
║    test      Generate tests for matching files                ║
║    fix       Fix issues in matching files                     ║
║                                                               ║
║  ${chalk.bold('Options')}                                                     ║
║    --concurrency <n>    Number of parallel workers (default: 5)║
║    --framework <name>   Test framework (vitest, jest)         ║
║    --dry-run            Show what would be processed          ║
║    --pattern <glob>     File pattern to match                 ║
║                                                               ║
║  ${chalk.bold('Examples')}                                                    ║
║    vibe batch test "src/**/*.ts"                              ║
║    vibe batch test --concurrency 3                            ║
║    vibe batch fix "src/utils/*.ts" --dry-run                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `));
}
