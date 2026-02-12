/**
 * VIBE CLI - Watch Commands
 * Commands for file watching and auto-actions
 */

import * as path from 'path';
import chalk from 'chalk';
import { createLogger } from '../utils/pino-logger.js';
import { progressManager } from '../ui/progress-manager.js';
import { WatchMonitor } from '../core/watch-monitor.js';
import { WatchConfig, ChangeEvent } from '../types/watch.js';
import { generateTests } from './test.js';
import { fix } from './fix.js';
import { CompletionPrimitive } from '../domain/primitives/completion.js';
import { PlanningPrimitive } from '../domain/primitives/planning.js';
import { ExecutionPrimitive } from '../domain/primitives/execution.js';
import { MultiEditPrimitive } from '../domain/primitives/multi-edit.js';
import { SearchPrimitive } from '../domain/primitives/search.js';

const logger = createLogger('watch-commands');

interface WatchCommandOptions {
  pattern?: string;
  debounce?: number;
  autoApprove?: boolean;
  command?: string;
}

/**
 * Watch and run tests on change
 */
export async function watchTest(
  args: string[],
  primitives: {
    search: SearchPrimitive;
    completion: CompletionPrimitive;
  },
  options: WatchCommandOptions = {}
): Promise<void> {
  const pattern = options.pattern || 'src/**/*.{ts,tsx}';
  const debounceMs = options.debounce || 300;

  console.log(chalk.cyan(`\n👁️  Watch Mode: Test\n`));
  console.log(chalk.gray(`Watching: ${pattern}`));
  console.log(chalk.gray(`Debounce: ${debounceMs}ms\n`));
  console.log(chalk.yellow('Press Ctrl+C to stop\n'));

  const config: WatchConfig = {
    patterns: [pattern],
    ignore: ['node_modules/**', 'dist/**', '**/*.test.ts', '**/*.spec.ts'],
    debounceMs,
    action: 'test',
    autoApprove: options.autoApprove || false,
    notify: true,
  };

  const monitor = new WatchMonitor();

  await monitor.startWatching(config, async (changes) => {
    const filePaths = changes.map((c) => c.path);

    console.log(chalk.cyan(`\n📝 ${filePaths.length} file(s) changed:`));
    for (const file of filePaths.slice(0, 5)) {
      console.log(chalk.gray(`  - ${path.basename(file)}`));
    }
    if (filePaths.length > 5) {
      console.log(chalk.gray(`  ... and ${filePaths.length - 5} more`));
    }
    console.log();

    // Run tests for changed files
    for (const filePath of filePaths) {
      const testPath = filePath.replace(/\.(ts|tsx|js|jsx)$/, '.test.$1');

      progressManager.startSpinner({
        text: `Generating tests for ${path.basename(filePath)}...`,
      });

      try {
        await generateTests(
          [filePath],
          {
            search: primitives.search,
            completion: primitives.completion,
            multiEdit: {} as any,
          },
          { framework: 'vitest', update: false }
        );
        progressManager.succeedSpinner(`Tests updated for ${path.basename(filePath)}`);
      } catch (error) {
        progressManager.failSpinner(`Failed to generate tests for ${path.basename(filePath)}`);
      }
    }
  });

  // Keep process alive
  process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n\nStopping watch...'));
    await monitor.stopWatching();
    process.exit(0);
  });

  // Keep running
  await new Promise(() => { });
}

/**
 * Watch and fix on change
 */
