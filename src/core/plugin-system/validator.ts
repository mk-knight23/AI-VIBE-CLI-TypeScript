/**
 * VIBE CLI - Plugin Validator
 * Validates plugin manifests and compatibility
 */

import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { createLogger } from '../../utils/pino-logger.js';
import { errors } from '../../utils/errors.js';
import { PluginManifest, PluginPermission } from '../../types/plugin.js';

const logger = createLogger('plugin-validator');

// Plugin manifest schema
const ManifestSchema = z.object({
  name: z.string().min(1).regex(/^[a-z0-9-]+$/),
  version: z.string().regex(/^\d+\.\d+\.\d+/),
  description: z.string().min(1),
  author: z.string().optional(),
  license: z.string().optional(),
  main: z.string().min(1),
  vibeVersion: z.string().regex(/^\^?\d+\.\d+/),
  dependencies: z.array(z.string()).optional(),
  permissions: z.array(z.enum([
    'filesystem:read',
    'filesystem:write',
    'network',
    'shell',
    'git',
    'config:read'
  ])).optional(),
});

type ValidationResult =
  | { valid: true; manifest: PluginManifest }
  | { valid: false; errors: string[] };

/**
 * Validate plugin manifest
 */
export function validateManifest(manifest: unknown): ValidationResult {
  try {
    const validated = ManifestSchema.parse(manifest);
    return { valid: true, manifest: validated as PluginManifest };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
      return { valid: false, errors: issues };
    }
    return { valid: false, errors: ['Invalid manifest format'] };
  }
}

/**
 * Check plugin compatibility
 */
export function checkCompatibility(
  manifest: PluginManifest,
  currentVibeVersion: string
): { compatible: boolean; issues: string[] } {
  const issues: string[] = [];

  // Parse vibe version requirement
  const requiredVersion = manifest.vibeVersion.replace(/^\^/, '');
  const requiredParts = requiredVersion.split('.').map(Number);
  const currentParts = currentVibeVersion.split('.').map(Number);

  // Check major version compatibility (must match for ^ constraint)
  if (manifest.vibeVersion.startsWith('^')) {
    if (requiredParts[0] !== currentParts[0]) {
      issues.push(
        `Incompatible major version: plugin requires ${requiredParts[0]}.x, running ${currentParts[0]}.x`
      );
    }
  } else {
    // Exact version required
    if (requiredVersion !== currentVibeVersion) {
      issues.push(
        `Exact version required: plugin requires ${requiredVersion}, running ${currentVibeVersion}`
      );
    }
  }

  return {
    compatible: issues.length === 0,
    issues
  };
}

/**
 * Validate plugin directory
 */
export async function validatePluginDirectory(pluginPath: string): Promise<ValidationResult> {
  try {
    // Check if directory exists
    const stats = await fs.promises.stat(pluginPath);
    if (!stats.isDirectory()) {
      return { valid: false, errors: ['Plugin path is not a directory'] };
    }

    // Check for manifest
    const manifestPath = path.join(pluginPath, 'vibe-plugin.json');
    if (!fs.existsSync(manifestPath)) {
      return { valid: false, errors: ['Missing vibe-plugin.json manifest'] };
    }

    // Read and validate manifest
    const manifestContent = await fs.promises.readFile(manifestPath, 'utf-8');
    let manifest: unknown;
    try {
      manifest = JSON.parse(manifestContent);
    } catch {
      return { valid: false, errors: ['Invalid JSON in vibe-plugin.json'] };
    }

    const manifestResult = validateManifest(manifest);
    if (!manifestResult.valid) {
      return manifestResult;
    }

    // Check main entry point exists
    const mainPath = path.join(pluginPath, manifestResult.manifest.main);
    if (!fs.existsSync(mainPath)) {
      return {
        valid: false,
        errors: [`Main entry point not found: ${manifestResult.manifest.main}`]
      };
    }

    return { valid: true, manifest: manifestResult.manifest };
  } catch (error) {
    logger.error({ error, path: pluginPath }, 'Failed to validate plugin');
    return {
      valid: false,
      errors: [(error as Error).message]
    };
  }
}

/**
 * Check if permission is valid
 */
export function isValidPermission(permission: string): permission is PluginPermission {
  const valid: PluginPermission[] = [
    'filesystem:read',
    'filesystem:write',
    'network',
    'shell',
    'git',
    'config:read'
  ];
  return valid.includes(permission as PluginPermission);
}
