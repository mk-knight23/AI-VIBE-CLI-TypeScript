import inquirer from 'inquirer';
import { BasePrimitive, PrimitiveResult } from './types.js';
import chalk from 'chalk';

export class ApprovalPrimitive extends BasePrimitive {
    public id = 'approval';
    public name = 'Approval Primitive';

    public async execute(input: {
        message?: string;
        data?: any;
        task?: string;
        step?: number;
        primitive?: string;
        rationale?: string;
    }): Promise<PrimitiveResult> {
        // Use task as message if message is not provided (for orchestration)
        const message = input.message || input.task || 'Approval required';
        const rationale = input.rationale;

        console.log(chalk.yellow('\n⚠️  ACTION REQUIRED: Approval Requested'));
        console.log(chalk.white(message));

        if (rationale) {
            console.log(chalk.gray(`Reason: ${rationale}`));
        }

        if (input.data) {
            console.log(chalk.gray(JSON.stringify(input.data, null, 2)));
        }

        const answers = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'approved',
                message: 'Do you approve this action?',
                default: false,
            },
        ]);

        if (answers.approved) {
            return { success: true, data: { message, approved: true } };
        } else {
            return { success: false, error: 'User denied approval' };
        }
    }
}

