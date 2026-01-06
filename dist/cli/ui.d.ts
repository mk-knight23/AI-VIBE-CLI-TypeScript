/**
 * VIBE-CLI v12 - Shared Readline Interface
 *
 * SINGLETON: Only one readline interface for the entire application.
 * Prevents duplicate input / character echo issues.
 */
import readline from 'readline';
export declare const rl: readline.Interface;
/**
 * Prompt helper - uses the shared readline interface
 */
export declare function prompt(question: string): Promise<string>;
/**
 * Yes/No prompt helper
 */
export declare function promptYesNo(question: string): Promise<boolean>;
/**
 * Number prompt helper
 */
export declare function promptNumber(question: string, min: number, max: number): Promise<number>;
//# sourceMappingURL=ui.d.ts.map