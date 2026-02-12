/**
 * VIBE CLI - Plugin Registry
 * Manages the list of installed plugins
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import axios from 'axios';
import { createLogger } from '../../utils/pino-logger.js';
import { InstalledPlugin, PluginManifest } from '../../types/plugin.js';

const API_URL = 'http://localhost:3000/api';

const logger = createLogger('plugin-registry');

export class PluginRegistry {
    private pluginsDir: string;
    private registryPath: string;

    constructor() {
        this.pluginsDir = path.join(os.homedir(), '.vibe', 'plugins');
        this.registryPath = path.join(this.pluginsDir, 'registry.json');
        this.ensureDir();
    }

    private ensureDir() {
        if (!fs.existsSync(this.pluginsDir)) {
            fs.mkdirSync(this.pluginsDir, { recursive: true });
        }
        if (!fs.existsSync(this.registryPath)) {
            fs.writeFileSync(this.registryPath, JSON.stringify([], null, 2));
        }
    }

    /**
     * List all installed plugins
     */
    listPlugins(): InstalledPlugin[] {
        try {
            const data = fs.readFileSync(this.registryPath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            logger.error({ error }, 'Failed to read plugin registry');
            return [];
        }
    }

    /**
     * Add a plugin to the registry
     */
    registerPlugin(manifest: PluginManifest, pluginPath: string) {
        const plugins = this.listPlugins();
        const existingIndex = plugins.findIndex(p => p.manifest.name === manifest.name);

        const entry: InstalledPlugin = {
            manifest,
            path: pluginPath,
            enabled: true,
        };

        if (existingIndex >= 0) {
            plugins[existingIndex] = entry;
        } else {
            plugins.push(entry);
        }

        this.saveRegistry(plugins);
        logger.info({ plugin: manifest.name }, 'Plugin registered');
    }

    /**
     * Remove a plugin from the registry
     */
    unregisterPlugin(name: string) {
        const plugins = this.listPlugins();
        const filtered = plugins.filter(p => p.manifest.name !== name);
        this.saveRegistry(filtered);
        logger.info({ plugin: name }, 'Plugin unregistered');
    }

    /**
     * Toggle plugin enabled status
     */
    setPluginStatus(name: string, enabled: boolean) {
        const plugins = this.listPlugins();
        const plugin = plugins.find(p => p.manifest.name === name);
        if (plugin) {
            plugin.enabled = enabled;
            this.saveRegistry(plugins);
        }
    }

    /**
     * Search for plugins in the remote marketplace
     */
    async searchMarketplace() {
        try {
            const response = await axios.get(`${API_URL}/marketplace/plugins`);
            return response.data.plugins || [];
        } catch (error) {
            logger.error({ error }, 'Failed to search marketplace');
            return [];
        }
    }

    /**
     * Install a plugin from the remote marketplace
     */
    async installFromMarketplace(id: string) {
        try {
            // Step 1: Tell server we want to install
            const response = await axios.post(`${API_URL}/marketplace/install`, { id, type: 'plugin' });

            // Step 2: Simulation for MVP
            logger.info({ plugin: id }, 'Initiated remote plugin installation');
            return {
                success: true,
                message: response.data.message || `Installing ${id}...`
            };
        } catch (error) {
            logger.error({ error, plugin: id }, 'Marketplace installation failed');
            throw new Error(`Marketplace installation failed: ${error}`);
        }
    }

    private saveRegistry(plugins: InstalledPlugin[]) {
        fs.writeFileSync(this.registryPath, JSON.stringify(plugins, null, 2));
    }

    /**
     * Get the directory where plugins are stored
     */
    getPluginsDir(): string {
        return this.pluginsDir;
    }
}

export const pluginRegistry = new PluginRegistry();
