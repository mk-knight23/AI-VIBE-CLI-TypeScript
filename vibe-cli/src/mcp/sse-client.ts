/**
 * SSE MCP Transport - Server-Sent Events transport for MCP
 * Extends MCP client with HTTP/SSE support
 */

import { EventEmitter } from 'events';
import { MCPTool } from './client';

export interface SSEServerConfig {
  name: string;
  url: string;
  headers?: Record<string, string>;
  timeout?: number;
}

interface MCPMessage {
  jsonrpc: '2.0';
  id?: number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code: number; message: string };
}

export class SSEMCPClient extends EventEmitter {
  private servers: Map<string, { url: string; headers: Record<string, string>; tools: MCPTool[] }> = new Map();
  private messageId = 0;
  private pending: Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void; timeout: NodeJS.Timeout }> = new Map();

  async connect(config: SSEServerConfig): Promise<void> {
    if (this.servers.has(config.name)) {
      return;
    }

    const headers = {
      'Content-Type': 'application/json',
      ...config.headers
    };

    this.servers.set(config.name, { url: config.url, headers, tools: [] });

    // Initialize connection
    await this.send(config.name, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      clientInfo: { name: 'vibe-cli', version: '10.0.0' }
    });

    // List tools
    const toolsResult = await this.send(config.name, 'tools/list', {});
    const tools = (toolsResult as { tools: MCPTool[] })?.tools || [];
    
    const server = this.servers.get(config.name);
    if (server) {
      server.tools = tools;
    }

    this.emit('connected', { server: config.name, tools: tools.length });
  }

  disconnect(name: string): void {
    this.servers.delete(name);
    this.emit('disconnected', { server: name });
  }

  async callTool(serverName: string, toolName: string, args: Record<string, unknown>): Promise<unknown> {
    const server = this.servers.get(serverName);
    if (!server) {
      throw new Error(`SSE server not connected: ${serverName}`);
    }

    const tool = server.tools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName} on ${serverName}`);
    }

    return this.send(serverName, 'tools/call', {
      name: toolName,
      arguments: args
    });
  }

  getAllTools(): { server: string; tool: MCPTool }[] {
    const result: { server: string; tool: MCPTool }[] = [];
    for (const [name, server] of this.servers) {
      for (const tool of server.tools) {
        result.push({ server: name, tool });
      }
    }
    return result;
  }

  getServerTools(name: string): MCPTool[] {
    return this.servers.get(name)?.tools || [];
  }

  listServers(): string[] {
    return Array.from(this.servers.keys());
  }

  isConnected(name: string): boolean {
    return this.servers.has(name);
  }

  private async send(serverName: string, method: string, params: unknown): Promise<unknown> {
    const server = this.servers.get(serverName);
    if (!server) throw new Error(`Server not connected: ${serverName}`);

    const id = ++this.messageId;
    const msg: MCPMessage = { jsonrpc: '2.0', id, method, params };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`SSE request timeout: ${method}`));
      }, 30000);

      this.pending.set(id, { resolve, reject, timeout });

      this.sendRequest(server.url, server.headers, msg)
        .then(response => {
          clearTimeout(timeout);
          this.pending.delete(id);
          
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response.result);
          }
        })
        .catch(err => {
          clearTimeout(timeout);
          this.pending.delete(id);
          reject(err);
        });
    });
  }

  private async sendRequest(url: string, headers: Record<string, string>, msg: MCPMessage): Promise<MCPMessage> {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(msg)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('text/event-stream')) {
      return this.handleSSEResponse(response);
    }

    return response.json();
  }

  private async handleSSEResponse(response: Response): Promise<MCPMessage> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';
    let result: MCPMessage | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            if (parsed.jsonrpc === '2.0') {
              result = parsed;
            }
            this.emit('message', parsed);
          } catch {}
        }
      }
    }

    if (!result) {
      throw new Error('No valid response received');
    }

    return result;
  }

  // Stream tool execution with progress
  async *streamToolCall(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>
  ): AsyncGenerator<{ type: 'progress' | 'result'; data: unknown }> {
    const server = this.servers.get(serverName);
    if (!server) throw new Error(`Server not connected: ${serverName}`);

    const id = ++this.messageId;
    const msg: MCPMessage = {
      jsonrpc: '2.0',
      id,
      method: 'tools/call',
      params: { name: toolName, arguments: args }
    };

    const response = await fetch(server.url, {
      method: 'POST',
      headers: server.headers,
      body: JSON.stringify(msg)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.progress) {
              yield { type: 'progress', data: parsed.progress };
            } else if (parsed.result) {
              yield { type: 'result', data: parsed.result };
            }
          } catch {}
        }
      }
    }
  }
}

// Singleton
export const sseMcpClient = new SSEMCPClient();
