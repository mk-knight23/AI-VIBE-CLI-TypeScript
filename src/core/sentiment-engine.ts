import { VibeProviderRouter } from '../providers/router';

export class SentimentEngine {
    constructor(private provider: VibeProviderRouter) { }

    async detectUserVibe(input: string): Promise<'positive' | 'neutral' | 'frustrated'> {
        const prompt = `Analyze the sentiment of this user input for a CLI: "${input}".
Is the user happy, neutral, or frustrated? Return ONLY one word.`;
        const response = await this.provider.complete(prompt);
        const result = response.content.toLowerCase();

        if (result.includes('frustrated')) return 'frustrated';
        if (result.includes('positive')) return 'positive';
        return 'neutral';
    }

    async detectCodeVibe(code: string): Promise<string> {
        const prompt = `What is the "vibe" of this code? (e.g. "modern and clean", "legacy and messy", "highly functional", etc.)
Return a short descriptive phrase.
Code:
${code}`;
        return (await this.provider.complete(prompt)).content.trim();
    }
}
