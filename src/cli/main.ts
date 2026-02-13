import { Command } from 'commander';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { VIBE_VERSION } from '../version.js';
import { PlanningPrimitive } from '../domain/primitives/planning.js';
import { CompletionPrimitive } from '../domain/primitives/completion.js';
import { ExecutionPrimitive } from '../domain/primitives/execution.js';
import { MultiEditPrimitive } from '../domain/primitives/multi-edit.js';
import { ApprovalPrimitive } from '../domain/primitives/approval.js';
import { MemoryPrimitive } from '../domain/primitives/memory.js';
import { DeterminismPrimitive } from '../domain/primitives/determinism.js';
import { SearchPrimitive } from '../domain/primitives/search.js';
import { OrchestrationPrimitive } from '../domain/primitives/orchestration.js';
import { IPrimitive } from '../domain/primitives/types.js';
import chalk from 'chalk';
import { runInteractive } from './interactive.js';
import { enhancedMCPManager as mcpManager } from '../mcp/enhanced-manager.js';
import { scaffold } from '../commands/scaffold.js';
import { generateTests } from '../commands/test.js';
import { fix } from '../commands/fix.js';
import { autonomousCommand } from '../commands/autonomous.js';
import { createLogger } from '../utils/pino-logger.js';
import { progressManager } from '../ui/progress-manager.js';
import { getAllCredentials, CredentialType, getCredentialName } from '../core/credentials.js';
import { generateCommit, generatePR, reviewCode } from '../commands/git.js';
import { configManager, ConfigManager } from '../core/config-system.js';
import { VibeProviderRouter } from '../providers/router.js';
import { VibeApiServer } from '../core/api-server.js';
import { batchTest, batchFix } from '../commands/batch.js';
import { createCheckpoint, listCheckpoints, rollbackToCheckpoint } from '../commands/checkpoint-commands.js';
import { listPlugins, installPlugin, uninstallPlugin, togglePlugin, showPluginHelp, searchPlugins } from '../commands/plugin.js';
import { publishItem } from '../commands/publish.js';
import { pluginRegistry } from '../core/plugin-system/registry.js';
import { loadPlugin } from '../core/plugin-system/loader.js';
import { updateChecker } from '../core/update-checker.js';
import { telemetry } from '../core/telemetry.js';
import { DatabaseManager } from '../core/database/database-manager.js';
import { RunRepository } from '../core/database/repositories/run-repository.js';
import { v4 as uuidv4 } from 'uuid';

// New structured logger
const logger = createLogger('cli');

// Disable progress indicators if not TTY
if (!process.stdout.isTTY) {
    progressManager.disable();
}

