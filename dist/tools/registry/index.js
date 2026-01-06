"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.VibeToolRegistry = exports.toolRegistry = exports.ToolRegistry = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process = __importStar(require("child_process"));
// ============================================================================
// TOOLS
// ============================================================================
// Simple glob implementation without dependencies
async function globFiles(pattern, options) {
    const cwd = options?.cwd || process.cwd();
    const ignore = options?.ignore || [];
    // Use git ls-files for tracked files, find for all files
    try {
        const output = child_process.execSync('git ls-files', {
            encoding: 'utf-8',
            cwd,
        });
        return output.trim().split('\n').filter(Boolean);
    }
    catch {
        // Fallback: use find command
        try {
            const output = child_process.execSync(`find . -type f -name "${pattern.replace(/\*/g, '*')}"`, {
                encoding: 'utf-8',
                cwd,
            });
            return output.trim().split('\n').filter(Boolean).map((f) => f.replace(/^\.\//, ''));
        }
        catch {
            return [];
        }
    }
}
// ============================================================================
// FILE SYSTEM TOOLS
// ============================================================================
const FileSystemTools = [
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
            const filePath = path.resolve(ctx.workingDir, args.path);
            if (!fs.existsSync(filePath)) {
                return { success: false, output: '', error: `File not found: ${args.path}`, duration: Date.now() - startTime };
            }
            try {
                let content = fs.readFileSync(filePath, 'utf-8');
                // Handle line range
                if (args.lineStart || args.lineEnd) {
                    const lines = content.split('\n');
                    const start = args.lineStart || 1;
                    const end = args.lineEnd || lines.length;
                    content = lines.slice(start - 1, end).join('\n');
                }
                return {
                    success: true,
                    output: content,
                    duration: Date.now() - startTime,
                };
            }
            catch (error) {
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
            const filePath = path.resolve(ctx.workingDir, args.path);
            if (ctx.dryRun) {
                return { success: true, output: `[DRY RUN] Would write ${args.content.length} bytes to ${filePath}`, duration: Date.now() - startTime };
            }
            try {
                const dir = path.dirname(filePath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                if (args.mode === 'append') {
                    fs.appendFileSync(filePath, args.content);
                }
                else if (args.mode === 'insert' && args.lineNumber) {
                    const lines = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8').split('\n') : [];
                    lines.splice(args.lineNumber - 1, 0, args.content);
                    fs.writeFileSync(filePath, lines.join('\n'));
                }
                else {
                    fs.writeFileSync(filePath, args.content);
                }
                return {
                    success: true,
                    output: `Written to ${filePath}`,
                    filesChanged: [filePath],
                    duration: Date.now() - startTime,
                };
            }
            catch (error) {
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
            const files = await globFiles(args.pattern, {
                cwd: args.cwd || ctx.workingDir,
                ignore: args.ignore,
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
            const targetPath = path.resolve(ctx.workingDir, args.path || '.');
            function buildTree(dir, depth, maxDepth) {
                if (depth > maxDepth)
                    return '';
                const items = [];
                const entries = fs.readdirSync(path.join(ctx.workingDir, dir), { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    const indent = '  '.repeat(depth);
                    if (entry.isDirectory()) {
                        items.push(`${indent}📁 ${entry.name}/`);
                        items.push(buildTree(fullPath, depth + 1, maxDepth));
                    }
                    else {
                        items.push(`${indent}📄 ${entry.name}`);
                    }
                }
                return items.join('\n');
            }
            const tree = buildTree(path.relative(ctx.workingDir, targetPath) || '.', 0, args.maxDepth || 3);
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
            const searchPath = path.resolve(ctx.workingDir, args.path || '.');
            const results = [];
            const regex = new RegExp(args.pattern);
            function searchInDir(dir) {
                const entries = fs.readdirSync(path.join(ctx.workingDir, dir), { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.startsWith('node_modules')) {
                        searchInDir(fullPath);
                    }
                    else if (entry.isFile()) {
                        if (args.fileType && !entry.name.endsWith(args.fileType))
                            continue;
                        try {
                            const content = fs.readFileSync(path.join(ctx.workingDir, fullPath), 'utf-8');
                            if (regex.test(content)) {
                                results.push(fullPath);
                            }
                        }
                        catch {
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
const ShellTools = [
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
                const output = child_process.execSync(args.command, {
                    encoding: 'utf-8',
                    timeout: args.timeout || 60000,
                    maxBuffer: 10 * 1024 * 1024,
                    cwd: ctx.workingDir,
                });
                return {
                    success: true,
                    output,
                    duration: Date.now() - startTime,
                };
            }
            catch (error) {
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
const GitTools = [
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
            }
            catch (error) {
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
                if (args.staged)
                    cmd += ' --cached';
                if (args.file)
                    cmd += ` -- ${args.file}`;
                const output = child_process.execSync(cmd, {
                    encoding: 'utf-8',
                    cwd: ctx.workingDir,
                });
                return { success: true, output, duration: Date.now() - startTime };
            }
            catch (error) {
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
                if (args.amend)
                    cmd += ' --amend';
                const output = child_process.execSync(cmd, {
                    encoding: 'utf-8',
                    cwd: ctx.workingDir,
                });
                return { success: true, output, duration: Date.now() - startTime };
            }
            catch (error) {
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
                }
                else if (args.operation === 'create' && args.name) {
                    cmd = `git branch ${args.name}`;
                }
                else if (args.operation === 'delete' && args.name) {
                    cmd = `git branch ${args.delete ? '-D' : '-d'} ${args.name}`;
                }
                else {
                    return { success: false, output: '', error: 'Invalid branch operation', duration: Date.now() - startTime };
                }
                const output = child_process.execSync(cmd, { encoding: 'utf-8', cwd: ctx.workingDir });
                return { success: true, output, duration: Date.now() - startTime };
            }
            catch (error) {
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
class ToolRegistry {
    tools = new Map();
    constructor() {
        // Register all tools
        for (const tool of [...FileSystemTools, ...ShellTools, ...GitTools]) {
            this.tools.set(tool.name, tool);
        }
    }
    /**
     * Register a new tool
     */
    register(tool) {
        this.tools.set(tool.name, tool);
    }
    /**
     * Get a tool by name
     */
    get(name) {
        return this.tools.get(name);
    }
    /**
     * List all tools
     */
    list() {
        return Array.from(this.tools.values());
    }
    /**
     * List tools by category
     */
    listByCategory(category) {
        return this.list().filter((t) => t.category === category);
    }
    /**
     * Get tools that require approval
     */
    getApprovalRequired() {
        return this.list().filter((t) => t.requiresApproval);
    }
}
exports.ToolRegistry = ToolRegistry;
exports.VibeToolRegistry = ToolRegistry;
exports.toolRegistry = new ToolRegistry();
//# sourceMappingURL=index.js.map