/**
 * VIBE CLI - Plugin API
 * API exposed to plugins
 */

import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import { createLogger } from '../../utils/pino-logger.js';
import { progressManager } from '../../ui/progress-manager.js';
import { configManager } from '../config-system.js';
import { PluginAPI, PluginCommand, PluginManifest } from '../../types/plugin.js';

const logger = createLogger('plugin-api');

/**
 * Create plugin API
 */
export function createPluginAPI(
  manifest: PluginManifest,
  program: Command
): PluginAPI {
  const pluginLogger = createLogger(`plugin:${manifest.name}`);

  return {
    // Command registration
    registerCommand: (command: PluginCommand) => {
      const cmd = program
        .command(command.name)
        .description(command.description);

      // Add arguments
      if (command.arguments) {
        for (const arg of command.arguments) {
          cmd.argument(arg);
        }
      }

      // Add options
      if (command.options) {
        for (const opt of command.options) {
          cmd.option(opt.flags, opt.description, opt.defaultValue as string | boolean | string[] | undefined);
        }
      }

      // Add action
      cmd.action(async (...args) => {
        const options = args[args.length - 1] || {};
        const commandArgs = args.slice(0, -1);
        await command.action(commandArgs, options);
      });

      logger.debug({ command: command.name }, 'Plugin registered command');
    },

    // Logging
    logger: {
      info: (message, meta) => pluginLogger.info({ ...meta, plugin: manifest.name }, message),
      warn: (message, meta) => pluginLogger.warn({ ...meta, plugin: manifest.name }, message),
      error: (message, meta) => pluginLogger.error({ ...meta, plugin: manifest.name }, message),
      debug: (message, meta) => pluginLogger.debug({ ...meta, plugin: manifest.name }, message),
    },

    // Configuration (read-only)
    getConfig: () => {
      const config = configManager.getConfig();
      return config as Record<string, unknown>;
    },

    // UI primitives
    ui: {
      spinner: (text) => {
        const spinner = progressManager.startSpinner({ text });
        return {
          succeed: (t) => progressManager.succeedSpinner(t),
          fail: (t) => progressManager.failSpinner(t),
          update: (t) => progressManager.updateSpinnerText(t),
        };
      },
      progress: (total) => {
        const bar = progressManager.createProgressBar({ total });
        return {
          increment: () => bar.increment(),
          stop: () => progressManager.stopProgressBar(),
        };
      },
    },

    // File system (sandboxed to plugin directory)
    fs: {
      readFile: async (filepath) => {
        // Ensure path is within plugin directory
        const resolved = path.resolve(filepath);
        return fs.promises.readFile(resolved, 'utf-8');
      },
      writeFile: async (filepath, content) => {
        const resolved = path.resolve(filepath);
        await fs.promises.writeFile(resolved, content, 'utf-8');
      },
      exists: async (filepath) => {
        const resolved = path.resolve(filepath);
        return fs.existsSync(resolved);
      },
    },

    // Utilities
    path: {
      join: (...paths) => path.join(...paths),
      resolve: (...paths) => path.resolve(...paths),
      dirname: (filepath) => path.dirname(filepath),
      basename: (filepath) => path.basename(filepath),
    },
  };
}
