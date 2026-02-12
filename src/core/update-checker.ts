/**
 * VIBE CLI - Update Checker
 * Checks for new versions of VIBE CLI
 */

import axios from 'axios';
import chalk from 'chalk';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as fs from 'fs';
import { createLogger } from '../utils/pino-logger.js';

const logger = createLogger('update-checker');

export class UpdateChecker {
    private currentVersion: string;
    private pkgName: string;

    constructor() {
        const __dirname = dirname(fileURLToPath(import.meta.url));
        const pkgPath = path.join(__dirname, '../../package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        this.currentVersion = pkg.version;
        this.pkgName = pkg.name;
    }

    /**
     * Check for updates
     */
    async checkForUpdates(): Promise<string | null> {
        try {
            logger.debug('Checking for updates...');

            // Check npm registry
            const response = await axios.get(`https://registry.npmjs.org/${this.pkgName}/latest`, {
                timeout: 2000 // Fast timeout to avoid blocking startup
            });

            const latestVersion = response.data.version;

            if (this.isNewer(latestVersion, this.currentVersion)) {
                return latestVersion;
            }

            return null;
        } catch (error) {
            // Fail silently for the user, but log for debug
            logger.debug({ error }, 'Failed to check for updates');
            return null;
        }
    }

    /**
     * Simple semver-ish comparison
     */
    private isNewer(latest: string, current: string): boolean {
        const l = latest.split('.').map(Number);
        const c = current.split('.').map(Number);

        for (let i = 0; i < 3; i++) {
            if (l[i] > c[i]) return true;
            if (l[i] < c[i]) return false;
        }

        return false;
    }

    /**
     * Notify user if update is available
     */
    async notify() {
        const latest = await this.checkForUpdates();

        if (latest) {
            console.log(chalk.yellow(`\n🔔 A new version of VIBE CLI is available: ${chalk.bold(latest)} (current: ${this.currentVersion})`));
            console.log(chalk.gray(`   Run ${chalk.cyan('npm install -g ' + this.pkgName)} to update.\n`));
        }
    }
}

export const updateChecker = new UpdateChecker();
