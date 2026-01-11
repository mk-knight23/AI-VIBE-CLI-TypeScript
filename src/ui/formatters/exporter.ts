import * as fs from 'fs';
import * as path from 'path';

export interface ExportOptions {
    format: 'json' | 'csv' | 'text';
    filename: string;
}

export class Exporter {
    static export(data: any, options: ExportOptions): string {
        const filePath = path.join(process.cwd(), options.filename);
        let content = '';

        switch (options.format) {
            case 'json':
                content = JSON.stringify(data, null, 2);
                break;
            case 'csv':
                if (Array.isArray(data) && data.length > 0) {
                    const headers = Object.keys(data[0]);
                    const rows = data.map((item: any) =>
                        headers.map(h => `"${item[h]}"`).join(',')
                    );
                    content = [headers.join(','), ...rows].join('\n');
                }
                break;
            case 'text':
                content = String(data);
                break;
        }

        fs.writeFileSync(filePath, content);
        return filePath;
    }
}
