/**
 * VIBE CLI - Plugin Types
 */

import { Command } from 'commander';

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  main: string;
  vibeVersion: string;
  dependencies?: string[];
  permissions?: PluginPermission[];
}

export type PluginPermission =
  | 'filesystem:read'
  | 'filesystem:write'
  | 'network'
  | 'shell'
  | 'git'
  | 'config:read';

export interface VibePlugin {
  name: string;
  version: string;
  init: (api: PluginAPI) => void | Promise<void>;
  cleanup?: () => void | Promise<void>;
}

export interface PluginAPI {
  // Command registration
  registerCommand: (command: PluginCommand) => void;

  // Logging
  logger: {
    info: (message: string, meta?: Record<string, unknown>) => void;
    warn: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, meta?: Record<string, unknown>) => void;
    debug: (message: string, meta?: Record<string, unknown>) => void;
  };

  // Configuration (read-only)
  getConfig: () => Record<string, unknown>;

  // UI primitives
  ui: {
    spinner: (text: string) => {
      succeed: (text?: string) => void;
      fail: (text?: string) => void;
      update: (text: string) => void;
    };
    progress: (total: number) => {
      increment: () => void;
      stop: () => void;
    };
  };

  // File system (sandboxed)
  fs: {
    readFile: (path: string) => Promise<string>;
    writeFile: (path: string, content: string) => Promise<void>;
    exists: (path: string) => Promise<boolean>;
  };

  // Utilities
  path: {
    join: (...paths: string[]) => string;
    resolve: (...paths: string[]) => string;
    dirname: (path: string) => string;
    basename: (path: string) => string;
  };
}

export interface PluginCommand {
  name: string;
  description: string;
  arguments?: string[];
  options?: PluginCommandOption[];
  action: (args: string[], options: Record<string, unknown>) => Promise<void>;
}

export interface PluginCommandOption {
  flags: string;
  description: string;
  defaultValue?: unknown;
}

export interface InstalledPlugin {
  manifest: PluginManifest;
  path: string;
  enabled: boolean;
}

export interface PluginSearchResult {
  name: string;
  version: string;
  description: string;
  author: string;
  downloads: number;
  installed: boolean;
}
