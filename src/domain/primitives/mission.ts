import { BasePrimitive, PrimitiveResult, IPrimitive } from './types.js';
import { createLogger } from '../../utils/pino-logger.js';
import { PlanningPrimitive } from './planning.js';
import { OrchestrationPrimitive } from './orchestration.js';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const logger = createLogger('MissionPrimitive');

export class MissionPrimitive extends BasePrimitive {
    public id = 'mission';
    public name = 'Mission Primitive';
    private primitives: Map<string, IPrimitive>;

    constructor(primitives: Map<string, IPrimitive>) {
        super();
        this.primitives = primitives;
    }

    public async execute(args: { task: string; autoCommit?: boolean; runTests?: boolean }): Promise<PrimitiveResult> {
        logger.info(`Starting mission: ${args.task}`);

        try {
            // 1. Planning
            const planner = this.primitives.get('planning') as PlanningPrimitive;
            if (!planner) throw new Error('Planning primitive not available');

            const planResult = await planner.execute({ task: args.task });
            if (!planResult.success) return { success: false, error: `Planning failed: ${planResult.error}` };

            const plan = planResult.data;

            // 2. Orchestration (Execution)
            const orchestrator = this.primitives.get('orchestration') as OrchestrationPrimitive;
            if (!orchestrator) throw new Error('Orchestration primitive not available');

            const orchResult = await orchestrator.execute({ plan });
            if (!orchResult.success) return { success: false, error: `Execution failed: ${orchResult.error}`, data: { plan } };

            // 3. Optional: Run Tests
            let testResult = '';
            if (args.runTests) {
                testResult = this.runTests();
            }

            // 4. Optional: Auto-Commit
            if (args.autoCommit) {
                this.autoCommit(args.task);
            }

            return {
                success: true,
                data: {
                    plan,
                    execution: orchResult.data,
                    testResult
                }
            };

        } catch (error: any) {
            logger.error({ error }, 'Mission failed');
            return {
                success: false,
                error: error.message
            };
        }
    }

    private runTests(): string {
        try {
            // Check for vitest or jest in package.json
            const pkgPath = path.join(process.cwd(), 'package.json');
            if (fs.existsSync(pkgPath)) {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
                if (pkg.scripts && pkg.scripts.test) {
                    logger.info('Running tests via npm test...');
                    return execSync('npm test', { encoding: 'utf-8' });
                }
            }
            return 'No tests found to run.';
        } catch (error: any) {
            return `Tests failed: ${error.stdout || error.message}`;
        }
    }

    private autoCommit(task: string): void {
        try {
            if (fs.existsSync(path.join(process.cwd(), '.git'))) {
                execSync('git add .');
                const commitMsg = `feat(mission): ${task.substring(0, 50)}${task.length > 50 ? '...' : ''}`;
                execSync(`git commit -m "${commitMsg}"`);
                logger.info('Auto-committed mission changes.');
            }
        } catch (error: any) {
            logger.warn(`Auto-commit failed: ${error.message}`);
        }
    }
}
