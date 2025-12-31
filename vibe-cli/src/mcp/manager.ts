/**
 * Unified MCP Manager - Handles both stdio and SSE transports
 * Provides a single interface for all MCP operations
 */

import { MCPClient, mcpClient, MCPServerConfig, MCPTool } from './client';
import { SSEMCPClient, sseMcpClient, SSEServerConfig } from './sse-client';
import * as fs from 'fs';
import * as path from 'path';

export type TransportType = 'stdio' | 'sse';

export interface UnifiedServerConfig {
  name: string;
  transport: TransportType;
  // stdio config
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  // sse config
  url?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface MCPManagerConfig {
  servers: UnifiedServerConfig[];
}

const MCP_CONFIG_FILE = '.vibe/mcp.json';

/**
 * Unified MCP Manager
 */
class MCPManager {
  private stdioClient: MCPClient;
  private sseClient: SSEMCPClient;
  private serverTransports: Map<string, TransportType> = new Map();

  constructor() {
    this.stdioClient = mcpClient;
    this.sseClient = sseMcpClient;
  }

  /**
   * Load MCP config from project
   */
  loadConfig(projectPath: string = process.cwd()): UnifiedServerConfig[] {
    const configPath = path.join(projectPath, MCP_CONFIG_FILE);
    try {
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as MCPManagerConfig;
        return config.servers || [];
      }
    } catch {}
    return [];
  }

  /**
   * Save MCP config
   */
  saveConfig(servers: UnifiedServerConfig[], projectPath: string = process.cwd()): void {
    const configPath = path.join(projectPath, MCP_CONFIG_FILE);
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify({ servers }, null, 2));
  }

  /**
   * Connect to a server (auto-detects transport)
   */
  async connect(config: UnifiedServerConfig): Promise<void> {
    const transport = config.transport || (config.url ? 'sse' : 'stdio');
    this.serverTransports.set(config.name, transport);

    if (transport === 'sse') {
      if (!config.url) throw new Error('SSE transport requires url');
      await this.sseClient.connect({
        name: config.name,
        url: config.url,
        headers: config.headers,
        timeout: config.timeout
      });
    } else {
      if (!config.command) throw new Error('stdio transport requires command');
      await this.stdioClient.connect({
        name: config.name,
        command: config.command,
        args: config.args,
        env: config.env,
        cwd: config.cwd
      });
    }
  }

  /**
   * Connect all servers from config
   */
  async connectAll(projectPath: string = process.cwd()): Promise<{ connected: string[]; failed: string[] }> {
    const configs = this.loadConfig(projectPath);
    const connected: string[] = [];
    const failed: string[] = [];

    for (const config of configs) {
      try {
        await this.connect(config);
        connected.push(config.name);
      } catch (err: any) {
        failed.push(`${config.name}: ${err.message}`);
      }
    }

    return { connected, failed };
  }

  /**
   * Disconnect from a server
   */
  disconnect(name: string): void {
    const transport = this.serverTransports.get(name);
    if (transport === 'sse') {
      this.sseClient.disconnect(name);
    } else {
      this.stdioClient.disconnect(name);
    }
    this.serverTransports.delete(name);
  }

  /**
   * Disconnect all servers
   */
  disconnectAll(): void {
    for (const name of this.serverTransports.keys()) {
      this.disconnect(name);
    }
  }

  /**
   * Call a tool on any connected server
   */
  async callTool(serverName: string, toolName: string, args: Record<string, unknown>): Promise<unknown> {
    const transport = this.serverTransports.get(serverName);
    if (!transport) {
      throw new Error(`Server not connected: ${serverName}`);
    }

    if (transport === 'sse') {
      return this.sseClient.callTool(serverName, toolName, args);
    } else {
      return this.stdioClient.callTool(serverName, toolName, args);
    }
  }

  /**
   * Stream tool call (SSE only, falls back to regular call for stdio)
   */
  async *streamToolCall(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>
  ): AsyncGenerator<{ type: 'progress' | 'result'; data: unknown }> {
    const transport = this.serverTransports.get(serverName);
    if (!transport) {
      throw new Error(`Server not connected: ${serverName}`);
    }

    if (transport === 'sse') {
      yield* this.sseClient.streamToolCall(serverName, toolName, args);
    } else {
      // Fallback for stdio - just return result
      const result = await this.stdioClient.callTool(serverName, toolName, args);
      yield { type: 'result', data: result };
    }
  }

  /**
   * Get all tools from all connected servers
   */
  getAllTools(): { server: string; transport: TransportType; tool: MCPTool }[] {
    const result: { server: string; transport: TransportType; tool: MCPTool }[] = [];

    // stdio tools
    for (const { server, tool } of this.stdioClient.getAllTools()) {
      result.push({ server, transport: 'stdio', tool });
    }

    // sse tools
    for (const { server, tool } of this.sseClient.getAllTools()) {
      result.push({ server, transport: 'sse', tool });
    }

    return result;
  }

  /**
   * Get tools from a specific server
   */
  getServerTools(name: string): MCPTool[] {
    const transport = this.serverTransports.get(name);
    if (transport === 'sse') {
      return this.sseClient.getServerTools(name);
    } else {
      return this.stdioClient.getServerTools(name);
    }
  }

  /**
   * List all connected servers
   */
  listServers(): { name: string; transport: TransportType }[] {
    return Array.from(this.serverTransports.entries()).map(([name, transport]) => ({
      name,
      transport
    }));
  }

  /**
   * Check if a server is connected
   */
  isConnected(name: string): boolean {
    return this.serverTransports.has(name);
  }

  /**
   * Get server transport type
   */
  getTransport(name: string): TransportType | undefined {
    return this.serverTransports.get(name);
  }

  /**
   * Add a server to config
   */
  addServer(config: UnifiedServerConfig, projectPath: string = process.cwd()): void {
    const servers = this.loadConfig(projectPath);
    const existing = servers.findIndex(s => s.name === config.name);
    if (existing >= 0) {
      servers[existing] = config;
    } else {
      servers.push(config);
    }
    this.saveConfig(servers, projectPath);
  }

  /**
   * Remove a server from config
   */
  removeServer(name: string, projectPath: string = process.cwd()): boolean {
    const servers = this.loadConfig(projectPath);
    const idx = servers.findIndex(s => s.name === name);
    if (idx >= 0) {
      servers.splice(idx, 1);
      this.saveConfig(servers, projectPath);
      return true;
    }
    return false;
  }
}

// Singleton
export const mcpManager = new MCPManager();

// MCP server templates
export const MCP_TEMPLATES: Record<string, UnifiedServerConfig> = {
  filesystem: {
    name: 'filesystem',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '.']
  },
  git: {
    name: 'git',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-git']
  },
  fetch: {
    name: 'fetch',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-fetch']
  },
  memory: {
    name: 'memory',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory']
  }
};
