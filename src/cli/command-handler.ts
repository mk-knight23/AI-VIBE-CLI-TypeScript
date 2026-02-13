import chalk from 'chalk';
import { IPrimitive } from '../domain/primitives/types.js';
import { stackScaffolder } from '../features/scaffolding/stack-scaffolder.js';
import { errorAnalyzer } from '../features/debugging/error-analyzer.js';
import { projectVisualizer } from '../features/visualization/project-visualizer.js';
import { checkpointManager } from '../core/checkpoint-system/checkpoint-manager.js';
import { vibeSentiment } from '../features/terminal/vibe-sentiment.js';
import { createLogger } from '../utils/pino-logger.js';
import { generateCommit, generatePR, reviewCode } from '../commands/git.js';
import { CompletionPrimitive } from '../domain/primitives/completion.js';
import { VibeProviderRouter } from '../providers/router.js';
import { VibeConfigManager } from '../config.js';

const logger = createLogger('CommandHandler');

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _unused = checkpointManager;

export class CommandHandler {
    private primitiveMap: Map<string, IPrimitive>;

    constructor(primitiveMap: Map<string, IPrimitive>) {
        this.primitiveMap = primitiveMap;
    }

    /**
     * Handle a slash command
     */
    async handle(input: string): Promise<boolean> {
        const trimmed = input.trim();
        if (!trimmed.startsWith('/')) return false;

        const parts = trimmed.split(/\s+/);
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        switch (command) {
            case '/help':
                this.showHelp();
                return true;
            case '/scaffold':
                await this.handleScaffold(args);
                return true;
            case '/debug':
                await this.handleDebug(args);
                return true;
            case '/fix':
                await this.handleFix(args);
                return true;
            case '/test':
                await this.handleTest(args);
                return true;
            case '/docs':
                await this.handleDocs(args);
                return true;
            case '/viz':
                await this.handleViz(args);
                return true;
            case '/mood':
                await this.handleMood(args);
                return true;
            case '/commit':
                await this.handleCommit(args);
                return true;
            case '/pr':
                await this.handlePR(args);
                return true;
            case '/review':
                await this.handleReview(args);
                return true;
            case '/undo':
            case '/checkpoint':
                await this.handleCheckpoint(args);
                return true;
            case '/plugin':
                await this.handlePlugin(args);
                return true;
            case '/config':
                await this.handleConfig(args);
                return true;
            default:
                console.log(chalk.red(`Unknown command: ${command}. Type /help for a list of commands.`));
                return true;
        }
    }

    private showHelp() {
        console.log(chalk.bold('\nAvailable Commands:'));
        console.log(chalk.cyan('  /scaffold <desc> ') + '- AI-driven project scaffolding');
        console.log(chalk.cyan('  /debug <path>    ') + '- Deep AI error analysis & diagnosis');
        console.log(chalk.cyan('  /fix <error>     ') + '- Autonomous bug fixing & remediation');
        console.log(chalk.cyan('  /test <file>     ') + '- Intelligent unit test & mock generation');
        console.log(chalk.cyan('  /docs <file>     ') + '- Explain code and generate documentation');
        console.log(chalk.cyan('  /viz <dir>       ') + '- Interactive architecture visualization');
        console.log(chalk.cyan('  /mood            ') + '- Scan project health and developer "vibe"');
        console.log(chalk.cyan('  /commit [-m msg] ') + '- Generate semantic commit from staged changes');
        console.log(chalk.cyan('  /pr [--base br]  ') + '- Generate AI-powered PR description');
        console.log(chalk.cyan('  /review [--staged]') + '- Deep AI code review of current changes');
        console.log(chalk.cyan('  /checkpoint      ') + '- List or create system checkpoints');
        console.log(chalk.cyan('  /plugin          ') + '- Manage system plugins');
        console.log(chalk.cyan('  /undo            ') + '- Revert to the last checkpoint');
        console.log(chalk.cyan('  /config          ') + '- Interactive AI provider & theme setup');
        console.log(chalk.cyan('  /help            ') + '- Show this help message');
        console.log(chalk.cyan('  exit/quit        ') + '- Exit interactive mode\n');
    }

    private async handleScaffold(args: string[]) {
        if (args.length === 0) {
            console.log(chalk.yellow('Usage: /scaffold <description of the project>'));
            return;
        }
        const description = args.join(' ');
        console.log(chalk.blue(`🏗️  Scaffolding project: "${description}"...`));

        try {
            const completion = this.primitiveMap.get('completion');
            if (!completion) throw new Error('Completion primitive not found');

            // For now, use the generateCustom with a mock-like provider that uses our completion primitive
            const mockProvider = {
                chat: async (messages: Array<{ role: string; content: string }>) => {
                    const prompt = messages.map(m => m.content).join('\n');
                    const result = await completion.execute({ prompt });
                    return { content: result.data.text };
                }
            };

            await stackScaffolder.generateCustom({
                projectName: 'new-vibe-project',
                projectType: 'fullstack',
                database: 'sqlite',
                auth: 'none',
                description
            }, mockProvider);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            console.log(chalk.red(`Scaffolding failed: ${message}`));
        }
    }

