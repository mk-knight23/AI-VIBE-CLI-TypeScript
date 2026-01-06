"use strict";
/**
 * VIBE-CLI v12 - Logger Utility
 * Production-grade logging with levels and formatting
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = exports.LogLevel = void 0;
exports.createLogger = createLogger;
const chalk_1 = __importDefault(require("chalk"));
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["NONE"] = 4] = "NONE";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    static instance;
    level = LogLevel.INFO;
    moduleName = 'VIBE';
    silent = false;
    constructor() { }
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    setLevel(level) {
        if (typeof level === 'string') {
            const upper = level.toUpperCase();
            this.level = LogLevel[upper] || LogLevel.INFO;
        }
        else {
            this.level = level;
        }
    }
    setModuleName(name) {
        this.moduleName = name;
    }
    enable() {
        this.silent = false;
    }
    disable() {
        this.silent = true;
    }
    debug(message, data) {
        this.log(LogLevel.DEBUG, message, data);
    }
    info(message, data) {
        this.log(LogLevel.INFO, message, data);
    }
    warn(message, data) {
        this.log(LogLevel.WARN, message, data);
    }
    error(message, data) {
        this.log(LogLevel.ERROR, message, data);
    }
    log(level, message, data) {
        if (this.silent || level < this.level)
            return;
        const entry = {
            level,
            message,
            timestamp: new Date(),
            module: this.moduleName,
            data,
        };
        const formatted = this.format(entry);
        switch (level) {
            case LogLevel.DEBUG:
                console.log(chalk_1.default.gray(formatted));
                break;
            case LogLevel.INFO:
                console.log(chalk_1.default.cyan(formatted));
                break;
            case LogLevel.WARN:
                console.log(chalk_1.default.yellow(formatted));
                break;
            case LogLevel.ERROR:
                console.error(chalk_1.default.red(formatted));
                break;
        }
    }
    format(entry) {
        const time = entry.timestamp.toISOString().split('T')[1].slice(0, -1);
        const module = entry.module ? `[${entry.module}]` : '';
        const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
        return `${time} ${module} ${entry.message}${dataStr}`;
    }
    /**
     * Create a child logger with a specific module name
     */
    child(moduleName) {
        const child = new Logger();
        child.level = this.level;
        child.moduleName = moduleName;
        child.silent = this.silent;
        return child;
    }
    /**
     * Time a function execution
     */
    async time(label, fn) {
        const start = Date.now();
        try {
            return await fn();
        }
        finally {
            const duration = Date.now() - start;
            this.debug(`${label} took ${duration}ms`);
        }
    }
    /**
     * Time a synchronous function execution
     */
    timeSync(label, fn) {
        const start = Date.now();
        try {
            return fn();
        }
        finally {
            const duration = Date.now() - start;
            this.debug(`${label} took ${duration}ms`);
        }
    }
}
exports.Logger = Logger;
exports.logger = Logger.getInstance();
/**
 * Create a logger for a specific module
 */
function createLogger(moduleName) {
    return exports.logger.child(moduleName);
}
//# sourceMappingURL=logger.js.map