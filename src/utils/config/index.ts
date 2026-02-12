/**
 * VIBE-CLI v0.0.1 - Configuration Module
 *
 * Hierarchical configuration system with:
 * - Global and project-level config resolution
 * - Environment variable overrides
 * - Schema validation
 * - Secrets handling
 */

export { configResolver, ConfigResolver, DEFAULT_CONFIG } from './resolver.js';
export type {
  ConfigResolutionOptions,
  ConfigSource,
  VibeConfig,
  ThemeName,
  VerbosityLevel,
} from './resolver.js';
export { ConfigurationError } from './resolver.js';
