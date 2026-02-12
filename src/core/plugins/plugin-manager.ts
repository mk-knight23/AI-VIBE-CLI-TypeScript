import { createLogger } from '../../utils/pino-logger.js';
import { toolRegistry } from '../../tools/registry/index.js';
import { mcpManager } from '../../mcp/index.js';

const logger = createLogger('plugin-manager');

export interface VibePlugin {
    id: string;
    name: string;
    version: string;
    capabilities: string[];
    initialize(): Promise<void>;
}

export class PluginManager {
    private plugins: Map<string, VibePlugin> = new Map();

    public async registerPlugin(plugin: VibePlugin) {
        logger.info({ id: plugin.id, name: plugin.name }, 'Registering plugin');
        await plugin.initialize();
        this.plugins.set(plugin.id, plugin);
    }

    /**
     * Discovery layer: Returns all available capabilities across MCP and Plugins
     */
    public async getCapabilities() {
        // 1. Get tools from the internal registry (which includes MCP tools)
        const tools = toolRegistry.list();

        // 2. Get active MCP server status
        const mcpServers = mcpManager.getStatus();

        // 3. Get loaded plugins
        const loadedPlugins = Array.from(this.plugins.values()).map(p => ({
            id: p.id,
            name: p.name,
            capabilities: p.capabilities
        }));

        return {
            tools: tools.map(t => ({
                name: t.name,
                description: t.description,
                riskLevel: t.riskLevel
            })),
            mcpServers,
            plugins: loadedPlugins
        };
    }

    public getPlugin(id: string): VibePlugin | undefined {
        return this.plugins.get(id);
    }
}

// Export singleton
export const pluginManager = new PluginManager();
