/**
 * VIBE-CLI v0.0.2 - MCP Server
 * Model Context Protocol server for tool integration
 */

import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';
import chalk from 'chalk';

/**
 * MCP message types
 */
export type MCPMessageType = 'request' | 'response' | 'notification' | 'error';

/**
 * MCP request
 */
export interface MCPRequest {
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

/**
 * MCP response
 */
export interface MCPResponse {
  id: string;
  result?: Record<string, unknown>;
  error?: string;
}

/**
 * MCP tool definition
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  };
  handler: (params: Record<string, unknown>) => Promise<unknown>;
}

/**
 * MCP resource
 */
export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  content: () => Promise<string>;
}

/**
 * MCP prompt
 */
export interface MCPPrompt {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
  content: (args?: Record<string, string>) => string;
}

/**
 * MCP server config
 */
export interface MCPServerConfig {
  port: number;
  host: string;
  name: string;
  version: string;
}

/**
 * MCP Server
 */
export class MCPServer {
  private config: MCPServerConfig;
  private tools: Map<string, MCPTool>;
  private resources: Map<string, MCPResource>;
  private prompts: Map<string, MCPPrompt>;
  private server: net.Server | null = null;
  private connections: net.Socket[] = [];
  private requestHandlers: Map<string, (req: MCPRequest) => Promise<MCPResponse>>;

  constructor(config?: Partial<MCPServerConfig>) {
    this.config = {
      port: config?.port || 3001,
      host: config?.host || 'localhost',
      name: config?.name || 'vibe-cli',
      version: config?.version || '1.0.0',
    };
    this.tools = new Map();
    this.resources = new Map();
    this.prompts = new Map();
    this.requestHandlers = new Map();

    this.registerDefaultTools();
    this.registerDefaultHandlers();
  }

