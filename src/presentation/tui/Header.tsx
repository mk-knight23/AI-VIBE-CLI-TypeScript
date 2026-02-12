import React from 'react';
import { Box, Text } from 'ink';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';

export const Header: React.FC = () => {
    return (
        <Box flexDirection="column" marginBottom={1}>
            <Gradient name="pastel">
                <BigText text="VIBE" font="tiny" />
            </Gradient>
            <Box borderStyle="round" borderColor="cyan" paddingX={1}>
                <Text color="white">Next-Gen AI Developer Teammate | </Text>
                <Text color="cyan" bold>v0.1.0</Text>
                <Box marginLeft={2}>
                    <Text color="gray">System Status:</Text>
                    <Text color="green"> READY</Text>
                </Box>
            </Box>
        </Box>
    );
};
