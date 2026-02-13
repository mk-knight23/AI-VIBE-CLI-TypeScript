import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Header } from './Header.js';
import { Sidebar } from './Sidebar.js';
import { OrchestrationPrimitive } from '../../domain/primitives/orchestration.js';
import { EnhancedMCPManager } from '../../mcp/enhanced-manager.js';

export interface AppProps {
    orchestrator: OrchestrationPrimitive;
    mcpManager: EnhancedMCPManager;
}

export const App: React.FC<AppProps> = ({ orchestrator, mcpManager }) => {
    const [projectStatus, setProjectStatus] = useState({
        name: 'VIBE-CLI',
        branch: 'main',
        mcpServers: mcpManager.listServers().length,
        tasksCount: 0
    });
    const [feed, setFeed] = useState<string[]>([
        'System Ready. Waiting for intent...'
    ]);

    useEffect(() => {
        const handleSuggestion = (data: any) => {
            setFeed(prev => [...prev.slice(-10), `[PROACTIVE] ${data.suggestion}`]);
        };

        const handleStepStart = (step: any) => {
            setFeed(prev => [...prev.slice(-10), `[EXEC] Running ${step.primitive}: ${step.task}`]);
        };

        orchestrator.on('proactive:suggestion', handleSuggestion);
        orchestrator.on('step:start', handleStepStart);

        return () => {
            orchestrator.off('proactive:suggestion', handleSuggestion);
            orchestrator.off('step:start', handleStepStart);
        };
    }, [orchestrator]);

    return (
        <Box flexDirection="column" padding={1}>
            <Header />

            <Box flexDirection="row">
                <Sidebar
                    project={projectStatus.name}
                    branch={projectStatus.branch}
                    mcpServers={projectStatus.mcpServers}
                    tasksCount={projectStatus.tasksCount}
                />

                <Box
                    flexDirection="column"
                    flexGrow={1}
                    marginLeft={2}
                    borderStyle="round"
                    borderColor="cyan"
                    paddingX={1}
                    minHeight={10}
                >
                    <Text bold color="cyan">ACTIVITY FEED</Text>
                    <Box marginTop={1} flexDirection="column">
                        {feed.map((line, i) => (
                            <Text key={i} color={line.includes('[PROACTIVE]') ? 'yellow' : 'gray'}>
                                {i === feed.length - 1 ? '→ ' : '  '}{line}
                            </Text>
                        ))}
                    </Box>
                </Box>
            </Box>

            <Box marginTop={1} paddingX={1} backgroundColor="blue">
                <Text color="white" bold> FEEDBACK </Text>
                <Text color="white"> | Type your intent to start a session...</Text>
            </Box>
        </Box>
    );
};
