import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    FATAL = 4,
}

export class Logger {
    private component: string;
    private logFile: string;
    private minLevel: LogLevel;
    private isJson: boolean = false;

    constructor(component: string, minLevel: LogLevel = LogLevel.INFO) {
        this.component = component;
        this.minLevel = minLevel;
        this.logFile = path.join(process.cwd(), '.vibe', 'vibe.log');
        this.isJson = process.env.VIBE_LOG_FORMAT === 'json';

        // Ensure logs directory exists
        const dir = path.dirname(this.logFile);
        if (!fs.existsSync(dir)) {
            try {
                fs.mkdirSync(dir, { recursive: true });
            } catch (err) { }
        }
    }

    public setLevel(level: LogLevel): void {
        this.minLevel = level;
    }

    public setJsonMode(enabled: boolean): void {
        this.isJson = enabled;
    }

    private formatMessage(level: string, message: string): string {
        const timestamp = new Date().toISOString();
        if (this.isJson) {
            return JSON.stringify({ timestamp, level, component: this.component, message });
        }
        return `[${timestamp}] [${level}] [${this.component}] ${message}`;
    }

    private writeToFile(message: string): void {
        try {
            fs.appendFileSync(this.logFile, message + '\n');
        } catch (err) {
            // Ignore write errors to stay resilient
        }
    }

    public debug(message: string): void {
        if (this.minLevel <= LogLevel.DEBUG) {
            const formatted = this.formatMessage('DEBUG', message);
            console.debug(chalk.gray(formatted));
            this.writeToFile(formatted);
        }
    }

    public info(message: string): void {
        if (this.minLevel <= LogLevel.INFO) {
            const formatted = this.formatMessage('INFO', message);
            console.info(chalk.blue(formatted));
            this.writeToFile(formatted);
        }
    }

    public warn(message: string): void {
        if (this.minLevel <= LogLevel.WARN) {
            const formatted = this.formatMessage('WARN', message);
            console.warn(chalk.yellow(formatted));
            this.writeToFile(formatted);
        }
    }

    public error(message: string, error?: Error): void {
        if (this.minLevel <= LogLevel.ERROR) {
            const formatted = this.formatMessage('ERROR', message + (error ? `: ${error.message}` : ''));
            console.error(chalk.red(formatted));
            if (error?.stack) {
                this.writeToFile(error.stack);
            }
            this.writeToFile(formatted);
        }
    }

    public success(message: string): void {
        const formatted = this.formatMessage('SUCCESS', message);
        console.log(chalk.green('✔ ' + formatted));
        this.writeToFile(formatted);
    }
}

export const logger = new Logger('System');
