import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/structured-logger';

const logger = new Logger('ContextManager');

export class ContextManager {
    private maxContextLength = 30000; // Average token limit safety

    async getProjectContext(query: string, rootDir: string = process.cwd()): Promise<string> {
        logger.info(`Gathering context for: ${query}`);

        // 1. Identify relevant files (Heuristic or AI-based)
        // For now, let's include main project structure and obvious candidates
        const files = this.identifyRelevantFiles(rootDir);

        let context = `Project Root: ${rootDir}\n\n`;

        for (const file of files) {
            if (context.length > this.maxContextLength) break;

            const relativePath = path.relative(rootDir, file);
            const content = fs.readFileSync(file, 'utf-8');
            context += `--- File: ${relativePath} ---\n${content}\n\n`;
        }

        return context;
    }

    private identifyRelevantFiles(rootDir: string): string[] {
        const relevantExtensions = ['.ts', '.js', '.json', '.md'];
        const skipDirs = ['node_modules', '.git', 'dist', 'build'];

        const results: string[] = [];
        const walk = (dir: string) => {
            const list = fs.readdirSync(dir);
            list.forEach(file => {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                if (stat.isDirectory()) {
                    if (!skipDirs.includes(file)) walk(filePath);
                } else {
                    if (relevantExtensions.includes(path.extname(file))) {
                        results.push(filePath);
                    }
                }
            });
        };

        walk(rootDir);
        // Sort or filter based on query relevance in future
        return results.slice(0, 50); // Hard limit for safety
    }
}
