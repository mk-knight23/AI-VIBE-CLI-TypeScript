/**
 * MCP Manager Tests - v10.1 Unified Transport
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DIR = path.join(process.cwd(), '.vibe-test-mcp');

describe('MCP Manager', () => {
  beforeEach(() => {
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('Config Management', () => {
    it('should load empty config when no file exists', async () => {
      const { mcpManager } = await import('../../../src/mcp/manager');
      const configs = mcpManager.loadConfig(TEST_DIR);
      expect(configs).toEqual([]);
    });

    it('should save and load config', async () => {
      const { mcpManager } = await import('../../../src/mcp/manager');
      const servers = [
        { name: 'test', transport: 'stdio' as const, command: 'echo' }
      ];
      
      mcpManager.saveConfig(servers, TEST_DIR);
      const loaded = mcpManager.loadConfig(TEST_DIR);
      
      expect(loaded.length).toBe(1);
      expect(loaded[0].name).toBe('test');
    });

    it('should add server to config', async () => {
      const { mcpManager } = await import('../../../src/mcp/manager');
      
      mcpManager.addServer({
        name: 'new-server',
        transport: 'sse',
        url: 'http://localhost:3000'
      }, TEST_DIR);
      
      const configs = mcpManager.loadConfig(TEST_DIR);
      expect(configs.length).toBe(1);
      expect(configs[0].name).toBe('new-server');
      expect(configs[0].transport).toBe('sse');
    });

    it('should remove server from config', async () => {
      const { mcpManager } = await import('../../../src/mcp/manager');
      
      mcpManager.addServer({ name: 'to-remove', transport: 'stdio', command: 'test' }, TEST_DIR);
      expect(mcpManager.loadConfig(TEST_DIR).length).toBe(1);
      
      const removed = mcpManager.removeServer('to-remove', TEST_DIR);
      expect(removed).toBe(true);
      expect(mcpManager.loadConfig(TEST_DIR).length).toBe(0);
    });

    it('should return false when removing non-existent server', async () => {
      const { mcpManager } = await import('../../../src/mcp/manager');
      const removed = mcpManager.removeServer('nonexistent', TEST_DIR);
      expect(removed).toBe(false);
    });
  });

  describe('Server Listing', () => {
    it('should list connected servers with transport type', async () => {
      const { mcpManager } = await import('../../../src/mcp/manager');
      // Just test the method exists and returns correct format
      const servers = mcpManager.listServers();
      expect(Array.isArray(servers)).toBe(true);
    });

    it('should check if server is connected', async () => {
      const { mcpManager } = await import('../../../src/mcp/manager');
      expect(mcpManager.isConnected('nonexistent')).toBe(false);
    });

    it('should get transport type for server', async () => {
      const { mcpManager } = await import('../../../src/mcp/manager');
      expect(mcpManager.getTransport('nonexistent')).toBeUndefined();
    });
  });

  describe('Tool Listing', () => {
    it('should get all tools from all servers', async () => {
      const { mcpManager } = await import('../../../src/mcp/manager');
      const tools = mcpManager.getAllTools();
      expect(Array.isArray(tools)).toBe(true);
    });

    it('should get tools from specific server', async () => {
      const { mcpManager } = await import('../../../src/mcp/manager');
      const tools = mcpManager.getServerTools('nonexistent');
      expect(tools).toEqual([]);
    });
  });
});

describe('MCP Templates', () => {
  it('should have filesystem template', async () => {
    const { MCP_TEMPLATES } = await import('../../../src/mcp/manager');
    expect(MCP_TEMPLATES.filesystem).toBeDefined();
    expect(MCP_TEMPLATES.filesystem.transport).toBe('stdio');
    expect(MCP_TEMPLATES.filesystem.command).toBe('npx');
  });

  it('should have git template', async () => {
    const { MCP_TEMPLATES } = await import('../../../src/mcp/manager');
    expect(MCP_TEMPLATES.git).toBeDefined();
  });

  it('should have fetch template', async () => {
    const { MCP_TEMPLATES } = await import('../../../src/mcp/manager');
    expect(MCP_TEMPLATES.fetch).toBeDefined();
  });

  it('should have memory template', async () => {
    const { MCP_TEMPLATES } = await import('../../../src/mcp/manager');
    expect(MCP_TEMPLATES.memory).toBeDefined();
  });
});

describe('SSE Client', () => {
  it('should export SSEMCPClient', async () => {
    const { SSEMCPClient, sseMcpClient } = await import('../../../src/mcp/sse-client');
    expect(SSEMCPClient).toBeDefined();
    expect(sseMcpClient).toBeDefined();
  });

  it('should have streaming support', async () => {
    const { sseMcpClient } = await import('../../../src/mcp/sse-client');
    expect(typeof sseMcpClient.streamToolCall).toBe('function');
  });
});

describe('Compatibility Contract - MCP', () => {
  it('should export all required modules', async () => {
    const mcp = await import('../../../src/mcp');
    
    // Original exports
    expect(mcp.MCPClient).toBeDefined();
    expect(mcp.mcpClient).toBeDefined();
    expect(mcp.createDefaultMCPConfig).toBeDefined();
    
    // SSE exports
    expect(mcp.SSEMCPClient).toBeDefined();
    expect(mcp.sseMcpClient).toBeDefined();
    
    // Manager exports
    expect(mcp.mcpManager).toBeDefined();
    expect(mcp.MCP_TEMPLATES).toBeDefined();
  });

  it('mcpManager should have required methods', async () => {
    const { mcpManager } = await import('../../../src/mcp');
    
    expect(typeof mcpManager.loadConfig).toBe('function');
    expect(typeof mcpManager.saveConfig).toBe('function');
    expect(typeof mcpManager.connect).toBe('function');
    expect(typeof mcpManager.connectAll).toBe('function');
    expect(typeof mcpManager.disconnect).toBe('function');
    expect(typeof mcpManager.disconnectAll).toBe('function');
    expect(typeof mcpManager.callTool).toBe('function');
    expect(typeof mcpManager.streamToolCall).toBe('function');
    expect(typeof mcpManager.getAllTools).toBe('function');
    expect(typeof mcpManager.listServers).toBe('function');
    expect(typeof mcpManager.addServer).toBe('function');
    expect(typeof mcpManager.removeServer).toBe('function');
  });
});
