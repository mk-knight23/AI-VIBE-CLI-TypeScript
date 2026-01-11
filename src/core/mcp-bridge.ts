import axios from 'axios';

export interface MCPTool {
    name: string;
    description: string;
    inputSchema: any;
}

export class MCPBridge {
    private serverUrl: string;

    constructor(serverUrl: string = 'http://localhost:3000') {
        this.serverUrl = serverUrl;
    }

    async listTools(): Promise<MCPTool[]> {
        try {
            const response = await axios.get(`${this.serverUrl}/tools`);
            return response.data.tools;
        } catch (e) {
            return [];
        }
    }

    async callTool(name: string, args: any): Promise<any> {
        try {
            const response = await axios.post(`${this.serverUrl}/call`, { name, arguments: args });
            return response.data.result;
        } catch (e: any) {
            throw new Error(`MCP Tool call failed: ${e.message}`);
        }
    }
}
