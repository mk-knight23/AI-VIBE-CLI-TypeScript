/**
 * VIBE-CLI v12 - Base Module Class
 * All modules extend this class for consistency
 */

import chalk from 'chalk';

export interface ModuleInfo {
  name: string;
  version: string;
  description: string;
}

export interface ModuleResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    tokens?: number;
    duration?: number;
    model?: string;
  };
}

export abstract class BaseModule {
  protected readonly name: string;
  protected readonly version: string;
  protected readonly description: string;

  constructor(info: ModuleInfo) {
    this.name = info.name;
    this.version = info.version;
    this.description = info.description;
  }

  /**
   * Execute the module with given parameters
   */
  abstract execute(params: Record<string, any>): Promise<ModuleResult>;

  /**
   * Get module name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get module version
   */
  getVersion(): string {
    return this.version;
  }

  /**
   * Get module description
   */
  getDescription(): string {
    return this.description;
  }

  /**
   * Get module info
   */
  getInfo(): ModuleInfo {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
    };
  }

  /**
   * Log info message
   */
  protected logInfo(message: string): void {
    console.log(chalk.cyan(`[${this.name}]`) + chalk.white(` ${message}`));
  }

  /**
   * Log success message
   */
  protected logSuccess(message: string): void {
    console.log(chalk.cyan(`[${this.name}]`) + chalk.green(` ✓ ${message}`));
  }

  /**
   * Log error message
   */
  protected logError(message: string, error?: any): void {
    console.error(chalk.cyan(`[${this.name}]`) + chalk.red(` ✗ ${message}`));
    if (error) {
      console.error(chalk.gray(`  Error: ${error instanceof Error ? error.message : error}`));
    }
  }

  /**
   * Log warning message
   */
  protected logWarning(message: string): void {
    console.log(chalk.cyan(`[${this.name}]`) + chalk.yellow(` ⚠ ${message}`));
  }

  /**
   * Create a successful result
   */
  protected success(data: any, metadata?: ModuleResult['metadata']): ModuleResult {
    return {
      success: true,
      data,
      metadata,
    };
  }

  /**
   * Create a failure result
   */
  protected failure(error: string): ModuleResult {
    return {
      success: false,
      error,
    };
  }

  /**
   * Validate required parameters
   */
  protected validateParams(params: Record<string, any>, required: string[]): boolean {
    for (const key of required) {
      if (params[key] === undefined || params[key] === null || params[key] === '') {
        this.logError(`Missing required parameter: ${key}`);
        return false;
      }
    }
    return true;
  }
}
