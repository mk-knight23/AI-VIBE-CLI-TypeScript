/**
 * VIBE-CLI - Scaffold Command Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { TEMPLATES, scaffold } from '../../src/commands/scaffold';

describe('Scaffold Command', () => {
  const testDir = path.join(process.cwd(), 'test-scaffold-output');
  const originalCwd = process.cwd();

  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    process.chdir(testDir);
  });

  afterEach(() => {
    // Clean up test directory
    process.chdir(originalCwd);
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Template Definitions', () => {
    it('should have all required templates', () => {
      expect(TEMPLATES.nextjs).toBeDefined();
      expect(TEMPLATES.react).toBeDefined();
      expect(TEMPLATES.express).toBeDefined();
      expect(TEMPLATES['react-component']).toBeDefined();
      expect(TEMPLATES['nextjs-component']).toBeDefined();
      expect(TEMPLATES['express-route']).toBeDefined();
      expect(TEMPLATES['vitest-test']).toBeDefined();
    });

    it('should have project templates with required fields', () => {
      const projectTemplates = ['nextjs', 'react', 'express', 'vitest'];

      for (const key of projectTemplates) {
        const template = TEMPLATES[key as keyof typeof TEMPLATES];
        expect(template).toBeDefined();
        expect(template.type).toBe('project');
        expect(template.files).toBeDefined();
        expect(Array.isArray(template.files)).toBe(true);
      }
    });

    it('should have component templates with template field', () => {
      const componentTemplates = ['react-component', 'nextjs-component', 'express-route', 'vitest-test'];

      for (const key of componentTemplates) {
        const template = TEMPLATES[key as keyof typeof TEMPLATES];
        expect(template).toBeDefined();
        expect(template.type).toBe('component');
        expect(template.template).toBeDefined();
        expect(typeof template.template).toBe('string');
      }
    });
  });

  describe('Component Scaffolding', () => {
    it('should create a React component file', async () => {
      const primitives = {
        planning: {} as any,
        completion: {} as any,
        multiEdit: {} as any,
        execution: {} as any,
        search: {} as any,
      };

      const result = await scaffold(['react-component', 'TestButton'], primitives);

      expect(result.success).toBe(true);

      // Check if file was created
      const componentPath = path.join(testDir, 'test-button.tsx');
      expect(fs.existsSync(componentPath)).toBe(true);

      // Check file content
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain('TestButton');
      expect(content).toContain('interface TestButtonProps');
      expect(content).toContain('export const TestButton');
    });

    it('should create a Next.js component file', async () => {
      const primitives = {
        planning: {} as any,
        completion: {} as any,
        multiEdit: {} as any,
        execution: {} as any,
        search: {} as any,
      };

      const result = await scaffold(['nextjs-component', 'TestCard'], primitives);

      expect(result.success).toBe(true);

      const componentPath = path.join(testDir, 'test-card.tsx');
      expect(fs.existsSync(componentPath)).toBe(true);

      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain("'use client'");
      expect(content).toContain('TestCard');
      expect(content).toContain('interface TestCardProps');
    });

    it('should create an Express route file', async () => {
      const primitives = {
        planning: {} as any,
        completion: {} as any,
        multiEdit: {} as any,
        execution: {} as any,
        search: {} as any,
      };

      const result = await scaffold(['express-route', 'users'], primitives);

      expect(result.success).toBe(true);

      const routePath = path.join(testDir, 'users.ts');
      expect(fs.existsSync(routePath)).toBe(true);

      const content = fs.readFileSync(routePath, 'utf-8');
      expect(content).toContain('Router()');
      expect(content).toContain("GET /users");
      expect(content).toContain("POST /users");
    });

    it('should create a Vitest test file', async () => {
      const primitives = {
        planning: {} as any,
        completion: {} as any,
        multiEdit: {} as any,
        execution: {} as any,
        search: {} as any,
      };

      const result = await scaffold(['vitest-test', 'mathUtils'], primitives);

      expect(result.success).toBe(true);

      const testPath = path.join(testDir, 'math-utils.test.ts');
      expect(fs.existsSync(testPath)).toBe(true);

      const content = fs.readFileSync(testPath, 'utf-8');
      expect(content).toContain("describe('mathUtils'");
      expect(content).toContain('it(');
      expect(content).toContain('expect(');
    });
  });

  describe('String Conversions', () => {
    it('should convert strings to PascalCase correctly', () => {
      // This is tested indirectly through component generation
      const primitives = {
        planning: {} as any,
        completion: {} as any,
        multiEdit: {} as any,
        execution: {} as any,
        search: {} as any,
      };

      scaffold(['react-component', 'my-test-component'], primitives);

      const componentPath = path.join(testDir, 'my-test-component.tsx');
      const content = fs.readFileSync(componentPath, 'utf-8');

      expect(content).toContain('MyTestComponent');
      expect(content).toContain('interface MyTestComponentProps');
    });

    it('should handle kebab-case names', () => {
      const primitives = {
        planning: {} as any,
        completion: {} as any,
        multiEdit: {} as any,
        execution: {} as any,
        search: {} as any,
      };

      scaffold(['react-component', 'user-profile-card'], primitives);

      const componentPath = path.join(testDir, 'user-profile-card.tsx');
      expect(fs.existsSync(componentPath)).toBe(true);

      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain('UserProfileCard');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid template names', async () => {
      const primitives = {
        planning: {} as any,
        completion: {} as any,
        multiEdit: {} as any,
        execution: {} as any,
        search: {} as any,
      };

      const result = await scaffold(['invalid-template'], primitives);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle missing template name', async () => {
      const primitives = {
        planning: {} as any,
        completion: {} as any,
        multiEdit: {} as any,
        execution: {} as any,
        search: {} as any,
      };

      // Should show help and return success
      const result = await scaffold([], primitives);
      expect(result.success).toBe(true);
    });
  });
});
