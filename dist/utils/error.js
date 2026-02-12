/**
 * VIBE-CLI v0.0.1 - Custom Error Classes
 * Production-grade error handling with specific error types
 */
export class VibeError extends Error {
    code;
    details;
    constructor(message, code = 'VIBE_ERROR', details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'VibeError';
    }
}
export class ModuleError extends VibeError {
    moduleName;
    action;
    constructor(message, moduleName, action, details) {
        super(message, 'MODULE_ERROR', { moduleName, action, ...details });
        this.moduleName = moduleName;
        this.action = action;
        this.name = 'ModuleError';
    }
}
export class RouteError extends VibeError {
    route;
    input;
    constructor(message, route, input, details) {
        super(message, 'ROUTE_ERROR', { route, input, ...details });
        this.route = route;
        this.input = input;
        this.name = 'RouteError';
    }
}
export class ProviderError extends VibeError {
    provider;
    model;
    statusCode;
    constructor(message, provider, model, statusCode, details) {
        super(message, 'PROVIDER_ERROR', { provider, model, statusCode, ...details });
        this.provider = provider;
        this.model = model;
        this.statusCode = statusCode;
        this.name = 'ProviderError';
    }
}
export class ConfigurationError extends VibeError {
    configKey;
    constructor(message, configKey, details) {
        super(message, 'CONFIGURATION_ERROR', { configKey, ...details });
        this.configKey = configKey;
        this.name = 'ConfigurationError';
    }
}
export class ValidationError extends VibeError {
    field;
    value;
    constructor(message, field, value, details) {
        super(message, 'VALIDATION_ERROR', { field, value, ...details });
        this.field = field;
        this.value = value;
        this.name = 'ValidationError';
    }
}
/**
 * Error handler wrapper for async functions
 */
export async function withErrorHandling(fn, errorHandler) {
    try {
        return await fn();
    }
    catch (error) {
        return errorHandler(error instanceof Error ? error : new Error(String(error)));
    }
}
/**
 * Create error response object
 */
export function createErrorResponse(error, context) {
    const vibeError = error;
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
//# sourceMappingURL=error.js.map