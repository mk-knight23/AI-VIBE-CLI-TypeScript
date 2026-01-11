import ora, { Ora } from 'ora';
import { themeManager } from '../themes/theme-manager';

export class Spinner {
    private ora: Ora;

    constructor(text: string) {
        const theme = themeManager.getCurrentTheme();
        this.ora = ora({
            text: theme.text(text),
            color: 'cyan',
            spinner: 'dots',
        });
    }

    start(): void {
        this.ora.start();
    }

    succeed(text?: string): void {
        const theme = themeManager.getCurrentTheme();
        this.ora.succeed(text ? theme.success(text) : undefined);
    }

    fail(text?: string): void {
        const theme = themeManager.getCurrentTheme();
        this.ora.fail(text ? theme.error(text) : undefined);
    }

    warn(text?: string): void {
        const theme = themeManager.getCurrentTheme();
        this.ora.warn(text ? theme.warning(text) : undefined);
    }

    stop(): void {
        this.ora.stop();
    }

    set text(text: string) {
        const theme = themeManager.getCurrentTheme();
        this.ora.text = theme.text(text);
    }
}

export function createSpinner(text: string): Spinner {
    return new Spinner(text);
}
