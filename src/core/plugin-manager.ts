import * as fs from 'fs';
import * as path from 'path';

export interface VibePlugin {
    name: string;
    version: string;
    onInit?: (context: any) => void;
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
                    const plugin = require(path.resolve(pluginsDir, item));
                    this.plugins.push(plugin);
                    if (plugin.onInit) plugin.onInit({});
                } catch (e) {
                    console.error(`Failed to load plugin ${item}:`, e);
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
}
