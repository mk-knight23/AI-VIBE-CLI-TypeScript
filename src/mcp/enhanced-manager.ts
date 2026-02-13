/**
 * VIBE-CLI v0.0.2 - Enhanced MCP Manager
 * Advanced Model Context Protocol management with health checks, reconnection, and event handling
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { configManager } from "../core/config-system.js";
import { createLogger } from "../utils/pino-logger.js";
import { EventEmitter } from 'events';
import { LRUCache } from "../utils/lru-cache.js";
import type { MCPTool } from "../types.js";

const logger = createLogger("EnhancedMCPManager");

export interface MCPServerConnection {
    client: Client;
    transport: StdioClientTransport;
    name: string;
    config: MCP_SERVER_CONFIG;
    retryCount: number;
    lastHeartbeat?: Date;
    lastActivity?: Date;
    status: 'connecting' | 'connected' | 'disconnected' | 'error';
}

export interface MCP_SERVER_CONFIG {
    command: string;
    args?: string[];
    env?: Record<string, string>;
    enabled?: boolean;
    timeout?: number;
    maxRetries?: number;
}

export interface MCPManagerConfig {
    connectionTimeout: number;
    retryAttempts: number;
    retryDelay: number;
    heartbeatInterval: number;
    maxCacheSize: number;
    cacheTTL: number;
}

export class EnhancedMCPManager extends EventEmitter {
    private connections: Map<string, MCPServerConnection> = new Map();
    private toolCache: LRUCache<string, MCPTool[]> = new LRUCache({ maxSize: 100, ttl: 300000 });
    private config: MCPManagerConfig;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private cleanupInterval: NodeJS.Timeout | null = null;
    private initialized: boolean = false;

    constructor(config?: Partial<MCPManagerConfig>) {
        super();
        this.config = {
            connectionTimeout: config?.connectionTimeout || 10000,
            retryAttempts: config?.retryAttempts || 5,
            retryDelay: config?.retryDelay || 1000,
            heartbeatInterval: config?.heartbeatInterval || 60000,
            maxCacheSize: config?.maxCacheSize || 100,
            cacheTTL: config?.cacheTTL || 300000
        };
    }

    public async initialize(): Promise<void> {
        if (this.initialized) {
            logger.warn('MCP Manager already initialized');
            return;
        }

        const vibeConfig = configManager.getConfig();
        const mcpConfig = (vibeConfig as any).mcpServers || {};

        const connectPromises: Promise<void>[] = [];

        for (const [name, serverConfig] of Object.entries(mcpConfig)) {
            if (!(serverConfig as any).disabled) {
                connectPromises.push(this.connectToServer(name, serverConfig as MCP_SERVER_CONFIG));
            }
        }

        await Promise.allSettled(connectPromises);

        this.startHeartbeat();
        this.startCleanup();
        this.initialized = true;

        this.emit('initialized', { serverCount: this.connections.size });
        logger.info(`MCP Manager initialized with ${this.connections.size} servers`);
    }

    private async connectToServer(name: string, config: MCP_SERVER_CONFIG, attempt: number = 1): Promise<void> {
        logger.info(`Connecting to MCP server: ${name} (attempt ${attempt}/${this.config.retryAttempts})`);

        try {
            const env: Record<string, string> = { ...process.env } as Record<string, string>;
            if (config.env) {
                Object.assign(env, config.env);
            }

            const transport = new StdioClientTransport({
                command: config.command,
                args: config.args || [],
                env
            });

            const client = new Client(
                { name: "vibe-ai-teammate", version: "0.0.2" },
                { capabilities: {} }
            );

            await this.connectWithTimeout(client, transport, this.config.connectionTimeout);

            const connection: MCPServerConnection = {
                client,
                transport,
                name,
                config,
                retryCount: 0,
                lastHeartbeat: new Date(),
                lastActivity: new Date(),
                status: 'connected'
            };

            this.connections.set(name, connection);

            // Register tools
            await this.registerTools(name, client);

            this.emit('server:connected', { name, serverCount: this.connections.size });
            logger.info(`Successfully connected to MCP server: ${name}`);

        } catch (error: any) {
            logger.error(`Failed to connect to ${name}: ${error.message}`);

            if (attempt < this.config.retryAttempts) {
                const delay = this.calculateBackoff(attempt);
                logger.info(`Retrying ${name} in ${delay}ms`);

                setTimeout(() => {
                    this.connectToServer(name, config, attempt + 1);
                }, delay);
            } else {
                this.emit('server:failed', { name, error: error.message });
            }
        }
    }

    private async connectWithTimeout(
        client: Client,
        transport: StdioClientTransport,
        timeout: number
    ): Promise<void> {
        const connectPromise = client.connect(transport);
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Connection timeout')), timeout);
        });

        await Promise.race([connectPromise, timeoutPromise]);
    }

    private calculateBackoff(attempt: number): number {
        return Math.min(this.config.retryDelay * Math.pow(2, attempt - 1), 30000);
    }

    private async registerTools(name: string, client: Client): Promise<void> {
        try {
            const { tools } = await client.listTools();
            const toolList: MCPTool[] = tools.map(tool => ({
                name: tool.name,
                description: tool.description || '',
                inputSchema: (tool.inputSchema as Record<string, unknown>) || {}
            }));

            this.toolCache.set(name, toolList);
            logger.info(`Registered ${tools.length} tools from ${name}`);
        } catch (error) {
            logger.warn(`Failed to register tools from ${name}`);
        }
    }

    private startHeartbeat(): void {
        if (this.heartbeatInterval) return;

        this.heartbeatInterval = setInterval(async () => {
            for (const [name, conn] of this.connections.entries()) {
                try {
                    await conn.client.ping();
                    conn.lastHeartbeat = new Date();
                    conn.status = 'connected';
                } catch (error) {
                    logger.warn(`Heartbeat failed for ${name}, attempting reconnect...`);
                    conn.status = 'error';
                    this.scheduleReconnect(name);
                }
            }
        }, this.config.heartbeatInterval);
    }

    private startCleanup(): void {
        this.cleanupInterval = setInterval(() => {
            // Evict expired cache entries
            this.toolCache.evictExpired();

            // Check for stale connections
            for (const [name, conn] of this.connections.entries()) {
                if (conn.status === 'error' && conn.lastActivity) {
                    const staleTime = Date.now() - conn.lastActivity.getTime();
                    if (staleTime > 300000) { // 5 minutes
                        logger.info(`Reconnecting to stale server: ${name}`);
                        this.scheduleReconnect(name);
                    }
                }
            }
        }, 60000);
    }

    private scheduleReconnect(name: string): void {
        const conn = this.connections.get(name);
        if (!conn) return;

        conn.retryCount++;

        if (conn.retryCount > this.config.retryAttempts) {
            logger.error(`Max retries exceeded for ${name}, giving up`);
            this.emit('server:abandoned', { name, retries: conn.retryCount });
            return;
        }

        const delay = this.calculateBackoff(conn.retryCount);

        setTimeout(() => {
            this.connectToServer(name, conn.config, conn.retryCount + 1);
        }, delay);
    }

    public async callTool<T = unknown>(
        serverName: string,
        toolName: string,
        args: Record<string, unknown> = {}
    ): Promise<T> {
        const connection = this.connections.get(serverName);
        if (!connection) {
            throw new Error(`MCP server ${serverName} not connected`);
        }

        if (connection.status !== 'connected') {
            throw new Error(`MCP server ${serverName} is ${connection.status}`);
        }

        connection.lastActivity = new Date();

        try {
            const toolPromise = connection.client.callTool({
                name: toolName,
                arguments: args
            });

            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error(`MCP Tool call timed out after ${this.config.connectionTimeout}ms`)), this.config.connectionTimeout);
            });

            const result = await Promise.race([toolPromise, timeoutPromise]) as any;

            if (result.isError) {
                const errorMessage = (result.content as any)?.[0]?.text || 'Tool call failed';
                throw new Error(errorMessage);
            }

            return this.parseToolResult<T>(result.content);
        } catch (error) {
            connection.status = 'error';
            throw error;
        }
    }

    private parseToolResult<T>(content: any): T {
        if (Array.isArray(content)) {
            return content.map(item => {
                if (item.type === 'text') {
                    try {
                        return JSON.parse(item.text) as T;
                    } catch {
                        return item.text as T;
                    }
                }
                return item;
            }) as unknown as T;
        }

        if (content?.type === 'text') {
            try {
                return JSON.parse(content.text) as T;
            } catch {
                return content.text as T;
            }
        }

        return content as T;
    }

    public async listTools(serverName?: string): Promise<MCPTool[]> {
        if (serverName) {
            const cached = this.toolCache.get(serverName);
            if (cached) return cached;

            const connection = this.connections.get(serverName);
            if (connection) {
                await this.registerTools(serverName, connection.client);
                return this.toolCache.get(serverName) || [];
            }
            return [];
        }

        const allTools: MCPTool[] = [];
        for (const [name, connection] of this.connections.entries()) {
            const tools = await this.listTools(name);
            for (const tool of tools) {
                allTools.push({ ...tool, name: `${name}_${tool.name}` });
            }
        }

        return allTools;
    }

    public async listResources<T = unknown>(serverName: string): Promise<T[]> {
        const connection = this.connections.get(serverName);
        if (!connection) {
            throw new Error(`MCP server ${serverName} not connected`);
        }

        const { resources } = await connection.client.listResources();
        return resources as T[];
    }

    public listServers(): string[] {
        return Array.from(this.connections.keys());
    }

    public isConnected(name: string): boolean {
        const conn = this.connections.get(name);
        return conn?.status === 'connected';
    }

    public getServerStatus(): Array<{
        name: string;
        status: string;
        lastHeartbeat: Date | null;
        toolCount: number;
    }> {
        return Array.from(this.connections.values()).map(conn => ({
            name: conn.name,
            status: conn.status,
            lastHeartbeat: conn.lastHeartbeat || null,
            toolCount: this.toolCache.get(conn.name)?.length || 0
        }));
    }

    public getMetrics(): {
        serverCount: number;
        connectedCount: number;
        totalCachedTools: number;
        uptime: number;
    } {
        let connectedCount = 0;
        let totalCachedTools = 0;

        for (const conn of this.connections.values()) {
            if (conn.status === 'connected') connectedCount++;
            const tools = this.toolCache.get(conn.name);
            if (tools) totalCachedTools += tools.length;
        }

        return {
            serverCount: this.connections.size,
            connectedCount,
            totalCachedTools,
            uptime: process.uptime()
        };
    }

    public async shutdown(): Promise<void> {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        for (const connection of this.connections.values()) {
            try {
                await connection.transport.close();
            } catch (error) {
                logger.warn(`Error closing transport for ${connection.name}`);
            }
        }

        this.connections.clear();
        this.toolCache.clear();
        this.initialized = false;

        this.emit('shutdown');
        logger.info('MCP Manager shutdown complete');
    }

    public addServer(name: string, config: MCP_SERVER_CONFIG): void {
        this.connectToServer(name, config);
    }

    public removeServer(name: string): void {
        const connection = this.connections.get(name);
        if (connection) {
            connection.transport.close();
            this.connections.delete(name);
            this.toolCache.delete(name);
            this.emit('server:removed', { name });
        }
    }
}

export const enhancedMCPManager = new EnhancedMCPManager();
