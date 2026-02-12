/**
 * VIBE CLI - Standardized Error Handling Framework
 * Provides consistent error types, codes, and user-friendly messages
 */

export enum ErrorCode {
  // Configuration errors
  CONFIG_NOT_FOUND = 'CONFIG_NOT_FOUND',
  CONFIG_INVALID = 'CONFIG_INVALID',
  CONFIG_READ_ERROR = 'CONFIG_READ_ERROR',
  CONFIG_WRITE_ERROR = 'CONFIG_WRITE_ERROR',

  // Credential errors
  CREDENTIAL_NOT_FOUND = 'CREDENTIAL_NOT_FOUND',
  CREDENTIAL_STORE_ERROR = 'CREDENTIAL_STORE_ERROR',
  CREDENTIAL_DELETE_ERROR = 'CREDENTIAL_DELETE_ERROR',

  // API/LLM errors
  API_KEY_MISSING = 'API_KEY_MISSING',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  API_TIMEOUT = 'API_TIMEOUT',
  API_ERROR = 'API_ERROR',

  // File system errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  DIRECTORY_NOT_FOUND = 'DIRECTORY_NOT_FOUND',

  // Command errors
  COMMAND_INVALID = 'COMMAND_INVALID',
  COMMAND_FAILED = 'COMMAND_FAILED',
  COMMAND_ABORTED = 'COMMAND_ABORTED',

  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',

  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  userMessage: string;
  suggestion?: string;
  cause?: Error;
  context?: Record<string, unknown>;
}

export class VibeError extends Error {
  public readonly code: ErrorCode;
  public readonly userMessage: string;
  public readonly suggestion?: string;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: Date;
  public readonly isVibeError = true;

  constructor(details: ErrorDetails) {
    super(details.message);
    this.name = 'VibeError';
    this.code = details.code;
    this.userMessage = details.userMessage;
    this.suggestion = details.suggestion;
    this.context = details.context;
    this.timestamp = new Date();

    // Preserve stack trace
    if (details.cause?.stack) {
      this.stack = `${this.stack}\nCaused by: ${details.cause.stack}`;
    }
  }

  /**
   * Format error for display to user
   */
  public formatForDisplay(): string {
    const parts: string[] = [`❌ ${this.userMessage}`];

    if (this.suggestion) {
      parts.push(`💡 ${this.suggestion}`);
    }

    if (process.env.DEBUG === 'true' || process.env.VIBE_DEBUG === 'true') {
      parts.push(`\n[${this.code}] ${this.message}`);
      if (this.context) {
        parts.push(`Context: ${JSON.stringify(this.context, null, 2)}`);
      }
    }

    return parts.join('\n');
  }

