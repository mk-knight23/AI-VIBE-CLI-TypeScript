import { BasePrimitive, PrimitiveResult } from './types';
import { exec } from 'child_process';
import { promisify } from 'util';
import { configManager } from '../core/config-system';
import { Logger } from '../utils/structured-logger';

const execAsync = promisify(exec);
const logger = new Logger('ExecutionPrimitive');

export class ExecutionPrimitive extends BasePrimitive {
    public id = 'execution';
    public name = 'Execution Primitive';

    public async execute(input: { command: string; cwd?: string }): Promise<PrimitiveResult> {
        const config = configManager.getConfig();
        const dangerousCommands = config.approval.dangerousCommands;

        // Dry-run check
        if (config.dryRun) {
            logger.info(`[DRY-RUN] Would execute: ${input.command}`);
            return {
                success: true,
                data: { dryRun: true, command: input.command },
            };
        }

        // Safety check
        const isDangerous = dangerousCommands.some(cmd => input.command.includes(cmd));
        if (isDangerous) {
            return {
                success: false,
                error: `Command "${input.command}" is marked as dangerous and requires explicit approval functionality (not yet implemented in primitive directly).`,
            };
        }

        try {
            logger.info(`Executing: ${input.command}`);
            const { stdout, stderr } = await execAsync(input.command, {
                cwd: input.cwd || process.cwd(),
            });

            return {
                success: true,
                data: { stdout, stderr },
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                data: { stderr: error.stderr, stdout: error.stdout },
            };
        }
    }
}
