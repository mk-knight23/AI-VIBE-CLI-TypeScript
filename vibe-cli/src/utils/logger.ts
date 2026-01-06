/**
 * VIBE-CLI v12 - Logger Utility
 * Production-grade logging with levels and formatting
 */

import chalk from 'chalk';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  module?: string;
  data?: Record<string, any>;
}

export class Logger {
  private static instance: Logger;
  private level: LogLevel = LogLevel.INFO;
  private moduleName: string = 'VIBE';
  private silent: boolean = false;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLevel(level: LogLevel | string): void {
    if (typeof level === 'string') {
      const upper = level.toUpperCase();
      this.level = (LogLevel as any)[upper] || LogLevel.INFO;
    } else {
      this.level = level;
    }
  }

  setModuleName(name: string): void {
    this.moduleName = name;
  }

  enable(): void {
    this.silent = false;
  }

  disable(): void {
    this.silent = true;
  }

  debug(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, data);
  }

  private log(level: LogLevel, message: string, data?: Record<string, any>): void {
    if (this.silent || level < this.level) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      module: this.moduleName,
      data,
    };

    const formatted = this.format(entry);
    switch (level) {
      case LogLevel.DEBUG:
        console.log(chalk.gray(formatted));
        break;
      case LogLevel.INFO:
        console.log(chalk.cyan(formatted));
        break;
      case LogLevel.WARN:
        console.log(chalk.yellow(formatted));
        break;
      case LogLevel.ERROR:
        console.error(chalk.red(formatted));
        break;
    }
  }

  private format(entry: LogEntry): string {
    const time = entry.timestamp.toISOString().split('T')[1].slice(0, -1);
    const module = entry.module ? `[${entry.module}]` : '';
    const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
    return `${time} ${module} ${entry.message}${dataStr}`;
  }

  /**
   * Create a child logger with a specific module name
   */
  child(moduleName: string): Logger {
    const child = new Logger();
    child.level = this.level;
    child.moduleName = moduleName;
    child.silent = this.silent;
    return child;
  }

  /**
   * Time a function execution
   */
  async time<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      return await fn();
    } finally {
      const duration = Date.now() - start;
      this.debug(`${label} took ${duration}ms`);
    }
  }

  /**
   * Time a synchronous function execution
   */
  timeSync<T>(label: string, fn: () => T): T {
    const start = Date.now();
    try {
      return fn();
    } finally {
      const duration = Date.now() - start;
      this.debug(`${label} took ${duration}ms`);
    }
  }
}

export const logger = Logger.getInstance();

/**
 * Create a logger for a specific module
 */
export function createLogger(moduleName: string): Logger {
  return logger.child(moduleName);
}
