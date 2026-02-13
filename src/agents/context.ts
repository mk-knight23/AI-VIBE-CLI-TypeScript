import * as crypto from 'crypto';
import { toolRegistry, checkpointSystem, sandbox } from '../tools/index.js';
import { approvalManager } from '../approvals/index.js';
import { ToolDefinition, ToolResult, ToolContext } from '../tools/registry/index.js';

export class AgentExecutionContext {
  workingDir: string;
  dryRun: boolean = false;
  sessionId: string;
  checkpointCreated: boolean = false;
  tools: Map<string, ToolDefinition> = new Map();
  results: ToolResult[] = [];

  constructor(options: { workingDir?: string; sessionId?: string; dryRun?: boolean } = {}) {
    this.workingDir = options.workingDir || process.cwd();
    this.sessionId = options.sessionId || crypto.randomUUID();
    this.dryRun = options.dryRun || false;

    // Load available tools
    for (const tool of toolRegistry.list()) {
      this.tools.set(tool.name, tool);
    }
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  async executeTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, output: '', error: `Tool not found: ${name}`, duration: 0 };
    }

    const context: ToolContext = {
      workingDir: this.workingDir,
      dryRun: this.dryRun,
      sandbox: sandbox.getConfig().enabled,
      sessionId: this.sessionId,
      approvalSystem: {
        async request(description: string, operations: string[], risk: 'low' | 'medium' | 'high' | 'critical'): Promise<boolean> {
          return approvalManager.request(description, operations, risk);
        },
      },
    };

    const result = await tool.handler(args, context);
    this.results.push(result);
    return result;
  }

  async createCheckpoint(description: string): Promise<string | null> {
    return checkpointSystem.createSync(this.sessionId, description) || null;
  }

  async restoreCheckpoint(checkpointId: string): Promise<boolean> {
    return checkpointSystem.restoreSync(checkpointId);
  }
}
