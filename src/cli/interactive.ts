import inquirer from 'inquirer';
import chalk from 'chalk';
import { IPrimitive } from '../domain/primitives/types.js';
import { PlanningPrimitive } from '../domain/primitives/planning.js';
import { OrchestrationPrimitive } from '../domain/primitives/orchestration.js';
import { ApprovalPrimitive } from '../domain/primitives/approval.js';
import { createLogger } from '../utils/pino-logger.js';
import { CommandHandler } from './command-handler.js';

const logger = createLogger('Interactive');

export async function runInteractive(primitiveMap: Map<string, IPrimitive>) {
    console.log(chalk.cyan(`
  VIBE Interactive Mode
  Type '/help' for commands, 'exit' or 'quit' to leave.
    `));

    const commandHandler = new CommandHandler(primitiveMap);

    while (true) {
        const { task } = await inquirer.prompt([
            {
                type: 'input',
                name: 'task',
                message: chalk.green('vibe >'),
                validate: (input) => input.trim().length > 0 || 'Please enter a task or type exit.'
            }
        ]);

        const trimmedTask = task.trim();

        if (['exit', 'quit'].includes(trimmedTask.toLowerCase())) {
            console.log(chalk.yellow('Goodbye!'));
            process.exit(0);
        }

        // Check for slash commands
        if (trimmedTask.startsWith('/')) {
            const handled = await commandHandler.handle(trimmedTask);
            if (handled) continue;
        }

        try {
            logger.info(`Thinking about: "${trimmedTask}"`);

            // 1. Planning
            process.stdout.write(chalk.blue('🧠 Thinking: '));
            const planner = primitiveMap.get('planning') as PlanningPrimitive;
            const planResult = await planner.execute({ task }, (chunk) => {
                process.stdout.write(chalk.gray(chunk));
            });
            process.stdout.write('\n');

            if (!planResult.success) {
                console.log(chalk.red(`Planning failed: ${planResult.error}`));
                continue;
            }

            const plan = planResult.data;
            console.log(chalk.green('\n📍 Execution Plan:'));
            plan.forEach((s: any) => console.log(`  [${s.step}] ${chalk.bold(s.primitive.toUpperCase())}: ${s.task}`));

            // 2. Approval
            const approver = primitiveMap.get('approval') as ApprovalPrimitive;
            const approval = await approver.execute({ message: 'Proceed with this plan?' });

            if (!approval.success) {
                console.log(chalk.yellow('Plan aborted by user.'));
                continue;
            }

            // 3. Orchestration
            console.log(chalk.blue('\n🚀 Executing plan...'));
            const orchestrator = primitiveMap.get('orchestration') as OrchestrationPrimitive;
            const orchResult = await orchestrator.execute({ plan });

            if (orchResult.success) {
                console.log(chalk.green('\n✅ Task completed successfully!'));
            } else {
                console.log(chalk.red(`\n❌ Task execution failed: ${orchResult.error}`));
            }
        } catch (error: any) {
            console.log(chalk.red(`\n❌ Error: ${error.message}`));
        }
    }
}
