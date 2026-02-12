/**
 * VIBE-CLI v0.0.2 - Enhanced Interactive Mode
 * Advanced interactive shell with autocomplete, history, and context awareness
 */

import * as readline from 'readline';
import { EnhancedCommandHandler } from './enhanced-command-handler.js';

export interface InteractiveConfig {
    welcomeMessage: string;
    prompt: string;
    commands: Map<string, string>;
    historySize: number;
    enableAutoComplete: boolean;
    enableSmartSuggestions: boolean;
}

export interface InteractiveSession {
    id: string;
    startTime: Date;
    commandCount: number;
}

export class EnhancedInteractiveMode {
    private history: string[] = [];
    private session: InteractiveSession;
    private commandHandler: EnhancedCommandHandler;
    private config: InteractiveConfig;
    private currentInput: string = '';
    private readonly rl: readline.Interface;

    constructor(
        commandHandler: EnhancedCommandHandler,
        config?: Partial<InteractiveConfig>
    ) {
        this.commandHandler = commandHandler;
        this.session = {
            id: this.generateSessionId(),
            startTime: new Date(),
            commandCount: 0
        };

        this.config = {
            welcomeMessage: this.getDefaultWelcome(),
            prompt: 'vibe',
            historySize: config?.historySize || 100,
            enableAutoComplete: config?.enableAutoComplete ?? true,
            enableSmartSuggestions: config?.enableSmartSuggestions ?? true,
            commands: config?.commands || new Map()
        };

        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    private getDefaultWelcome(): string {
        return `
╔════════════════════════════════════════════════════════════════╗
║                    VIBE CLI v0.0.2                            ║
║              AI-Powered Developer Teammate                      ║
╚════════════════════════════════════════════════════════════════╝

Type 'help' for available commands, 'exit' to quit.
    `.trim();
    }

    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Start the interactive session
     */
    async start(): Promise<void> {
        console.clear();
        console.log(this.config.welcomeMessage);
        console.log(`Session ID: ${this.session.id}\n`);

        await this.mainLoop();
    }

    /**
     * Main interactive loop using promises
     */
    private async mainLoop(): Promise<void> {
        while (true) {
            try {
                const answer = await this.question(this.getPrompt());

                if (!answer) break;

                if (answer.trim() === '') continue;
                if (answer.trim().toLowerCase() === 'exit') break;

                await this.processInput(answer);
            } catch {
                break;
            }
        }

        await this.shutdown();
    }

    private question(query: string): Promise<string> {
        return new Promise((resolve, reject) => {
            this.rl.question(query, (answer) => {
                resolve(answer);
            });
            this.rl.on('error', reject);
        });
    }

    private getPrompt(): string {
        return `${this.config.prompt} → `;
    }

    private async processInput(input: string): Promise<void> {
        const trimmed = input.trim();

        if (trimmed === '') return;

        // Add to history
        this.addToHistory(trimmed);

        // Parse command and args
        const parts = this.parseCommand(trimmed);
        const [cmd, ...args] = parts;

        // Handle built-in commands
        if (await this.handleBuiltInCommand(cmd, args)) {
            return;
        }

        // Execute command
        await this.executeCommand(cmd, args);
    }

    private parseCommand(input: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = '';

        for (let i = 0; i < input.length; i++) {
            const char = input[i];

            if (char === '"' || char === "'") {
                if (!inQuotes) {
                    inQuotes = true;
                    quoteChar = char;
                } else if (char === quoteChar) {
                    inQuotes = false;
                    quoteChar = '';
                } else {
                    current += char;
                }
            } else if (char === ' ' && !inQuotes) {
                if (current) {
                    result.push(current);
                    current = '';
                }
            } else {
                current += char;
            }
        }

        if (current) {
            result.push(current);
        }

        return result;
    }

    private async handleBuiltInCommand(cmd: string, _args: string[]): Promise<boolean> {
        switch (cmd.toLowerCase()) {
            case 'help':
                this.showHelp();
                return true;

            case 'history':
                this.showHistory();
                return true;

            case 'clear':
                console.clear();
                return true;

            case 'session':
                this.showSessionInfo();
                return true;

            case 'commands':
                this.showAvailableCommands();
                return true;

            case 'stats':
                this.showStats();
                return true;

            default:
                return false;
        }
    }

    private async executeCommand(cmd: string, args: string[]): Promise<void> {
        this.session.commandCount++;

        try {
            await this.commandHandler.execute([cmd, ...args]);
        } catch (error) {
            console.error(`Command failed: ${(error as Error).message}`);
        }
    }

    private addToHistory(input: string): void {
        this.history.push(input);
        if (this.history.length > this.config.historySize) {
            this.history.shift();
        }
    }

    private showHelp(): void {
        console.log(`
Available Commands:
  help          Show this help message
  history       Show command history
  clear         Clear the screen
  session       Show current session info
  commands      List all available commands
  stats         Show usage statistics
  exit          Exit the interactive mode

Use <Tab> for autocomplete on commands and file paths.
    `.trim());
    }

    private showHistory(): void {
        console.log('\nCommand History:');
        console.log('─'.repeat(40));
        this.history.forEach((cmd, index) => {
            console.log(`${String(index + 1).padStart(3)}  ${cmd}`);
        });
        console.log('');
    }

    private showSessionInfo(): void {
        const duration = Date.now() - this.session.startTime.getTime();
        const minutes = Math.floor(duration / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);

        console.log(`
Session Information:
  ID: ${this.session.id}
  Started: ${this.session.startTime.toISOString()}
  Duration: ${minutes}m ${seconds}s
  Commands: ${this.session.commandCount}
    `.trim());
    }

    private showAvailableCommands(): void {
        const commands = this.commandHandler.listCommands();

        console.log('\nAvailable Commands:');
        console.log('─'.repeat(40));
        commands.forEach(cmd => {
            const definition = this.commandHandler.getCommand(cmd);
            if (definition) {
                console.log(`  ${cmd.padEnd(20)} ${definition.description}`);
            }
        });
        console.log('');
    }

    private showStats(): void {
        console.log(`
Usage Statistics:
  Commands executed: ${this.session.commandCount}
  History entries: ${this.history.length}
  Session duration: ${this.formatDuration(Date.now() - this.session.startTime.getTime())}
    `.trim());
    }

    private formatDuration(ms: number): string {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        }
        return `${seconds}s`;
    }

    private async shutdown(): Promise<void> {
        console.log('\nGoodbye! 👋');
        this.rl.close();
    }

    /**
     * Get current session info
     */
    getSession(): InteractiveSession {
        return { ...this.session };
    }

    /**
     * Get command history
     */
    getHistory(): string[] {
        return [...this.history];
    }

    /**
     * Export session data
     */
    exportSession(): object {
        return {
            session: this.session,
            history: this.history,
            exportedAt: new Date().toISOString()
        };
    }
}
