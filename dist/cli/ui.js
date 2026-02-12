/**
 * VIBE-CLI v0.0.1 - Shared Readline Interface
 *
 * SINGLETON: Only one readline interface for the entire application.
 * Prevents duplicate input / character echo issues.
 */
import readline from 'readline';
let completer = (line) => [[], line];
export let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    completer: (line) => completer(line),
});
/**
 * Update the completer function
 */
export function setCompleter(newCompleter) {
    completer = newCompleter;
}
/**
 * Prompt helper - uses the shared readline interface
 */
export function prompt(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}
/**
 * Yes/No prompt helper
 */
export function promptYesNo(question) {
    return new Promise((resolve) => {
        rl.question(`${question} (y/n) `, (answer) => {
            resolve(answer.toLowerCase().startsWith('y'));
        });
    });
}
/**
 * Number prompt helper
 */
export function promptNumber(question, min, max) {
    return new Promise((resolve) => {
        rl.question(`${question} [${min}-${max}]: `, (answer) => {
            const num = parseInt(answer, 10);
            if (isNaN(num) || num < min || num > max) {
                resolve(promptNumber(question, min, max));
            }
            else {
                resolve(num);
            }
        });
    });
}
/**
 * Write a chunk to stdout without a newline
 */
export function writeStreamChunk(chunk) {
    process.stdout.write(chunk);
}
/**
 * Draw a decorative box around text
 */
export function drawBox(text, color = (s) => s) {
    const lines = text.split('\n');
    const width = Math.max(...lines.map((l) => l.length)) + 4;
    const top = color('╔' + '═'.repeat(width - 2) + '╗');
    const bottom = color('╚' + '═'.repeat(width - 2) + '╝');
    console.log(top);
    for (const line of lines) {
        console.log(color('║ ') + line.padEnd(width - 4) + color(' ║'));
    }
    console.log(bottom);
}
//# sourceMappingURL=ui.js.map