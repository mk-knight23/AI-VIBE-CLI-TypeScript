/**
 * VIBE-CLI v12 - MCP Manager
 * Model Context Protocol backbone for structured context
 */

import { EventEmitter } from 'events';

// Re-export classes
export {
  MCPContextAggregator,
  FileSystemContextProvider,
  GitContextProvider,
  OpenAPIContextProvider,
  TestsContextProvider,
  MemoryContextProvider,
} from './context-provider.js';

// Re-export types
export type {
  IContextProvider,
  MCPContext,
  FileSystemContext,
  GitContext,
  OpenAPIContext,
  TestsContext,
  MemoryContext,
  InfraContext
} from './context-provider.js';

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

// MCP Manager - handles connections to MCP servers
export class VibeMCPManager extends EventEmitter {
  private servers: Map<string, {
    process: any;
    tools: MCPTool[];
    resources: MCPResource[];
  }>;
  private configPath: string;

  constructor() {
    super();
    this.servers = new Map();
    this.configPath = '.vibe/mcp.json';
  }

  /**
   * Load MCP configuration
   */
  loadConfig(): MCPServerConfig[] {
    try {
      const fs = require('fs');
      if (fs.existsSync(this.configPath)) {
        const config = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        return config.servers || [];
      }
    } catch {}
    return [];
  }

  /**
   * Connect to an MCP server
   */
  async connect(config: MCPServerConfig): Promise<void> {
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
  disconnect(name: string): void {
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
  disconnectAll(): void {
    for (const name of this.servers.keys()) {
      this.disconnect(name);
    }
  }

  /**
   * Call a tool on an MCP server
   */
  async callTool(serverName: string, toolName: string, args: Record<string, unknown>): Promise<unknown> {
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
  getAllTools(): { server: string; tool: MCPTool }[] {
    const result: { server: string; tool: MCPTool }[] = [];
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
  getServerTools(name: string): MCPTool[] {
    return this.servers.get(name)?.tools || [];
  }

  /**
   * List connected servers
   */
  listServers(): string[] {
    return Array.from(this.servers.keys());
  }

  /**
   * Check if server is connected
   */
  isConnected(name: string): boolean {
    return this.servers.has(name);
  }

  /**
   * Get all resources from connected servers
   */
  getAllResources(): MCPResource[] {
    const resources: MCPResource[] = [];
    for (const server of this.servers.values()) {
      resources.push(...server.resources);
    }
    return resources;
  }

  /**
   * Read a resource by URI
   */
  async readResource(uri: string): Promise<{ contents: Array<{ mimeType: string; text: string }> }> {
    // In a real implementation, this would route to the appropriate server
    return { contents: [{ mimeType: 'text/plain', text: 'Resource content' }] };
  }

  /**
   * Create default MCP configuration
   */
  createDefaultConfig(): string {
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

// Export singleton
export const mcpManager = new VibeMCPManager();
