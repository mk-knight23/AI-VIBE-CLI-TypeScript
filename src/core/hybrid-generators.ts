import { VibeProviderRouter } from '../providers/router';
import { execSync } from 'child_process';

export class HybridGenerator {
    constructor(private provider: VibeProviderRouter) { }

    async generateBoilerplate(desc: string): Promise<void> {
        const prompt = `Based on the description: "${desc}", identify the best stack and common files.
Return a JSON object: { "stack": "...", "files": ["file1", "file2"], "initCommand": "..." }`;

        const response = await this.provider.complete(prompt);
        const plan = JSON.parse(response.content.match(/\{[\s\S]*\}/)![0]);

        if (plan.initCommand) {
            console.log(`Executing: ${plan.initCommand}`);
            execSync(plan.initCommand, { stdio: 'inherit' });
        }
    }
}

export class WorkflowChains {
    static async executeChain(steps: string[]): Promise<void> {
        for (const step of steps) {
            console.log(`\n⛓️ Chain Step: ${step}`);
            // Logical execution...
        }
    }
}
