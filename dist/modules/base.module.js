"use strict";
/**
 * VIBE-CLI v12 - Base Module Class
 * All modules extend this class for consistency
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseModule = void 0;
const chalk_1 = __importDefault(require("chalk"));
class BaseModule {
    name;
    version;
    description;
    constructor(info) {
        this.name = info.name;
        this.version = info.version;
        this.description = info.description;
    }
    /**
     * Get module name
     */
    getName() {
        return this.name;
    }
    /**
     * Get module version
     */
    getVersion() {
        return this.version;
    }
    /**
     * Get module description
     */
    getDescription() {
        return this.description;
    }
    /**
     * Get module info
     */
    getInfo() {
        return {
            name: this.name,
            version: this.version,
            description: this.description,
        };
    }
    /**
     * Log info message
     */
    logInfo(message) {
        console.log(chalk_1.default.cyan(`[${this.name}]`) + chalk_1.default.white(` ${message}`));
    }
    /**
     * Log success message
     */
    logSuccess(message) {
        console.log(chalk_1.default.cyan(`[${this.name}]`) + chalk_1.default.green(` ✓ ${message}`));
    }
    /**
     * Log error message
     */
    logError(message, error) {
        console.error(chalk_1.default.cyan(`[${this.name}]`) + chalk_1.default.red(` ✗ ${message}`));
        if (error) {
            console.error(chalk_1.default.gray(`  Error: ${error instanceof Error ? error.message : error}`));
        }
    }
    /**
     * Log warning message
     */
    logWarning(message) {
        console.log(chalk_1.default.cyan(`[${this.name}]`) + chalk_1.default.yellow(` ⚠ ${message}`));
    }
    /**
     * Create a successful result
     */
    success(data, metadata) {
        return {
            success: true,
            data,
            metadata,
        };
    }
    /**
     * Create a failure result
     */
    failure(error) {
        return {
            success: false,
            error,
        };
    }
    /**
     * Validate required parameters
     */
    validateParams(params, required) {
        for (const key of required) {
            if (params[key] === undefined || params[key] === null || params[key] === '') {
                this.logError(`Missing required parameter: ${key}`);
                return false;
            }
        }
        return true;
    }
}
exports.BaseModule = BaseModule;
//# sourceMappingURL=base.module.js.map