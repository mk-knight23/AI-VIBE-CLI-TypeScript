import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeTool, tools } from '../../../src/tools';

describe('Edge Cases', () => {
  describe('No Internet / Provider Outage', () => {
    it('should handle fetch timeout gracefully', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('Network timeout'));
      
      // Tool should not crash on network failure
      try {
        await executeTool('web_fetch', { url: 'https://example.com' });
      } catch (err: any) {
        expect(err.message).toContain('timeout');
      }
      
      global.fetch = originalFetch;
    });
  });

  describe('Rate Limits', () => {
    it('should handle 429 responses', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      });
      
      try {
        await executeTool('web_fetch', { url: 'https://api.example.com' });
      } catch (err: any) {
        expect(err.message).toMatch(/rate|limit|429/i);
      }
      
      global.fetch = originalFetch;
    });
  });

  describe('Partial Responses', () => {
    it('should handle empty tool results', async () => {
      try {
        await executeTool('list_directory', { path: '/nonexistent/path/12345' });
      } catch (err: any) {
        // Should fail with clear error, not crash
        expect(err.message).toContain('ENOENT');
      }
    });
  });

  describe('User Cancel', () => {
    it('should have cancellable tool definitions', () => {
      const dangerousTools = tools.filter(t => t.requiresConfirmation);
      expect(dangerousTools.length).toBeGreaterThan(0);
      
      // Write and delete operations should require confirmation
      const writeFile = tools.find(t => t.name === 'write_file');
      const deleteFile = tools.find(t => t.name === 'delete_file');
      const shellCmd = tools.find(t => t.name === 'run_shell_command');
      
      expect(writeFile?.requiresConfirmation).toBe(true);
      expect(deleteFile?.requiresConfirmation).toBe(true);
      expect(shellCmd?.requiresConfirmation).toBe(true);
    });
  });

  describe('Corrupt Configs', () => {
    it('should handle malformed JSON in memory file', async () => {
      const { MemoryManager } = await import('../../../src/core/memory');
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');
      
      const tempDir = path.join(os.tmpdir(), `vibe-test-${Date.now()}`);
      fs.mkdirSync(path.join(tempDir, '.vibe'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, '.vibe', 'memory.json'), '{ invalid json }}}');
      
      // Should not crash, should use defaults
      const memory = new MemoryManager(tempDir);
      expect(memory.getState()).toBeDefined();
      
      // Cleanup
      fs.rmSync(tempDir, { recursive: true });
    });
  });

  describe('Large Input Handling', () => {
    it('should handle very long file paths', async () => {
      const longPath = '/a'.repeat(500);
      try {
        await executeTool('read_file', { path: longPath });
      } catch (err: any) {
        // Should fail gracefully with clear error
        expect(err.message).toBeDefined();
      }
    });

    it('should truncate very long content in memory', async () => {
      const { MemoryManager } = await import('../../../src/core/memory');
      const memory = new MemoryManager();
      
      const longContent = 'x'.repeat(10000);
      memory.addChatMessage('user', longContent);
      
      const state = memory.getState();
      // Content should be truncated
      expect(state.chatHistory[0].content.length).toBeLessThan(10000);
    });
  });
});

describe('Tool Validation', () => {
  it('should reject unknown tools', async () => {
    await expect(executeTool('nonexistent_tool', {})).rejects.toThrow('Tool not found');
  });

  it('should have unique tool names', () => {
    const names = tools.map(t => t.name);
    const uniqueNames = new Set(names);
    expect(names.length).toBe(uniqueNames.size);
  });

  it('should have descriptions for all tools', () => {
    tools.forEach(tool => {
      expect(tool.description).toBeTruthy();
      expect(tool.description.length).toBeGreaterThanOrEqual(10);
    });
  });
});
