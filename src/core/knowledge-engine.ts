import * as fs from 'fs';
import * as path from 'path';
import { VibeProviderRouter } from '../providers/router';

export class KnowledgeEngine {
    constructor(private provider: VibeProviderRouter) { }

    async searchDocs(query: string, docsPath: string = 'docs'): Promise<string> {
        const absolutePath = path.resolve(docsPath);
        if (!fs.existsSync(absolutePath)) return 'Docs directory not found.';

        // Simple keyword search in files for now
        // Future: Use embeddings (Feature #20)
        const files = this.getFiles(absolutePath);
        const relevantFiles = files.filter(f => {
            const content = fs.readFileSync(f, 'utf-8');
            return content.toLowerCase().includes(query.toLowerCase());
        });

        if (relevantFiles.length === 0) return 'No relevant local docs found.';

        const context = relevantFiles.slice(0, 3).map(f => {
            return `File: ${f}\nContent: ${fs.readFileSync(f, 'utf-8').slice(0, 500)}...`;
        }).join('\n\n');

        const prompt = `Based on the following documentation snippets, answer the query: "${query}"\n\nDocs:\n${context}`;
        return (await this.provider.complete(prompt)).content;
    }

    private getFiles(dir: string): string[] {
        let results: string[] = [];
        const list = fs.readdirSync(dir);
        list.forEach(file => {
            file = path.join(dir, file);
            const stat = fs.statSync(file);
            if (stat && stat.isDirectory()) {
                results = results.concat(this.getFiles(file));
            } else if (file.endsWith('.md') || file.endsWith('.txt')) {
                results.push(file);
            }
        });
        return results;
    }

    async findExamples(concept: string): Promise<string> {
        const prompt = `Find or generate a realistic code example for: "${concept}". 
Include best practices and clear comments.`;
        return (await this.provider.complete(prompt)).content;
    }
}
