import { BasePrimitive, PrimitiveResult, IPrimitive } from './types';
import { Logger } from '../utils/structured-logger';

const logger = new Logger('OrchestrationPrimitive');

export class OrchestrationPrimitive extends BasePrimitive {
    public id = 'orchestration';
    public name = 'Orchestration Primitive';
    private primitives: Map<string, IPrimitive>;

    constructor(primitives: Map<string, IPrimitive>) {
        super();
        this.primitives = primitives;
    }

    public async execute(input: { plan: any[]; parallel?: boolean }): Promise<PrimitiveResult> {
        const results = [];
        logger.info(`Starting execution of plan with ${input.plan.length} steps. Mode: ${input.parallel ? 'Parallel' : 'Sequential'}`);

        if (input.parallel) {
            const promises = input.plan.map(async (step) => {
                const primitive = this.primitives.get(step.primitive.toLowerCase());
                if (!primitive) return { step: step.step, success: false, error: `Unknown primitive: ${step.primitive}` };

                const result = await primitive.execute(step.data || step.input || step);
                return { step: step.step, result };
            });
            const parallelResults = await Promise.all(promises);
            return { success: true, data: parallelResults };
        }

        for (const step of input.plan) {
            // Conditional check
            if (step.condition && !this.evaluateCondition(step.condition, results)) {
                logger.info(`Step ${step.step} skipped due to condition: ${step.condition}`);
                continue;
            }

            const primitive = this.primitives.get(step.primitive.toLowerCase());
            if (!primitive) {
                logger.error(`Unknown primitive: ${step.primitive}`);
                return { success: false, error: `Unknown primitive: ${step.primitive}` };
            }

            logger.info(`[Step ${step.step}] Running ${step.primitive}: ${step.task}`);
            const result = await primitive.execute(step.data || step.input || step);
            results.push({ step: step.step, result });

            if (!result.success && !step.continueOnError) {
                logger.error(`Step ${step.step} failed. Halting orchestration.`);
                return { success: false, data: results, error: result.error };
            }
        }

        return { success: true, data: results };
    }

    private evaluateCondition(condition: string, results: any[]): boolean {
        // Very basic condition evaluation (e.g., "step1.success == true")
        if (condition.includes('.success == true')) {
            const stepId = parseInt(condition.split('.')[0].replace('step', ''));
            const prev = results.find(r => r.step === stepId);
            return prev?.result?.success === true;
        }
        return true;
    }
}