export async function watchFix(
  args: string[],
  primitives: {
    search: SearchPrimitive;
    completion: CompletionPrimitive;
    planning: any;
    execution: any;
    multiEdit: any;
  },
  options: WatchCommandOptions = {}
): Promise<void> {
  const pattern = options.pattern || 'src/**/*.{ts,tsx}';
  const debounceMs = options.debounce || 300;

  console.log(chalk.cyan(`\n👁️  Watch Mode: Fix\n`));
  console.log(chalk.gray(`Watching: ${pattern}`));
  console.log(chalk.gray(`Debounce: ${debounceMs}ms`));
  console.log(chalk.gray(`Auto-approve: ${options.autoApprove ? 'yes' : 'no'}\n`));
  console.log(chalk.yellow('Press Ctrl+C to stop\n'));

  const config: WatchConfig = {
    patterns: [pattern],
    ignore: ['node_modules/**', 'dist/**'],
    debounceMs,
    action: 'fix',
    autoApprove: options.autoApprove || false,
    notify: true,
  };

  const monitor = new WatchMonitor();

  await monitor.startWatching(config, async (changes) => {
    const filePaths = changes.map((c) => c.path);

    console.log(chalk.cyan(`\n📝 ${filePaths.length} file(s) changed:`));
    for (const file of filePaths.slice(0, 5)) {
      console.log(chalk.gray(`  - ${path.basename(file)}`));
    }
    console.log();

    // Fix each changed file
    for (const filePath of filePaths) {
      progressManager.startSpinner({
        text: `Checking ${path.basename(filePath)}...`,
      });

      try {
        await fix(
          [filePath],
          {
            search: primitives.search,
            completion: primitives.completion,
            planning: primitives.planning,
            execution: primitives.execution,
            multiEdit: primitives.multiEdit,
          },
          {
            dryRun: !options.autoApprove,
            test: !options.autoApprove,
            rollback: true,
          }
        );
        progressManager.succeedSpinner(`Fixed ${path.basename(filePath)}`);
      } catch (error) {
        progressManager.failSpinner(`Failed to fix ${path.basename(filePath)}`);
      }
    }
  });

  // Keep process alive
  process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n\nStopping watch...'));
    await monitor.stopWatching();
    process.exit(0);
  });

  // Keep running
  await new Promise(() => { });
}

/**
 * Watch with custom command
 */
export async function watchCustom(
  args: string[],
  options: WatchCommandOptions = {}
): Promise<void> {
  if (!options.command) {
    console.log(chalk.red('Error: --command is required'));
    process.exit(1);
  }

  const pattern = options.pattern || '**/*';
  const debounceMs = options.debounce || 300;

  console.log(chalk.cyan(`\n👁️  Watch Mode: Custom\n`));
  console.log(chalk.gray(`Watching: ${pattern}`));
  console.log(chalk.gray(`Command: ${options.command}`));
  console.log(chalk.gray(`Debounce: ${debounceMs}ms\n`));
  console.log(chalk.yellow('Press Ctrl+C to stop\n'));

  const config: WatchConfig = {
    patterns: [pattern],
    ignore: ['node_modules/**', 'dist/**', '.git/**'],
    debounceMs,
    action: 'custom',
    customCommand: options.command,
    autoApprove: true,
    notify: true,
  };

  const monitor = new WatchMonitor();
  const { execSync } = require('child_process');

  await monitor.startWatching(config, async (changes) => {
    const filePaths = changes.map((c) => c.path);

    console.log(chalk.cyan(`\n📝 ${filePaths.length} file(s) changed`));
    console.log(chalk.gray(`Running: ${options.command}\n`));

    try {
      execSync(options.command!, { stdio: 'inherit' });
      console.log(chalk.green('\n✅ Command completed'));
    } catch (error) {
      console.log(chalk.red('\n❌ Command failed'));
    }
  });

  // Keep process alive
  process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n\nStopping watch...'));
    await monitor.stopWatching();
    process.exit(0);
  });

  // Keep running
  await new Promise(() => { });
}

/**
 * Show watch help
 */
export function showWatchHelp(): void {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║  VIBE Watch - File watching with auto-actions                 ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ${chalk.bold('Usage')}                                                       ║
║    vibe watch <action> [options]                              ║
║                                                               ║
║  ${chalk.bold('Actions')}                                                     ║
║    test                 Auto-generate tests on file change    ║
║    fix                  Auto-fix issues on file change        ║
║    --command <cmd>      Run custom command on file change     ║
║                                                               ║
║  ${chalk.bold('Options')}                                                     ║
║    --pattern <glob>     File pattern to watch (default: src/**/*)║
║    --debounce <ms>      Debounce time in ms (default: 300)    ║
║    --auto-approve       Auto-approve fixes without prompting  ║
║                                                               ║
║  ${chalk.bold('Examples')}                                                    ║
║    vibe watch test                                            ║
║    vibe watch test --pattern "src/utils/*.ts"                 ║
║    vibe watch fix --auto-approve                              ║
║    vibe watch --command "npm run build"                       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `));
}
