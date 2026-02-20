/**
 * VIBE-CLI v0.0.2 - MCP Server
 * Exposes Vibe Primitives as Model Context Protocol tools.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { createLogger } from "../utils/pino-logger.js";
import { IPrimitive } from "../domain/primitives/types.js";

const logger = createLogger("MCPServer");

export class VibeMCPServer {
    private server: Server;
    private primitives: Map<string, IPrimitive>;

    constructor(primitives: Map<string, IPrimitive> = new Map()) {
        this.primitives = primitives;
        this.server = new Server(
            {
                name: "vibe-cli-server",
                version: "0.0.2",
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        this.setupHandlers();
    }

    private setupHandlers() {
        // List available tools (Vibe Primitives)
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: "vibe_plan",
                        description: "Generate a multi-step execution plan for a technical task.",
                        inputSchema: {
                            type: "object",
                            properties: {
                                task: { type: "string", description: "The task to plan for." },
                                context: { type: "string", description: "Additional codebase context." }
                            },
                            required: ["task"]
                        }
                    },
                    {
                        name: "vibe_execute",
                        description: "Execute a specific command or tool within the Vibe environment.",
                        inputSchema: {
                            type: "object",
                            properties: {
                                command: { type: "string", description: "The shell command to run." }
                            },
                            required: ["command"]
                        }
                    },
                    {
                        name: "vibe_search",
                        description: "Semantic search across the local codebase.",
                        inputSchema: {
                            type: "object",
                            properties: {
                                query: { type: "string", description: "The search query." }
                            },
                            required: ["query"]
                        }
                    },
                    {
                        name: "vibe_get_map",
                        description: "Get a comprehensive structural map of the repository (Aider-style).",
                        inputSchema: {
                            type: "object",
                            properties: {
                                directory: { type: "string", description: "Optional directory to scan." }
                            }
                        }
                    },
                    {
                        name: "vibe_mission",
                        description: "Execute an end-to-end mission (Plan + Execute + Verify + Commit).",
                        inputSchema: {
                            type: "object",
                            properties: {
                                task: { type: "string", description: "The goal to accomplish." },
                                autoCommit: { type: "boolean", description: "Whether to auto-commit on success." },
                                runTests: { type: "boolean", description: "Whether to run tests for verification." }
                            },
                            required: ["task"]
                        }
                    }
                ],
            };
        });

        // Handle tool calls
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            logger.info({ name, args }, "MCP Tool Call");

            try {
                switch (name) {
                    case "vibe_plan":
                        const planner = this.primitives.get('planning');
                        if (planner) {
                            const result = await planner.execute({ task: args?.task });
                            return {
                                content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }]
                            };
                        }
                        return { content: [{ type: "text", text: "Planning primitive not available" }] };
                    case "vibe_execute":
                        const executor = this.primitives.get('execution');
                        if (executor) {
                            const result = await executor.execute({ command: args?.command });
                            return {
                                content: [{ type: "text", text: result.data || result.error || "No output" }]
                            };
                        }
                        return { content: [{ type: "text", text: "Execution primitive not available" }] };
                    case "vibe_search":
                        const searcher = this.primitives.get('search');
                        if (searcher) {
                            const result = await searcher.execute({ query: args?.query });
                            return {
                                content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }]
                            };
                        }
                        return { content: [{ type: "text", text: "Search primitive not available" }] };
                    case "vibe_get_map":
                        const scanner = this.primitives.get('scanning');
                        if (scanner) {
                            const result = await scanner.execute({ directory: args?.directory });
                            return {
                                content: [{ type: "text", text: result.data?.map || "No map generated" }]
                            };
                        }
                        return { content: [{ type: "text", text: "Scanning primitive not available" }] };
                    case "vibe_mission":
                        const mission = this.primitives.get('mission');
                        if (mission) {
                            const result = await mission.execute({
                                task: args?.task,
                                autoCommit: args?.autoCommit,
                                runTests: args?.runTests
                            });
                            return {
                                content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
                            };
                        }
                        return { content: [{ type: "text", text: "Mission primitive not available" }] };
                    default:
                        throw new Error(`Tool not found: ${name}`);
                }
            } catch (error: any) {
                return {
                    isError: true,
                    content: [{ type: "text", text: error.message }]
                };
            }
        });
    }

    public async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        logger.info("Vibe MCP Server running on stdio");
    }
}
