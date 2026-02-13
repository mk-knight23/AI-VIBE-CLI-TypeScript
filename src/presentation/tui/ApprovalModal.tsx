import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export interface ApprovalModalProps {
    message: string;
    rationale?: string;
    onApprove: () => void;
    onDeny: () => void;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({ message, rationale, onApprove, onDeny }) => {
    const [selected, setSelected] = useState<'yes' | 'no'>('no');

    useInput((input, key) => {
        if (key.leftArrow || key.rightArrow) {
            setSelected(prev => (prev === 'yes' ? 'no' : 'yes'));
        }
        if (key.return) {
            selected === 'yes' ? onApprove() : onDeny();
        }
        if (key.escape) {
            onDeny();
        }
        if (input.toLowerCase() === 'y') {
            onApprove();
        }
        if (input.toLowerCase() === 'n') {
            onDeny();
        }
    });

    return (
        <Box
            flexDirection="column"
            borderStyle="double"
            borderColor="yellow"
            padding={1}
            width={60}
        >
            <Text bold color="yellow">⚠️  ACTION REQUIRED: Approval Requested</Text>
            <Box marginTop={1}>
                <Text>{message}</Text>
            </Box>
            {rationale && (
                <Box marginTop={1}>
                    <Text color="gray">Rationale: {rationale}</Text>
                </Box>
            )}

            <Box marginTop={2} justifyContent="center">
                <Box paddingX={2} backgroundColor={selected === 'yes' ? 'green' : undefined}>
                    <Text color={selected === 'yes' ? 'white' : 'green'} bold> [ (Y)ES ] </Text>
                </Box>
                <Box marginLeft={4} paddingX={2} backgroundColor={selected === 'no' ? 'red' : undefined}>
                    <Text color={selected === 'no' ? 'white' : 'red'} bold> [ (N)O ] </Text>
                </Box>
            </Box>
            <Box marginTop={1} justifyContent="center" flexDirection="column" alignItems="center">
                <Text color="gray">Use ← → arrows to select, Enter to confirm</Text>
                <Text color="gray">Shortcuts: 'y' to approve, 'n' or Esc to deny</Text>
            </Box>
        </Box>
    );
};
