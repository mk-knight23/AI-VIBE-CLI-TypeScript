import { Diagnostics } from './diagnostics';

export class ReadinessValidator {
    static async validate(): Promise<{ ready: boolean; report: string[] }> {
        const diagnostics = new Diagnostics();
        const results = await diagnostics.check(); // Reusing diagnostics logic

        const report: string[] = [];
        let ready = true;

        if (!results.find(r => r.metric === 'Git' && r.status === 'OK')) {
            report.push('CRITICAL: Git not initialized.');
            ready = false;
        }

        if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
            report.push('WARNING: No primary cloud LLM provider configured.');
        }

        return { ready, report };
    }
}
