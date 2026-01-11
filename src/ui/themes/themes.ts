import chalk from 'chalk';

export interface VibeTheme {
    name: string;
    primary: (text: string) => string;
    secondary: (text: string) => string;
    accent: (text: string) => string;
    error: (text: string) => string;
    warning: (text: string) => string;
    success: (text: string) => string;
    border: (text: string) => string;
    text: (text: string) => string;
    dim: (text: string) => string;
}

export const themes: Record<string, VibeTheme> = {
    vibe: {
        name: 'VIBE (Default)',
        primary: (text) => chalk.cyan(text),
        secondary: (text) => chalk.gray(text),
        accent: (text) => chalk.white.bold(text),
        error: (text) => chalk.red(text),
        warning: (text) => chalk.yellow(text),
        success: (text) => chalk.green(text),
        border: (text) => chalk.cyan(text),
        text: (text) => chalk.white(text),
        dim: (text) => chalk.gray(text),
    },
    minimal: {
        name: 'Minimal',
        primary: (text) => chalk.white.bold(text),
        secondary: (text) => chalk.gray(text),
        accent: (text) => chalk.white(text),
        error: (text) => chalk.red(text),
        warning: (text) => chalk.yellow(text),
        success: (text) => chalk.green(text),
        border: (text) => chalk.gray(text),
        text: (text) => chalk.white(text),
        dim: (text) => chalk.gray(text),
    },
    neon: {
        name: 'Neon',
        primary: (text) => chalk.magentaBright(text),
        secondary: (text) => chalk.blueBright(text),
        accent: (text) => chalk.yellowBright.bold(text),
        error: (text) => chalk.redBright.bold(text),
        warning: (text) => chalk.yellowBright(text),
        success: (text) => chalk.greenBright(text),
        border: (text) => chalk.magentaBright(text),
        text: (text) => chalk.whiteBright(text),
        dim: (text) => chalk.blue(text),
    },
};