    private async handleDebug(args: string[]) {
        const target = args.join(' ') || process.cwd();
        console.log(chalk.blue(`🔍 Analyzing: ${target}...`));

        try {
            const result = errorAnalyzer.analyzeSourceFile(target);
            if (result.length === 0) {
                console.log(chalk.green('✅ No obvious issues found in source analysis.'));
            } else {
                result.forEach(err => console.log(errorAnalyzer.formatError(err)));
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            console.log(chalk.red(`Analysis failed: ${message}`));
        }
    }

    private async handleFix(args: string[]) {
        const issue = args.join(' ');
        if (!issue) {
            console.log(chalk.yellow('Usage: /fix <error message or description>'));
            return;
        }
        console.log(chalk.blue(`🛠️  Attempting to fix: "${issue}"...`));

        // Use planner to fix the issue
        const planner = this.primitiveMap.get('planning');
        if (planner) {
            const result = await planner.execute({ task: `Fix this issue: ${issue}` });
            if (result.success) {
                console.log(chalk.green('Plan generated for fix. Use natural language to proceed with execution.'));
                // Note: in a real implementation, we might want to auto-execute here or pass back to interactive
            }
        }
    }

    private async handleTest(args: string[]) {
        const file = args.join(' ');
        if (!file) {
            console.log(chalk.yellow('Usage: /test <file path>'));
            return;
        }
        console.log(chalk.blue(`🧪 Generating tests for: ${file}...`));
        // Logic to generate tests using LLM
        const completion = this.primitiveMap.get('completion');
        if (completion) {
            const result = await completion.execute({
                prompt: `Generate unit tests for this file: ${file}. Use Vitest.`
            });
            if (result.success) {
                console.log(chalk.green('Tests generated.'));
            }
        }
    }

    private async handleDocs(args: string[]) {
        const file = args.join(' ');
        if (!file) {
            console.log(chalk.yellow('Usage: /docs <file path>'));
            return;
        }
        console.log(chalk.blue(`📚 Generating documentation for: ${file}...`));
        const completion = this.primitiveMap.get('completion');
        if (completion) {
            const result = await completion.execute({
                prompt: `Explain the code in ${file} and generate markdown documentation.`
            });
            if (result.success) {
                console.log(chalk.white(result.data.text));
            }
        }
    }

    private async handleViz(args: string[]) {
        const dir = args.join(' ') || process.cwd();
        console.log(chalk.blue(`📊 Visualizing: ${dir}...`));
        const result = projectVisualizer.visualizeProject(dir, 'ascii');
        console.log(result.content);
    }

    private async handleMood(args: string[]) {
        console.log(vibeSentiment.analyze(process.cwd()));
    }

    private async handleCommit(args: string[]) {
        const completion = this.primitiveMap.get('completion') as CompletionPrimitive;
        const options: Record<string, string> = {};
        if (args.includes('-m')) options.message = args[args.indexOf('-m') + 1];
        await generateCommit([], { completion }, options);
    }

    private async handlePR(args: string[]) {
        const completion = this.primitiveMap.get('completion') as CompletionPrimitive;
        const options: Record<string, string> = {};
        if (args.includes('--base')) options.base = args[args.indexOf('--base') + 1];
        await generatePR([], { completion }, options);
    }

    private async handleReview(args: string[]) {
        const completion = this.primitiveMap.get('completion') as CompletionPrimitive;
        await reviewCode([], { completion }, {});
    }

    private async handleCheckpoint(args: string[]) {
        const { listCheckpoints, createCheckpoint, rollbackToCheckpoint } = require('../commands/checkpoint-commands');
        if (args[0] === 'create') {
            await createCheckpoint(args[1] || 'Manual Checkpoint');
        } else if (args[0] === 'rollback') {
            await rollbackToCheckpoint(args[1]);
        } else {
            listCheckpoints();
        }
    }

    private async handlePlugin(args: string[]) {
        const { listPlugins, installPlugin, uninstallPlugin, togglePlugin } = require('../commands/plugin');
        const subcommand = args[0];
        const nameOrPath = args[1];

        switch (subcommand) {
            case 'list':
                listPlugins();
                break;
            case 'search':
                const { searchPlugins } = require('../commands/plugin');
                await searchPlugins();
                break;
            case 'install':
                // For TUI, we'll pass a mock program or simplified install
                await installPlugin(nameOrPath, {} as Record<string, unknown>);
                break;
            case 'uninstall':
                uninstallPlugin(nameOrPath);
                break;
            case 'enable':
                togglePlugin(nameOrPath, true);
                break;
            case 'disable':
                togglePlugin(nameOrPath, false);
                break;
            default:
                listPlugins();
        }
    }

    private async handleConfig(args: string[]) {
        const router = new VibeProviderRouter();
        const manager = new VibeConfigManager(router);
        await manager.runFirstTimeSetup();
    }
}
