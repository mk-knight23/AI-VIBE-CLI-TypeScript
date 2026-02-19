import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enhancedMCPManager } from '../../src/mcp/enhanced-manager';
import { pluginManager, VibePlugin } from '../../src/core/plugins/plugin-manager';

describe('Plugin & MCP Productionization', () => {
    describe('EnhancedMCPManager', () => {
        it('should return server status', () => {
            const status = enhancedMCPManager.getServerStatus();
            expect(Array.isArray(status)).toBe(true);
        });

        it('should handle shutdown cleanly', async () => {
            await expect(enhancedMCPManager.shutdown()).resolves.not.toThrow();
        });
    });

    describe('PluginManager', () => {
        it('should register and initialize plugins', async () => {
            const mockPlugin: VibePlugin = {
                id: 'test-plugin',
                name: 'Test Plugin',
                version: '1.0.0',
                capabilities: ['test-cap'],
                initialize: vi.fn().mockResolvedValue(undefined)
            };

            await pluginManager.registerPlugin(mockPlugin);
            expect(mockPlugin.initialize).toHaveBeenCalled();
            expect(pluginManager.getPlugin('test-plugin')).toBe(mockPlugin);
        });

        it('should aggregate capabilities across systems', async () => {
            const capabilities = await pluginManager.getCapabilities();
            expect(capabilities).toHaveProperty('tools');
            expect(capabilities).toHaveProperty('mcpServers');
            expect(capabilities).toHaveProperty('plugins');
        });
    });
});
