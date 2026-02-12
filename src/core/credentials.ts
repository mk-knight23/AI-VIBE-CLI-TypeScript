/**
 * VIBE CLI - Secure Credential Storage
 * Uses system keychain via keytar for secure API key storage
 */

import keytar from 'keytar';
import { VibeError, errors, ErrorCode } from '../utils/errors.js';
import { createLogger } from '../utils/pino-logger.js';

const logger = createLogger('credentials');

// Service name for keychain entries
const SERVICE_NAME = 'vibe-cli';

// Supported credential types
export enum CredentialType {
  ANTHROPIC_API_KEY = 'anthropic-api-key',
  OPENAI_API_KEY = 'openai-api-key',
  MINIMAX_API_KEY = 'minimax-api-key',
  GITHUB_TOKEN = 'github-token',
  GITLAB_TOKEN = 'gitlab-token',
}

// Human-readable names for credential types
const CREDENTIAL_NAMES: Record<CredentialType, string> = {
  [CredentialType.ANTHROPIC_API_KEY]: 'Anthropic API Key',
  [CredentialType.OPENAI_API_KEY]: 'OpenAI API Key',
  [CredentialType.MINIMAX_API_KEY]: 'MiniMax API Key',
  [CredentialType.GITHUB_TOKEN]: 'GitHub Token',
  [CredentialType.GITLAB_TOKEN]: 'GitLab Token',
};

// Environment variable mappings
const ENV_MAPPINGS: Record<CredentialType, string> = {
  [CredentialType.ANTHROPIC_API_KEY]: 'ANTHROPIC_API_KEY',
  [CredentialType.OPENAI_API_KEY]: 'OPENAI_API_KEY',
  [CredentialType.MINIMAX_API_KEY]: 'MINIMAX_API_KEY',
  [CredentialType.GITHUB_TOKEN]: 'GITHUB_TOKEN',
  [CredentialType.GITLAB_TOKEN]: 'GITLAB_TOKEN',
};

export interface CredentialInfo {
  type: CredentialType;
  name: string;
  stored: boolean;
  envValue: boolean;
}

/**
 * Get the account name for a credential type
 */
function getAccountName(type: CredentialType): string {
  return type;
}

/**
 * Store a credential in the system keychain
 */
export async function setCredential(
  type: CredentialType,
  value: string
): Promise<{ success: true } | { success: false; error: VibeError }> {
  const account = getAccountName(type);
  const name = CREDENTIAL_NAMES[type];

  logger.debug({ credentialType: type, account }, 'Storing credential');

  try {
    await keytar.setPassword(SERVICE_NAME, account, value);
    logger.info({ credentialType: type }, 'Credential stored successfully');
    return { success: true };
  } catch (error) {
    logger.error({ error, credentialType: type }, 'Failed to store credential');
    return {
      success: false,
      error: errors.credentialStoreError(name, error as Error),
    };
  }
}

/**
 * Retrieve a credential from the system keychain
 * Falls back to environment variable if not in keychain
 */
export async function getCredential(
  type: CredentialType
): Promise<{ success: true; value: string; source: 'keychain' | 'env' } | { success: false; error: VibeError }> {
  const account = getAccountName(type);
  const name = CREDENTIAL_NAMES[type];
  const envVar = ENV_MAPPINGS[type];

  logger.debug({ credentialType: type, account }, 'Retrieving credential');

  // First, try the system keychain
  try {
    const value = await keytar.getPassword(SERVICE_NAME, account);
    if (value) {
      logger.debug({ credentialType: type, source: 'keychain' }, 'Credential found in keychain');
      return { success: true, value, source: 'keychain' };
    }
  } catch (error) {
    logger.warn({ error, credentialType: type }, 'Error reading from keychain, trying env');
  }

  // Fall back to environment variable
  const envValue = process.env[envVar];
  if (envValue) {
    logger.debug({ credentialType: type, source: 'env' }, 'Credential found in environment');
    return { success: true, value: envValue, source: 'env' };
  }

  // Not found anywhere
  logger.warn({ credentialType: type }, 'Credential not found');
  return {
    success: false,
    error: errors.credentialNotFound(name, account),
  };
}

/**
 * Delete a credential from the system keychain
 */
export async function deleteCredential(
  type: CredentialType
): Promise<{ success: true } | { success: false; error: VibeError }> {
  const account = getAccountName(type);
  const name = CREDENTIAL_NAMES[type];

  logger.debug({ credentialType: type, account }, 'Deleting credential');

  try {
    const result = await keytar.deletePassword(SERVICE_NAME, account);
    if (result) {
      logger.info({ credentialType: type }, 'Credential deleted successfully');
      return { success: true };
    } else {
      logger.warn({ credentialType: type }, 'Credential not found for deletion');
      return { success: true }; // Already doesn't exist
    }
  } catch (error) {
    logger.error({ error, credentialType: type }, 'Failed to delete credential');
    return {
      success: false,
      error: new VibeError({
        code: ErrorCode.CREDENTIAL_DELETE_ERROR,
        message: `Failed to delete credential for ${name}`,
        userMessage: `Could not delete ${name}`,
        suggestion: 'Check your system keychain permissions',
        cause: error as Error,
        context: { type, account },
      }),
    };
  }
}

/**
 * Check if a credential exists
 */
export async function hasCredential(type: CredentialType): Promise<boolean> {
  const result = await getCredential(type);
  return result.success;
}

/**
 * Get information about all credentials
 */
export async function getAllCredentials(): Promise<CredentialInfo[]> {
  const credentials: CredentialInfo[] = [];

  for (const type of Object.values(CredentialType)) {
    const envVar = ENV_MAPPINGS[type as CredentialType];
    const hasEnvValue = !!process.env[envVar];
    const hasStoredValue = await hasCredential(type as CredentialType);

    credentials.push({
      type: type as CredentialType,
      name: CREDENTIAL_NAMES[type as CredentialType],
      stored: hasStoredValue,
      envValue: hasEnvValue,
    });
  }

  return credentials;
}

/**
 * Get the environment variable name for a credential type
 */
export function getEnvVarName(type: CredentialType): string {
  return ENV_MAPPINGS[type];
}

/**
 * Get human-readable name for a credential type
 */
export function getCredentialName(type: CredentialType): string {
  return CREDENTIAL_NAMES[type];
}

/**
 * Migrate credentials from environment to keychain
 */
export async function migrateFromEnv(type: CredentialType): Promise<{ success: boolean; migrated: boolean; error?: VibeError }> {
  const envVar = ENV_MAPPINGS[type];
  const envValue = process.env[envVar];

  if (!envValue) {
    return { success: true, migrated: false };
  }

  // Check if already in keychain
  const existing = await getCredential(type);
  if (existing.success && existing.source === 'keychain') {
    logger.debug({ credentialType: type }, 'Already in keychain, skipping migration');
    return { success: true, migrated: false };
  }

  // Store in keychain
  const result = await setCredential(type, envValue);
  if (result.success) {
    logger.info({ credentialType: type }, 'Migrated credential from env to keychain');
    return { success: true, migrated: true };
  } else {
    return { success: false, migrated: false, error: result.error };
  }
}
