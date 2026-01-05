/**
 * VIBE CLI v12 - Command Line Arguments Parser
 * Simple, minimal argument parsing for single-command UX
 */

export class CommandLineArgs {
  private args: string[];
  
  constructor() {
    this.args = process.argv.slice(2);
  }
  
  /**
   * Check if any arguments were provided
   */
  hasArgs(): boolean {
    return this.args.length > 0;
  }
  
  /**
   * Check if a flag is present
   */
  hasFlag(...flags: string[]): boolean {
    return this.args.some(arg => 
      flags.some(flag => arg === flag || arg.startsWith(`${flag}=`))
    );
  }
  
  /**
   * Get first positional argument (command)
   */
  getCommand(): string | null {
    if (this.args.length === 0) return null;
    const first = this.args[0];
    if (first.startsWith('-')) return null;
    return first;
  }
  
  /**
   * Get all arguments after the command
   */
  getArgs(): string[] {
    const cmd = this.getCommand();
    if (!cmd) return this.args;
    const idx = this.args.indexOf(cmd);
    return this.args.slice(idx + 1);
  }
  
  /**
   * Get all flags (arguments starting with -)
   */
  getFlags(): string[] {
    return this.args.filter(arg => arg.startsWith('-'));
  }
  
  /**
   * Get all positional arguments
   */
  getPositional(): string[] {
    return this.args.filter(arg => !arg.startsWith('-'));
  }
  
  /**
   * Get value for an option (--key value)
   */
  getOption(name: string): string | null {
    const idx = this.args.indexOf(name);
    if (idx === -1 || idx + 1 >= this.args.length) return null;
    const next = this.args[idx + 1];
    if (next.startsWith('-')) return null;
    return next;
  }
  
  /**
   * Check if an option is present
   */
  hasOption(name: string): boolean {
    return this.args.includes(name);
  }
  
  /**
   * Get all key-value pairs from arguments
   */
  getOptions(): Record<string, string> {
    const options: Record<string, string> = {};
    for (let i = 0; i < this.args.length; i++) {
      const arg = this.args[i];
      if (arg.startsWith('--')) {
        const key = arg.slice(2);
        const next = this.args[i + 1];
        if (next && !next.startsWith('-')) {
          options[key] = next;
          i++;
        } else {
          options[key] = 'true';
        }
      }
    }
    return options;
  }
}
