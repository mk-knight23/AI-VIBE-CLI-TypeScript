import { VibeProviderRouter } from '../providers/router';

export class TestGenerator {
    constructor(private provider: VibeProviderRouter) { }

    async generate(filePath: string, framework: 'vitest' | 'jest' = 'vitest'): Promise<string> {
        const content = require('fs').readFileSync(filePath, 'utf-8');
        const prompt = `Generate unit tests for the following file using ${framework}.
Include edge cases, error handling, and logical flow tests.
Return ONLY the test code.

File: ${filePath}
Code:
${content}`;

        const response = await this.provider.complete(prompt);
        return response.content.replace(/```[a-z]*\n|```/g, '').trim();
    }
}
