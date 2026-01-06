/**
 * VIBE CLI v12 - Command Line Arguments Parser
 * Simple, minimal argument parsing for single-command UX
 */
export declare class CommandLineArgs {
    private args;
    constructor();
    /**
     * Check if any arguments were provided
     */
    hasArgs(): boolean;
    /**
     * Check if a flag is present
     */
    hasFlag(...flags: string[]): boolean;
    /**
     * Get first positional argument (command)
     */
    getCommand(): string | null;
    /**
     * Get all arguments after the command
     */
    getArgs(): string[];
    /**
     * Get all flags (arguments starting with -)
     */
    getFlags(): string[];
    /**
     * Get all positional arguments
     */
    getPositional(): string[];
    /**
     * Get value for an option (--key value)
     */
    getOption(name: string): string | null;
    /**
     * Check if an option is present
     */
    hasOption(name: string): boolean;
    /**
     * Get all key-value pairs from arguments
     */
    getOptions(): Record<string, string>;
}
//# sourceMappingURL=args.d.ts.map