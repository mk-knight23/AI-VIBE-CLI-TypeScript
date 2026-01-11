import { OrchestrationPrimitive } from '../primitives/orchestration';
import * as fs from 'fs';
import * as path from 'path';

export interface Workflow {
    name: string;
    description: string;
    steps: any[];
}

export class WorkflowManager {
    constructor(private orchestrator: OrchestrationPrimitive) { }

    async runWorkflow(name: string, workflowsDir: string = './.vibe/workflows'): Promise<any> {
        const workflowPath = path.join(workflowsDir, `${name}.json`);
        if (!fs.existsSync(workflowPath)) {
            throw new Error(`Workflow ${name} not found at ${workflowPath}`);
        }

        const workflow: Workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));
        console.log(`\n🚀 Running Workflow: ${workflow.name}`);
        console.log(`📝 Description: ${workflow.description}\n`);

        return this.orchestrator.execute({ plan: workflow.steps });
    }

    static createTemplate(name: string): string {
        const template = {
            name,
            description: 'Describe what this workflow does',
            steps: [
                { step: 1, primitive: 'execution', task: 'npm test', data: { command: 'npm test' } }
            ]
        };
        return JSON.stringify(template, null, 2);
    }
}
