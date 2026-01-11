import { VibeProviderRouter } from '../providers/router';

export class MemoryCompressor {
    constructor(private provider: VibeProviderRouter) { }

    async compress(history: any[]): Promise<string> {
        const serialized = JSON.stringify(history);
        const prompt = `Summarize the following interaction history into a single concise paragraph of "context memory".
Focus on what was achieved and what state the system is currently in.
History:
${serialized}`;

        const response = await this.provider.complete(prompt);
        return response.content;
    }
}
