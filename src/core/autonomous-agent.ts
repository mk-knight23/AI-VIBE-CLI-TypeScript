import { OrchestrationPrimitive } from '../primitives/orchestration';
import { PlanningPrimitive } from '../primitives/planning';
import { VibeProviderRouter } from '../providers/router';
import { Logger } from '../utils/structured-logger';

const logger = new Logger('AutonomousAgent');

export class AutonomousAgent {
    private maxIterations = 5;

    constructor(
        private planner: PlanningPrimitive,
        private orchestrator: OrchestrationPrimitive,
        private provider: VibeProviderRouter
    ) { }

    async solve(task: string): Promise<{ success: boolean; result?: any; error?: string }> {
        logger.info(`Starting autonomous task: ${task}`);
        let currentIteration = 0;
        let completed = false;
        let lastResult: any = null;

        while (currentIteration < this.maxIterations && !completed) {
            currentIteration++;
            logger.info(`Iteration ${currentIteration}/${this.maxIterations}`);

            // 1. Plan
            const planResult = await this.planner.execute({
                task: lastResult ? `Continue solving: ${task}. Previous result: ${JSON.stringify(lastResult)}` : task
            });

            if (!planResult.success) {
                return { success: false, error: `Planning failed: ${planResult.error}` };
            }

            const plan = planResult.data;
            if (!plan || plan.length === 0) {
                completed = true;
                break;
            }

            // 2. Orchestrate
            const orchestrationResult = await this.orchestrator.execute({ plan });
            lastResult = orchestrationResult.data;

            if (!orchestrationResult.success) {
                logger.error(`Orchestration failed at step. Trying to recover...`);
                // Future: Add self-correction loop here
                return { success: false, error: `Orchestration failed: ${orchestrationResult.error}`, result: lastResult };
            }

            // 3. Evaluate if finished
            const evaluationPrompt = `Given the original task: "${task}" and the results of the recent steps: ${JSON.stringify(lastResult)}, is the task fully completed? 
Return ONLY "YES" or "NO".`;
            const evalResponse = await this.provider.complete(evaluationPrompt);
            if (evalResponse.content.trim().toUpperCase() === 'YES') {
                completed = true;
            }
        }

        return {
            success: completed,
            result: lastResult,
            error: completed ? undefined : 'Max iterations reached without completion.'
        };
    }
}
