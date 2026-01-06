/**
 * VIBE-CLI v12 - Custom Error Classes
 * Production-grade error handling with specific error types
 */
export declare class VibeError extends Error {
    code: string;
    details?: Record<string, any> | undefined;
    constructor(message: string, code?: string, details?: Record<string, any> | undefined);
}
export declare class ModuleError extends VibeError {
    moduleName: string;
    action?: string | undefined;
    constructor(message: string, moduleName: string, action?: string | undefined, details?: Record<string, any>);
}
export declare class RouteError extends VibeError {
    route: string;
    input?: string | undefined;
    constructor(message: string, route: string, input?: string | undefined, details?: Record<string, any>);
}
export declare class ProviderError extends VibeError {
    provider: string;
    model?: string | undefined;
    statusCode?: number | undefined;
    constructor(message: string, provider: string, model?: string | undefined, statusCode?: number | undefined, details?: Record<string, any>);
}
export declare class ConfigurationError extends VibeError {
    configKey: string;
    constructor(message: string, configKey: string, details?: Record<string, any>);
}
export declare class ValidationError extends VibeError {
    field?: string | undefined;
    value?: any | undefined;
    constructor(message: string, field?: string | undefined, value?: any | undefined, details?: Record<string, any>);
}
/**
 * Error handler wrapper for async functions
 */
export declare function withErrorHandling<T>(fn: () => Promise<T>, errorHandler: (error: Error) => T): Promise<T>;
/**
 * Create error response object
 */
export declare function createErrorResponse(error: Error, context?: Record<string, any>): {
    success: false;
    error: string;
    code: string;
    context?: Record<string, any>;
};
//# sourceMappingURL=error.d.ts.map