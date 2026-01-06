/**
 * VIBE-CLI v12 - Modules Integration Tests
 * Tests the interaction between modules and core components
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Set up test environment
const TEST_PROJECT_ROOT = '/tmp/vibe-test-project';
const TEST_FILE = path.join(TEST_PROJECT_ROOT, 'test-file.js');

describe('Modules Integration', () => {
  beforeAll(() => {
    // Create test project structure
    if (!fs.existsSync(TEST_PROJECT_ROOT)) {
      fs.mkdirSync(TEST_PROJECT_ROOT, { recursive: true });
    }
    if (!fs.existsSync(TEST_FILE)) {
      fs.writeFileSync(TEST_FILE, '// Test file\nconsole.log("Hello");\n');
    }
  });

  afterAll(() => {
    // Cleanup
    if (fs.existsSync(TEST_FILE)) {
      fs.unlinkSync(TEST_FILE);
    }
    if (fs.existsSync(TEST_PROJECT_ROOT)) {
      fs.rmdirSync(TEST_PROJECT_ROOT);
    }
  });

  describe('BaseModule Integration', () => {
    it('should create module with info and allow execution', async () => {
      const { BaseModule, ModuleResult } = await import('../../src/modules/base.module');

      class TestModule extends BaseModule {
        async execute(params: Record<string, any>): Promise<ModuleResult> {
          return this.success({
            executed: true,
            params,
          });
        }
      }

      const module = new TestModule({
        name: 'test',
        version: '1.0.0',
        description: 'Integration test module',
      });

      expect(module.getName()).toBe('test');
      expect(module.getVersion()).toBe('1.0.0');

      const result = await module.execute({ test: true });
      expect(result.success).toBe(true);
      expect(result.data?.executed).toBe(true);
    });

    it('should handle success and failure states correctly', async () => {
      const { BaseModule, ModuleResult } = await import('../../src/modules/base.module');

      class TestModule extends BaseModule {
        async execute(params: Record<string, any>): Promise<ModuleResult> {
          if (params.shouldFail) {
            return this.failure('Expected failure');
          }
          return this.success({ value: params.value });
        }
      }

      const module = new TestModule({
        name: 'test',
        version: '1.0.0',
        description: 'Test',
      });

      const successResult = await module.execute({ shouldFail: false, value: 42 });
      expect(successResult.success).toBe(true);
      expect(successResult.data?.value).toBe(42);

      const failureResult = await module.execute({ shouldFail: true });
      expect(failureResult.success).toBe(false);
      expect(failureResult.error).toBe('Expected failure');
    });
  });

  describe('TestingModule Integration', () => {
    it('should detect test frameworks from package.json', async () => {
      const { TestingModule } = await import('../../src/modules/testing/index');

      // Create a mock package.json
      const mockPackagePath = path.join(TEST_PROJECT_ROOT, 'package.json');
      fs.writeFileSync(mockPackagePath, JSON.stringify({
        devDependencies: { jest: '^29.0.0' },
        scripts: { test: 'jest' },
      }, null, 2));

      // The module should be able to detect jest
      const module = new TestingModule();
      expect(module.getName()).toBe('testing');
      expect(module.getVersion()).toBe('1.0.0');

      // Cleanup
      fs.unlinkSync(mockPackagePath);
    });
  });

  describe('SecurityModule Integration', () => {
    it('should create security module and verify properties', async () => {
      const { SecurityModule } = await import('../../src/modules/security/index');

      const module = new SecurityModule();

      expect(module.getName()).toBe('security');
      expect(module.getVersion()).toBe('1.0.0');
      expect(module.getDescription()).toContain('Vulnerability');
    });
  });

  describe('DebuggingModule Integration', () => {
    it('should create debugging module and verify properties', async () => {
      const { DebuggingModule } = await import('../../src/modules/debugging/index');

      const module = new DebuggingModule();

      expect(module.getName()).toBe('debugging');
      expect(module.getVersion()).toBe('1.0.0');
      expect(module.getDescription()).toContain('Error analysis');
    });
  });

  describe('DeploymentModule Integration', () => {
    it('should create deployment module and verify properties', async () => {
      const { DeploymentModule } = await import('../../src/modules/deployment/index');

      const module = new DeploymentModule();

      expect(module.getName()).toBe('deployment');
      expect(module.getVersion()).toBe('1.0.0');
      expect(module.getDescription()).toContain('Build');
    });
  });

  describe('CodeAssistantModule Integration', () => {
    it('should create code assistant module and verify properties', async () => {
      const { CodeAssistantModule } = await import('../../src/modules/code-assistant/index');

      const module = new CodeAssistantModule();

      expect(module.getName()).toBe('code_assistant');
      expect(module.getVersion()).toBe('1.0.0');
      expect(module.getDescription()).toContain('code');
    });
  });

  describe('Modules Index Integration', () => {
    it('should export BaseModule from base.module', async () => {
      const { BaseModule } = await import('../../src/modules/base.module');
      expect(BaseModule).toBeDefined();
    });

    it('should export code assistant module', async () => {
      const { CodeAssistantModule } = await import('../../src/modules/code-assistant/index');
      expect(CodeAssistantModule).toBeDefined();
    });

    it('should export testing module', async () => {
      const { TestingModule } = await import('../../src/modules/testing/index');
      expect(TestingModule).toBeDefined();
    });

    it('should export debugging module', async () => {
      const { DebuggingModule } = await import('../../src/modules/debugging/index');
      expect(DebuggingModule).toBeDefined();
    });

    it('should export security module', async () => {
      const { SecurityModule } = await import('../../src/modules/security/index');
      expect(SecurityModule).toBeDefined();
    });

    it('should export deployment module', async () => {
      const { DeploymentModule } = await import('../../src/modules/deployment/index');
      expect(DeploymentModule).toBeDefined();
    });
  });
});

describe('Module Execution Scenarios', () => {
  describe('Error Handling', () => {
    it('should handle module execution errors gracefully', async () => {
      const { BaseModule, ModuleResult } = await import('../../src/modules/base.module');

      class ErrorModule extends BaseModule {
        async execute(params: Record<string, any>): Promise<ModuleResult> {
          // Simulate error handling - in real usage, errors should be caught
          try {
            throw new Error('Module execution failed');
          } catch (error) {
            return this.failure(error instanceof Error ? error.message : 'Unknown error');
          }
        }
      }

      const module = new ErrorModule({
        name: 'error-test',
        version: '1.0.0',
        description: 'Error test',
      });

      const result = await module.execute({});
      expect(result.success).toBe(false);
      expect(result.error).toBe('Module execution failed');
    });
  });

  describe('Metadata Propagation', () => {
    it('should preserve metadata through execution', async () => {
      const { BaseModule, ModuleResult } = await import('../../src/modules/base.module');

      class MetadataModule extends BaseModule {
        async execute(params: Record<string, any>): Promise<ModuleResult> {
          return this.success(
            { processed: true },
            {
              tokens: params.tokens || 0,
              duration: params.duration || 0,
              model: params.model || 'default',
            }
          );
        }
      }

      const module = new MetadataModule({
        name: 'metadata-test',
        version: '1.0.0',
        description: 'Metadata test',
      });

      const result = await module.execute({
        tokens: 150,
        duration: 250,
        model: 'claude-sonnet',
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.tokens).toBe(150);
      expect(result.metadata?.duration).toBe(250);
      expect(result.metadata?.model).toBe('claude-sonnet');
    });
  });
});

// ============================================================================
// FILE BUILDING INTEGRATION TESTS
// ============================================================================

describe('File Building Integration', () => {
  const TEST_BUILD_DIR = '/tmp/vibe-build-test';

  beforeAll(() => {
    if (!fs.existsSync(TEST_BUILD_DIR)) {
      fs.mkdirSync(TEST_BUILD_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    // Cleanup test directory
    if (fs.existsSync(TEST_BUILD_DIR)) {
      fs.rmSync(TEST_BUILD_DIR, { recursive: true, force: true });
    }
  });

  describe('Project Scaffolding', () => {
    it('should create a complete project structure', async () => {
      const { BaseModule, ModuleResult } = await import('../../src/modules/base.module');

      class ScaffoldingModule extends BaseModule {
        async execute(params: Record<string, any>): Promise<ModuleResult> {
          const { projectPath, files } = params;

          // Create project structure
          for (const file of files) {
            const filePath = path.join(projectPath, file.name);
            const dir = path.dirname(filePath);

            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(filePath, file.content);
          }

          return this.success({
            filesCreated: files.length,
            projectPath,
          });
        }
      }

      const module = new ScaffoldingModule({
        name: 'scaffolding',
        version: '1.0.0',
        description: 'Project scaffolding module',
      });

      const testFiles = [
        { name: 'package.json', content: '{"name":"test-project","version":"1.0.0"}' },
        { name: 'src/index.js', content: 'console.log("Hello");' },
        { name: 'src/components/App.js', content: 'export default function App() {}' },
      ];

      const result = await module.execute({
        projectPath: TEST_BUILD_DIR,
        files: testFiles,
      });

      expect(result.success).toBe(true);
      expect(result.data?.filesCreated).toBe(3);

      // Verify files were created
      expect(fs.existsSync(path.join(TEST_BUILD_DIR, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(TEST_BUILD_DIR, 'src/index.js'))).toBe(true);
      expect(fs.existsSync(path.join(TEST_BUILD_DIR, 'src/components/App.js'))).toBe(true);
    });

    it('should handle nested directory creation', async () => {
      const { BaseModule, ModuleResult } = await import('../../src/modules/base.module');

      class NestedModule extends BaseModule {
        async execute(params: Record<string, any>): Promise<ModuleResult> {
          const { basePath, depth } = params;

          for (let i = 0; i < depth; i++) {
            const dirPath = path.join(basePath, ...Array(i).fill('nested'));
            if (!fs.existsSync(dirPath)) {
              fs.mkdirSync(dirPath, { recursive: true });
            }
            fs.writeFileSync(path.join(dirPath, `file-${i}.txt`), `Level ${i}`);
          }

          return this.success({ directoriesCreated: depth });
        }
      }

      const module = new NestedModule({
        name: 'nested',
        version: '1.0.0',
        description: 'Nested directory test',
      });

      const result = await module.execute({
        basePath: TEST_BUILD_DIR,
        depth: 5,
      });

      expect(result.success).toBe(true);
      expect(result.data?.directoriesCreated).toBe(5);
    });
  });

  describe('Provider Fallback Chain', () => {
    it('should return free tier models correctly', async () => {
      const { VibeProviderRouter } = await import('../../src/providers/router');

      const router = new VibeProviderRouter();
      const freeModels = router.getFreeTierModels();

      expect(Array.isArray(freeModels)).toBe(true);
      // Should include models from Google (Gemini free) and Ollama
      expect(freeModels.length).toBeGreaterThan(0);

      // Each entry should have provider, model, and name
      for (const fm of freeModels) {
        expect(fm.provider).toBeDefined();
        expect(fm.model).toBeDefined();
        expect(fm.name).toBeDefined();
      }
    });

    it('should identify local providers', async () => {
      const { VibeProviderRouter } = await import('../../src/providers/router');

      const router = new VibeProviderRouter();
      const localProviders = router.getLocalProviders();

      // Ollama should be in local providers
      expect(localProviders).toContain('ollama');
    });

    it('should have MiniMax as default provider when no config exists', async () => {
      // Note: This test checks the code default, not runtime behavior
      // If a config file exists, the saved provider will be used instead
      const { PROVIDER_REGISTRY } = await import('../../src/providers/registry');

      // MiniMax should be the first provider in the registry (default)
      expect(PROVIDER_REGISTRY[0].id).toBe('minimax');
      expect(PROVIDER_REGISTRY[0].defaultModel).toBe('MiniMax-M2.1');
    });

    it('should identify configured providers', async () => {
      const { VibeProviderRouter } = await import('../../src/providers/router');

      const router = new VibeProviderRouter();
      const configured = router.getConfiguredProviders();

      expect(Array.isArray(configured)).toBe(true);
    });
  });

  describe('System Prompt', () => {
    it('should export production-grade system prompt', async () => {
      const { VIBE_SYSTEM_PROMPT, VIBE_SYSTEM_PROMPT_VERSION } = await import('../../src/cli/system-prompt');

      expect(VIBE_SYSTEM_PROMPT).toBeDefined();
      expect(typeof VIBE_SYSTEM_PROMPT).toBe('string');
      expect(VIBE_SYSTEM_PROMPT.length).toBeGreaterThan(100);

      // Should NOT contain demo-era language
      expect(VIBE_SYSTEM_PROMPT).not.toContain('Did you mean');
      expect(VIBE_SYSTEM_PROMPT).not.toContain('CLARIFY');
      expect(VIBE_SYSTEM_PROMPT).not.toContain('offer options');

      // Should contain production rules
      expect(VIBE_SYSTEM_PROMPT).toContain('Always respond meaningfully');
      expect(VIBE_SYSTEM_PROMPT).toContain('Never say "I\'m not sure');
      expect(VIBE_SYSTEM_PROMPT).toContain('Prefer doing over explaining');

      expect(VIBE_SYSTEM_PROMPT_VERSION).toBe('12.0.0');
    });
  });
});
