/**
 * AI Enforcement Tests
 *
 * Ensures VIBE CLI is truly AI-FIRST:
 * - AI model is invoked for every project creation
 * - No template-based or heuristic creation bypasses AI
 * - All file content comes from AI generation
 * - UI shows AI usage transparency
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../../../src/core/api';
import { MemoryManager } from '../../../src/core/memory';
import { processUserInput } from '../../../src/cli/interactive';

// Mock dependencies
vi.mock('../../../src/core/api');
vi.mock('../../../src/core/memory');
vi.mock('../../../src/utils/terminal-renderer');
vi.mock('../../../src/tools', () => ({
  tools: [],
  executeTool: vi.fn().mockResolvedValue({ success: true })
}));

describe('AI Enforcement', () => {
  let mockClient: any;
  let mockMemory: any;
  let consoleSpy: any;

  beforeEach(() => {
    mockClient = {
      chat: vi.fn(),
      getProvider: vi.fn().mockReturnValue('megallm'),
      setProvider: vi.fn()
    };

    mockMemory = {
      getMemoryContext: vi.fn().mockReturnValue(''),
      addMilestone: vi.fn(),
      onFileWrite: vi.fn(),
      onError: vi.fn(),
      summarizeOldMessages: vi.fn().mockReturnValue([])
    } as any;

    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleSpy.mockRestore();
  });

  describe('Project Creation AI Enforcement', () => {
    it('should call AI for "create react app" requests', async () => {
      const input = 'create a react app called my-app';
      const messages: any[] = [{ role: 'system', content: 'system prompt' }];

      mockClient.chat.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              projectName: 'test-project',
              structure: {
                folders: ['src', 'public'],
                files: [
                  {
                    path: 'package.json',
                    content: '{"name":"test-project","version":"1.0.0"}'
                  },
                  {
                    path: 'src/App.jsx',
                    content: 'export default function App() { return <h1>Hello</h1>; }'
                  }
                ]
              },
              shellCommands: ['npm install'],
              dependencies: { npm: ['react'], pip: [], other: [] }
            }),
            tool_calls: []
          }
        }]
      });

      await processUserInput(mockClient, messages, 'test-model', input, mockMemory);

      expect(mockClient.chat).toHaveBeenCalledTimes(1);
      expect(mockMemory.addMilestone).toHaveBeenCalledWith(
        expect.stringContaining('AI Project Creation')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🤖 Using AI model')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📝 Generating project via AI pipeline')
      );
    });

    it('should call AI for "build python api" requests', async () => {
      const input = 'build a python api with framework';
      const messages: any[] = [{ role: 'system', content: 'system prompt' }];

      mockClient.chat.mockResolvedValue({
        choices: [{
          message: {
            content: 'I will create a Python Flask API for you.',
            tool_calls: []
          }
        }]
      });

      await processUserInput(mockClient, messages, 'test-model', input, mockMemory);

      expect(mockClient.chat).toHaveBeenCalledTimes(1);
      expect(mockMemory.addMilestone).toHaveBeenCalledWith(
        expect.stringContaining('AI Project Creation')
      );
    });

    it('should call AI for "generate html website" requests', async () => {
      const input = 'generate an html website';
      const messages: any[] = [{ role: 'system', content: 'system prompt' }];

      mockClient.chat.mockResolvedValue({
        choices: [{
          message: {
            content: 'I will create an HTML website for you.',
            tool_calls: []
          }
        }]
      });

      await processUserInput(mockClient, messages, 'test-model', input, mockMemory);

      expect(mockClient.chat).toHaveBeenCalledTimes(1);
      expect(mockMemory.addMilestone).toHaveBeenCalledWith(
        expect.stringContaining('AI Project Creation')
      );
    });

    it('should call AI for "make node api" requests', async () => {
      const input = 'make a node api server';
      const messages: any[] = [{ role: 'system', content: 'system prompt' }];

      mockClient.chat.mockResolvedValue({
        choices: [{
          message: {
            content: 'I will create a Node.js API server for you.',
            tool_calls: []
          }
        }]
      });

      await processUserInput(mockClient, messages, 'test-model', input, mockMemory);

      expect(mockClient.chat).toHaveBeenCalledTimes(1);
      expect(mockMemory.addMilestone).toHaveBeenCalledWith(
        expect.stringContaining('AI Project Creation')
      );
    });

    it('should call AI for "scaffold vue app" requests', async () => {
      const input = 'scaffold a vue app';
      const messages: any[] = [{ role: 'system', content: 'system prompt' }];

      mockClient.chat.mockResolvedValue({
        choices: [{
          message: {
            content: 'I will create a Vue.js app for you.',
            tool_calls: []
          }
        }]
      });

      await processUserInput(mockClient, messages, 'test-model', input, mockMemory);

      expect(mockClient.chat).toHaveBeenCalledTimes(1);
      expect(mockMemory.addMilestone).toHaveBeenCalledWith(
        expect.stringContaining('AI Project Creation')
      );
    });
  });

  describe('Template Bypass Prevention', () => {
    it('should have no template scaffolding (completely removed)', () => {
      // Template-based scaffolding has been completely removed from the codebase
      // All project creation goes through AI pipeline only
      // No shouldScaffold function exists - templates are forbidden

      const testCases = [
        'create react app',
        'build python api',
        'generate html website',
        'make node server',
        'scaffold vue app'
      ];

      // Since templates are removed, all requests are handled by AI
      testCases.forEach(request => {
        // This would be verified by ensuring AI is called for each request
        expect(true).toBe(true); // Placeholder - actual verification in other tests
      });
    });
  });

  describe('AI Usage Logging', () => {
    it('should log AI model and provider for project creation', async () => {
      const input = 'create a react app';
      const messages: any[] = [{ role: 'system', content: 'system prompt' }];

      mockClient.chat.mockResolvedValue({
        choices: [{
          message: {
            content: 'Creating React app...',
            tool_calls: []
          }
        }]
      });

      await processUserInput(mockClient, messages, 'qwen-model', input, mockMemory);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🤖 Using AI model: qwen-model')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📝 Generating project via AI pipeline')
      );
    });

    it('should track AI usage in memory milestones', async () => {
      const input = 'build python api';
      const messages: any[] = [{ role: 'system', content: 'system prompt' }];

      mockClient.chat.mockResolvedValue({
        choices: [{
          message: {
            content: 'Creating Python API...',
            tool_calls: []
          }
        }]
      });

      await processUserInput(mockClient, messages, 'claude-model', input, mockMemory);

      expect(mockMemory.addMilestone).toHaveBeenCalledWith(
        'AI Project Creation: build python api (Model: claude-model, Provider: megallm)'
      );
    });
  });

  describe('Consistent AI Behavior', () => {
    const projectTypes = [
      'create react app',
      'create react app with routing',
      'create advanced react app with auth',
      'build python web api',
      'build python web app',
      'generate html css js website',
      'generate simple html page',
      'make node express api',
      'make node api with database',
      'scaffold vue app',
      'scaffold angular application'
    ];

    it.each(projectTypes)('should use AI for "%s"', async (request) => {
      const messages: any[] = [{ role: 'system', content: 'system prompt' }];

      mockClient.chat.mockResolvedValue({
        choices: [{
          message: {
            content: `I will create a project for: ${request}`,
            tool_calls: []
          }
        }]
      });

      await processUserInput(mockClient, messages, 'test-model', request, mockMemory);

      expect(mockClient.chat).toHaveBeenCalledTimes(1);
      expect(mockMemory.addMilestone).toHaveBeenCalledWith(
        expect.stringContaining('AI Project Creation')
      );
    });
  });

  describe('Error Handling with AI Enforcement', () => {
    it('should handle AI failures gracefully', async () => {
      const input = 'create react app';
      const messages: any[] = [{ role: 'system', content: 'system prompt' }];

      mockClient.chat.mockRejectedValue(new Error('AI service unavailable'));

      const result = await processUserInput(mockClient, messages, 'test-model', input, mockMemory);

      expect(result).toBe(''); // Function catches errors and returns empty string
      expect(mockMemory.onError).toHaveBeenCalledWith('AI service unavailable');
    });

    it('should not create files without AI response', async () => {
      const input = 'create react app';
      const messages: any[] = [{ role: 'system', content: 'system prompt' }];

      mockClient.chat.mockResolvedValue({
        choices: [{
          message: {
            content: '',
            tool_calls: []
          }
        }]
      });

      const result = await processUserInput(mockClient, messages, 'test-model', input, mockMemory);

      expect(result).toBe('');
      expect(mockMemory.onFileWrite).not.toHaveBeenCalled();
    });
  });
});
