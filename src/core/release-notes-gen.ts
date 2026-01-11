import { VibeProviderRouter } from '../providers/router';
import simpleGit from 'simple-git';

const git = simpleGit();

export class ReleaseNotesGenerator {
    constructor(private provider: VibeProviderRouter) { }

    async generate(version: string): Promise<string> {
        const log = await git.log({ maxCount: 20 });
        const changes = log.all.map(c => c.message).join('\n');

        const prompt = `Generate a professional, developer-friendly Release Notes document for version ${version} based on these changes:
${changes}

Include sections for: New Features, Improvements, Bug Fixes, and Breaking Changes.`;

        const response = await this.provider.complete(prompt);
        return response.content;
    }
}
