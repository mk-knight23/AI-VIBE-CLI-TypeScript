/**
 * VIBE-CLI v0.0.1 - MCP Manager
 * Model Context Protocol backbone for structured context
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { configManager } from "../core/config-system.js";
import { createLogger } from "../utils/pino-logger.js";
import { toolRegistry } from "../tools/registry/index.js";
import { EventEmitter } from 'events';

const logger = createLogger("VibeMCPManager");

export interface MCPServerConnection {
  client: Client;
  transport: StdioClientTransport;
  name: string;
  config: { command: string; args: string[]; env?: Record<string, string> };
  retryCount: number;
  lastHeartbeat?: Date;
}

export class VibeMCPManager extends EventEmitter {
  private connections: Map<string, MCPServerConnection> = new Map();
  private maxRetries = 5;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
  }

  public async initialize(): Promise<void> {
    const config = configManager.getConfig();
    const servers = (config as any).mcpServers || {};

    for (const [name, serverConfig] of Object.entries(servers)) {
      if ((serverConfig as any).disabled) continue;

      try {
        await this.connectWithRetry(name, serverConfig as any);
      } catch (error: any) {
        logger.error(`Failed to connect to MCP server ${name} after multiple retries: ${error.message}`);
      }
    }

    this.startHeartbeat();
  }

  private async connectWithRetry(name: string, config: any, retry = 0): Promise<void> {
    try {
      await this.connectToServer(name, config);
    } catch (error: any) {
      if (retry < this.maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retry), 30000);
        logger.warn(`Retrying connection to ${name} in ${delay}ms (Attempt ${retry + 1}/${this.maxRetries})`);

        setTimeout(() => {
          this.connectWithRetry(name, config, retry + 1);
        }, delay);
      } else {
        throw error;
      }
    }
  }

  private async connectToServer(name: string, config: { command: string; args: string[]; env?: Record<string, string> }): Promise<void> {
    logger.info(`Connecting to MCP server: ${name} (${config.command})`);

    const env: Record<string, string> = { ...process.env } as Record<string, string>;
    if (config.env) {
      Object.assign(env, config.env);
    }

    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: env
    });

    const client = new Client(
      {
        name: "vibe-ai-teammate",
        version: "0.0.2",
      },
      {
        capabilities: {},
      }
    );

    // Set timeout for connection
    const connectPromise = client.connect(transport);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 10000));

    await Promise.race([connectPromise, timeoutPromise]);

    this.connections.set(name, {
      client,
      transport,
      name,
      config,
      retryCount: 0,
      lastHeartbeat: new Date()
    });

    // Register tools from this server
    try {
      const { tools } = await client.listTools();
      for (const tool of tools) {
        toolRegistry.register({
          name: `${name}_${tool.name}`,
          description: tool.description || "",
          category: "code",
          schema: {
            type: "object",
            properties: (tool.inputSchema as any).properties || {},
            required: (tool.inputSchema as any).required || []
          },
          riskLevel: "medium",
          requiresApproval: true,
          handler: async (args) => {
            const result = await client.callTool({
              name: tool.name,
              arguments: args
            });
            return {
              success: !result.isError,
              output: JSON.stringify(result.content, null, 2),
              duration: 0
            };
          }
        });
      }
      logger.info(`Connected to ${name} and registered ${tools.length} tools`);
    } catch (e) {
      logger.warn(`Connected to ${name} but failed to list tools`);
    }

    this.emit('connect', { server: name });
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(async () => {
      for (const [name, conn] of this.connections.entries()) {
        try {
          // Ping server by listing tools (lightweight enough)
          await conn.client.listTools();
          conn.lastHeartbeat = new Date();
        } catch (error) {
          logger.error(`Heartbeat failed for MCP server ${name}. Attempting reconnect...`);
          this.connections.delete(name);
          this.connectWithRetry(name, conn.config);
        }
      }
    }, 60000); // Check every minute
  }

  public async shutdown(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    for (const connection of this.connections.values()) {
      await connection.transport.close();
    }
    this.connections.clear();
  }

  public listServers(): string[] {
    return Array.from(this.connections.keys());
  }

  public isConnected(name: string): boolean {
    return this.connections.has(name);
  }

  public getStatus() {
    return Array.from(this.connections.values()).map(c => ({
      name: c.name,
      lastHeartbeat: c.lastHeartbeat,
      status: 'online'
    }));
  }
}

// Export singleton
export const mcpManager = new VibeMCPManager();
