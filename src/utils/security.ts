/**
 * VIBE CLI - Security Utilities
 * Provides constant-time comparison and other security helpers
 */

import crypto from 'crypto';

/**
 * Constant-time string comparison to prevent timing attacks
 * Use this when comparing API keys, tokens, or other sensitive values
 *
 * @param a First string to compare
 * @param b Second string to compare
 * @returns true if strings are equal, false otherwise
 *
 * @example
 * // DON'T use this (vulnerable to timing attacks):
 * if (userApiKey === expectedApiKey) { ... }
 *
 * // DO use this (constant-time comparison):
 * if (constantTimeEqual(userApiKey, expectedApiKey)) { ... }
 */
export function constantTimeEqual(a: string, b: string): boolean {
  // If lengths differ, they're definitely not equal
  // Return early but still do comparison to maintain timing
  if (a.length !== b.length) {
    // Use timingSafeEqual with buffers of same length for consistent timing
    try {
      // Create a fake comparison that takes similar time
      const maxLen = Math.max(a.length, b.length);
      const bufA = Buffer.alloc(maxLen, 0);
      const bufB = Buffer.alloc(maxLen, 0);
      bufA.write(a);
      bufB.write(b);
      crypto.timingSafeEqual(bufA, bufB);
    } catch {
      // Ignore any errors from the fake comparison
    }
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(a, 'utf-8'),
      Buffer.from(b, 'utf-8')
    );
  } catch {
    return false;
  }
}

/**
 * Constant-time buffer comparison
 * Direct wrapper around crypto.timingSafeEqual with better error handling
 *
 * @param a First buffer
 * @param b Second buffer
 * @returns true if buffers are equal, false otherwise
 */
export function constantTimeBufferEqual(a: Buffer, b: Buffer): boolean {
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Securely compare two values that might be API keys or tokens
 * Handles null/undefined and performs constant-time comparison
 *
 * @param a First value (can be string, undefined, or null)
 * @param b Second value (can be string, undefined, or null)
 * @returns true if values are equal, false otherwise
 */
export function secureCompare(
  a: string | undefined | null,
  b: string | undefined | null
): boolean {
  // Handle null/undefined cases first (these are fast operations)
  if (a === undefined || a === null) {
    return b === undefined || b === null;
  }
  if (b === undefined || b === null) {
    return false;
  }

  // Both are strings, use constant-time comparison
  return constantTimeEqual(a, b);
}

/**
 * Check if a value matches an expected API key using constant-time comparison
 * This is the recommended function for API key validation
 *
 * @param actualKey The actual key to validate
 * @param expectedKey The expected key value
 * @returns true if keys match, false otherwise
 */
export function validateApiKey(
  actualKey: string | undefined | null,
  expectedKey: string | undefined | null
): boolean {
  return secureCompare(actualKey, expectedKey);
}

/**
 * Hash a value using SHA-256 for safe storage/comparison
 * Note: For password hashing, use bcrypt/scrypt/argon2 instead
 *
 * @param value Value to hash
 * @returns Hex-encoded hash
 */
export function sha256Hash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Generate a random secure token
 *
 * @param bytes Number of random bytes (default: 32)
 * @returns Hex-encoded random token
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Validate a string against allowed characters
 * Use this to validate user input before using it in commands
 *
 * @param input String to validate
 * @param allowedPattern Regex pattern of allowed characters
 * @returns true if valid, false otherwise
 */
export function validateInput(input: string, allowedPattern: RegExp): boolean {
  return allowedPattern.test(input);
}

/**
 * Sanitize a string for safe logging
 * Removes or masks sensitive information
 *
 * @param str String to sanitize
 * @param maskPatterns Array of patterns to mask (default: common API key patterns)
 * @returns Sanitized string
 */
export function sanitizeForLogging(
  str: string,
  maskPatterns: RegExp[] = [
    /sk-[a-zA-Z0-9-]{20,}/g,
    /sk-ant-api03-[a-zA-Z0-9_-]{20,}/g,
    /Bearer\s+[a-zA-Z0-9._-]+/g,
    /api[_-]?key["']?\s*[:=]\s*["']?([a-zA-Z0-9_-]{10,})/gi,
  ]
): string {
  let sanitized = str;
  for (const pattern of maskPatterns) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized;
}
