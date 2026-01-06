/**
 * VIBE-CLI v12 - Shared Readline Interface
 *
 * SINGLETON: Only one readline interface for the entire application.
 * Prevents duplicate input / character echo issues.
 */

import readline from 'readline';

export const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true,
});

/**
 * Prompt helper - uses the shared readline interface
 */
export function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Yes/No prompt helper
 */
export function promptYesNo(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    rl.question(`${question} (y/n) `, (answer) => {
      resolve(answer.toLowerCase().startsWith('y'));
    });
  });
}

/**
 * Number prompt helper
 */
export function promptNumber(
  question: string,
  min: number,
  max: number
): Promise<number> {
  return new Promise((resolve) => {
    rl.question(`${question} [${min}-${max}]: `, (answer) => {
      const num = parseInt(answer, 10);
      if (isNaN(num) || num < min || num > max) {
        resolve(promptNumber(question, min, max));
      } else {
        resolve(num);
      }
    });
  });
}
