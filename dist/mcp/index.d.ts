/**
 * VIBE-CLI v12 - MCP Manager
 * Model Context Protocol backbone for structured context
 */
import { EventEmitter } from 'events';
export { MCPContextAggregator, FileSystemContextProvider, GitContextProvider, OpenAPIContextProvider, TestsContextProvider, MemoryContextProvider, } from './context-provider.js';
export type { IContextProvider, MCPContext, FileSystemContext, GitContext, OpenAPIContext, TestsContext, MemoryContext, InfraContext } from './context-provider.js';
export interface MCPServerConfig {
    name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
    cwd?: string;
}
export interface MCPTool {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
}
export interface MCPResource {
    uri: string;
    name: string;
    description: string;
    mimeType?: string;
}
export declare class VibeMCPManager extends EventEmitter {
    private servers;
    private configPath;
    constructor();
    /**
     * Load MCP configuration
     */
    loadConfig(): MCPServerConfig[];
    /**
     * Connect to an MCP server
     */
    connect(config: MCPServerConfig): Promise<void>;
    /**
     * Disconnect from an MCP server
     */
    disconnect(name: string): void;
    /**
     * Disconnect from all servers
     */
    disconnectAll(): void;
    /**
     * Call a tool on an MCP server
     */
    callTool(serverName: string, toolName: string, args: Record<string, unknown>): Promise<unknown>;
    /**
     * Get all available tools across servers
     */
    getAllTools(): {
        server: string;
        tool: MCPTool;
    }[];
    /**
     * Get tools from a specific server
     */
    getServerTools(name: string): MCPTool[];
    /**
     * List connected servers
     */
    listServers(): string[];
    /**
     * Check if server is connected
     */
    isConnected(name: string): boolean;
    /**
     * Get all resources from connected servers
     */
    getAllResources(): MCPResource[];
    /**
     * Read a resource by URI
     */
    readResource(uri: string): Promise<{
        contents: Array<{
            mimeType: string;
            text: string;
        }>;
    }>;
    /**
     * Create default MCP configuration
     */
    createDefaultConfig(): string;
}
export declare const mcpManager: VibeMCPManager;
//# sourceMappingURL=index.d.ts.map