  /**
   * Format error for logging
   */
  public toJSON(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      suggestion: this.suggestion,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

/**
 * Helper function to create common errors
 */
export const errors = {
  configNotFound(configPath: string): VibeError {
    return new VibeError({
      code: ErrorCode.CONFIG_NOT_FOUND,
      message: `Configuration file not found: ${configPath}`,
      userMessage: 'No configuration file found',
      suggestion: 'Run "vibe config init" to create a configuration file',
      context: { configPath },
    });
  },

  configInvalid(reason: string, configPath?: string): VibeError {
    return new VibeError({
      code: ErrorCode.CONFIG_INVALID,
      message: `Invalid configuration: ${reason}`,
      userMessage: 'Your configuration file has errors',
      suggestion: 'Check the configuration file format and try again',
      context: { reason, configPath },
    });
  },

  credentialNotFound(service: string, account: string): VibeError {
    return new VibeError({
      code: ErrorCode.CREDENTIAL_NOT_FOUND,
      message: `Credential not found: ${service}/${account}`,
      userMessage: `No API key found for ${service}`,
      suggestion: `Run "vibe config set-key ${service.toLowerCase()} <your-key>" to store your API key`,
      context: { service, account },
    });
  },

  credentialStoreError(service: string, cause?: Error): VibeError {
    return new VibeError({
      code: ErrorCode.CREDENTIAL_STORE_ERROR,
      message: `Failed to store credential for ${service}`,
      userMessage: `Could not save your API key for ${service}`,
      suggestion: 'Check your system keychain permissions and try again',
      cause,
      context: { service },
    });
  },

  apiKeyMissing(provider: string): VibeError {
    return new VibeError({
      code: ErrorCode.API_KEY_MISSING,
      message: `API key missing for ${provider}`,
      userMessage: `No API key configured for ${provider}`,
      suggestion: `Set ${provider.toUpperCase()}_API_KEY environment variable or run "vibe config set-key ${provider.toLowerCase()} <your-key>"`,
      context: { provider },
    });
  },

  apiRateLimit(provider: string, retryAfter?: number): VibeError {
    return new VibeError({
      code: ErrorCode.API_RATE_LIMIT,
      message: `Rate limit exceeded for ${provider}`,
      userMessage: `Rate limit reached for ${provider}`,
      suggestion: retryAfter
        ? `Please wait ${retryAfter} seconds before trying again`
        : 'Please wait a moment before trying again',
      context: { provider, retryAfter },
    });
  },

  apiTimeout(provider: string, timeoutMs: number): VibeError {
    return new VibeError({
      code: ErrorCode.API_TIMEOUT,
      message: `Request to ${provider} timed out after ${timeoutMs}ms`,
      userMessage: `Request to ${provider} took too long`,
      suggestion: 'Check your internet connection and try again',
      context: { provider, timeoutMs },
    });
  },

  apiError(provider: string, statusCode: number, message?: string): VibeError {
    return new VibeError({
      code: ErrorCode.API_ERROR,
      message: `API error from ${provider}: ${statusCode} ${message || ''}`,
      userMessage: `Error communicating with ${provider}`,
      suggestion: statusCode >= 500
        ? 'The service is temporarily unavailable. Please try again later'
        : 'Please check your API key and try again',
      context: { provider, statusCode, message },
    });
  },

  fileNotFound(filePath: string): VibeError {
    return new VibeError({
      code: ErrorCode.FILE_NOT_FOUND,
      message: `File not found: ${filePath}`,
      userMessage: `File not found: ${filePath}`,
      suggestion: 'Check the file path and try again',
      context: { filePath },
    });
  },

  fileReadError(filePath: string, cause?: Error): VibeError {
    return new VibeError({
      code: ErrorCode.FILE_READ_ERROR,
      message: `Failed to read file: ${filePath}`,
      userMessage: `Could not read file: ${filePath}`,
      suggestion: 'Check file permissions and try again',
      cause,
      context: { filePath },
    });
  },

  fileWriteError(filePath: string, cause?: Error): VibeError {
    return new VibeError({
      code: ErrorCode.FILE_WRITE_ERROR,
      message: `Failed to write file: ${filePath}`,
      userMessage: `Could not write file: ${filePath}`,
      suggestion: 'Check directory permissions and disk space',
      cause,
      context: { filePath },
    });
  },

  directoryNotFound(dirPath: string): VibeError {
    return new VibeError({
      code: ErrorCode.DIRECTORY_NOT_FOUND,
      message: `Directory not found: ${dirPath}`,
      userMessage: `Directory not found: ${dirPath}`,
      suggestion: 'Check the directory path and try again',
      context: { dirPath },
    });
  },

  commandInvalid(command: string, reason: string): VibeError {
    return new VibeError({
      code: ErrorCode.COMMAND_INVALID,
      message: `Invalid command "${command}": ${reason}`,
      userMessage: `Invalid command: ${command}`,
      suggestion: 'Run "vibe --help" to see available commands',
      context: { command, reason },
    });
  },

  commandFailed(command: string, cause?: Error): VibeError {
    return new VibeError({
      code: ErrorCode.COMMAND_FAILED,
      message: `Command "${command}" failed`,
      userMessage: `Command failed: ${command}`,
      suggestion: 'Check the error details and try again',
      cause,
      context: { command },
    });
  },

  commandAborted(command: string): VibeError {
    return new VibeError({
      code: ErrorCode.COMMAND_ABORTED,
      message: `Command "${command}" was aborted`,
      userMessage: `Command cancelled: ${command}`,
      context: { command },
    });
  },

  validationError(field: string, reason: string): VibeError {
    return new VibeError({
      code: ErrorCode.VALIDATION_ERROR,
      message: `Validation failed for ${field}: ${reason}`,
      userMessage: `Invalid value for ${field}`,
      suggestion: reason,
      context: { field, reason },
    });
  },

  invalidInput(reason: string): VibeError {
    return new VibeError({
      code: ErrorCode.INVALID_INPUT,
      message: `Invalid input: ${reason}`,
      userMessage: 'Invalid input provided',
      suggestion: reason,
      context: { reason },
    });
  },

  networkError(url: string, cause?: Error): VibeError {
    return new VibeError({
      code: ErrorCode.NETWORK_ERROR,
      message: `Network error for ${url}`,
      userMessage: 'Network connection failed',
      suggestion: 'Check your internet connection and try again',
      cause,
      context: { url },
    });
  },

  timeoutError(operation: string, timeoutMs: number): VibeError {
    return new VibeError({
      code: ErrorCode.TIMEOUT_ERROR,
      message: `Operation "${operation}" timed out after ${timeoutMs}ms`,
      userMessage: 'Operation took too long to complete',
      suggestion: 'Try again or increase the timeout limit',
      context: { operation, timeoutMs },
    });
  },

  unknownError(cause?: Error): VibeError {
    return new VibeError({
      code: ErrorCode.UNKNOWN_ERROR,
      message: cause?.message || 'An unknown error occurred',
      userMessage: 'Something went wrong',
      suggestion: 'Try again or run with DEBUG=true for more details',
      cause,
    });
  },
};

/**
 * Wrap any error in a VibeError
 */
export function wrapError(error: unknown, context?: Record<string, unknown>): VibeError {
  if (error instanceof VibeError) {
    if (context) {
      return new VibeError({
        code: error.code,
        message: error.message,
        userMessage: error.userMessage,
        suggestion: error.suggestion,
        context: { ...error.context, ...context },
      });
    }
    return error;
  }

  if (error instanceof Error) {
    return new VibeError({
      code: ErrorCode.UNKNOWN_ERROR,
      message: error.message,
      userMessage: 'An unexpected error occurred',
      suggestion: 'Try again or run with DEBUG=true for more details',
      cause: error,
      context,
    });
  }

  return new VibeError({
    code: ErrorCode.UNKNOWN_ERROR,
    message: String(error),
    userMessage: 'An unexpected error occurred',
    suggestion: 'Try again or run with DEBUG=true for more details',
    context,
  });
}

/**
 * Check if an error is a VibeError
 */
export function isVibeError(error: unknown): error is VibeError {
  return error instanceof VibeError || (error as VibeError)?.isVibeError === true;
}
