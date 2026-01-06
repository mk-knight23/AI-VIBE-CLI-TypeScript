/**
 * VIBE-CLI v12 - Base Module Class
 * All modules extend this class for consistency
 */
export interface ModuleInfo {
    name: string;
    version: string;
    description: string;
}
export interface ModuleResult {
    success: boolean;
    data?: any;
    error?: string;
    metadata?: {
        tokens?: number;
        duration?: number;
        model?: string;
    };
}
export declare abstract class BaseModule {
    protected readonly name: string;
    protected readonly version: string;
    protected readonly description: string;
    constructor(info: ModuleInfo);
    /**
     * Execute the module with given parameters
     */
    abstract execute(params: Record<string, any>): Promise<ModuleResult>;
    /**
     * Get module name
     */
    getName(): string;
    /**
     * Get module version
     */
    getVersion(): string;
    /**
     * Get module description
     */
    getDescription(): string;
    /**
     * Get module info
     */
    getInfo(): ModuleInfo;
    /**
     * Log info message
     */
    protected logInfo(message: string): void;
    /**
     * Log success message
     */
    protected logSuccess(message: string): void;
    /**
     * Log error message
     */
    protected logError(message: string, error?: any): void;
    /**
     * Log warning message
     */
    protected logWarning(message: string): void;
    /**
     * Create a successful result
     */
    protected success(data: any, metadata?: ModuleResult['metadata']): ModuleResult;
    /**
     * Create a failure result
     */
    protected failure(error: string): ModuleResult;
    /**
     * Validate required parameters
     */
    protected validateParams(params: Record<string, any>, required: string[]): boolean;
}
//# sourceMappingURL=base.module.d.ts.map