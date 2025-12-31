/**
 * MCP Client Tests - P0
 * Tests for v10 Model Context Protocol integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock child_process before importing
vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    stdin: { write: vi.fn() },
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn(),
    kill: vi.fn(),
  })),
}));

import { MCPClient, createDefaultMCPConfig, MCPServerConfig } from '../../../src/mcp/client';

describe('MCPClient', () => {
  let client: MCPClient;
  let tmpDir: string;

  beforeEach(() => {
    client = new MCPClient();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-mcp-test-'));
  });

  afterEach(() => {
    client.disconnectAll();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('loadConfig', () => {
    it('should return empty array when config missing', () => {
      const result = client.loadConfig(tmpDir);
      expect(result).toEqual([]);
    });

    it('should load config from .vibe/mcp.json', () => {
      const configDir = path.join(tmpDir, '.vibe');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'mcp.json'),
        JSON.stringify({
          servers: [{ name: 'test', command: 'echo', args: ['hello'] }]
        })
      );

      const result = client.loadConfig(tmpDir);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('test');
    });

    it('should handle malformed JSON gracefully', () => {
      const configDir = path.join(tmpDir, '.vibe');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(path.join(configDir, 'mcp.json'), 'not json');

      const result = client.loadConfig(tmpDir);
      expect(result).toEqual([]);
    });
  });

  describe('Server Management', () => {
    it('should list no servers initially', () => {
      expect(client.listServers()).toEqual([]);
    });

    it('should report not connected for unknown server', () => {
      expect(client.isConnected('unknown')).toBe(false);
    });

    it('should get empty tools for unknown server', () => {
      expect(client.getServerTools('unknown')).toEqual([]);
    });

    it('should get all tools as empty initially', () => {
      expect(client.getAllTools()).toEqual([]);
    });
  });

  describe('Tool Calls', () => {
    it('should throw error for disconnected server', async () => {
      await expect(client.callTool('unknown', 'test', {}))
        .rejects.toThrow('MCP server not connected: unknown');
    });
  });
});

describe('createDefaultMCPConfig', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-mcp-config-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should create .vibe directory if missing', () => {
    const configPath = createDefaultMCPConfig(tmpDir);
    expect(fs.existsSync(path.join(tmpDir, '.vibe'))).toBe(true);
    expect(configPath).toContain('.vibe/mcp.json');
  });

  it('should create valid JSON config', () => {
    createDefaultMCPConfig(tmpDir);
    const content = fs.readFileSync(path.join(tmpDir, '.vibe', 'mcp.json'), 'utf8');
    const config = JSON.parse(content);
    expect(config.servers).toBeDefined();
    expect(Array.isArray(config.servers)).toBe(true);
  });

  it('should include filesystem server by default', () => {
    createDefaultMCPConfig(tmpDir);
    const content = fs.readFileSync(path.join(tmpDir, '.vibe', 'mcp.json'), 'utf8');
    const config = JSON.parse(content);
    expect(config.servers.some((s: MCPServerConfig) => s.name === 'filesystem')).toBe(true);
  });
});
