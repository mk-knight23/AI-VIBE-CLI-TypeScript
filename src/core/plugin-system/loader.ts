/**
 * VIBE CLI - Plugin Loader
 * Loads and manages plugins
 */

import * as path from 'path';
import { pathToFileURL } from 'url';
import { Command } from 'commander';
import { createLogger } from '../../utils/pino-logger.js';
import { errors } from '../../utils/errors.js';
import { VibePlugin, PluginManifest, InstalledPlugin } from '../../types/plugin.js';
import { validatePluginDirectory } from './validator.js';
import { createPluginAPI } from './api.js';
import {
  validatePermissions,
  verifySignature,
  SECURITY_POLICY
} from './security.js';

const logger = createLogger('plugin-loader');

export interface LoadedPlugin {
  manifest: PluginManifest;
  instance: VibePlugin;
  path: string;
}

/**
 * Load a plugin
 */
export async function loadPlugin(
  pluginPath: string,
  program: Command
): Promise<LoadedPlugin> {
  logger.debug({ path: pluginPath }, 'Loading plugin');

  // Validate plugin
  const validation = await validatePluginDirectory(pluginPath);
  if (!validation.valid) {
    throw errors.validationError(
      'plugin',
      validation.errors.join(', ')
    );
  }

  const { manifest } = validation;

  // Security: Validate permissions
  if (SECURITY_POLICY.requireExplicitPermissions && !manifest.permissions) {
    throw errors.validationError(
      'plugin',
      'Plugin must declare permissions for security. See plugin documentation for details.'
    );
  }

  if (manifest.permissions) {
    const permValidation = validatePermissions(manifest);
    if (!permValidation.valid) {
      throw errors.validationError(
        'plugin',
        `Invalid permissions: ${permValidation.errors.join(', ')}`
      );
    }
  }

  // Security: Verify signature
  if (SECURITY_POLICY.requireSignature) {
    const signatureCheck = await verifySignature(pluginPath, manifest);
    if (!signatureCheck.valid) {
      logger.error(
        { plugin: manifest.name, error: signatureCheck.error },
        'Plugin signature verification failed'
      );
      throw errors.validationError(
        'plugin',
        `Signature verification failed: ${signatureCheck.error}`
      );
    }
    logger.info({ plugin: manifest.name, signer: signatureCheck.signer }, 'Plugin signature verified');
  } else {
    logger.warn(
      { plugin: manifest.name },
      'Loading unsigned plugin (signature verification disabled - not recommended for production)'
    );
  }

  // Check compatibility
  const vibeVersion = '0.0.2'; // TODO: Get from package.json
  const requiredVersion = manifest.vibeVersion.replace(/^\^/, '');
  const requiredMajor = requiredVersion.split('.')[0];
  const currentMajor = vibeVersion.split('.')[0];

  if (requiredMajor !== currentMajor) {
    logger.warn(
      { plugin: manifest.name, required: requiredMajor, current: currentMajor },
      'Plugin may be incompatible'
    );
  }

  // Load main module
  const mainPath = path.join(pluginPath, manifest.main);
  let pluginModule: any;

  try {
    // Use dynamic import for ESM support
    const fileUrl = pathToFileURL(mainPath).href;
    pluginModule = await import(fileUrl);
  } catch (error) {
    logger.error({ error, path: mainPath }, 'Failed to load plugin module');
    throw errors.commandFailed('loadPlugin', error as Error);
  }

  // Extract default export or named exports
  const pluginInstance: VibePlugin = pluginModule.default || pluginModule;

  if (!pluginInstance.init) {
    throw errors.validationError(
      'plugin',
      'Plugin must export an init function'
    );
  }

  // Create API and initialize
  const api = createPluginAPI(manifest, program);

  try {
    await pluginInstance.init(api);
  } catch (error) {
    logger.error({ error, plugin: manifest.name }, 'Plugin init failed');
    throw errors.commandFailed('pluginInit', error as Error);
  }

  logger.info({ plugin: manifest.name, version: manifest.version }, 'Plugin loaded');

  return {
    manifest,
    instance: pluginInstance,
    path: pluginPath,
  };
}

/**
 * Unload a plugin
 */
export async function unloadPlugin(plugin: LoadedPlugin): Promise<void> {
  logger.debug({ plugin: plugin.manifest.name }, 'Unloading plugin');

  if (plugin.instance.cleanup) {
    try {
      await plugin.instance.cleanup();
    } catch (error) {
      logger.error({ error, plugin: plugin.manifest.name }, 'Plugin cleanup failed');
    }
  }
}
