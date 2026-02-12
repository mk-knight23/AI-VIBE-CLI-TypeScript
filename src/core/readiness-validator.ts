import { Diagnostics } from './diagnostics.js';

export class ReadinessValidator {
    static async validate(): Promise<{ ready: boolean; report: string[] }> {
        const results = Diagnostics.getDiagnosticsData();

        const report: string[] = [];
        let ready = true;

        if (!results.find((r: any) => r.name === 'Git' && r.status === 'OK')) {
            report.push('CRITICAL: Git not initialized.');
            ready = false;
        }

        if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
            report.push('WARNING: No primary cloud LLM provider configured.');
        }

        return { ready, report };
    }
}
