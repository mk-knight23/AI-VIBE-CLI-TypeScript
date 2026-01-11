import { VibeProviderRouter } from '../providers/router';
import { StateManager } from './state-manager';

export class SuggestionEngine {
    constructor(
        private provider: VibeProviderRouter,
        private state: StateManager
    ) { }

    async getSuggestions(input: string): Promise<string[]> {
        if (!input || input.length < 2) return [];

        const history = this.state.getHistory(10);
        const historyContext = history.map((h: any) => h.input).join('\n');

        const prompt = `Given the user's current CLI input: "${input}" and their recent history:
${historyContext}

Suggest 3 likely next commands or natural language intents. 
Return ONLY a JSON array of strings.`;

        try {
            const response = await this.provider.complete(prompt);
            const jsonMatch = response.content.match(/\[.*\]/s);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            // Fallback to local prefix matching
        }

        return this.getFallbackSuggestions(input);
    }

    private getFallbackSuggestions(input: string): string[] {
        const commands = [
            '/help', '/status', '/config', '/mode agent', '/mode code',
            '/clear', '/exit', '/providers', '/models', '/history'
        ];
        return commands.filter(c => c.startsWith(input));
    }
}
