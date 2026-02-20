import { BasePrimitive, PrimitiveResult } from './types.js';
import * as fs from 'fs';
import * as path from 'path';

export class ScanningPrimitive extends BasePrimitive {
    public id = 'scanning';
    public name = 'Scanning';

    async execute(args: { directory?: string }): Promise<PrimitiveResult> {
        const targetDir = args.directory || process.cwd();

        try {
            const map = this.generateMap(targetDir);
            return {
                success: true,
                data: { map }
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    private generateMap(dir: string, depth: number = 0): string {
        const items = fs.readdirSync(dir);
        let output = '';
        const indent = '  '.repeat(depth);

        for (const item of items) {
            if (['node_modules', '.git', 'dist', 'build', '.ai-agent'].includes(item)) continue;

            const fullPath = path.join(dir, item);
            const stats = fs.statSync(fullPath);

            if (stats.isDirectory()) {
                output += `${indent}📁 ${item}/\n`;
                output += this.generateMap(fullPath, depth + 1);
            } else {
                output += `${indent}📄 ${item}\n`;
            }
        }

        return output;
    }
}
