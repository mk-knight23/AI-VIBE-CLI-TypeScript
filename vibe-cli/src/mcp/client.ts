/**
 * MCP Client - Model Context Protocol integration
 * Connects to MCP servers for extended tool capabilities
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { AuditLogger } from '../core/security';

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

interface MCPMessage {
  jsonrpc: '2.0';
  id?: number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code: number; message: string };
}

const MCP_CONFIG_FILE = '.vibe/mcp.json';

export class MCPClient extends EventEmitter {
  private servers: Map<string, { process: ChildProcess; tools: MCPTool[] }> = new Map();
  private messageId = 0;
  private pending: Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }> = new Map();
  private audit: AuditLogger;

  constructor() {
    super();
    this.audit = new AuditLogger();
  }

  /**
   * Load MCP config from project
   */
  loadConfig(projectPath: string = process.cwd()): MCPServerConfig[] {
    const configPath = path.join(projectPath, MCP_CONFIG_FILE);
    try {
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
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

    const proc = spawn(config.command, config.args || [], {
      cwd: config.cwd || process.cwd(),
      env: { ...process.env, ...config.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let buffer = '';

    proc.stdout?.on('data', (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const msg: MCPMessage = JSON.parse(line);
            this.handleMessage(config.name, msg);
          } catch {}
        }
      }
    });

    proc.stderr?.on('data', (data: Buffer) => {
      this.emit('error', { server: config.name, error: data.toString() });
    });

    proc.on('exit', (code) => {
      this.servers.delete(config.name);
      this.emit('disconnect', { server: config.name, code });
    });

    this.servers.set(config.name, { process: proc, tools: [] });

    // Initialize connection
    await this.send(config.name, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      clientInfo: { name: 'vibe-cli', version: '10.0.0' },
    });

    // List available tools
    const toolsResult = await this.send(config.name, 'tools/list', {});
    const tools = (toolsResult as { tools: MCPTool[] })?.tools || [];
    
    const server = this.servers.get(config.name);
    if (server) {
      server.tools = tools;
    }

    this.audit.log({
      action: 'mcp-connect',
      command: config.name,
      riskLevel: 'low',
      approved: true,
      result: 'success',
    });
  }

  /**
   * Disconnect from server
   */
  disconnect(name: string): void {
    const server = this.servers.get(name);
    if (server) {
      server.process.kill();
      this.servers.delete(name);
    }
  }

  /**
   * Disconnect all servers
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

    const tool = server.tools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName} on ${serverName}`);
    }

    this.audit.log({
      action: 'mcp-tool-call',
      command: `${serverName}/${toolName}`,
      riskLevel: 'low',
      approved: true,
    });

    const result = await this.send(serverName, 'tools/call', {
      name: toolName,
      arguments: args,
    });

    this.audit.log({
      action: 'mcp-tool-result',
      command: `${serverName}/${toolName}`,
      riskLevel: 'low',
      approved: true,
      result: 'success',
    });

    return result;
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
   * Get tools from specific server
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

  private async send(server: string, method: string, params: unknown): Promise<unknown> {
    const s = this.servers.get(server);
    if (!s) throw new Error(`Server not connected: ${server}`);

    const id = ++this.messageId;
    const msg: MCPMessage = { jsonrpc: '2.0', id, method, params };

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      s.process.stdin?.write(JSON.stringify(msg) + '\n');

      // Timeout
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`MCP request timeout: ${method}`));
        }
      }, 30000);
    });
  }

  private handleMessage(server: string, msg: MCPMessage): void {
    if (msg.id && this.pending.has(msg.id)) {
      const { resolve, reject } = this.pending.get(msg.id)!;
      this.pending.delete(msg.id);

      if (msg.error) {
        reject(new Error(msg.error.message));
      } else {
        resolve(msg.result);
      }
    }
  }
}

// Singleton instance
export const mcpClient = new MCPClient();

/**
 * Create default MCP config
 */
export function createDefaultMCPConfig(projectPath: string = process.cwd()): string {
  const configPath = path.join(projectPath, MCP_CONFIG_FILE);
  const dir = path.dirname(configPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const defaultConfig = {
    servers: [
      {
        name: 'filesystem',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', process.cwd()],
      },
    ],
  };

  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  return configPath;
}
