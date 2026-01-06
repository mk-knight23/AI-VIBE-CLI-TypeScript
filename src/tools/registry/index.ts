/**
 * VIBE CLI - Tool Registry
 *
 * Central registry for all tools available to agents:
 * - File system operations (read, write, glob, tree)
 * - Shell command execution (sandboxed)
 * - Git operations
 *
 * Each tool has:
 * - Schema for parameters
 * - Handler function
 * - Risk level
 * - Approval requirements
 *
 * Version: 13.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';

// ============================================================================
// TYPES
// ============================================================================

export type ToolCategory = 'filesystem' | 'shell' | 'git' | 'search' | 'web' | 'code';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface SchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  optional?: boolean;
  enum?: string[];
}

export interface ToolSchema {
  type: 'object';
  properties: Record<string, SchemaProperty>;
  required?: string[];
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
  filesChanged?: string[];
  data?: unknown;
  duration: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  category: ToolCategory;
  schema: ToolSchema;
  handler: (args: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  examples?: string[];
}

export interface ToolContext {
  workingDir: string;
  dryRun?: boolean;
  sandbox?: boolean;
  sessionId: string;
  approvalSystem: {
    request: (description: string, operations: string[], risk: RiskLevel) => Promise<boolean>;
  };
}

// ============================================================================
// TOOLS
// ============================================================================

// Simple glob implementation without dependencies
async function globFiles(pattern: string, options?: { cwd?: string; ignore?: string[] }): Promise<string[]> {
  const cwd = options?.cwd || process.cwd();
  const ignore = options?.ignore || [];

  // Use git ls-files for tracked files, find for all files
  try {
    const output = child_process.execSync('git ls-files', {
      encoding: 'utf-8',
      cwd,
    });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    // Fallback: use find command
    try {
      const output = child_process.execSync(`find . -type f -name "${pattern.replace(/\*/g, '*')}"`, {
        encoding: 'utf-8',
        cwd,
      });
      return output.trim().split('\n').filter(Boolean).map((f) => f.replace(/^\.\//, ''));
    } catch {
      return [];
    }
  }
}

// ============================================================================
// FILE SYSTEM TOOLS
// ============================================================================

