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
export declare class ToolRegistry {
    private tools;
    constructor();
    /**
     * Register a new tool
     */
    register(tool: ToolDefinition): void;
    /**
     * Get a tool by name
     */
    get(name: string): ToolDefinition | undefined;
    /**
     * List all tools
     */
    list(): ToolDefinition[];
    /**
     * List tools by category
     */
    listByCategory(category: ToolCategory): ToolDefinition[];
    /**
     * Get tools that require approval
     */
    getApprovalRequired(): ToolDefinition[];
}
export declare const toolRegistry: ToolRegistry;
export { ToolRegistry as VibeToolRegistry };
//# sourceMappingURL=index.d.ts.map