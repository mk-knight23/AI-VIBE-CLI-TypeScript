import { themeManager } from '../themes/theme-manager';

export function formatTable(headers: string[], rows: string[][]): string {
    const theme = themeManager.getCurrentTheme();
    const columnWidths = headers.map((h, i) =>
        Math.max(h.length, ...rows.map(r => r[i]?.length || 0))
    );

    const headerLine = headers.map((h, i) =>
        theme.accent(h.padEnd(columnWidths[i]))
    ).join(' │ ');

    const separator = columnWidths.map(w => '─'.repeat(w)).join('─┼─');

    const contentRows = rows.map(row =>
        row.map((cell, i) => theme.text((cell || '').padEnd(columnWidths[i]))).join(' │ ')
    ).join('\n');

    return `\n${headerLine}\n${theme.border(separator)}\n${contentRows}\n`;
}
