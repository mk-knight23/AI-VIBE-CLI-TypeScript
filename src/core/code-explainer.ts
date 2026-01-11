import { VibeProviderRouter } from '../providers/router';

export class CodeExplainer {
    constructor(private provider: VibeProviderRouter) { }

    async explain(filePath: string, code?: string): Promise<string> {
        const content = code || (require('fs').readFileSync(filePath, 'utf-8'));
        const prompt = `Explain the following code in a concise, developer-friendly way. 
Focus on purpose, logic flow, and edge cases.
File: ${filePath}

Code:
${content}`;

        return (await this.provider.complete(prompt)).content;
    }

    async generateDocs(filePath: string, code?: string): Promise<string> {
        const content = code || (require('fs').readFileSync(filePath, 'utf-8'));
        const prompt = `Generate technical documentation (JSDoc/Markdown) for the following code.
File: ${filePath}

Code:
${content}`;

        return (await this.provider.complete(prompt)).content;
    }
}
