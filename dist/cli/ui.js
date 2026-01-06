"use strict";
/**
 * VIBE-CLI v12 - Shared Readline Interface
 *
 * SINGLETON: Only one readline interface for the entire application.
 * Prevents duplicate input / character echo issues.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rl = void 0;
exports.prompt = prompt;
exports.promptYesNo = promptYesNo;
exports.promptNumber = promptNumber;
const readline_1 = __importDefault(require("readline"));
exports.rl = readline_1.default.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
});
/**
 * Prompt helper - uses the shared readline interface
 */
function prompt(question) {
    return new Promise((resolve) => {
        exports.rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}
/**
 * Yes/No prompt helper
 */
function promptYesNo(question) {
    return new Promise((resolve) => {
        exports.rl.question(`${question} (y/n) `, (answer) => {
            resolve(answer.toLowerCase().startsWith('y'));
        });
    });
}
/**
 * Number prompt helper
 */
function promptNumber(question, min, max) {
    return new Promise((resolve) => {
        exports.rl.question(`${question} [${min}-${max}]: `, (answer) => {
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
//# sourceMappingURL=ui.js.map