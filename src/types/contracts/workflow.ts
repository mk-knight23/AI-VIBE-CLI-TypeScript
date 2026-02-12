import { z } from 'zod';

/**
 * Standard schema for a single workflow step
 */
export const WorkflowStepSchema = z.object({
    id: z.string().uuid(),
    step: z.number(),
    primitive: z.enum([
        'planning', 'completion', 'execution', 'multi-edit',
        'approval', 'memory', 'determinism', 'search', 'orchestration'
    ]),
    task: z.string(),
    dependsOn: z.array(z.string()).optional(),
    retryPolicy: z.object({
        maxRetries: z.number().default(3),
        backoff: z.enum(['fixed', 'exponential']).default('exponential')
    }).optional(),
    idempotencyKey: z.string().optional()
});

/**
 * schema for an entire workflow/plan
 */
export const WorkflowDefinitionSchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    steps: z.array(WorkflowStepSchema),
    metadata: z.record(z.string(), z.any()).optional()
});

export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;