  /**
   * Register default tools
   */
  private registerDefaultTools(): void {
    // Read file tool
    this.registerTool({
      name: 'read_file',
      description: 'Read the contents of a file',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path to the file' },
        },
        required: ['path'],
      },
      handler: async (params) => {
        const filePath = params.path as string;
        if (!fs.existsSync(filePath)) {
          throw new Error(`File not found: ${filePath}`);
        }
        return { content: fs.readFileSync(filePath, 'utf-8') };
      },
    });

    // Write file tool
    this.registerTool({
      name: 'write_file',
      description: 'Write content to a file',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path to the file' },
          content: { type: 'string', description: 'Content to write' },
        },
        required: ['path', 'content'],
      },
      handler: async (params) => {
        const filePath = params.path as string;
        const content = params.content as string;
        fs.writeFileSync(filePath, content, 'utf-8');
        return { success: true };
      },
    });

    // List directory tool
    this.registerTool({
      name: 'list_directory',
      description: 'List contents of a directory',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path to the directory' },
        },
        required: ['path'],
      },
      handler: async (params) => {
        const dirPath = params.path as string;
        if (!fs.existsSync(dirPath)) {
          throw new Error(`Directory not found: ${dirPath}`);
        }
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        return {
          entries: entries.map((entry) => ({
            name: entry.name,
            isDirectory: entry.isDirectory(),
            isFile: entry.isFile(),
          })),
        };
      },
    });

    // Search files tool
    this.registerTool({
      name: 'search_files',
      description: 'Search for files matching a pattern',
      inputSchema: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Glob pattern' },
          path: { type: 'string', description: 'Base path (defaults to current directory)' },
        },
        required: ['pattern'],
      },
      handler: async (params) => {
        const { glob } = require('fast-glob');
        const basePath = (params.path as string) || process.cwd();
        const files = await glob(params.pattern as string, { cwd: basePath });
        return { files };
      },
    });

    // Get file info tool
    this.registerTool({
      name: 'get_file_info',
      description: 'Get information about a file',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path to the file' },
        },
        required: ['path'],
      },
      handler: async (params) => {
        const filePath = params.path as string;
        const stats = fs.statSync(filePath);
        return {
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory(),
        };
      },
    });

    // Run command tool
    this.registerTool({
      name: 'run_command',
      description: 'Run a shell command',
      inputSchema: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Command to run' },
          timeout: { type: 'number', description: 'Timeout in milliseconds' },
        },
        required: ['command'],
      },
      handler: async (params) => {
        const { execSync } = require('child_process');
        try {
          const result = execSync(params.command as string, {
            encoding: 'utf-8',
            timeout: (params.timeout as number) || 30000,
          });
          return { output: result, success: true };
        } catch (error) {
          return { output: String(error), success: false };
        }
      },
    });

    // Grep tool
    this.registerTool({
      name: 'grep',
      description: 'Search for text in files',
      inputSchema: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Regex pattern to search' },
          path: { type: 'string', description: 'Base path' },
          glob: { type: 'string', description: 'File glob pattern' },
        },
        required: ['pattern'],
      },
      handler: async (params) => {
        const { glob } = require('fast-glob');
        const basePath = (params.path as string) || process.cwd();
        const files = await glob((params.glob as string) || '**/*.{ts,js,py}', { cwd: basePath });
        const results: Array<{ file: string; line: number; content: string }> = [];

        for (const file of files) {
          const filePath = path.join(basePath, file);
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');
            const regex = new RegExp(params.pattern as string, 'gi');

            lines.forEach((line, index) => {
              if (regex.test(line)) {
                results.push({ file, line: index + 1, content: line.trim() });
              }
            });
          } catch {
            // Skip unreadable files
          }
        }

        return { results };
      },
    });
  }

  /**
   * Register default request handlers
   */
  private registerDefaultHandlers(): void {
    // Initialize request
    this.requestHandlers.set('initialize', async (req) => {
      return {
        id: req.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: this.tools.size > 0,
            resources: this.resources.size > 0,
            prompts: this.prompts.size > 0,
          },
          serverInfo: {
            name: this.config.name,
            version: this.config.version,
          },
        },
      };
    });

    // List tools
    this.requestHandlers.set('tools/list', async (req) => {
      return {
        id: req.id,
        result: {
          tools: Array.from(this.tools.values()).map((tool) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          })),
        },
      };
    });

    // Call tool
    this.requestHandlers.set('tools/call', async (req) => {
      const toolParams = req.params?.tool as { name?: string; arguments?: Record<string, unknown> } | undefined;
      const { name = '', arguments: args = {} } = toolParams || {};
      const tool = this.tools.get(name as string);

      if (!tool) {
        return { id: req.id, error: `Tool not found: ${name}` };
      }

      try {
        const result = await tool.handler(args);
        return { id: req.id, result: { result } as Record<string, unknown> };
      } catch (error) {
        return { id: req.id, error: String(error) };
      }
    });

    // List resources
    this.requestHandlers.set('resources/list', async (req) => {
      return {
        id: req.id,
        result: {
          resources: Array.from(this.resources.values()).map((resource) => ({
            uri: resource.uri,
            name: resource.name,
            description: resource.description,
            mimeType: resource.mimeType,
          })),
        },
      };
    });

    // Read resource
    this.requestHandlers.set('resources/read', async (req) => {
      const resourceParams = req.params?.resource as { uri?: string } | undefined;
      const { uri = '' } = resourceParams || {};
      const resource = this.resources.get(uri);

      if (!resource) {
        return { id: req.id, error: `Resource not found: ${uri}` };
      }

      try {
        const content = await resource.content();
        return { id: req.id, result: { contents: [{ uri, text: content }] } as Record<string, unknown> };
      } catch (error) {
        return { id: req.id, error: String(error) };
      }
    });

    // List prompts
    this.requestHandlers.set('prompts/list', async (req) => {
      return {
        id: req.id,
        result: {
          prompts: Array.from(this.prompts.values()).map((prompt) => ({
            name: prompt.name,
            description: prompt.description,
            arguments: prompt.arguments,
          })),
        },
      };
    });

    // Get prompt
    this.requestHandlers.set('prompts/get', async (req) => {
      const promptParams = req.params?.prompt as { name?: string; arguments?: Record<string, string> } | undefined;
      const { name = '', arguments: args = {} } = promptParams || {};
      const prompt = this.prompts.get(name as string);

      if (!prompt) {
        return { id: req.id, error: `Prompt not found: ${name}` };
      }

      try {
        const content = prompt.content(args);
        return { id: req.id, result: { description: prompt.description, messages: [{ role: 'user', content }] } };
      } catch (error) {
        return { id: req.id, error: String(error) };
      }
    });
  }

  /**
   * Register a tool
   */
  registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Register a resource
   */
  registerResource(resource: MCPResource): void {
    this.resources.set(resource.uri, resource);
  }

  /**
   * Register a prompt
   */
  registerPrompt(prompt: MCPPrompt): void {
    this.prompts.set(prompt.name, prompt);
  }

  /**
   * Register a request handler
   */
  registerRequestHandler(method: string, handler: (req: MCPRequest) => Promise<MCPResponse>): void {
    this.requestHandlers.set(method, handler);
  }

  /**
   * Start the server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        this.handleConnection(socket);
      });

      this.server.on('error', (err) => {
        reject(err);
      });

      this.server.listen(this.config.port, this.config.host, () => {
        console.log(chalk.green(`MCP Server started on ${this.config.host}:${this.config.port}`));
        resolve();
      });
    });
  }

  /**
   * Handle a connection
   */
  private handleConnection(socket: net.Socket): void {
    this.connections.push(socket);
    let buffer = '';

    socket.on('data', (data) => {
      buffer += data.toString();

      // Process complete JSON-RPC messages
      let newlineIndex;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const message = buffer.substring(0, newlineIndex);
        buffer = buffer.substring(newlineIndex + 1);

        if (message.trim()) {
          this.handleMessage(socket, message);
        }
      }
    });

    socket.on('end', () => {
      const index = this.connections.indexOf(socket);
      if (index > -1) {
        this.connections.splice(index, 1);
      }
    });

    socket.on('error', (err) => {
      console.error('Socket error:', err);
    });
  }

  /**
   * Handle a message
   */
  private async handleMessage(socket: net.Socket, message: string): Promise<void> {
    try {
      const req: MCPRequest = JSON.parse(message);
      const handler = this.requestHandlers.get(req.method);

      if (!handler) {
        const response: MCPResponse = {
          id: req.id,
          error: `Method not found: ${req.method}`,
        };
        socket.write(JSON.stringify(response) + '\n');
        return;
      }

      const response = await handler(req);
      socket.write(JSON.stringify(response) + '\n');
    } catch (error) {
      const errorResponse: MCPResponse = {
        id: '',
        error: String(error),
      };
      socket.write(JSON.stringify(errorResponse) + '\n');
    }
  }

  /**
   * Stop the server
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log(chalk.yellow('MCP Server stopped'));
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get server info
   */
  getServerInfo(): { name: string; version: string; port: number; tools: number; resources: number; prompts: number } {
    return {
      name: this.config.name,
      version: this.config.version,
      port: this.config.port,
      tools: this.tools.size,
      resources: this.resources.size,
      prompts: this.prompts.size,
    };
  }

  /**
   * Format server status
   */
  formatStatus(): string {
    const info = this.getServerInfo();
    const lines: string[] = [];

    lines.push(chalk.bold('\n🔌 MCP Server Status\n'));
    lines.push(chalk.gray('='.repeat(50)));
    lines.push('');
    lines.push(`Name:    ${info.name}`);
    lines.push(`Version: ${info.version}`);
    lines.push(`Port:    ${info.port}`);
    lines.push(`Tools:   ${info.tools}`);
    lines.push(`Resources: ${info.resources}`);
    lines.push(`Prompts:  ${info.prompts}`);
    lines.push('');

    if (this.server) {
      lines.push(chalk.green('Status: Running'));
    } else {
      lines.push(chalk.red('Status: Stopped'));
    }

    return lines.join('\n');
  }
}

/**
 * Singleton instance
 */
export const mcpServer = new MCPServer();
