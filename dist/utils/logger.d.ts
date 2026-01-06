/**
 * VIBE-CLI v12 - Logger Utility
 * Production-grade logging with levels and formatting
 */
export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4
}
export declare class Logger {
    private static instance;
    private level;
    private moduleName;
    private silent;
    private constructor();
    static getInstance(): Logger;
    setLevel(level: LogLevel | string): void;
    setModuleName(name: string): void;
    enable(): void;
    disable(): void;
    debug(message: string, data?: Record<string, any>): void;
    info(message: string, data?: Record<string, any>): void;
    warn(message: string, data?: Record<string, any>): void;
    error(message: string, data?: Record<string, any>): void;
    private log;
    private format;
    /**
     * Create a child logger with a specific module name
     */
    child(moduleName: string): Logger;
    /**
     * Time a function execution
     */
    time<T>(label: string, fn: () => Promise<T>): Promise<T>;
    /**
     * Time a synchronous function execution
     */
    timeSync<T>(label: string, fn: () => T): T;
}
export declare const logger: Logger;
/**
 * Create a logger for a specific module
 */
export declare function createLogger(moduleName: string): Logger;
//# sourceMappingURL=logger.d.ts.map