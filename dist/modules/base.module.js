/**
 * VIBE-CLI v0.0.1 - Base Module Class
 * All modules extend this class for consistency
 */
import chalk from 'chalk';
export class BaseModule {
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
        console.log(chalk.cyan(`[${this.name}]`) + chalk.white(` ${message}`));
    }
    /**
     * Log success message
     */
    logSuccess(message) {
        console.log(chalk.cyan(`[${this.name}]`) + chalk.green(` ✓ ${message}`));
    }
    /**
     * Log error message
     */
    logError(message, error) {
        console.error(chalk.cyan(`[${this.name}]`) + chalk.red(` ✗ ${message}`));
        if (error) {
            console.error(chalk.gray(`  Error: ${error instanceof Error ? error.message : error}`));
        }
    }
    /**
     * Log warning message
     */
    logWarning(message) {
        console.log(chalk.cyan(`[${this.name}]`) + chalk.yellow(` ⚠ ${message}`));
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
//# sourceMappingURL=base.module.js.map