export async function run() {
    const program = new Command();

    // Defer MCP Initialization until an action needs it
    const initMCP = async () => {
        // Only initialize once
        if (mcpManager.listServers().length > 0) return;
        console.log(chalk.gray('Initializing MCP context...'));
        await mcpManager.initialize();
    };

    program
        .name('vibe')
        .description('VIBE CLI - Your AI Development Teammate')
        .version(VIBE_VERSION);

    // Initialize Primitives
    const primitiveMap = new Map<string, IPrimitive>();
    primitiveMap.set('completion', new CompletionPrimitive());
    primitiveMap.set('planning', new PlanningPrimitive());
    primitiveMap.set('execution', new ExecutionPrimitive());
    primitiveMap.set('multi-edit', new MultiEditPrimitive());
    primitiveMap.set('approval', new ApprovalPrimitive());
    primitiveMap.set('memory', new MemoryPrimitive());
    primitiveMap.set('determinism', new DeterminismPrimitive());
    primitiveMap.set('search', new SearchPrimitive());

    const orchestrator = new OrchestrationPrimitive(primitiveMap);
    primitiveMap.set('orchestration', orchestrator);

    // Initialize Database
    const dbManager = new DatabaseManager(process.cwd());
    const runRepo = new RunRepository(dbManager);
    orchestrator.setRepository(runRepo);

    // Plugins
    const plugin = program.command('plugin').description('Manage plugins');

    plugin
        .command('list')
        .description('List installed plugins')
        .action(() => {
            listPlugins();
        });

    plugin
        .command('search')
        .description('Search remote marketplace for plugins')
        .action(async () => {
            await searchPlugins();
        });

    plugin
        .command('install')
        .description('Install a plugin from a local path or marketplace ID')
        .argument('<path|id>', 'Path to plugin directory or marketplace ID')
        .action(async (pathOrId) => {
            await installPlugin(pathOrId, program);
        });

    plugin
        .command('uninstall')
        .description('Uninstall a plugin')
        .argument('<name>', 'Plugin name')
        .action((name) => {
            uninstallPlugin(name);
        });

    plugin
        .command('enable')
        .description('Enable a plugin')
        .argument('<name>', 'Plugin name')
        .action((name) => {
            togglePlugin(name, true);
        });

    plugin
        .command('disable')
        .description('Disable a plugin')
        .argument('<name>', 'Plugin name')
        .action((name) => {
            togglePlugin(name, false);
        });

    plugin
        .command('help')
        .description('Show plugin help')
        .action(() => {
            showPluginHelp();
        });

    program
        .command('publish')
        .description('Publish a plugin or template to the community marketplace')
        .argument('<path>', 'Path to the plugin or template directory')
        .action(async (path) => {
            await publishItem(path);
        });

    // Start
    program
        .argument('[task]', 'Task to perform')
        .option('--tui', 'Start in interactive TUI mode', false)
        .action(async (taskArgs, options) => {
            if (options.tui) {
                await initMCP();
                const { runTUI } = await import('../presentation/tui/run.js');
                await runTUI(orchestrator, mcpManager);
                return;
            }
            await initMCP();
            // Load enabled plugins on startup
            const installedPlugins = pluginRegistry.listPlugins();
            for (const p of installedPlugins) {
                if (p.enabled) {
                    try {
                        await loadPlugin(p.path, program);
                    } catch (error) {
                        logger.error({ error, plugin: p.manifest.name }, 'Failed to load plugin on startup');
                    }
                }
            }

            // Track CLI usage (if enabled)
            telemetry.trackEvent('cli_start', { command: taskArgs[0] || 'interactive' });

            const task = taskArgs.join(' ');
            if (!task) {
                await initMCP();
                await runInteractive(primitiveMap);
                return;
            }

            logger.info({ task }, 'Processing task');

            // Create Run Context
            const runId = uuidv4();
            runRepo.createRun({
                runId,
                user: { id: process.env.USER || 'anonymous', role: 'admin' },
                workspace: { path: process.cwd() },
                configSnapshot: {} as Record<string, unknown>, // TODO: Load actual config snapshot
                timestamp: new Date().toISOString()
            });

            orchestrator.setCurrentRunId(runId);

            // 1. Planning
            progressManager.startSpinner({ text: 'Devising a plan...', color: 'blue' });
            const planner = primitiveMap.get('planning') as PlanningPrimitive;
            const planResult = await planner.execute({ task });

            if (!planResult.success) {
                progressManager.failSpinner('Planning failed');
                logger.error({ error: planResult.error }, 'Planning failed');
                return;
            }
            progressManager.succeedSpinner('Plan devised');

            const plan = planResult.data;
            console.log(chalk.green('\n📍 Execution Plan:')); // eslint-disable-line no-console
            plan.forEach((s: any) => console.log(`  [${s.step}] ${chalk.bold(s.primitive.toUpperCase())}: ${s.task}`)); // eslint-disable-line no-console

            // Display plan
            console.log(chalk.green('\n📍 Execution Plan:'));
            plan.forEach((s: any) => console.log(`  [${s.step}] ${chalk.bold(s.primitive.toUpperCase())}: ${s.task}`));

            // 2. Approval
            const approver = primitiveMap.get('approval') as ApprovalPrimitive;
            const approval = await approver.execute({ message: 'Proceed with this plan?' });

            if (!approval.success) {
                logger.warn('Plan aborted by user');
                return;
            }

            // 3. Orchestration
            progressManager.startSpinner({ text: 'Executing plan...', color: 'blue' });
            const orchResult = await orchestrator.execute({ plan });

            if (orchResult.success) {
                console.log(chalk.green('\n✅ Task completed successfully!'));
            } else {
                console.log(chalk.red(`\n❌ Task execution failed: ${orchResult.error}`));
                logger.error({ error: orchResult.error }, 'Task execution failed');
            }

            // Check for updates after the task is done (async)
            updateChecker.notify().catch(() => { });
        });

    // Specific Subcommands for power users

    // Autonomous command
    program.addCommand(autonomousCommand);

    // Scaffolding command
    program
        .command('scaffold')
        .description('Generate projects and components')
        .argument('[template...]', 'Template type and name (e.g., "nextjs my-app" or "react-component Button")')
        .action(async (args) => {
            const primitives = {
                planning: primitiveMap.get('planning') as PlanningPrimitive,
                completion: primitiveMap.get('completion') as CompletionPrimitive,
                multiEdit: primitiveMap.get('multi-edit') as MultiEditPrimitive,
                execution: primitiveMap.get('execution') as ExecutionPrimitive,
                search: primitiveMap.get('search') as SearchPrimitive,
            };
            await scaffold(args || [], primitives);
        });

    // Test generation command
    program
        .command('test')
        .description('Generate unit tests for code')
        .argument('[target...]', 'File or directory to generate tests for')
        .option('--framework <name>', 'Test framework (vitest, jest)', 'vitest')
        .option('--coverage', 'Include coverage metrics', false)
        .option('--update', 'Overwrite existing test files', false)
        .action(async (args, options) => {
            const primitives = {
                search: primitiveMap.get('search') as SearchPrimitive,
                completion: primitiveMap.get('completion') as CompletionPrimitive,
                multiEdit: primitiveMap.get('multi-edit') as MultiEditPrimitive,
            };
            await generateTests(args, primitives, {
                framework: options.framework,
                coverage: options.coverage,
                update: options.update,
            });
        });

    // Git Commands
    program
        .command('commit')
        .description('Generate semantic commit message')
        .option('-m, --message <msg>', 'Additional context for commit')
        .option('--dry-run', 'Show commit message without committing')
        .option('--no-push', "Don't push after commit")
        .action(async (options) => {
            const primitives = { completion: primitiveMap.get('completion') as CompletionPrimitive };
            await generateCommit([], primitives, options);
        });

    program
        .command('pr')
        .description('Generate PR description')
        .option('--base <branch>', 'Base branch (default: main)', 'main')
        .option('--draft', 'Create as draft PR')
        .option('--title <title>', 'Custom PR title')
        .option('--dry-run', 'Show description without creating')
        .action(async (options) => {
            const primitives = { completion: primitiveMap.get('completion') as CompletionPrimitive };
            await generatePR([], primitives, options);
        });

    program
        .command('review')
        .description('AI-powered code review')
        .option('--staged', 'Review staged changes (default)', true)
        .option('--unstaged', 'Review unstaged changes')
        .option('--file <path>', 'Review specific file')
        .option('--fix', 'Attempt to auto-fix issues')
        .action(async (options) => {
            const primitives = { completion: primitiveMap.get('completion') as CompletionPrimitive };
            await reviewCode([], primitives, options);
        });

    // Batch & Maintenance
    program
        .command('batch')
        .description('Batch process files')
        .argument('<cmd>', 'Subcommand (test, fix)')
        .argument('[pattern]', 'Globs pattern')
        .option('--concurrency <n>', 'Number of parallel workers', '5')
        .option('--dry-run', 'Show what would be processed')
        .action(async (cmd, pattern, options) => {
            const primitives = {
                search: primitiveMap.get('search') as SearchPrimitive,
                completion: primitiveMap.get('completion') as CompletionPrimitive,
                planning: primitiveMap.get('planning'),
                execution: primitiveMap.get('execution'),
                multiEdit: primitiveMap.get('multi-edit'),
            };
            if (cmd === 'test') {
                await batchTest([pattern], primitives, options);
            } else if (cmd === 'fix') {
                await batchFix([pattern], primitives, options);
            }
        });

    program
        .command('watch')
        .description('Watch files for changes and automatically run tasks')
        .action(async () => {
            const { WatchMonitor } = await import('../core/watch-monitor.js');
            const monitor = new WatchMonitor();
            await monitor.startWatching({}, (events) => {
                console.log(`Detected ${events.length} changes`);
            });
        });

    // Telemetry
    program
        .command('telemetry')
        .description('Enable or disable anonymous telemetry')
        .argument('[status]', 'Status (on/off)')
        .action((status) => {
            if (!status) {
                const current = telemetry.isEnabled() ? chalk.green('ON') : chalk.red('OFF');
                console.log(`\nTelemetry is currently ${current}\n`);
                console.log(chalk.gray('Use "vibe telemetry on" or "vibe telemetry off" to change.'));
                return;
            }
            const enabled = status === 'on';
            telemetry.setEnabled(enabled);
            console.log(chalk.green(`\n✅ Telemetry turned ${enabled ? 'ON' : 'OFF'}.\n`));
        });

    // Checkpoints
    const checkpoint = program.command('checkpoint').description('Manage system checkpoints');

    checkpoint
        .command('create')
        .argument('<name>', 'Checkpoint name')
        .option('-d, --description <desc>', 'Checkpoint description')
        .action(async (name, options) => {
            await createCheckpoint(name, options);
        });

    checkpoint
        .command('list')
        .option('--json', 'Output in JSON format')
        .action(async (options) => {
            listCheckpoints(options);
        });

    checkpoint
        .command('rollback')
        .argument('<id>', 'Checkpoint ID')
        .option('--force', 'Force rollback')
        .action(async (id, options) => {
            await rollbackToCheckpoint(id, options);
        });

    // Server
    program
        .command('server')
        .description('Start the VIBE REST API server')
        .option('-p, --port <number>', 'Port to run on', '3000')
        .action((options) => {
            const server = new VibeApiServer(parseInt(options.port));
            server.start();
        });

    program
        .command('config')
        .description('Manage configuration')
        .action(async () => {
            const router = new VibeProviderRouter();
            const manager = ConfigManager.getInstance();
            // Use optional chaining instead of type assertion (P4-100)
            if ('runFirstTimeSetup' in manager && typeof manager.runFirstTimeSetup === 'function') {
                await manager.runFirstTimeSetup();
            }
        });

    program
        .command('doctor')
        .description('Check system health and environment')
        .action(async () => {
            console.log(chalk.bold('\n🔍 VIBE Doctor - System Health Check\n')); // eslint-disable-line no-console

            // Check Credentials
            progressManager.startSpinner({ text: 'Checking credentials...' });
            const credentials = await getAllCredentials();
            progressManager.succeedSpinner('Credentials checked');

            console.log(chalk.bold('\n🔐 Credentials:\n'));
            for (const cred of credentials) {
                const status = cred.stored || cred.envValue ? chalk.green('✅') : chalk.yellow('⚠️');
                const source = cred.stored ? ' (keychain)' : cred.envValue ? ' (env)' : '';
                console.log(`${status} ${cred.name}${source}`);
            }

            // Check Git
            try {
                const gitVersion = execSync('git --version').toString().trim();
                console.log(`${chalk.green('✅')} Git: ${gitVersion}`); // eslint-disable-line no-console
            } catch (e) {
                console.log(`${chalk.red('❌')} Git: Not found in PATH`); // eslint-disable-line no-console
            }

            // Check Node
            console.log(`${chalk.green('✅')} Node: ${process.version}`); // eslint-disable-line no-console

            // Check Workspace
            const vibeDir = path.join(process.cwd(), '.vibe');
            if (fs.existsSync(vibeDir)) {
                console.log(`${chalk.green('✅')} .vibe directory: Exists`); // eslint-disable-line no-console
            } else {
                console.log(`${chalk.blue('ℹ️')} .vibe directory: Will be created on first use`); // eslint-disable-line no-console
            }

            // Check MCP Servers
            const config = configManager.getConfig();
            const mcpServers = config.mcpServers || {};
            const serverCount = Object.keys(mcpServers).length;
            if (serverCount > 0) {
                console.log(`${chalk.green('✅')} MCP Servers: ${serverCount} configured`); // eslint-disable-line no-console
            } else {
                console.log(`${chalk.yellow('⚠️')} MCP Servers: None configured`); // eslint-disable-line no-console
            }

            // Check Telemetry
            const telStatus = telemetry.isEnabled() ? chalk.green('ON') : chalk.gray('OFF (Opt-out)');
            console.log(`${chalk.white('📊')} Telemetry: ${telStatus}`); // eslint-disable-line no-console

            console.log('\n✨ Health check complete.\n'); // eslint-disable-line no-console
            process.exit(0);
        });

    program
        .command('completion')
        .description('Generate shell completion script')
        .option('--bash', 'Generate Bash completion')
        .option('--zsh', 'Generate Zsh completion')
        .action(async (options) => {

            const __dirname = dirname(fileURLToPath(import.meta.url));
            const scriptDir = join(__dirname, '..', '..', 'bin');

            if (options.bash || (!options.bash && !options.zsh)) {
                const bashScript = fs.readFileSync(path.join(scriptDir, 'vibe-completion.bash'), 'utf-8');
                console.log(bashScript); // eslint-disable-line no-console
                console.log(chalk.gray('\n# To install for Bash, run:')); // eslint-disable-line no-console
                console.log(chalk.cyan(`  echo "source $(pwd)/bin/vibe-completion.bash" >> ~/.bashrc && source ~/.bashrc`)); // eslint-disable-line no-console
            }

            if (options.zsh) {
                const zshScript = fs.readFileSync(path.join(scriptDir, 'vibe-completion.zsh'), 'utf-8');
                console.log(zshScript); // eslint-disable-line no-console
                console.log(chalk.gray('\n# To install for Zsh, run:')); // eslint-disable-line no-console
                console.log(chalk.cyan(`  echo "source $(pwd)/bin/vibe-completion.zsh" >> ~/.zshrc && source ~/.zshrc`)); // eslint-disable-line no-console
            }

            process.exit(0);
        });

    await program.parseAsync(process.argv);
}
