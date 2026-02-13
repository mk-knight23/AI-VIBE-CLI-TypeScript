/**
 * VIBE CLI Progress Spinner & Status Display
 * Spinners, progress bars, and status indicators for long-running operations
 */

import chalk from 'chalk';

export type SpinnerType = 'dots' | 'line' | 'star' | 'box' | 'arrow' | 'bouncing' | 'weather';

const spinners: Record<SpinnerType, string[]> = {
    dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    line: ['-', '\\', '|', '/'],
    star: ['⋆', '⋇', '⋈', '★', '☆'],
    box: ['▖', '▘', '▝', '▗'],
    arrow: ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙'],
    bouncing: ['⠁', '⠂', '⠄', '⠂'],
    weather: ['☀', '☁', '☂', '❄'],
};

export interface ProgressBarOptions {
    width?: number;
    completeChar?: string;
    incompleteChar?: string;
    total?: number;
    format?: string;
}

export interface SpinnerOptions {
    type?: SpinnerType;
    color?: string;
    interval?: number;
    stream?: NodeJS.WriteStream;
}

export class ProgressSpinner {
    private frames: string[];
    private frameIndex: number;
    private interval: NodeJS.Timeout | null = null;
    private text: string;
    private color: string;
    private stream: NodeJS.WriteStream;
    private running: boolean = false;

    constructor(text: string = 'Processing...', options: SpinnerOptions = {}) {
        this.frames = spinners[options.type || 'dots'];
        this.frameIndex = 0;
        this.text = text;
        this.color = options.color || 'blue';
        this.stream = options.stream || process.stderr;
        if (options.interval) {
            this.interval = setInterval(() => this.tick(), options.interval);
        }
    }

    start(): this {
        this.running = true;
        // Optimized interval: 120ms = ~8 FPS (reduced from 80ms = 12.5 FPS)
        this.interval = this.interval || setInterval(() => this.tick(), 120);
        this.tick();
        return this;
    }

    tick(): void {
        const frame = this.frames[this.frameIndex];
        const coloredFrame = this.applyColor(frame);
        const output = `\r${coloredFrame} ${this.text}`;
        this.stream.write(output);
        this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    }

    update(text: string): void {
        this.text = text;
        this.tick();
    }

    succeed(message: string = 'Done!'): void {
        this.stop();
        console.log(`${chalk.green('✔')} ${message}`); // eslint-disable-line no-console
    }

    fail(message: string = 'Failed!'): void {
        this.stop();
        console.log(`${chalk.red('✖')} ${message}`); // eslint-disable-line no-console
    }

    warn(message: string): void {
        this.stop();
        console.log(`${chalk.yellow('⚠')} ${message}`); // eslint-disable-line no-console
    }

    info(message: string): void {
        this.stop();
        console.log(`${chalk.blue('ℹ')} ${message}`); // eslint-disable-line no-console
    }

    stop(): void {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.running = false;
        this.stream.write('\r\x1b[K');
    }

    private applyColor(frame: string): string {
        const colors: Record<string, (s: string) => string> = {
            blue: chalk.blue,
            green: chalk.green,
            yellow: chalk.yellow,
            red: chalk.red,
            cyan: chalk.cyan,
            magenta: chalk.magenta,
            white: chalk.white,
        };
        return (colors[this.color] || chalk.white)(frame);
    }

    isRunning(): boolean {
        return this.running;
    }
}

export class ProgressBar {
    private current: number;
    private total: number;
    private width: number;
    private completeChar: string;
    private incompleteChar: string;
    private format: string;

    constructor(options: ProgressBarOptions = {}) {
        this.current = 0;
        this.total = options.total || 100;
        this.width = options.width || 40;
        this.completeChar = options.completeChar || '█';
        this.incompleteChar = options.incompleteChar || '░';
        this.format = options.format || '[{bar}] {current}/{total} {percent}% {task}';
    }

    setTotal(total: number): void {
        this.total = total;
    }

    update(current: number, task?: string): void {
        this.current = Math.min(current, this.total);
        this.render(task);
    }

    increment(task?: string): void {
        this.update(this.current + 1, task);
    }

    render(task?: string): void {
        const percent = this.current / this.total;
        const completeWidth = Math.floor(this.width * percent);
        const incompleteWidth = this.width - completeWidth;

        const complete = this.completeChar.repeat(Math.max(0, completeWidth));
        const incomplete = this.incompleteChar.repeat(Math.max(0, incompleteWidth));

        const output = this.format
            .replace('{bar}', `${chalk.green(complete)}${chalk.gray(incomplete)}`)
            .replace('{current}', this.current.toString())
            .replace('{total}', this.total.toString())
            .replace('{percent}', (percent * 100).toFixed(0))
            .replace('{task}', task || '');

        process.stdout.write(`\r${output}`);
    }

    stop(): void {
        console.log(''); // eslint-disable-line no-console
    }
}

export class StatusIndicator {
    private static icons = {
        success: '✔',
        error: '✖',
        warning: '⚠',
        info: 'ℹ',
        pending: '○',
        loading: '◐',
        skipped: '⊘',
    };

    static success(message: string, prefix: string = ''): void {
        console.log(`${prefix}${chalk.green(this.icons.success)} ${message}`); // eslint-disable-line no-console
    }

    static error(message: string, prefix: string = ''): void {
        console.log(`${prefix}${chalk.red(this.icons.error)} ${message}`); // eslint-disable-line no-console
    }

    static warning(message: string, prefix: string = ''): void {
        console.log(`${prefix}${chalk.yellow(this.icons.warning)} ${message}`); // eslint-disable-line no-console
    }

    static info(message: string, prefix: string = ''): void {
        console.log(`${prefix}${chalk.blue(this.icons.info)} ${message}`); // eslint-disable-line no-console
    }

    static pending(message: string, prefix: string = ''): void {
        console.log(`${prefix}${chalk.gray(this.icons.pending)} ${message}`); // eslint-disable-line no-console
    }

    static loading(message: string): void {
        console.log(`${chalk.cyan(this.icons.loading)} ${message}`); // eslint-disable-line no-console
    }

    static skipped(message: string, prefix: string = ''): void {
        console.log(`${prefix}${chalk.gray(this.icons.skipped)} ${message}`); // eslint-disable-line no-console
    }
}

export function createSpinner(text: string, type?: SpinnerType): ProgressSpinner {
    return new ProgressSpinner(text, { type });
}

export function createProgressBar(options?: ProgressBarOptions): ProgressBar {
    return new ProgressBar(options);
}

export const status = StatusIndicator;
