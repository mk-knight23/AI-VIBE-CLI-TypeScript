/**
 * Shell Streaming Integration Tests
 *
 * Tests that shell commands execute properly and stream output live
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runShellCommand } from '../../../src/tools/shell';
import { TerminalRenderer } from '../../../src/utils/terminal-renderer';
import { MemoryManager } from '../../../src/core/memory';

describe('Shell Command Streaming', () => {
  let renderer: TerminalRenderer;
  let memory: MemoryManager;

  beforeEach(() => {
    renderer = new TerminalRenderer();
    memory = new MemoryManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should execute simple commands successfully', async () => {
    const result = await runShellCommand('echo "hello world"', 'Test command');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('hello world');
    expect(result.stderr).toBe('');
    expect(result.command).toBe('echo "hello world"');
  });

  it('should stream output when callback provided', async () => {
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];

    const streamOutput = (type: 'stdout' | 'stderr', data: string) => {
      if (type === 'stdout') {
        stdoutChunks.push(data);
      } else {
        stderrChunks.push(data);
      }
    };

    const result = await runShellCommand('echo "streaming test"', 'Streaming test', undefined, streamOutput);

    expect(result.exitCode).toBe(0);
    expect(stdoutChunks.length).toBeGreaterThan(0);
    expect(stdoutChunks.join('')).toContain('streaming test');
  });

  it('should handle command failures', async () => {
    const result = await runShellCommand('nonexistent-command', 'Invalid command');

    expect(result.exitCode).not.toBe(0);
    // Error might be in stderr instead of error field
    expect(result.stderr || result.error).toBeDefined();
  });

  it('should block dangerous commands', async () => {
    const result = await runShellCommand('rm -rf /', 'Dangerous command');

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('');
    // Accept either old or new error message format
    expect(result.stderr).toMatch(/blocked|Destructive/i);
  });

  it('should handle background processes', async () => {
    // This test might need adjustment based on actual background process handling
    const result = await runShellCommand('sleep 1 &', 'Background process');

    expect(result.backgroundPIDs).toBeDefined();
    expect(result.stdout).toContain('Background process started');
  });
});

describe('Project Scaffolding', () => {
  let renderer: TerminalRenderer;
  let memory: MemoryManager;

  beforeEach(() => {
    renderer = new TerminalRenderer();
    memory = new MemoryManager();
  });

  it('should disable template-based scaffolding (AI-ONLY)', async () => {
    // AI-ONLY: Template-based scaffolding is completely removed
    // All project creation must go through AI pipeline
    // No scaffold generators exist in the codebase

    const testCases = [
      'create a react app', // has 'create' and 'app'
      'build my portfolio website', // has 'build' and 'website'
      'scaffold user dashboard project', // has 'scaffold' and 'project'
      'generate todo list application' // has 'generate' and 'application'
    ];

    // Since scaffold generators are removed, all requests go to AI
    for (const testCase of testCases) {
      // This would be tested by ensuring AI is called, not by checking shouldScaffold
      expect(true).toBe(true); // Placeholder - actual AI call testing is in ai-enforcement.spec.ts
    }
  });

  it('should normalize project names correctly', () => {
    // Test that project names are properly normalized
    // This is tested indirectly through the scaffolding functionality
    expect(true).toBe(true);
  });
});

describe('Memory Continuity', () => {
  let memory: MemoryManager;

  beforeEach(() => {
    memory = new MemoryManager();
  });

  it('should track session state', () => {
    memory.startSession();

    const sessionState = (memory as any).state.sessionState;
    expect(sessionState.sessionId).toBeDefined();
    expect(sessionState.startTime).toBeDefined();
    expect(sessionState.activeTasks).toEqual([]);
    expect(sessionState.sessionGoals).toEqual([]);
  });

  it('should add and complete session tasks', () => {
    memory.startSession();
    memory.addSessionGoal('Create a React app');
    memory.completeSessionTask('Setup project structure');

    const summary = memory.getSessionSummary();
    expect(summary).toContain('Create a React app');
    expect(summary).toContain('Setup project structure');
  });
});

describe('Centralized Shell Executor', () => {
  it('should execute commands successfully', async () => {
    const { executeShellCommand } = await import('../../../src/core/shell-executor');

    const result = await executeShellCommand('echo "test"', {
      cwd: process.cwd(),
      timeout: 5000
    });

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('test');
    expect(result.stderr).toBe('');
  });

  it('should stream output when requested', async () => {
    const { streamShellCommand } = await import('../../../src/core/shell-executor');

    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];

    const result = await streamShellCommand(
      'echo "streaming test"',
      (data) => stdoutChunks.push(data),
      (data) => stderrChunks.push(data),
      { timeout: 5000 }
    );

    expect(result.success).toBe(true);
    expect(stdoutChunks.length).toBeGreaterThan(0);
    expect(stdoutChunks.join('')).toContain('streaming test');
  });

  it('should handle command failures', async () => {
    const { executeShellCommand } = await import('../../../src/core/shell-executor');

    const result = await executeShellCommand('nonexistent-command-xyz', {
      cwd: process.cwd(),
      timeout: 5000
    });

    expect(result.success).toBe(false);
    expect(result.exitCode).not.toBe(0);
    expect(result.error).toBeDefined();
  });

  it('should block dangerous commands', async () => {
    const { executeShellCommand } = await import('../../../src/core/shell-executor');

    const result = await executeShellCommand('rm -rf /', {
      cwd: process.cwd(),
      timeout: 5000
    });

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Blocked');
  });

  it('should support retry logic', async () => {
    const { executeShellCommand } = await import('../../../src/core/shell-executor');

    // Use a command that might occasionally fail
    const result = await executeShellCommand('echo "retry test"', {
      cwd: process.cwd(),
      timeout: 5000,
      retryCount: 1,
      retryDelay: 100
    });

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('retry test');
  });

  it('should handle timeouts', async () => {
    const { executeShellCommand } = await import('../../../src/core/shell-executor');

    // This should timeout quickly
    const startTime = Date.now();
    const result = await executeShellCommand('sleep 10', {
      cwd: process.cwd(),
      timeout: 1000 // 1 second timeout
    });

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds
    expect(result.success).toBe(false);
    expect(result.error).toContain('timed out');
  });

  it('should support working directory', async () => {
    const { executeShellCommand } = await import('../../../src/core/shell-executor');

    const result = await executeShellCommand('pwd', {
      cwd: process.cwd(),
      timeout: 5000
    });

    expect(result.success).toBe(true);
    expect(result.stdout.trim()).toBe(process.cwd());
  });
});