const FileSystemTools: ToolDefinition[] = [
  {
    name: 'file_read',
    description: 'Read the contents of a file',
    category: 'filesystem',
    schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to read' },
        encoding: { type: 'string', description: 'File encoding (default: utf-8)', optional: true },
        lineStart: { type: 'number', description: 'Start line number', optional: true },
        lineEnd: { type: 'number', description: 'End line number', optional: true },
      },
      required: ['path'],
    },
    riskLevel: 'low',
    requiresApproval: false,
    handler: async (args, ctx) => {
      const startTime = Date.now();
      const filePath = path.resolve(ctx.workingDir, args.path as string);

      if (!fs.existsSync(filePath)) {
        return { success: false, output: '', error: `File not found: ${args.path}`, duration: Date.now() - startTime };
      }

      try {
        let content = fs.readFileSync(filePath, 'utf-8');

        // Handle line range
        if (args.lineStart || args.lineEnd) {
          const lines = content.split('\n');
          const start = (args.lineStart as number) || 1;
          const end = (args.lineEnd as number) || lines.length;
          content = lines.slice(start - 1, end).join('\n');
        }

        return {
          success: true,
          output: content,
          duration: Date.now() - startTime,
        };
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: Date.now() - startTime,
        };
      }
    },
  },
  {
    name: 'file_write',
    description: 'Create or overwrite a file with content',
    category: 'filesystem',
    schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to create/modify' },
        content: { type: 'string', description: 'Content to write to the file' },
        mode: { type: 'string', description: 'Write mode: overwrite, append, insert', optional: true },
        lineNumber: { type: 'number', description: 'Line number for insert mode', optional: true },
      },
      required: ['path', 'content'],
    },
    riskLevel: 'medium',
    requiresApproval: true,
    handler: async (args, ctx) => {
      const startTime = Date.now();
      const filePath = path.resolve(ctx.workingDir, args.path as string);

      if (ctx.dryRun) {
        return { success: true, output: `[DRY RUN] Would write ${(args.content as string).length} bytes to ${filePath}`, duration: Date.now() - startTime };
      }

      try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        if (args.mode === 'append') {
          fs.appendFileSync(filePath, args.content as string);
        } else if (args.mode === 'insert' && args.lineNumber) {
          const lines = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8').split('\n') : [];
          lines.splice((args.lineNumber as number) - 1, 0, args.content as string);
          fs.writeFileSync(filePath, lines.join('\n'));
        } else {
          fs.writeFileSync(filePath, args.content as string);
        }

        return {
          success: true,
          output: `Written to ${filePath}`,
          filesChanged: [filePath],
          duration: Date.now() - startTime,
        };
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: Date.now() - startTime,
        };
      }
    },
  },
  {
    name: 'file_glob',
    description: 'Find files matching a pattern',
    category: 'filesystem',
    schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Glob pattern (e.g., "**/*.ts")' },
        cwd: { type: 'string', description: 'Working directory', optional: true },
        ignore: { type: 'array', description: 'Patterns to ignore', optional: true },
      },
      required: ['pattern'],
    },
    riskLevel: 'low',
    requiresApproval: false,
    handler: async (args, ctx) => {
      const startTime = Date.now();
      const files = await globFiles(args.pattern as string, {
        cwd: (args.cwd as string) || ctx.workingDir,
        ignore: args.ignore as string[],
      });

      return {
        success: true,
        output: files.join('\n'),
        data: { files },
        duration: Date.now() - startTime,
      };
    },
  },
  {
    name: 'file_tree',
    description: 'Get directory tree structure',
    category: 'filesystem',
    schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path (default: current directory)' },
        maxDepth: { type: 'number', description: 'Maximum depth', optional: true },
      },
    },
    riskLevel: 'low',
    requiresApproval: false,
    handler: async (args, ctx) => {
      const startTime = Date.now();
      const targetPath = path.resolve(ctx.workingDir, (args.path as string) || '.');

      function buildTree(dir: string, depth: number, maxDepth: number): string {
        if (depth > maxDepth) return '';

        const items: string[] = [];
        const entries = fs.readdirSync(path.join(ctx.workingDir, dir), { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const indent = '  '.repeat(depth);

          if (entry.isDirectory()) {
            items.push(`${indent}📁 ${entry.name}/`);
            items.push(buildTree(fullPath, depth + 1, maxDepth));
          } else {
            items.push(`${indent}📄 ${entry.name}`);
          }
        }

        return items.join('\n');
      }

      const tree = buildTree(path.relative(ctx.workingDir, targetPath) || '.', 0, (args.maxDepth as number) || 3);

      return {
        success: true,
        output: tree,
        duration: Date.now() - startTime,
      };
    },
  },
  {
    name: 'file_search',
    description: 'Search for files containing a pattern',
    category: 'filesystem',
    schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Search pattern (regex or string)' },
        path: { type: 'string', description: 'Path to search in', optional: true },
        fileType: { type: 'string', description: 'Filter by file type', optional: true },
      },
      required: ['pattern'],
    },
    riskLevel: 'low',
    requiresApproval: false,
    handler: async (args, ctx) => {
      const startTime = Date.now();
      const searchPath = path.resolve(ctx.workingDir, (args.path as string) || '.');

      const results: string[] = [];
      const regex = new RegExp(args.pattern as string);

      function searchInDir(dir: string) {
        const entries = fs.readdirSync(path.join(ctx.workingDir, dir), { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.startsWith('node_modules')) {
            searchInDir(fullPath);
          } else if (entry.isFile()) {
            if (args.fileType && !entry.name.endsWith(args.fileType as string)) continue;

            try {
              const content = fs.readFileSync(path.join(ctx.workingDir, fullPath), 'utf-8');
              if (regex.test(content)) {
                results.push(fullPath);
              }
            } catch {
              // Skip unreadable files
            }
          }
        }
      }

      searchInDir(searchPath);

      return {
        success: true,
        output: results.join('\n'),
        data: { files: results },
        duration: Date.now() - startTime,
      };
    },
  },
];

// ============================================================================
// SHELL TOOLS
// ============================================================================

const ShellTools: ToolDefinition[] = [
  {
    name: 'shell_exec',
    description: 'Execute a shell command',
    category: 'shell',
    schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Command to execute' },
        timeout: { type: 'number', description: 'Timeout in milliseconds', optional: true },
      },
      required: ['command'],
    },
    riskLevel: 'high',
    requiresApproval: true,
    handler: async (args, ctx) => {
      const startTime = Date.now();

      if (ctx.dryRun) {
        return { success: true, output: `[DRY RUN] Would execute: ${args.command}`, duration: Date.now() - startTime };
      }

      try {
        const output = child_process.execSync(args.command as string, {
          encoding: 'utf-8',
          timeout: (args.timeout as number) || 60000,
          maxBuffer: 10 * 1024 * 1024,
          cwd: ctx.workingDir,
        });

        return {
          success: true,
          output,
          duration: Date.now() - startTime,
        };
      } catch (error: any) {
        return {
          success: false,
          output: error.stdout?.toString() || '',
          error: error.message,
          exitCode: error.status,
          duration: Date.now() - startTime,
        };
      }
    },
  },
];

// ============================================================================
// GIT TOOLS
// ============================================================================

