/**
 * VIBE-CLI v12 - Custom Error Classes
 * Production-grade error handling with specific error types
 */

export class VibeError extends Error {
  constructor(
    message: string,
    public code: string = 'VIBE_ERROR',
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'VibeError';
  }
}

export class ModuleError extends VibeError {
  constructor(
    message: string,
    public moduleName: string,
    public action?: string,
    details?: Record<string, any>
  ) {
    super(message, 'MODULE_ERROR', { moduleName, action, ...details });
    this.name = 'ModuleError';
  }
}

export class RouteError extends VibeError {
  constructor(
    message: string,
    public route: string,
    public input?: string,
    details?: Record<string, any>
  ) {
    super(message, 'ROUTE_ERROR', { route, input, ...details });
    this.name = 'RouteError';
  }
}

export class ProviderError extends VibeError {
  constructor(
    message: string,
    public provider: string,
    public model?: string,
    public statusCode?: number,
    details?: Record<string, any>
  ) {
    super(message, 'PROVIDER_ERROR', { provider, model, statusCode, ...details });
    this.name = 'ProviderError';
  }
}

export class ConfigurationError extends VibeError {
  constructor(
    message: string,
    public configKey: string,
    details?: Record<string, any>
  ) {
    super(message, 'CONFIGURATION_ERROR', { configKey, ...details });
    this.name = 'ConfigurationError';
  }
}

export class ValidationError extends VibeError {
  constructor(
    message: string,
    public field?: string,
    public value?: any,
    details?: Record<string, any>
  ) {
    super(message, 'VALIDATION_ERROR', { field, value, ...details });
    this.name = 'ValidationError';
  }
}

/**
 * Error handler wrapper for async functions
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  errorHandler: (error: Error) => T
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    return errorHandler(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Create error response object
 */
export function createErrorResponse(
  error: Error,
  context?: Record<string, any>
): { success: false; error: string; code: string; context?: Record<string, any> } {
  const vibeError = error as VibeError;
  return {
    success: false,
    error: error.message,
    code: vibeError.code || 'UNKNOWN_ERROR',
    // Merge context with error details
    context: {
      ...context,
      ...vibeError.details,
    },
  };
}
