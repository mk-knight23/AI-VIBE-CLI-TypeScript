import simpleGit from 'simple-git';
import { VibeProviderRouter } from '../providers/router';

const git = simpleGit();

export class GitIntelligence {
    constructor(private provider: VibeProviderRouter) { }

    async generateSemanticCommit(): Promise<string> {
        const diff = await git.diff(['--cached']);
        if (!diff) return 'No staged changes.';

        const prompt = `Generate a concise, semantic commit message (Conventional Commits) for the following diff:\n\n${diff}\n\nReturn ONLY the commit message.`;
        const response = await this.provider.complete(prompt);
        return response.content.trim();
    }

    async analyzeHistory(limit: number = 10): Promise<string> {
        const log = await git.log({ maxCount: limit });
        const history = log.all.map(c => `${c.date} - ${c.author_name}: ${c.message}`).join('\n');

        const prompt = `Analyze the recent project history and summarize the current direction and recent changes:\n\n${history}`;
        const response = await this.provider.complete(prompt);
        return response.content;
    }
}