const GitTools: ToolDefinition[] = [
  {
    name: 'git_status',
    description: 'Show working tree status',
    category: 'git',
    schema: {
      type: 'object',
      properties: {
        short: { type: 'boolean', description: 'Use short format', optional: true },
      },
    },
    riskLevel: 'low',
    requiresApproval: false,
    handler: async (args, ctx) => {
      const startTime = Date.now();

      try {
        const output = child_process.execSync(`git status ${args.short ? '--short' : ''}`, {
          encoding: 'utf-8',
          cwd: ctx.workingDir,
        });

        return { success: true, output, duration: Date.now() - startTime };
      } catch (error: any) {
        return {
          success: false,
          output: '',
          error: error.message,
          duration: Date.now() - startTime,
        };
      }
    },
  },
  {
    name: 'git_diff',
    description: 'Show changes between commits',
    category: 'git',
    schema: {
      type: 'object',
      properties: {
        staged: { type: 'boolean', description: 'Show staged changes', optional: true },
        file: { type: 'string', description: 'Show diff for specific file', optional: true },
      },
    },
    riskLevel: 'low',
    requiresApproval: false,
    handler: async (args, ctx) => {
      const startTime = Date.now();

      try {
        let cmd = 'git diff';
        if (args.staged) cmd += ' --cached';
        if (args.file) cmd += ` -- ${args.file}`;

        const output = child_process.execSync(cmd, {
          encoding: 'utf-8',
          cwd: ctx.workingDir,
        });

        return { success: true, output, duration: Date.now() - startTime };
      } catch (error: any) {
        return {
          success: false,
          output: '',
          error: error.message,
          duration: Date.now() - startTime,
        };
      }
    },
  },
  {
    name: 'git_commit',
    description: 'Record changes to the repository',
    category: 'git',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Commit message' },
        amend: { type: 'boolean', description: 'Amend previous commit', optional: true },
        all: { type: 'boolean', description: 'Stage all changes', optional: true },
      },
      required: ['message'],
    },
    riskLevel: 'high',
    requiresApproval: true,
    handler: async (args, ctx) => {
      const startTime = Date.now();

      if (ctx.dryRun) {
        return { success: true, output: `[DRY RUN] Would commit: ${args.message}`, duration: Date.now() - startTime };
      }

      try {
        if (args.all) {
          child_process.execSync('git add -A', { encoding: 'utf-8', cwd: ctx.workingDir });
        }

        let cmd = `git commit -m "${args.message}"`;
        if (args.amend) cmd += ' --amend';

        const output = child_process.execSync(cmd, {
          encoding: 'utf-8',
          cwd: ctx.workingDir,
        });

        return { success: true, output, duration: Date.now() - startTime };
      } catch (error: any) {
        return {
          success: false,
          output: '',
          error: error.message,
          duration: Date.now() - startTime,
        };
      }
    },
  },
  {
    name: 'git_branch',
    description: 'List, create, or delete branches',
    category: 'git',
    schema: {
      type: 'object',
      properties: {
        operation: { type: 'string', description: 'Operation: list, create, delete' },
        name: { type: 'string', description: 'Branch name' },
        delete: { type: 'boolean', description: 'Force delete', optional: true },
      },
    },
    riskLevel: 'medium',
    requiresApproval: true,
    handler: async (args, ctx) => {
      const startTime = Date.now();

      if (ctx.dryRun && args.operation !== 'list') {
        return { success: true, output: `[DRY RUN] Would ${args.operation} branch: ${args.name}`, duration: Date.now() - startTime };
      }

      try {
        let cmd = 'git branch';
        if (args.operation === 'list') {
          const output = child_process.execSync(cmd, { encoding: 'utf-8', cwd: ctx.workingDir });
          return { success: true, output, duration: Date.now() - startTime };
        } else if (args.operation === 'create' && args.name) {
          cmd = `git branch ${args.name}`;
        } else if (args.operation === 'delete' && args.name) {
          cmd = `git branch ${args.delete ? '-D' : '-d'} ${args.name}`;
        } else {
          return { success: false, output: '', error: 'Invalid branch operation', duration: Date.now() - startTime };
        }

        const output = child_process.execSync(cmd, { encoding: 'utf-8', cwd: ctx.workingDir });
        return { success: true, output, duration: Date.now() - startTime };
      } catch (error: any) {
        return {
          success: false,
          output: '',
          error: error.message,
          duration: Date.now() - startTime,
        };
      }
    },
  },
];

// ============================================================================
// TOOL REGISTRY
// ============================================================================

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    // Register all tools
    for (const tool of [...FileSystemTools, ...ShellTools, ...GitTools]) {
      this.tools.set(tool.name, tool);
    }
  }

  /**
   * Register a new tool
   */
  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Get a tool by name
   */
  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * List all tools
   */
  list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * List tools by category
   */
  listByCategory(category: ToolCategory): ToolDefinition[] {
    return this.list().filter((t) => t.category === category);
  }

  /**
   * Get tools that require approval
   */
  getApprovalRequired(): ToolDefinition[] {
    return this.list().filter((t) => t.requiresApproval);
  }
}

export const toolRegistry = new ToolRegistry();
export { ToolRegistry as VibeToolRegistry };
