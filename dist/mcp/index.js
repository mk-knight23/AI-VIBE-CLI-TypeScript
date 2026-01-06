"use strict";
/**
 * VIBE-CLI v12 - MCP Manager
 * Model Context Protocol backbone for structured context
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mcpManager = exports.VibeMCPManager = exports.MemoryContextProvider = exports.TestsContextProvider = exports.OpenAPIContextProvider = exports.GitContextProvider = exports.FileSystemContextProvider = exports.MCPContextAggregator = void 0;
const events_1 = require("events");
// Re-export classes
var context_provider_js_1 = require("./context-provider.js");
Object.defineProperty(exports, "MCPContextAggregator", { enumerable: true, get: function () { return context_provider_js_1.MCPContextAggregator; } });
Object.defineProperty(exports, "FileSystemContextProvider", { enumerable: true, get: function () { return context_provider_js_1.FileSystemContextProvider; } });
Object.defineProperty(exports, "GitContextProvider", { enumerable: true, get: function () { return context_provider_js_1.GitContextProvider; } });
Object.defineProperty(exports, "OpenAPIContextProvider", { enumerable: true, get: function () { return context_provider_js_1.OpenAPIContextProvider; } });
Object.defineProperty(exports, "TestsContextProvider", { enumerable: true, get: function () { return context_provider_js_1.TestsContextProvider; } });
Object.defineProperty(exports, "MemoryContextProvider", { enumerable: true, get: function () { return context_provider_js_1.MemoryContextProvider; } });
// MCP Manager - handles connections to MCP servers
class VibeMCPManager extends events_1.EventEmitter {
    servers;
    configPath;
    constructor() {
        super();
        this.servers = new Map();
        this.configPath = '.vibe/mcp.json';
    }
    /**
     * Load MCP configuration
     */
    loadConfig() {
        try {
            const fs = require('fs');
            if (fs.existsSync(this.configPath)) {
                const config = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
                return config.servers || [];
            }
        }
        catch { }
        return [];
    }
    /**
     * Connect to an MCP server
     */
    async connect(config) {
        if (this.servers.has(config.name)) {
            return; // Already connected
        }
        console.log(`Connecting to MCP server: ${config.name}`);
        // Store connection info (actual implementation would spawn process)
        this.servers.set(config.name, {
            process: null,
            tools: [],
            resources: []
        });
        this.emit('connect', { server: config.name });
    }
    /**
     * Disconnect from an MCP server
     */
    disconnect(name) {
        const server = this.servers.get(name);
        if (server) {
            if (server.process) {
                server.process.kill();
            }
            this.servers.delete(name);
            this.emit('disconnect', { server: name });
        }
    }
    /**
     * Disconnect from all servers
     */
    disconnectAll() {
        for (const name of this.servers.keys()) {
            this.disconnect(name);
        }
    }
    /**
     * Call a tool on an MCP server
     */
    async callTool(serverName, toolName, args) {
        const server = this.servers.get(serverName);
        if (!server) {
            throw new Error(`MCP server not connected: ${serverName}`);
        }
        // In a real implementation, this would send the request via MCP protocol
        console.log(`Calling ${serverName}/${toolName}`);
        return { result: 'tool result' };
    }
    /**
     * Get all available tools across servers
     */
    getAllTools() {
        const result = [];
        for (const [name, server] of this.servers) {
            for (const tool of server.tools) {
                result.push({ server: name, tool });
            }
        }
        return result;
    }
    /**
     * Get tools from a specific server
     */
    getServerTools(name) {
        return this.servers.get(name)?.tools || [];
    }
    /**
     * List connected servers
     */
    listServers() {
        return Array.from(this.servers.keys());
    }
    /**
     * Check if server is connected
     */
    isConnected(name) {
        return this.servers.has(name);
    }
    /**
     * Get all resources from connected servers
     */
    getAllResources() {
        const resources = [];
        for (const server of this.servers.values()) {
            resources.push(...server.resources);
        }
        return resources;
    }
    /**
     * Read a resource by URI
     */
    async readResource(uri) {
        // In a real implementation, this would route to the appropriate server
        return { contents: [{ mimeType: 'text/plain', text: 'Resource content' }] };
    }
    /**
     * Create default MCP configuration
     */
    createDefaultConfig() {
        const defaultConfig = {
            servers: [
                {
                    name: 'filesystem',
                    command: 'npx',
                    args: ['-y', '@modelcontextprotocol/server-filesystem', process.cwd()]
                },
                {
                    name: 'git',
                    command: 'npx',
                    args: ['-y', '@modelcontextprotocol/server-github']
                }
            ]
        };
        const fs = require('fs');
        const dir = require('path').dirname(this.configPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2));
        return this.configPath;
    }
}
exports.VibeMCPManager = VibeMCPManager;
// Export singleton
exports.mcpManager = new VibeMCPManager();
//# sourceMappingURL=index.js.map