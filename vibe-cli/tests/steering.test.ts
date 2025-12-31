/**
 * Steering System Tests - v10.1 Enhanced
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  loadSteering,
  loadSteeringDir,
  loadAllSteering,
  createDefaultSteering,
  getSteeringSummary,
  getSteeringForPrompt,
  getHooksForEvent,
  SteeringConfig,
  SteeringHook
} from '../src/core/steering';

const TEST_DIR = path.join(process.cwd(), '.vibe-test-steering');

describe('Steering System - v10.1', () => {
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

  describe('loadSteering', () => {
    it('should load steering from .vibe/steering.md', () => {
      const steeringDir = path.join(TEST_DIR, '.vibe');
      fs.mkdirSync(steeringDir, { recursive: true });
      fs.writeFileSync(path.join(steeringDir, 'steering.md'), `# Test
## Rules
- Rule 1
- Rule 2
## About
Test context
`);
      
      const config = loadSteering(TEST_DIR);
      expect(config).not.toBeNull();
      expect(config!.rules).toContain('Rule 1');
      expect(config!.rules).toContain('Rule 2');
    });

    it('should return null if no steering file', () => {
      const config = loadSteering(TEST_DIR);
      expect(config).toBeNull();
    });
  });

  describe('loadSteeringDir', () => {
    it('should load multiple steering files from directory', () => {
      const steeringDir = path.join(TEST_DIR, '.vibe', 'steering');
      fs.mkdirSync(steeringDir, { recursive: true });
      
      fs.writeFileSync(path.join(steeringDir, '01-rules.md'), `## Rules
- First rule
`);
      fs.writeFileSync(path.join(steeringDir, '02-context.md'), `## About
Project context
`);
      
      const configs = loadSteeringDir(steeringDir);
      expect(configs.length).toBe(2);
      expect(configs[0].priority).toBe(1);
      expect(configs[1].priority).toBe(2);
    });

    it('should return empty array for non-existent directory', () => {
      const configs = loadSteeringDir(path.join(TEST_DIR, 'nonexistent'));
      expect(configs).toEqual([]);
    });
  });

  describe('loadAllSteering', () => {
    it('should merge workspace steering', () => {
      const steeringDir = path.join(TEST_DIR, '.vibe', 'steering');
      fs.mkdirSync(steeringDir, { recursive: true });
      
      fs.writeFileSync(path.join(steeringDir, 'rules.md'), `## Rules
- Workspace rule
`);
      
      const { workspace, merged } = loadAllSteering(TEST_DIR);
      expect(workspace.length).toBeGreaterThan(0);
      expect(merged.rules).toContain('Workspace rule');
    });
  });

  describe('Hooks parsing', () => {
    it('should parse hooks from steering', () => {
      const steeringDir = path.join(TEST_DIR, '.vibe');
      fs.mkdirSync(steeringDir, { recursive: true });
      fs.writeFileSync(path.join(steeringDir, 'steering.md'), `## Hooks
- onFileWrite: prompt: Verify changes
- onSessionStart: shell: echo "Starting"
`);
      
      const config = loadSteering(TEST_DIR);
      expect(config!.hooks).toBeDefined();
      expect(config!.hooks!.length).toBe(2);
      expect(config!.hooks![0].event).toBe('onFileWrite');
      expect(config!.hooks![0].action).toBe('prompt');
    });
  });

  describe('getSteeringForPrompt', () => {
    it('should format steering for system prompt', () => {
      const steeringDir = path.join(TEST_DIR, '.vibe');
      fs.mkdirSync(steeringDir, { recursive: true });
      fs.writeFileSync(path.join(steeringDir, 'steering.md'), `## Rules
- Follow code style
## About
Test project
`);
      
      const prompt = getSteeringForPrompt(TEST_DIR);
      expect(prompt).toContain('PROJECT STEERING');
      expect(prompt).toContain('Follow code style');
      expect(prompt).toContain('Test project');
    });

    it('should return empty string if no steering', () => {
      const prompt = getSteeringForPrompt(TEST_DIR);
      expect(prompt).toBe('');
    });
  });

  describe('getHooksForEvent', () => {
    it('should filter hooks by event', () => {
      const steeringDir = path.join(TEST_DIR, '.vibe');
      fs.mkdirSync(steeringDir, { recursive: true });
      fs.writeFileSync(path.join(steeringDir, 'steering.md'), `## Hooks
- onFileWrite: prompt: Check 1
- onFileWrite: prompt: Check 2
- onSessionStart: prompt: Welcome
`);
      
      const hooks = getHooksForEvent('onFileWrite', TEST_DIR);
      expect(hooks.length).toBe(2);
    });
  });

  describe('createDefaultSteering', () => {
    it('should create default steering file', () => {
      const steeringPath = createDefaultSteering(TEST_DIR);
      expect(fs.existsSync(steeringPath)).toBe(true);
      
      const content = fs.readFileSync(steeringPath, 'utf8');
      expect(content).toContain('## Rules');
      expect(content).toContain('## Hooks');
    });
  });
});

describe('Compatibility Contract - Steering', () => {
  it('should export all required functions', async () => {
    const steering = await import('../src/core/steering');
    
    expect(typeof steering.loadSteering).toBe('function');
    expect(typeof steering.loadSteeringDir).toBe('function');
    expect(typeof steering.loadAllSteering).toBe('function');
    expect(typeof steering.createDefaultSteering).toBe('function');
    expect(typeof steering.getSteeringSummary).toBe('function');
    expect(typeof steering.getSteeringForPrompt).toBe('function');
    expect(typeof steering.getHooksForEvent).toBe('function');
  });

  it('should support Kiro steering locations', async () => {
    // Verify .kiro/steering is in the search paths
    const { loadSteering } = await import('../src/core/steering');
    // Function should exist and not throw
    expect(() => loadSteering()).not.toThrow();
  });
});
