import React from 'react';
import { Box, Text } from 'ink';

export interface SidebarProps {
    project: string;
    branch: string;
    mcpServers: number;
    tasksCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ project, branch, mcpServers, tasksCount }) => {
    return (
        <Box
            flexDirection="column"
            borderStyle="single"
            borderColor="gray"
            paddingX={1}
            width={30}
        >
            <Text bold color="yellow">PROJECT INFO</Text>
            <Box marginTop={1} flexDirection="column">
                <Text>Name: <Text color="cyan">{project}</Text></Text>
                <Text>Branch: <Text color="magenta">{branch}</Text></Text>
            </Box>

            <Box marginTop={1} flexDirection="column">
                <Text bold color="yellow">ECOSYSTEM</Text>
                <Text>MCP Servers: <Text color="green">{mcpServers}</Text></Text>
                <Text>Active Tasks: <Text color="cyan">{tasksCount}</Text></Text>
            </Box>

            <Box marginTop={1} flexDirection="column">
                <Text bold color="yellow">METRICS</Text>
                <Text color="gray">CPU: 12%</Text>
                <Text color="gray">MEM: 145MB</Text>
            </Box>
        </Box>
    );
};
