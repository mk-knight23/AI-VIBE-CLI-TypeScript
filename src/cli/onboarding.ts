/**
 * VIBE CLI Interactive Onboarding Wizard
 * First-time user setup and configuration
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { configManager } from '../core/config-system.js';
import { themeManager, ThemeName } from '../utils/theme-manager.js';

export interface OnboardingAnswers {
    welcome: boolean;
    apiKey: string;
    provider: 'anthropic' | 'openai' | 'minimax';
    theme: ThemeName;
    enableTelemetry: boolean;
    enableAutoSave: boolean;
    enableSpellcheck: boolean;
    defaultEditor: string;
    completionStyle: 'brief' | 'detailed';
}

export class OnboardingWizard {
    async start(): Promise<OnboardingAnswers | null> {
        const config = configManager.getConfig();

        if (config.onboardingComplete) {
            return null;
        }

        console.log(chalk.cyan('\n🚀 Welcome to VIBE CLI!')); // eslint-disable-line no-console
        console.log(chalk.gray("Let's get you set up in just a few steps.\n")); // eslint-disable-line no-console

        const answers = await this.runQuestions();

        this.applyConfiguration(answers);

        config.onboardingComplete = true;
        configManager.saveConfig(config);

        console.log(chalk.green('\n✨ Setup complete! You\'re ready to start coding.\n')); // eslint-disable-line no-console

        return answers;
    }

    private async runQuestions(): Promise<OnboardingAnswers> {
        const answers = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'welcome',
                message: 'Ready to configure VIBE for your development workflow?',
                default: true,
            },
            {
                type: 'password',
                name: 'apiKey',
                message: 'Enter your API key (leave empty to configure later):',
                mask: '*',
            },
            {
                type: 'list',
                name: 'provider',
                message: 'Which AI provider would you like to use?',
                choices: [
                    { name: 'Anthropic (Claude)', value: 'anthropic' },
                    { name: 'OpenAI (GPT-4)', value: 'openai' },
                    { name: 'MiniMax', value: 'minimax' },
                ],
                default: 'anthropic',
            },
            {
                type: 'list',
                name: 'theme',
                message: 'Choose a color theme for the CLI:',
                choices: [
                    { name: '🌙 Dark (default)', value: 'dark' },
                    { name: '☀️ Light', value: 'light' },
                    { name: '🧛 Dracula', value: 'dracula' },
                    { name: '❄️ Nord', value: 'nord' },
                    { name: '🐙 GitHub', value: 'github' },
                ],
                default: 'dark',
            },
            {
                type: 'confirm',
                name: 'enableTelemetry',
                message: 'Help improve VIBE by sending anonymous usage data?',
                default: false,
            },
            {
                type: 'confirm',
                name: 'enableAutoSave',
                message: 'Enable automatic session save and restore?',
                default: true,
            },
            {
                type: 'confirm',
                name: 'enableSpellcheck',
                message: 'Enable spellcheck for your queries?',
                default: true,
            },
            {
                type: 'input',
                name: 'defaultEditor',
                message: 'What\'s your preferred code editor?',
                default: 'code',
                validate: (input: string) => {
                    if (input.trim().length > 0) return true;
                    return 'Please enter an editor name';
                },
            },
            {
                type: 'list',
                name: 'completionStyle',
                message: 'How detailed should AI completions be?',
                choices: [
                    { name: 'Brief (faster responses)', value: 'brief' },
                    { name: 'Detailed (more context)', value: 'detailed' },
                ],
                default: 'brief',
            },
        ] as any);

        return answers as OnboardingAnswers;
    }

    private applyConfiguration(answers: OnboardingAnswers): void {
        const config = configManager.getConfig();

        if (answers.apiKey) {
            config.apiKey = answers.apiKey;
        }

        config.provider = answers.provider;
        config.theme = answers.theme;
        config.telemetry = answers.enableTelemetry;
        config.autoSave = answers.enableAutoSave;
        config.spellcheck = answers.enableSpellcheck;
        config.editor = answers.defaultEditor;
        config.completionStyle = answers.completionStyle;

        themeManager.setTheme(answers.theme);
    }

    async showTips(): Promise<void> {
        console.log(chalk.cyan('\n💡 Quick Tips:')); // eslint-disable-line no-console
        console.log('  • Type naturally - VIBE understands intent'); // eslint-disable-line no-console
        console.log('  • Use /help to see available commands'); // eslint-disable-line no-console
        console.log('  • Use /undo to revert changes'); // eslint-disable-line no-console
        console.log('  • Press Ctrl+C to cancel anytime\n'); // eslint-disable-line no-console

        const { prompt } = await inquirer.prompt({
            type: 'confirm',
            name: 'prompt',
            message: 'Ready to start?',
            default: true,
        });

        if (!prompt) {
            process.exit(0);
        }
    }

    isOnboardingComplete(): boolean {
        const config = configManager.getConfig();
        return config.onboardingComplete ?? false;
    }

    resetOnboarding(): void {
        const config = configManager.getConfig();
        config.onboardingComplete = false;
        configManager.saveConfig(config);
    }
}

export const onboardingWizard = new OnboardingWizard();

export async function runOnboarding(): Promise<OnboardingAnswers | null> {
    return onboardingWizard.start();
}
