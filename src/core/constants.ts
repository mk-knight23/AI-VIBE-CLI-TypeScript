/**
 * VIBE CLI - Core Constants
 * Centralized configuration values and magic numbers
 */

/**
 * Cache Configuration
 */
export const CACHE_CONFIG = {
  // Maximum number of entries in LRU caches
  MAX_FILE_CACHE_SIZE: 1000,
  MAX_SEMANTIC_INDEX_SIZE: 5000,

  // Memory limits (in MB)
  MAX_CACHE_MEMORY_MB: 100,

  // Cache TTL (in milliseconds)
  CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes

  // Cache freshness threshold (in milliseconds)
  CACHE_FRESHNESS_THRESHOLD_MS: 60 * 60 * 1000, // 1 hour
} as const;

/**
 * Timeout Configuration
 */
export const TIMEOUT_CONFIG = {
  // Default operation timeouts (in milliseconds)
  DEFAULT_COMMAND_TIMEOUT_MS: 60000, // 1 minute
  DEFAULT_API_REQUEST_TIMEOUT_MS: 30000, // 30 seconds
  DEFAULT_FILE_OPERATION_TIMEOUT_MS: 5000, // 5 seconds

  // Database timeouts
  DATABASE_BUSY_TIMEOUT_MS: 5000, // 5 seconds

  // Sandbox resource limits
  SANDBOX_MAX_MEMORY_MB: 512,
  SANDBOX_MAX_CPU_TIME_SEC: 60,
  SANDBOX_MAX_FILE_SIZE_MB: 10,
} as const;

/**
 * Rate Limiting Configuration
 */
export const RATE_LIMIT_CONFIG = {
  // API rate limiting (requests per window)
  API_RATE_LIMIT_MAX_REQUESTS: 100,
  API_RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes

  // Token bucket rate limiting
  TOKEN_BUCKET_CAPACITY: 100,
  TOKEN_BUCKET_REFILL_RATE: 10, // tokens per second
} as const;

/**
 * File Size and Content Limits
 */
export const FILE_LIMITS = {
  // Maximum file sizes for various operations
  MAX_API_REQUEST_SIZE_MB: 10,
  MAX_LOG_SIZE_BYTES: 10 * 1024 * 1024, // 10MB

  // Context packing limits
  MAX_CONTEXT_TOKENS: 100000,
  TOKENS_PER_CHAR_APPROX: 0.000003,
} as const;

/**
 * Time Constants
 */
export const TIME_CONSTANTS = {
  SECOND_MS: 1000,
  MINUTE_MS: 60 * 1000,
  HOUR_MS: 60 * 60 * 1000,
  DAY_MS: 24 * 60 * 60 * 1000,
  WEEK_MS: 7 * 24 * 60 * 60 * 1000,
  MONTH_MS: 30 * 24 * 60 * 60 * 1000,
  YEAR_MS: 365 * 24 * 60 * 60 * 1000,
} as const;

/**
 * File Encoding
 */
export const ENCODING = {
  UTF8: 'utf-8',
  DEFAULT: 'utf-8',
} as const;

/**
 * File Paths and Patterns
 */
export const PATH_PATTERNS = {
  // Default ignore patterns for codebase scanning
  DEFAULT_IGNORE: [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/*.min.js',
    '**/*.min.css',
  ],

  // Source file patterns to scan
  SOURCE_FILE_PATTERNS: [
    '**/*.ts',
    '**/*.tsx',
    '**/*.js',
    '**/*.jsx',
    '**/*.py',
    '**/*.java',
    '**/*.go',
    '**/*.rs',
  ],

  // Test file patterns
  TEST_FILE_PATTERNS: [
    '**/*.test.ts',
    '**/*.test.js',
    '**/*.spec.ts',
    '**/*.spec.js',
    '**/tests/**/*.ts',
    '**/tests/**/*.js',
    '**/__tests__/**',
  ],
} as const;

/**
 * Semantic Index Configuration
 */
export const SEMANTIC_INDEX_CONFIG = {
  // Recency bonus scoring
  TODAY_BONUS: 0.3,
  THIS_WEEK_BONUS: 0.2,
  THIS_MONTH_BONUS: 0.1,

  // Chunking
  DEFAULT_CHUNK_SIZE: 1000,
  DEFAULT_CHUNK_OVERLAP: 200,
  MIN_TOKEN_LENGTH: 100,
  MAX_TOKEN_LENGTH: 1000,
} as const;

/**
 * API Server Configuration
 */
export const API_SERVER_CONFIG = {
  DEFAULT_PORT: 3000,
  DEFAULT_HOST: '0.0.0.0',

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // Version
  API_VERSION: 'v1',
  API_PREFIX: '/api/v1',
} as const;

/**
 * Security Configuration
 */
export const SECURITY_CONFIG = {
  // Signature verification
  MAX_SIGNATURE_AGE_MS: 365 * 24 * 60 * 60 * 1000, // 1 year
  MAX_PLUGIN_SIZE_BYTES: 10 * 1024 * 1024, // 10MB

  // Blocked plugin names
  BLOCKED_PLUGIN_NAMES: [
    'admin',
    'root',
    'system',
    'vibe-core',
  ],

  // Dangerous commands (always blocked)
  DANGEROUS_COMMANDS: [
    'rm',
    'dd',
    'mkfs',
    'chmod',
    'chown',
    'sudo',
    'su',
  ],

  // Blocked paths for sandbox
  BLOCKED_SYSTEM_PATHS: [
    '/etc',
    '/usr',
    '/bin',
    '/sbin',
    '/boot',
    '/lib',
    '/lib64',
    '/root',
    '/home/root',
    '.ssh',
    '.aws',
    '.gcloud',
    '/private/etc',
    '/private/var',
  ],
} as const;

/**
 * Version Information
 */
export const VERSION_INFO = {
  CLI_VERSION: '0.0.2',
  API_VERSION: 'v1',
  PROTOCOL_VERSION: '1.0.0',
} as const;

/**
 * Progress Indicators
 */
export const SPINNER_CONFIG = {
  // Update interval for spinners (milliseconds)
  UPDATE_INTERVAL_MS: 120, // 8 FPS

  // Frames per second targets
  SPINNER_FPS_TARGET: 8,
  PROGRESS_BAR_FPS_TARGET: 6,
} as const;

/**
 * Feature Flags
 */
export const FEATURES = {
  MCP_ENABLED: true,
  TELEMETRY_ENABLED: true,
  AUTO_UPDATE_CHECK: true,
  EXPERIMENTAL_SANDBOX: false, // TODO: Enable when VM2 integration is complete
} as const;

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
  PLUGIN_SIGNATURE_REQUIRED: 'Plugin signature not found. Unsigned plugins are not allowed for security.',
  PLUGIN_PERMISSION_DENIED: 'Permission denied: Plugin does not have required permissions.',
  API_KEY_MISSING: 'API key not configured. Please set environment variables.',
  PATH_TRAVERSAL_DETECTED: 'Security: Path traversal detected. Access denied.',
  COMMAND_BLOCKED: 'Command blocked for security reasons.',
} as const;

/**
 * Success Messages
 */
export const SUCCESS_MESSAGES = {
  PLUGIN_LOADED: 'Plugin loaded successfully',
  CONFIG_SAVED: 'Configuration saved',
  CHECKPOINT_CREATED: 'Checkpoint created',
  CHECKPOINT_RESTORED: 'Checkpoint restored',
} as const;
