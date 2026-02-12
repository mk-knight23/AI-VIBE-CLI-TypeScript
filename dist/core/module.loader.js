/**
 * VIBE-CLI v0.0.1 - Module Loader
 * Loads and manages VIBE modules
 */
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { BaseModule } from '../modules/base.module.js';
export class ModuleLoader {
    modules = new Map();
    modulesDir;
    loadedCount = 0;
    failedCount = 0;
    constructor(modulesDir) {
        this.modulesDir = modulesDir || path.join(process.cwd(), 'src', 'modules');
    }
    /**
     * Load all modules from the modules directory
     */
    async loadAll() {
        this.modules.clear();
        this.loadedCount = 0;
        this.failedCount = 0;
        console.log(chalk.cyan('\n─── Loading Modules ───\n'));
        // Check if modules directory exists
        if (!fs.existsSync(this.modulesDir)) {
            console.log(chalk.yellow(`Modules directory not found: ${this.modulesDir}`));
            console.log(chalk.gray('  Running with core functionality only.\n'));
            return this.modules;
        }
        // Get all subdirectories
        const entries = fs.readdirSync(this.modulesDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) {
                continue;
            }
            const moduleName = entry.name;
            const modulePath = path.join(this.modulesDir, moduleName);
            await this.loadModule(moduleName, modulePath);
        }
        // Summary
        console.log(chalk.cyan('\n─── Module Load Summary ───\n'));
        console.log(chalk.green(`  ✓ Loaded: ${this.loadedCount}`));
        if (this.failedCount > 0) {
            console.log(chalk.red(`  ✗ Failed: ${this.failedCount}`));
        }
        console.log(chalk.gray(`  Total: ${this.modules.size} modules\n`));
        return this.modules;
    }
    /**
     * Load a single module
     */
    async loadModule(name, modulePath) {
        try {
            // Try index.ts first, then index.js
            let indexPath = null;
            const tsPath = path.join(modulePath, 'index.ts');
            const jsPath = path.join(modulePath, 'index.js');
            if (fs.existsSync(tsPath)) {
                indexPath = tsPath;
            }
            else if (fs.existsSync(jsPath)) {
                indexPath = jsPath;
            }
            if (!indexPath) {
                this.logSkip(name, 'No index.ts or index.js found');
                return;
            }
            // Clear require cache if reloading
            const requirePath = indexPath.replace(/\.ts$/, '').replace(/\\/g, '/');
            const cached = require.cache[require.resolve(requirePath)];
            if (cached) {
                delete require.cache[require.resolve(requirePath)];
            }
            // Dynamic import
            const moduleExports = await import(requirePath);
            // Get the module class (default export or named export)
            const ModuleClass = moduleExports.default || moduleExports[name.charAt(0).toUpperCase() + name.slice(1) + 'Module'] || moduleExports[name];
            if (!ModuleClass) {
                this.logSkip(name, 'No module class found in exports');
                return;
            }
            // Instantiate module
            const module = new ModuleClass();
            if (!(module instanceof BaseModule)) {
                this.logSkip(name, 'Module does not extend BaseModule');
                return;
            }
            // Register module
            this.modules.set(name, module);
            this.loadedCount++;
            console.log(`  ${chalk.green('✓')} ${chalk.white(name.padEnd(20))} v${module.getVersion()}`);
        }
        catch (error) {
            this.failedCount++;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.log(`  ${chalk.red('✗')} ${chalk.white(name.padEnd(20))} - ${chalk.red(errorMessage)}`);
        }
    }
    /**
     * Log module skip
     */
    logSkip(name, reason) {
        console.log(`  ${chalk.gray('○')} ${chalk.white(name.padEnd(20))} - ${chalk.gray(reason)}`);
    }
    /**
     * Get a specific module by name
     */
    getModule(name) {
        return this.modules.get(name);
    }
    /**
     * Check if a module is loaded
     */
    hasModule(name) {
        return this.modules.has(name);
    }
    /**
     * List all loaded modules
     */
    listModules() {
        const list = [];
        for (const [name, module] of this.modules) {
            list.push({
                name,
                version: module.getVersion(),
                description: module.getDescription(),
            });
        }
        return list;
    }
    /**
     * Get all modules as a map
     */
    getAllModules() {
        return new Map(this.modules);
    }
    /**
     * Get module names
     */
    getModuleNames() {
        return Array.from(this.modules.keys());
    }
    /**
     * Get load statistics
     */
    getStats() {
        return {
            total: this.loadedCount + this.failedCount,
            loaded: this.loadedCount,
            failed: this.failedCount,
        };
    }
    /**
     * Execute a module by name
     */
    async execute(name, params) {
        const module = this.getModule(name);
        if (!module) {
            return {
                success: false,
                error: `Module '${name}' not found`,
            };
        }
        try {
            const result = await module.execute(params);
            return result;
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Unload all modules (for testing)
     */
    unloadAll() {
        this.modules.clear();
        this.loadedCount = 0;
        this.failedCount = 0;
    }
}
//# sourceMappingURL=module.loader.js.map