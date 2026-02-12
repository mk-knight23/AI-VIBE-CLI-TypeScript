/**
 * VIBE CLI Output Formatter
 * Export data in JSON, CSV, Table, and other formats
 */

import chalk from 'chalk';

export type OutputFormat = 'json' | 'csv' | 'table' | 'text' | 'markdown' | 'yaml';

/** Generic record type for formatter input data */
type DataRecord = Record<string, unknown>;

export interface TableColumn {
    header: string;
    key: string;
    width?: number;
    align?: 'left' | 'center' | 'right';
    format?: (value: unknown) => string;
}

export interface FormatOptions {
    format?: OutputFormat;
    outputFile?: string;
    headers?: boolean;
    delimiter?: string;
    pretty?: boolean;
}

export class OutputFormatter {
    private options: FormatOptions;

    constructor(options: FormatOptions = {}) {
        this.options = {
            format: options.format || 'table',
            outputFile: options.outputFile,
            headers: options.headers !== false,
            delimiter: options.delimiter || ',',
            pretty: options.pretty !== false,
        };
    }

    setOption<K extends keyof FormatOptions>(key: K, value: FormatOptions[K]): void {
        this.options[key] = value;
    }

    format(data: unknown): string {
        if (this.options.outputFile) {
            const fs = require('fs');
            fs.writeFileSync(this.options.outputFile, this.toString(data));
            return `Output written to ${this.options.outputFile}`;
        }

        return this.toString(data);
    }

    toString(data: unknown): string {
        const records = Array.isArray(data) ? data as DataRecord[] : [data as DataRecord];

        switch (this.options.format) {
            case 'json':
                return this.toJSON(records);
            case 'csv':
                return this.toCSV(records);
            case 'table':
                return this.toTable(records);
            case 'markdown':
                return this.toMarkdown(records);
            case 'yaml':
                return this.toYAML(records);
            case 'text':
            default:
                return this.toText(records);
        }
    }

    private toJSON(data: DataRecord[]): string {
        if (this.options.pretty) {
            return JSON.stringify(data, null, 2);
        }
        return JSON.stringify(data);
    }

    private toCSV(data: DataRecord[]): string {
        if (data.length === 0) return '';

        const keys = this.getAllKeys(data);
        const lines: string[] = [];

        if (this.options.headers) {
            lines.push(keys.join(this.options.delimiter));
        }

        for (const item of data) {
            const values = keys.map(key => {
                const value = this.getNestedValue(item, key);
                return this.escapeCSV(String(value ?? ''));
            });
            lines.push(values.join(this.options.delimiter));
        }

        return lines.join('\n');
    }

    private toTable(data: DataRecord[], columns?: TableColumn[]): string {
        if (data.length === 0) return 'No data available';

        if (columns) {
            return this.customTable(data, columns);
        }

        const keys = this.getAllKeys(data);
        const colWidths = this.calculateColumnWidths(data, keys);

        const horizontalLine = this.createTableLine(colWidths, '┌', '─', '┬', '┐');
        const separatorLine = this.createTableLine(colWidths, '├', '─', '┼', '┤');
        const bottomLine = this.createTableLine(colWidths, '└', '─', '┴', '┘');

        const lines: string[] = [horizontalLine];

        const headers = keys.map((key, i) =>
            this.padString(key, colWidths[i], 'center')
        );
        lines.push(`│ ${headers.join(' │ ')} │`);
        lines.push(separatorLine);

        for (const item of data) {
            const values = keys.map((key, i) =>
                this.padString(String(this.getNestedValue(item, key) ?? ''), colWidths[i], 'left')
            );
            lines.push(`│ ${values.join(' │ ')} │`);
        }

        lines.push(bottomLine);

        return lines.join('\n');
    }

    private customTable(data: DataRecord[], columns: TableColumn[]): string {
        const colWidths = columns.map(col => {
            const headerLen = (col.width || col.header.length);
            const maxValueLen = Math.max(
                headerLen,
                ...data.map(row => String(this.getNestedValue(row, col.key) ?? '').length)
            );
            return Math.min(col.width || maxValueLen, 100);
        });

        const horizontalLine = this.createTableLine(colWidths, '┌', '─', '┬', '┐');
        const separatorLine = this.createTableLine(colWidths, '├', '─', '┼', '┤');
        const bottomLine = this.createTableLine(colWidths, '└', '─', '┴', '┘');

        const lines: string[] = [horizontalLine];

        const headers = columns.map((col, i) =>
            this.padString(col.header, colWidths[i], col.align || 'left')
        );
        lines.push(`│ ${headers.join(' │ ')} │`);
        lines.push(separatorLine);

        for (const item of data) {
            const values = columns.map((col, i) => {
                const rawValue = this.getNestedValue(item, col.key);
                const formattedValue = col.format ? col.format(rawValue) : String(rawValue ?? '');
                return this.padString(formattedValue, colWidths[i], col.align || 'left');
            });
            lines.push(`│ ${values.join(' │ ')} │`);
        }

        lines.push(bottomLine);

        return lines.join('\n');
    }

