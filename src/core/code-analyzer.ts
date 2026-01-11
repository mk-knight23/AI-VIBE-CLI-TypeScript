import { VibeProviderRouter } from '../providers/router';

export class CodeAnalyzer {
    constructor(private provider: VibeProviderRouter) { }

    async analyze(filePath: string, code?: string): Promise<any> {
        const content = code || (require('fs').readFileSync(filePath, 'utf-8'));
        const prompt = `Analyze the following code for quality, performance, and best practices.
Provide a score (1-10) and specific improvement suggestions.
Format as a JSON object: { "score": number, "suggestions": string[], "criticalIssues": string[] }

File: ${filePath}
Code:
${content}`;

        const response = await this.provider.complete(prompt);
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : { score: 0, suggestions: [], criticalIssues: ['Failed to parse analysis'] };
    }

    async review(files: string[]): Promise<string> {
        const prompt = `Perform an intelligent code review of the following files: ${files.join(', ')}.
Look for architectural issues, consistency, and potential bugs.
Return a detailed markdown report.`;

        // In a real implementation, we would attach file contents here
        return (await this.provider.complete(prompt)).content;
    }
}
