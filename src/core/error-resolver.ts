import { VibeProviderRouter } from '../providers/router';
import { MultiEditPrimitive } from '../primitives/multi-edit';

export class ErrorResolver {
    constructor(
        private provider: VibeProviderRouter,
        private multiEdit: MultiEditPrimitive
    ) { }

    async resolve(error: string, contextFiles: string[]): Promise<any> {
        const prompt = `The following error occurred: "${error}".
Analyze the provided files and suggest a fix.
Files: ${contextFiles.join(', ')}

Return a plan for the fix in JSON format.`;

        // 1. Analyze error
        const planResponse = await this.provider.complete(prompt);

        // 2. Execute fix using MultiEdit (if approved in real scenario)
        // For now, return the suggestion
        return planResponse.content;
    }

    async remediate(problem: string, files: string[]): Promise<boolean> {
        // Automated remediation
        const result = await this.multiEdit.execute({
            files,
            description: `Fix the following problem: ${problem}`
        });
        return result.success;
    }
}