    private toMarkdown(data: DataRecord[]): string {
        if (data.length === 0) return 'No data available';

        const keys = this.getAllKeys(data);
        const colWidths = this.calculateColumnWidths(data, keys);

        const headerLine = `| ${keys.map((k, i) => this.padString(k, colWidths[i], 'center')).join(' | ')} |`;
        const separatorLine = `| ${keys.map((_, i) => '-'.repeat(colWidths[i])).join(' | ')} |`;

        const lines = [headerLine, separatorLine];

        for (const item of data) {
            const values = keys.map((key, i) =>
                this.padString(String(this.getNestedValue(item, key) ?? ''), colWidths[i], 'left')
            );
            lines.push(`| ${values.join(' | ')} |`);
        }

        return lines.join('\n');
    }

    private toYAML(data: DataRecord[]): string {
        const yaml = require('js-yaml');
        return yaml.dump(data, { indent: 2, lineWidth: -1 });
    }

    private toText(data: DataRecord[]): string {
        if (data.length === 0) return 'No data available';

        const keys = this.getAllKeys(data);

        for (const item of data) {
            const lines = keys.map(key => {
                const value = this.getNestedValue(item, key);
                return `  ${key}: ${value}`;
            });
            lines.unshift('---');
            return lines.join('\n');
        }

        return '';
    }

    private getAllKeys(data: DataRecord[]): string[] {
        const keys = new Set<string>();
        for (const item of data) {
            this.collectKeys(item, '', keys);
        }
        return Array.from(keys);
    }

    private collectKeys(obj: unknown, prefix: string, keys: Set<string>): void {
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
            for (const [k, v] of Object.entries(obj as DataRecord)) {
                const fullKey = prefix ? `${prefix}.${k}` : k;
                if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v as DataRecord).length > 0) {
                    this.collectKeys(v, fullKey, keys);
                } else {
                    keys.add(fullKey);
                }
            }
        }
    }

    private getNestedValue(obj: DataRecord, path: string): unknown {
        return path.split('.').reduce<unknown>((current, key) => (current as DataRecord)?.[key], obj);
    }

    private calculateColumnWidths(data: DataRecord[], keys: string[]): number[] {
        return keys.map(key => {
            const headerLen = key.length;
            const maxValueLen = Math.max(
                headerLen,
                ...data.map(item => String(this.getNestedValue(item, key) ?? '').length)
            );
            return Math.min(maxValueLen + 2, 100);
        });
    }

    private createTableLine(widths: number[], left: string, fill: string, sep: string, right: string): string {
        const parts = widths.map(w => fill.repeat(w));
        return left + parts.join(sep) + right;
    }

    private padString(str: string, width: number, align: 'left' | 'center' | 'right' = 'left'): string {
        const len = [...str].length;
        if (len >= width) return str.slice(0, width);

        const padding = width - len;
        switch (align) {
            case 'right':
                return ' '.repeat(padding) + str;
            case 'center':
                const left = Math.floor(padding / 2);
                return ' '.repeat(left) + str + ' '.repeat(padding - left);
            default:
                return str + ' '.repeat(padding);
        }
    }

    private escapeCSV(value: string): string {
        if (value.includes(this.options.delimiter!) || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }
}

export function formatOutput(data: unknown, format: OutputFormat = 'table'): string {
    const formatter = new OutputFormatter({ format });
    return formatter.toString(data);
}

export function createTable(columns: TableColumn[]): OutputFormatter {
    return new OutputFormatter({ format: 'table' });
}

export function exportToJSON(data: unknown, filePath?: string): string {
    const formatter = new OutputFormatter({ format: 'json', outputFile: filePath });
    return formatter.format(data);
}

export function exportToCSV(data: DataRecord[], filePath?: string, headers: boolean = true): string {
    const formatter = new OutputFormatter({ format: 'csv', outputFile: filePath, headers });
    return formatter.format(data);
}

export function exportToMarkdown(data: DataRecord[], filePath?: string): string {
    const formatter = new OutputFormatter({ format: 'markdown', outputFile: filePath });
    return formatter.format(data);
}
