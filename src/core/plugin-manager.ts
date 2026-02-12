import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { createLogger } from '../utils/pino-logger.js';

const logger = createLogger('PluginManager');

export interface VibePlugin {
    name: string;
    version: string;
    onInit?: (context: Record<string, unknown>) => void;
    commands?: Record<string, (args: string[]) => Promise<void>>;
    hooks?: {
        beforeAI?: (input: string) => string;
        afterAI?: (output: string) => string;
    };
}

export class PluginManager {
    private plugins: VibePlugin[] = [];

    async loadPlugins(pluginsDir: string = './.vibe/plugins'): Promise<void> {
        if (!fs.existsSync(pluginsDir)) return;

        const items = fs.readdirSync(pluginsDir);
        for (const item of items) {
            if (item.endsWith('.js')) {
                try {
                    const filePath = path.resolve(pluginsDir, item);
                    const fileUrl = pathToFileURL(filePath).href;
                    const mod = await import(fileUrl);
                    const plugin: VibePlugin = mod.default || mod;

                    if (!plugin.name || !plugin.version) {
                        logger.warn({ file: item }, 'Plugin missing name or version, skipping');
                        continue;
                    }

                    this.plugins.push(plugin);
                    if (plugin.onInit) plugin.onInit({});
                    logger.info({ plugin: plugin.name, version: plugin.version }, 'Plugin loaded');
                } catch (e: unknown) {
                    const message = e instanceof Error ? e.message : String(e);
                    logger.error({ file: item, error: message }, 'Failed to load plugin');
                }
            }
        }
    }

    getCommands(): Record<string, (args: string[]) => Promise<void>> {
        const cmds: Record<string, (args: string[]) => Promise<void>> = {};
        this.plugins.forEach(p => {
            if (p.commands) Object.assign(cmds, p.commands);
        });
        return cmds;
    }

    applyHook(type: 'beforeAI' | 'afterAI', data: string): string {
        let current = data;
        this.plugins.forEach(p => {
            if (p.hooks?.[type]) {
                current = p.hooks[type]!(current);
            }
        });
        return current;
    }

    getPlugins(): VibePlugin[] {
        return [...this.plugins];
    }
}
