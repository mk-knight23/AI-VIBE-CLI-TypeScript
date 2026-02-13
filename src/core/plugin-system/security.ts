/**
 * VIBE CLI - Plugin Security System
 * Provides permission management, signature verification, and sandbox enforcement
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '../../utils/pino-logger.js';
import { PluginManifest } from '../../types/plugin.js';

const logger = createLogger('plugin-security');

/**
 * Plugin permission declarations
 */
export interface PluginPermissions {
  // File system access
  filesystem?: {
    read?: string[]; // Allowed read paths (globs)
    write?: string[]; // Allowed write paths (globs)
  };

  // Network access
  network?: {
    allowed?: string[]; // Allowed domains/IPs
    blocked?: string[]; // Blocked domains/IPs
  };

  // Command execution
  commands?: {
    allowed?: string[]; // Allowed commands
    blocked?: string[]; // Blocked commands
  };

  // System access
  system?: {
    env?: boolean; // Access to environment variables
    subprocess?: boolean; // Spawn child processes
  };

  // VIBE API access
  vibe?: {
    config?: 'read' | 'write' | 'none'; // Config access level
    commands?: boolean; // Register new commands
    database?: boolean; // Access VIBE database
  };
}

/**
 * Signature verification result
 */
export interface SignatureVerificationResult {
  valid: boolean;
  signer?: string;
  error?: string;
}

/**
 * Validate plugin permissions
 */
export function validatePermissions(
  manifest: PluginManifest
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Ensure permissions object exists
  if (!manifest.permissions) {
    errors.push('Plugin must declare permissions');
    return { valid: false, errors };
  }

  // Validate file system permissions
  if (manifest.permissions.filesystem) {
    const { read, write } = manifest.permissions.filesystem;

    // Write permissions require read permissions
    if (write && write.length > 0) {
      if (!read || read.length === 0) {
        errors.push('Plugins with write permissions must also declare read permissions');
      }
    }

    // Check for path traversal attempts
    const allPaths = [...(read || []), ...(write || [])];
    for (const p of allPaths) {
      if (p.includes('..')) {
        errors.push(`Invalid path permission: ${p} contains parent directory references`);
      }
      if (path.isAbsolute(p)) {
        errors.push(`Path permissions must be relative: ${p}`);
      }
    }
  }

  // Validate network permissions
  if (manifest.permissions.network) {
    const { allowed, blocked } = manifest.permissions.network;

    // Ensure only one is specified
    if (allowed && allowed.length > 0 && blocked && blocked.length > 0) {
      errors.push('Cannot specify both allowed and blocked network permissions');
    }
  }

  // Validate command permissions
  if (manifest.permissions.commands) {
    const { allowed, blocked } = manifest.permissions.commands;

    // Dangerous commands must be explicitly blocked
    const dangerous = ['rm', 'dd', 'mkfs', 'chmod', 'chown', 'sudo', 'su'];
    if (allowed) {
      for (const cmd of dangerous) {
        if (allowed.includes(cmd)) {
          errors.push(`Dangerous command ${cmd} must be explicitly blocked`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Verify plugin signature
 * TODO: Implement full key management system
 * TODO: Support multiple signature algorithms
 * TODO: Integrate with isolated-vm for sandboxing
 */
export async function verifySignature(
  pluginPath: string,
  manifest: PluginManifest
): Promise<SignatureVerificationResult> {
  const signaturePath = path.join(pluginPath, 'signature.json');

  // Check if signature exists
  if (!fs.existsSync(signaturePath)) {
    return {
      valid: false,
      error: 'Plugin signature not found. Unsigned plugins are not allowed for security.'
    };
  }

  try {
    const signatureData = JSON.parse(fs.readFileSync(signaturePath, 'utf-8'));

    // Basic signature validation
    if (!signatureData.algorithm || !signatureData.signature || !signatureData.timestamp) {
      return {
        valid: false,
        error: 'Invalid signature format'
      };
    }

    // Check signature age (reject signatures older than 1 year)
    const signatureAge = Date.now() - signatureData.timestamp;
    const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year
    if (signatureAge > maxAge) {
      return {
        valid: false,
        error: 'Plugin signature is too old (older than 1 year)'
      };
    }

    // Verify signature against manifest
    // TODO: Implement proper cryptographic verification
    const manifestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(manifest))
      .digest('hex');

    const expectedSignature = crypto
      .createHash('sha256')
      .update(manifestHash + signatureData.timestamp)
      .digest('hex');

    if (signatureData.signature !== expectedSignature) {
      return {
        valid: false,
        error: 'Plugin signature verification failed'
      };
    }

    return {
      valid: true,
      signer: signatureData.signer || 'unknown'
    };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to verify signature: ${(error as Error).message}`
    };
  }
}

/**
 * Check if plugin path is allowed based on permissions
 */
export function checkFileAccess(
  requestedPath: string,
  permissions: PluginPermissions['filesystem'],
  pluginDir: string
): boolean {
  if (!permissions) {
    return false; // No permissions = no access
  }

  const resolvedPath = path.resolve(pluginDir, requestedPath);

  // Check read permissions
  if (permissions.read && permissions.read.length > 0) {
    // Simple glob matching
    for (const pattern of permissions.read) {
      const patternPath = path.resolve(pluginDir, pattern);
      if (resolvedPath.startsWith(patternPath)) {
        return true;
      }
    }
  }

  return false; // Not explicitly allowed
}

/**
 * Enforce plugin sandbox by limiting API access
 */
export function createSandboxedAPI(
  api: Record<string, unknown>,
  permissions: PluginPermissions
): Record<string, unknown> {
  const sandboxed: Record<string, unknown> = {};

  // Only expose capabilities based on permissions
  if (permissions.vibe?.config && permissions.vibe.config !== 'none') {
    sandboxed.getConfig = api.getConfig;
  }

  if (permissions.vibe?.commands) {
    sandboxed.registerCommand = api.registerCommand;
  }

  if (permissions.vibe?.database) {
    sandboxed.database = api.database;
  }

  return sandboxed;
}

/**
 * Security policy for plugins
 */
export const SECURITY_POLICY = {
  // Reject plugins without signatures
  requireSignature: process.env.VIBE_ALLOW_UNSIGNED_PLUGINS !== 'true',

  // Maximum plugin size (10MB)
  maxPluginSize: 10 * 1024 * 1024,

  // Blocked plugin names
  blockedNames: ['admin', 'root', 'system', 'vibe-core'],

  // Required permission declarations
  requireExplicitPermissions: true,
} as const;
