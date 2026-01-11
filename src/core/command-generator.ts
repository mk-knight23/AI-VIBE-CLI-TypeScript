import { VibeProviderRouter } from '../providers/router';
import os from 'os';

export class CommandGenerator {
    constructor(private provider: VibeProviderRouter) { }

    async generate(task: string): Promise<string> {
        const platform = os.platform();
        const shell = os.userInfo().shell || 'bash';

        const prompt = `Task: ${task}
Platform: ${platform}
Shell: ${shell}

Generate a safe, high-performance terminal command to achieve this task.
Return ONLY the command string, no explanation, no backticks.`;

        const response = await this.provider.complete(prompt);
        return response.content.trim();
    }
}
