/**
 * VIBE CLI - Publish Command
 * Handles uploading plugins and templates to the marketplace
 */

import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import axios from 'axios';
import { createLogger } from '../utils/pino-logger.js';

const logger = createLogger('publish-command');
const API_URL = 'http://localhost:3000/api';

export async function publishItem(itemPath: string) {
    try {
        const absolutePath = path.resolve(itemPath);
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`Path does not exist: ${absolutePath}`);
        }

        const stats = fs.statSync(absolutePath);
        if (!stats.isDirectory()) {
            throw new Error(`Path is not a directory: ${absolutePath}`);
        }

        // Validate manifest
        const manifestPath = path.join(absolutePath, 'vibe-plugin.json');
        const templatePath = path.join(absolutePath, 'vibe-template.json');

        let type = '';
        let manifest: any = null;

        if (fs.existsSync(manifestPath)) {
            type = 'plugin';
            manifest = await fs.readJson(manifestPath);
        } else if (fs.existsSync(templatePath)) {
            type = 'template';
            manifest = await fs.readJson(templatePath);
        } else {
            throw new Error('No vibe-plugin.json or vibe-template.json found in the directory.');
        }

        console.log(chalk.blue(`\n🚀 Preparing to publish ${type}: "${chalk.bold(manifest.name)}"...`));
        console.log(chalk.gray(`   Version: ${manifest.version}`));

        // Simulation for MVP: In a real system, we'd zip the folder
        // For now, we'll send the manifest to the server
        const response = await axios.post(`${API_URL}/marketplace/publish`, {
            type,
            manifest,
            timestamp: new Date().toISOString()
        });

        if (response.data.success) {
            console.log(chalk.green(`\n✅ Successfully published to the marketplace!`));
            console.log(chalk.cyan(`   View it at: ${response.data.url || 'http://vibe.dev/marketplace'}`));
        } else {
            throw new Error(response.data.error || 'Server rejected the publication.');
        }

    } catch (error: any) {
        console.log(chalk.red(`\n❌ Publication failed: ${error.message}`));
        logger.error({ error }, 'Publish failed');
    }
}
