/**
 * VIBE Agent Tools
 * Bridges core primitives to the agent system
 */

import { ToolDefinition, ToolContext, ToolResult } from '../tools/registry/index.js';
import { ExecutionPrimitive } from '../domain/primitives/execution.js';
import { MultiEditPrimitive } from '../domain/primitives/multi-edit.js';
import { SearchPrimitive } from '../domain/primitives/search.js';
import { MemoryPrimitive } from '../domain/primitives/memory.js';
import { ApprovalPrimitive } from '../domain/primitives/approval.js';

export type VibeTool = ToolDefinition;

/**
 * Shell Execution Tool
 */
export const shellTool: VibeTool = {
    name: 'shell',
    description: 'Execute a shell command in the current directory',
    category: 'shell',
    schema: {
        type: 'object',
        properties: {
            command: { type: 'string', description: 'The command to execute' },
            cwd: { type: 'string', description: 'Working directory' },
            task: { type: 'string', description: 'Natural language task (if command not provided)' },
        },
    },
    riskLevel: 'high',
    requiresApproval: true,
    handler: async (args: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
        const startTime = Date.now();
        const primitive = new ExecutionPrimitive();
        const result = await primitive.execute({
            command: args.command,
            cwd: args.cwd || context.workingDir,
            task: args.task,
        });

        return {
            success: result.success,
            output: result.data?.output || result.data?.stdout || '',
            error: result.error,
            data: result.data,
            duration: Date.now() - startTime,
        };
    },
};

/**
 * Multi-File Edit Tool
 */
export const editTool: VibeTool = {
    name: 'edit',
    description: 'Apply multi-file edits or create new files',
    category: 'code',
    schema: {
        type: 'object',
        properties: {
            files: { type: 'array', description: 'Files to edit', items: { type: 'string', description: 'File path' } },
            request: { type: 'string', description: 'Description of changes to make' },
        },
    },
    riskLevel: 'medium',
    requiresApproval: true,
    handler: async (args: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
        const startTime = Date.now();
        const primitive = new MultiEditPrimitive();
        const result = await primitive.execute({
            files: args.files,
            description: args.request,
        });

        return {
            success: result.success,
            output: result.success ? `Successfully applied edits to ${args.files?.join(', ') || 'new files'}` : 'Failed to apply edits',
            error: result.error,
            data: result.data,
            filesChanged: result.data?.appliedFiles,
            duration: Date.now() - startTime,
        };
    },
};

/**
 * Search Tool
 */
export const searchTool: VibeTool = {
    name: 'search',
    description: 'Search for text patterns across the codebase',
    category: 'search',
    schema: {
        type: 'object',
        properties: {
            query: { type: 'string', description: 'Search query' },
            path: { type: 'string', description: 'Path to search in' },
        },
    },
    riskLevel: 'low',
    requiresApproval: false,
    handler: async (args: Record<string, any>, _context: ToolContext): Promise<ToolResult> => {
        const startTime = Date.now();
        const primitive = new SearchPrimitive();
        const result = await primitive.execute({
            query: args.query,
            path: args.path || '.',
        });

        const files = result.data?.files || [];
        return {
            success: result.success,
            output: result.success ? `Found ${files.length} matches for "${args.query}"` : 'Search failed',
            error: result.error,
            data: result.data,
            duration: Date.now() - startTime,
        };
    },
};

/**
 * Memory Tool
 */
export const memoryTool: VibeTool = {
    name: 'memory',
    description: 'Store or retrieve information from session memory',
    category: 'filesystem',
    schema: {
        type: 'object',
        properties: {
            action: { type: 'string', description: 'Action to perform', enum: ['store', 'retrieve', 'search', 'document'] },
            key: { type: 'string', description: 'Key for storage/retrieval' },
            value: { type: 'string', description: 'Value to store' },
            query: { type: 'string', description: 'Query for searching' },
        },
    },
    riskLevel: 'low',
    requiresApproval: false,
    handler: async (args: Record<string, any>, _context: ToolContext): Promise<ToolResult> => {
        const startTime = Date.now();
        const primitive = new MemoryPrimitive();
        const result = await primitive.execute(args);

        return {
            success: result.success,
            output: result.success ? `Memory action "${args.action}" successful` : 'Memory action failed',
            error: result.error,
            data: result.data,
            duration: Date.now() - startTime,
        };
    },
};

/**
 * Approval Tool
 */
export const approvalTool: VibeTool = {
    name: 'approval',
    description: 'Explicitly request user approval for an action',
    category: 'shell',
    schema: {
        type: 'object',
        properties: {
            message: { type: 'string', description: 'The message to show the user' },
            risk: { type: 'string', description: 'Risk level', enum: ['low', 'medium', 'high', 'critical'] },
        },
    },
    riskLevel: 'low',
    requiresApproval: false,
    handler: async (args: Record<string, any>, _context: ToolContext): Promise<ToolResult> => {
        const startTime = Date.now();
        const primitive = new ApprovalPrimitive();
        const result = await primitive.execute(args);

        return {
            success: result.success,
            output: result.success ? 'Approval granted' : 'Approval denied',
            error: result.error,
            duration: Date.now() - startTime,
        };
    },
};

/**
 * Register all default tools in an execution context
 */
export function registerDefaultTools(context: { registerTool: (tool: VibeTool) => void }) {
    context.registerTool(shellTool);
    context.registerTool(editTool);
    context.registerTool(searchTool);
    context.registerTool(memoryTool);
    context.registerTool(approvalTool);
}
