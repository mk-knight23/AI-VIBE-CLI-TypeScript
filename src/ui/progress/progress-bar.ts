import { themeManager } from '../themes/theme-manager';

export class ProgressBar {
    private width: number = 40;

    constructor(private total: number, private current: number = 0) { }

    update(current: number): void {
        this.current = current;
        this.render();
    }

    render(): void {
        const theme = themeManager.getCurrentTheme();
        const percent = Math.min(1, this.current / this.total);
        const filled = Math.round(this.width * percent);
        const empty = this.width - filled;

        const bar = '█'.repeat(filled) + '░'.repeat(empty);
        const percentage = Math.round(percent * 100);

        process.stdout.write(`\r${theme.primary('[')}${theme.accent(bar)}${theme.primary(']')} ${theme.accent(percentage.toString())}%`);
        if (this.current >= this.total) {
            process.stdout.write('\n');
        }
    }
}
