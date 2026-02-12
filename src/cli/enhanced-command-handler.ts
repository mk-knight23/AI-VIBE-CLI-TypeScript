/**
 * VIBE-CLI v0.0.2 - Enhanced Command Handler
 * Type-safe CLI command registration and execution
 */

import { Command, Argument, Option, InvalidOptionArgumentError } from 'commander';
import { EventEmitter } from 'events';

export interface CommandDefinition {
    name: string;
    description: string;
    arguments?: Argument[];
    options?: Option[];
    action: (args: ParsedArgs) => Promise<void>;
    aliases?: string[];
    examples?: string[];
}

export interface ParsedArgs {
    [key: string]: unknown;
    _: string[];
}

export interface CommandHandlerConfig {
    programName: string;
    version: string;
    enableTelemetry?: boolean;
}

export class EnhancedCommandHandler extends EventEmitter {
    private readonly program: Command;
    private readonly commands: Map<string, CommandDefinition> = new Map();
    private readonly config: CommandHandlerConfig;
    private debugMode: boolean = false;

    constructor(config: CommandHandlerConfig) {
        super();
        this.config = config;
        this.program = new Command();
        this.setupGlobalOptions();
        this.setupErrorHandling();
    }

    private setupGlobalOptions(): void {
        this.program
            .name(this.config.programName)
            .version(this.config.version)
            .option('--verbose', 'Enable verbose (debug) logging')
            .option('--json', 'Output results as JSON')
            .option('--no-telemetry', 'Disable telemetry')
            .hook('preAction', (thisCommand) => {
                const options = thisCommand.opts();
                this.debugMode = options.verbose === true;
            });
    }

    private setupErrorHandling(): void {
        this.program.exitOverride((error) => {
            if (error) {
                const options = this.program.opts();
                if (this.debugMode) {
                    console.error('Error:', error.message);
                    if (error.stack) {
                        console.error(error.stack);
                    }
                } else {
                    console.error(error.message);
                }
            }
            process.exit(error?.exitCode || 1);
        });

        this.program.showSuggestionAfterError();
    }

    register(definition: CommandDefinition): void {
        const command = this.program
            .command(definition.name)
            .description(definition.description)
            .aliases(definition.aliases || []);

        // Add arguments
        for (const arg of definition.arguments || []) {
            command.addArgument(arg);
        }

        // Add options
        for (const opt of definition.options || []) {
            command.addOption(opt);
        }

        // Add examples
        if (definition.examples && definition.examples.length > 0) {
            command.addHelpText('after', '\nExamples:\n' + definition.examples.map(e => `  ${e}`).join('\n'));
        }

        // Set action
        command.action(async (...rawArgs: unknown[]) => {
            const lastArg = rawArgs[rawArgs.length - 1] as { opts?: () => Record<string, unknown> };
            const options = lastArg.opts?.() || {};
            const positionalArgs = rawArgs.slice(0, -1) as string[];

            const parsedArgs: ParsedArgs = {
                ...options,
                _: positionalArgs
            };

            // Emit command start event
            this.emit('command:start', { name: definition.name, args: parsedArgs });

            try {
                await definition.action(parsedArgs);
                this.emit('command:complete', { name: definition.name, success: true });
                console.log(`Command ${definition.name} completed successfully`);
            } catch (error) {
                this.emit('command:error', { name: definition.name, error });

                if (this.debugMode) {
                    console.error(`Command ${definition.name} failed:`, error);
                } else {
                    console.error(`Command failed: ${(error as Error).message}`);
                }

                throw error;
            }
        });

        this.commands.set(definition.name, definition);
    }

    /**
     * Register a simple command with minimal configuration
     */
    registerSimple(
        name: string,
        description: string,
        action: (args: ParsedArgs) => Promise<void>,
        options?: {
            aliases?: string[];
            examples?: string[];
            arguments?: string[];
            options?: Array<{ flags: string; description: string; defaultValue?: unknown }>;
        }
    ): void {
        const commandOptions = options?.options?.map(opt =>
            new Option(opt.flags, opt.description).default(opt.defaultValue)
        ) || [];

        this.register({
            name,
            description,
            arguments: options?.arguments?.map(arg => new Argument(arg)),
            options: commandOptions,
            aliases: options?.aliases,
            examples: options?.examples,
            action
        });
    }

    /**
     * Get command by name
     */
    getCommand(name: string): CommandDefinition | undefined {
        return this.commands.get(name);
    }

    /**
     * List all registered commands
     */
    listCommands(): string[] {
        return Array.from(this.commands.keys());
    }

    /**
     * Check if command exists
     */
    hasCommand(name: string): boolean {
        return this.commands.has(name);
    }

    /**
     * Get command help text
     */
    getHelpText(): string {
        return this.program.helpInformation();
    }

    /**
     * Parse and execute command line arguments
     */
    async execute(argv?: string[]): Promise<void> {
        await this.program.parseAsync(argv || process.argv);
    }

    /**
     * Get the underlying commander instance for advanced use
     */
    getProgram(): Command {
        return this.program;
    }

    /**
     * Add custom help text
     */
    addHelpText(position: 'beforeAll' | 'before' | 'after' | 'afterAll', text: string): void {
        this.program.addHelpText(position, text);
    }
}

/**
 * Create common argument validators
 */
export const Validators = {
    /**
     * Validate that argument is a number
     */
    number: (value: string): number => {
        const num = Number(value);
        if (isNaN(num)) {
            throw new InvalidOptionArgumentError(`Not a number: ${value}`);
        }
        return num;
    },

    /**
     * Validate that argument is a positive number
     */
    positiveNumber: (value: string): number => {
        const num = Validators.number(value);
        if (num <= 0) {
            throw new InvalidOptionArgumentError(`Must be positive: ${value}`);
        }
        return num;
    },

    /**
     * Validate that argument is a valid path
     */
    path: (value: string): string => {
        if (!value.startsWith('/') && !value.startsWith('./') && !value.startsWith('../')) {
            throw new InvalidOptionArgumentError(`Invalid path: ${value}`);
        }
        return value;
    },

    /**
     * Validate that argument is a valid email
     */
    email: (value: string): string => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            throw new InvalidOptionArgumentError(`Invalid email: ${value}`);
        }
        return value;
    },

    /**
     * Validate that argument is one of allowed values
     */
    oneOf: <T>(allowed: T[]): ((value: string) => T) => {
        return (value: string): T => {
            if (!allowed.includes(value as T)) {
                throw new InvalidOptionArgumentError(
                    `Invalid value: ${value}. Allowed values: ${allowed.join(', ')}`
                );
            }
            return value as T;
        };
    }
};
