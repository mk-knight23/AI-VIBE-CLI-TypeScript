import { OrchestrationPrimitive } from '../../domain/primitives/orchestration.js';
import { EnhancedMCPManager } from '../../infrastructure/mcp/enhanced-manager.js';
import { App } from './App.js';
import React from 'react';

export const runTUI = async (orchestrator: OrchestrationPrimitive, mcpManager: EnhancedMCPManager) => {
    // Dynamic import for ESM packages in CJS environment
    const { render } = await import('ink');

    // @ts-ignore - Ink types might be picky with dynamic React/Ink
    const { waitUntilExit } = render(<App orchestrator={orchestrator} mcpManager={mcpManager} />);
    return waitUntilExit();
};
