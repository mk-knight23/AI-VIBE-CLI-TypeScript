import { EventEmitter } from 'events';
import { BasePrimitive, PrimitiveResult, IPrimitive } from './types.js';
import { createLogger as createCLogger } from '../../utils/pino-logger.js';
import { ResilienceManager } from '../../core/resilience/resilience-manager.js';
import { CircuitBreaker } from '../../core/resilience/circuit-breaker.js';
import { RunRepository } from '../../core/database/repositories/run-repository.js';
import { v4 as uuidv4 } from 'uuid';

const logger = createCLogger('OrchestrationPrimitive');

export class OrchestrationPrimitive extends EventEmitter implements IPrimitive {
    public id = 'orchestration';
    public name = 'Orchestration Primitive';
    private primitives: Map<string, IPrimitive>;
    private circuitBreakers: Map<string, CircuitBreaker> = new Map();
    private repository?: RunRepository;
    private currentRunId?: string;

    constructor(primitives: Map<string, IPrimitive>) {
        super();
        this.primitives = primitives;
    }

    public setRepository(repository: RunRepository) {
        this.repository = repository;
    }

    public setCurrentRunId(runId: string) {
        this.currentRunId = runId;
    }

    private getCircuitBreaker(primitiveName: string): CircuitBreaker {
        if (!this.circuitBreakers.has(primitiveName)) {
            this.circuitBreakers.set(primitiveName, new CircuitBreaker({
                name: `primitive-${primitiveName}`,
                failureThreshold: 3,
                resetTimeoutMs: 30000 // 30 seconds
            }));
        }
        return this.circuitBreakers.get(primitiveName)!;
    }

    public async execute(input: { plan: any[]; parallel?: boolean; proactive?: boolean }): Promise<PrimitiveResult> {
        const results = [];
        logger.info(`Starting execution of plan with ${input.plan.length} steps. Mode: ${input.parallel ? 'Parallel' : 'Sequential'} ${input.proactive ? '(Proactive)' : ''}`);

        // If proactive, check for background tasks
        if (input.proactive) {
            await this.runProactiveDiscovery();
        }

        const runStep = async (step: any) => {
            const primitive = this.primitives.get(step.primitive.toLowerCase());
            if (!primitive) {
                return { success: false, error: `Unknown primitive: ${step.primitive}` };
            }

            // Ensure step has an ID
            step.id = step.id || uuidv4();

            if (this.repository && this.currentRunId) {
                this.repository.createStep(this.currentRunId, step, step.data || step.input || step);
            }

            const cb = this.getCircuitBreaker(step.primitive.toLowerCase());
            const startTime = Date.now();

            try {
                const result = await ResilienceManager.wrap(
                    `step-${step.step}-${step.primitive}`,
                    () => primitive.execute(step.data || step.input || step),
                    {
                        retries: step.retryPolicy?.maxRetries ?? 2,
                        timeoutMs: step.timeoutMs ?? 60000,
                        circuitBreaker: cb
                    }
                );

                const duration = Date.now() - startTime;
                if (this.repository) {
                    this.repository.updateStepResult(step.id, result.data, result.success ? 'success' : 'failed', result.error, duration);
                }

                return result;
            } catch (error: any) {
                const duration = Date.now() - startTime;
                if (this.repository) {
                    this.repository.updateStepResult(step.id, null, 'failed', error.message, duration);
                }
                throw error;
            }
        };

        if (input.parallel) {
            const promises = input.plan.map(async (step) => {
                const result = await runStep(step);
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

            logger.info(`[Step ${step.step}] Running ${step.primitive}: ${step.task}`);
            this.emit('step:start', step);

            try {
                const result = await runStep(step);
                results.push({ step: step.step, result });

                if (!result.success && !step.continueOnError) {
                    logger.error(`Step ${step.step} failed. Halting orchestration.`);
                    return { success: false, data: results, error: result.error };
                }
            } catch (error: any) {
                logger.error(`Step ${step.step} execution error: ${error.message}`);
                if (!step.continueOnError) {
                    return { success: false, data: results, error: error.message };
                }
            }
        }

        return { success: true, data: results };
    }

    private async runProactiveDiscovery(): Promise<void> {
        logger.info('Running proactive task discovery...');
        // Mock implementation of discovery logic
        // In v0.1.0 this will hook into fs-watching to suggest tests or lint fixes
        this.emit('proactive:suggestion', {
            type: 'lint',
            suggestion: 'Found 3 lint errors in src/cli/main.ts. Run "vibe fix" to resolve?',
            confidence: 0.95
        });
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
