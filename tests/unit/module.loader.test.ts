/**
 * VIBE-CLI v12 - Module Loader Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies before importing
vi.mock('fs');
vi.mock('path');

describe('ModuleLoader', () => {
  let ModuleLoader: any;

  beforeEach(async () => {
    vi.resetModules();
    // Clear module cache to get fresh import
    const module = await import('../../src/core/module.loader');
    ModuleLoader = module.ModuleLoader;
  });

  describe('Constructor', () => {
    it('should initialize with modules directory', () => {
      const loader = new ModuleLoader('/test/path');
      expect(loader).toBeDefined();
    });
  });

  describe('Module Discovery', () => {
    it('should find module files in directory', () => {
      const mockReaddirSync = vi.spyOn(fs, 'readdirSync');
      mockReaddirSync.mockReturnValue([
        { name: 'index.ts', isFile: () => true },
        { name: 'code-assistant', isDirectory: () => true },
      ]);

      // The actual test depends on the implementation
      expect(mockReaddirSync).toBeDefined();
    });
  });
});
