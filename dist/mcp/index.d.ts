/**
 * VIBE-CLI v0.0.1 - MCP Manager
 * Model Context Protocol backbone for structured context
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { EventEmitter } from 'events';
export interface MCPServerConnection {
    client: Client;
    transport: StdioClientTransport;
    name: string;
    config: {
        command: string;
        args: string[];
        env?: Record<string, string>;
    };
    retryCount: number;
    lastHeartbeat?: Date;
}
export declare class VibeMCPManager extends EventEmitter {
    private connections;
    private maxRetries;
    private heartbeatInterval;
    constructor();
    initialize(): Promise<void>;
    private connectWithRetry;
    private connectToServer;
    private startHeartbeat;
    shutdown(): Promise<void>;
    listServers(): string[];
    isConnected(name: string): boolean;
    getStatus(): {
        name: string;
        lastHeartbeat: Date | undefined;
        status: string;
    }[];
}
export declare const mcpManager: VibeMCPManager;
//# sourceMappingURL=index.d.ts.map