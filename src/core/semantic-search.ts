import * as fs from 'fs';
import * as path from 'path';
import { VibeProviderRouter } from '../providers/router.js';
import { createLogger } from '../utils/pino-logger.js';

const logger = createLogger('SemanticSearch');

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.vibe', 'coverage', 'build']);
const CODE_EXTENSIONS = new Set(['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.rs', '.java']);

export interface SearchResult {
    file: string;
    line: number;
    content: string;
    score: number;
}

export class SemanticSearch {
    constructor(private provider: VibeProviderRouter) { }

    /**
     * Search codebase for files matching a keyword query.
     * Falls back to file-system grep when no AI provider is available.
     */
    async search(query: string, scope: string = './src'): Promise<SearchResult[]> {
        const results: SearchResult[] = [];
        const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 2);

        if (keywords.length === 0) return results;

        const scanDir = (dir: string): void => {
            let entries: fs.Dirent[];
            try {
                entries = fs.readdirSync(dir, { withFileTypes: true });
            } catch {
                return;
            }

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    if (!SKIP_DIRS.has(entry.name)) scanDir(fullPath);
                } else if (entry.isFile() && CODE_EXTENSIONS.has(path.extname(entry.name))) {
                    try {
                        const content = fs.readFileSync(fullPath, 'utf-8');
                        const lines = content.split('\n');

                        for (let i = 0; i < lines.length; i++) {
                            const line = lines[i].toLowerCase();
                            const matchCount = keywords.filter(k => line.includes(k)).length;
                            if (matchCount > 0) {
                                results.push({
                                    file: path.relative(process.cwd(), fullPath),
                                    line: i + 1,
                                    content: lines[i].trim(),
                                    score: matchCount / keywords.length,
                                });
                            }
                        }
                    } catch {
                        // skip unreadable files
                    }
                }
            }
        };

        scanDir(scope);
        results.sort((a, b) => b.score - a.score);
        logger.info({ query, matches: results.length }, 'Semantic search complete');
        return results.slice(0, 50);
    }

    /**
     * Discover architectural patterns based on file naming conventions and structure.
     */
    async discoverPatterns(scope: string = './src'): Promise<string> {
        const patterns: Record<string, string[]> = {
            'Singleton': [],
            'Factory': [],
            'Adapter': [],
            'Manager/Service': [],
            'Index Barrel': [],
        };

        const scanDir = (dir: string): void => {
            let entries: fs.Dirent[];
            try {
                entries = fs.readdirSync(dir, { withFileTypes: true });
            } catch {
                return;
            }

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) {
                    scanDir(fullPath);
                } else if (entry.isFile() && CODE_EXTENSIONS.has(path.extname(entry.name))) {
                    const rel = path.relative(process.cwd(), fullPath);
                    const lower = entry.name.toLowerCase();

                    if (lower.includes('factory')) patterns['Factory'].push(rel);
                    if (lower.includes('adapter')) patterns['Adapter'].push(rel);
                    if (lower.includes('manager') || lower.includes('service')) patterns['Manager/Service'].push(rel);
                    if (lower === 'index.ts' || lower === 'index.js') patterns['Index Barrel'].push(rel);

                    // Check for singleton export pattern
                    try {
                        const content = fs.readFileSync(fullPath, 'utf-8');
                        if (/export\s+const\s+\w+\s*=\s*new\s+\w+/.test(content)) {
                            patterns['Singleton'].push(rel);
                        }
                    } catch { /* skip */ }
                }
            }
        };

        scanDir(scope);

        const lines: string[] = ['# Discovered Architectural Patterns\n'];
        for (const [pattern, files] of Object.entries(patterns)) {
            if (files.length > 0) {
                lines.push(`## ${pattern} (${files.length} files)`);
                files.slice(0, 10).forEach(f => lines.push(`- ${f}`));
                if (files.length > 10) lines.push(`- ... and ${files.length - 10} more`);
                lines.push('');
            }
        }
        return lines.join('\n');
    }
}
