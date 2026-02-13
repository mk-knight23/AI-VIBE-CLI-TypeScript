/**
 * VIBE-CLI v0.0.2 - IaC Generator
 * AI-driven Infrastructure-as-Code generation (Terraform, CloudFormation).
 */

import chalk from 'chalk';

export interface IACPlan {
    provider: 'aws' | 'gcp' | 'azure';
    format: 'terraform' | 'cloudformation' | 'pulumi';
    content: string;
    description: string;
}

export class IACGenerator {
    constructor() { }

    /**
     * Generate IaC code from a description using AI
     */
    async generatePlan(description: string, provider: any): Promise<IACPlan> {
        const prompt = `Generate Infrastructure-as-Code based on this description: "${description}".
    Choose the best provider (aws/gcp/azure) and format (terraform/cloudformation).
    Respond with a JSON object: { provider, format, content: "FULL_CODE_HERE", description: "SUMMARY" }`;

        try {
            const response = await provider.chat([{ role: 'system', content: 'You are a cloud infrastructure engineer.' }, { role: 'user', content: prompt }]);
            return JSON.parse(response.content.trim().replace(/```json/g, '').replace(/```/g, ''));
        } catch (error) {
            console.error(chalk.red('✗ IaC generation failed:'), error);
            throw error;
        }
    }

    /**
     * Format the plan for display
     */
    formatPlan(plan: IACPlan): string {
        const lines = [
            chalk.bold(`\n🌩️  IaC Plan: ${plan.description}`),
            chalk.cyan(`Provider: ${plan.provider}`),
            chalk.cyan(`Format: ${plan.format}`),
            '',
            chalk.gray('--- CODE BEGINS ---'),
            chalk.white(plan.content),
            chalk.gray('--- CODE ENDS ---'),
        ];
        return lines.join('\n');
    }
}

export const iacGenerator = new IACGenerator();
