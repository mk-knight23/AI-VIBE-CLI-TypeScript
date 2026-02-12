/**
 * VIBE CLI - Progress Manager
 * Handles spinners, progress bars, and multi-step progress
 */

import ora, { Ora, Spinner } from 'ora';
import cliProgress, { SingleBar, MultiBar } from 'cli-progress';
import chalk from 'chalk';
import { createLogger } from '../utils/pino-logger.js';

const logger = createLogger('progress');

export type SpinnerType = 'dots' | 'line' | 'arc';

// Valid ora spinner names
const SPINNER_NAMES: Record<SpinnerType, string> = {
    dots: 'dots',
    line: 'line',
    arc: 'arc',
};

export interface SpinnerOptions {
    text?: string;
    type?: SpinnerType;
    color?: 'green' | 'blue' | 'yellow' | 'red' | 'cyan';
}

export interface ProgressBarOptions {
    total: number;
    title?: string;
    format?: string;
}

export interface MultiStepProgress {
    currentStep: number;
    totalSteps: number;
    stepName: string;
}

/**
 * Progress Manager class
 * Manages spinners and progress bars for CLI operations
 */
export class ProgressManager {
    private spinner: Ora | null = null;
    private progressBar: SingleBar | null = null;
    private multiBar: MultiBar | null = null;
    private isEnabled: boolean = true;

    constructor(enabled: boolean = true) {
        this.isEnabled = enabled;
    }

    /**
     * Start a spinner
     */
    public startSpinner(options: SpinnerOptions = {}): Ora {
        if (!this.isEnabled) {
            return { text: options.text || '' } as Ora;
        }

        // Stop any existing spinner
        this.stopSpinner();

        const spinnerName = SPINNER_NAMES[options.type || 'dots'];
        const color = options.color || 'cyan';

        this.spinner = ora({
            text: options.text,
            spinner: spinnerName as any,
            color: color as any,
        }).start();

        logger.debug({ text: options.text }, 'Spinner started');
        return this.spinner;
    }

    /**
     * Update spinner text
     */
    public updateSpinnerText(text: string): void {
        if (this.spinner) {
            this.spinner.text = text;
        }
    }

    /**
     * Stop spinner with success
     */
    public succeedSpinner(text?: string): void {
        if (this.spinner) {
            this.spinner.succeed(text);
            this.spinner = null;
            logger.debug({ text }, 'Spinner succeeded');
        }
    }

    /**
     * Stop spinner with failure
     */
    public failSpinner(text?: string): void {
        if (this.spinner) {
            this.spinner.fail(text);
            this.spinner = null;
            logger.debug({ text }, 'Spinner failed');
        }
    }

    /**
     * Stop spinner with warning
     */
    public warnSpinner(text?: string): void {
        if (this.spinner) {
            this.spinner.warn(text);
            this.spinner = null;
        }
    }

    /**
     * Stop spinner without status
     */
    public stopSpinner(): void {
        if (this.spinner) {
            this.spinner.stop();
            this.spinner = null;
        }
    }

    /**
     * Create a progress bar
     */
    public createProgressBar(options: ProgressBarOptions): SingleBar {
        if (!this.isEnabled) {
            return {
                increment: () => {},
                update: () => {},
                stop: () => {},
            } as unknown as SingleBar;
        }

        // Stop any existing progress bar
        this.stopProgressBar();

        const format = options.format || this.getDefaultFormat(options.title);

        this.progressBar = new cliProgress.SingleBar({
            format,
            barCompleteChar: '█',
            barIncompleteChar: '░',
            hideCursor: true,
            clearOnComplete: false,
            stopOnComplete: true,
        });

        this.progressBar.start(options.total, 0);
        logger.debug({ total: options.total, title: options.title }, 'Progress bar started');

        return this.progressBar;
    }

    /**
     * Update progress bar
     */
    public updateProgress(current: number, payload?: Record<string, unknown>): void {
        if (this.progressBar) {
            this.progressBar.update(current, payload);
        }
    }

    /**
     * Increment progress bar
     */
    public incrementProgress(amount: number = 1, payload?: Record<string, unknown>): void {
        if (this.progressBar) {
            this.progressBar.increment(amount, payload);
        }
    }

    /**
     * Stop progress bar
     */
    public stopProgressBar(): void {
        if (this.progressBar) {
            this.progressBar.stop();
            this.progressBar = null;
            logger.debug('Progress bar stopped');
        }
    }

    /**
     * Create a multi-bar for parallel operations
     */
    public createMultiBar(): MultiBar {
        if (!this.isEnabled) {
            return {
                create: () => ({ increment: () => {}, stop: () => {} } as unknown as SingleBar),
                stop: () => {},
            } as unknown as MultiBar;
        }

        this.stopMultiBar();

        this.multiBar = new cliProgress.MultiBar({
            hideCursor: true,
            clearOnComplete: false,
            stopOnComplete: true,
        });

        return this.multiBar;
    }

    /**
     * Stop multi-bar
     */
    public stopMultiBar(): void {
        if (this.multiBar) {
            this.multiBar.stop();
            this.multiBar = null;
        }
    }

    /**
     * Display multi-step progress
     */
    public showMultiStepProgress(progress: MultiStepProgress): void {
        if (!this.isEnabled) return;

        const { currentStep, totalSteps, stepName } = progress;
        const percent = Math.round((currentStep / totalSteps) * 100);
        const filled = '█'.repeat(Math.round(percent / 10));
        const empty = '░'.repeat(10 - Math.round(percent / 10));

        console.log(chalk.cyan(`\n[${filled}${empty}] ${percent}% - Step ${currentStep}/${totalSteps}: ${stepName}\n`));
    }

    /**
     * Run a function with a spinner
     */
    public async withSpinner<T>(
        options: SpinnerOptions,
        fn: () => Promise<T>,
        successText?: string,
        errorText?: string
    ): Promise<T> {
        this.startSpinner(options);

        try {
            const result = await fn();
            this.succeedSpinner(successText);
            return result;
        } catch (error) {
            this.failSpinner(errorText);
            throw error;
        }
    }

    /**
     * Run a function with a progress bar
     */
    public async withProgressBar<T>(
        options: ProgressBarOptions,
        fn: (bar: SingleBar) => Promise<T>
    ): Promise<T> {
        const bar = this.createProgressBar(options);

        try {
            const result = await fn(bar);
            this.stopProgressBar();
            return result;
        } catch (error) {
            this.stopProgressBar();
            throw error;
        }
    }

    /**
     * Disable all progress indicators
     */
    public disable(): void {
        this.isEnabled = false;
        this.stopSpinner();
        this.stopProgressBar();
        this.stopMultiBar();
    }

    /**
     * Enable progress indicators
     */
    public enable(): void {
        this.isEnabled = true;
    }

    /**
     * Check if progress indicators are enabled
     */
    public isProgressEnabled(): boolean {
        return this.isEnabled;
    }

    /**
     * Get default format string
     */
    private getDefaultFormat(title?: string): string {
        const prefix = title ? `${chalk.cyan(title)} |` : '';
        return `${prefix}${chalk.cyan('{bar}')} {percentage}% | {value}/{total} | {duration_formatted}`;
    }
}

// Singleton instance
export const progressManager = new ProgressManager();

// Convenience exports
export function startSpinner(text?: string): Ora {
    return progressManager.startSpinner({ text });
}

export function stopSpinner(): void {
    progressManager.stopSpinner();
}

export function succeedSpinner(text?: string): void {
    progressManager.succeedSpinner(text);
}

export function failSpinner(text?: string): void {
    progressManager.failSpinner(text);
}
