/**
 * VIBE-CLI v0.0.2 - Refactor Engine
 * Pattern recognition and code transformation logic.
 */

import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';

export interface RefactorSuggestion {
    id: string;
    filePath: string;
    type: 'cleanup' | 'modularity' | 'performance' | 'security' | 'modernization';
    description: string;
    originalCode: string;
    suggestedCode: string;
    reason: string;
    confidence: number;
}

export class RefactorEngine {
    constructor() { }

    /**
     * Propose refactors for a file using AI
     */
    async proposeRefactors(filePath: string, provider: any): Promise<RefactorSuggestion[]> {
        if (!fs.existsSync(filePath)) return [];

        const content = fs.readFileSync(filePath, 'utf-8');
        const fileName = path.basename(filePath);

        const prompt = `Analyze this file and suggest 1-3 refactors for better modularity, performance, or clarity.
    
File: ${fileName}
Code:
${content}

Respond with a JSON array of objects: [{type, description, originalCode, suggestedCode, reason, confidence}]`;

        try {
            const response = await provider.chat([{ role: 'system', content: 'You are an expert software engineer specialized in refactoring.' }, { role: 'user', content: prompt }]);
            const results = JSON.parse(response.content.trim().replace(/```json/g, '').replace(/```/g, ''));

            return results.map((r: any) => ({
                id: `refactor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                filePath,
                ...r
            }));
        } catch (error) {
            console.error(chalk.red('✗ Refactoring analysis failed:'), error);
            return [];
        }
    }

    /**
     * Format suggestion for display
     */
    formatSuggestion(suggestion: RefactorSuggestion): string {
        const lines = [
            chalk.bold(`\n🛠️  [${suggestion.type.toUpperCase()}] Refactor Suggestion`),
            chalk.cyan('Description: ') + suggestion.description,
            chalk.cyan('Reason: ') + suggestion.reason,
            chalk.cyan('Confidence: ') + (suggestion.confidence * 100).toFixed(0) + '%',
            '',
            chalk.red('- Original:'),
            chalk.gray(suggestion.originalCode.split('\n').slice(0, 5).join('\n') + (suggestion.originalCode.split('\n').length > 5 ? '\n...' : '')),
            '',
            chalk.green('+ Suggested:'),
            chalk.white(suggestion.suggestedCode.split('\n').slice(0, 5).join('\n') + (suggestion.suggestedCode.split('\n').length > 5 ? '\n...' : '')),
        ];
        return lines.join('\n');
    }
}

export const refactorEngine = new RefactorEngine();
