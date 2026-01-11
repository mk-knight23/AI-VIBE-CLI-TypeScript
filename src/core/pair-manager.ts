import { VibeProviderRouter } from '../providers/router';
import { themeManager } from '../ui/themes/theme-manager';

export class PairProgrammingManager {
    constructor(private provider: VibeProviderRouter) { }

    async startPairing(task: string): Promise<void> {
        const theme = themeManager.getCurrentTheme();
        console.log(theme.accent(`\n🤝 Starting Pair Programming: ${task}\n`));

        // In a real TUI, this would switch to a dedicated mode
        console.log(theme.dim('Type your thoughts or code snippets. I am here to assist.'));
    }

    async getFeedback(code: string): Promise<string> {
        const prompt = `Review my current code and provide real-time feedback.
Focus on readability and immediate potential bugs.
Code:
${code}`;
        return (await this.provider.complete(prompt)).content;
    }

    async learnSupport(topic: string): Promise<string> {
        const prompt = `I am trying to learn/understand: "${topic}".
Explain it in the context of this project and provide a learning path.`;
        return (await this.provider.complete(prompt)).content;
    }
}
