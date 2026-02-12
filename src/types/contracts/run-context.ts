import { z } from 'zod';

/**
 * Standard envelope for all platform primitive results
 */
export const PrimitiveResultSchema = <T extends z.ZodTypeAny>(dataSchema: T) => z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    meta: z.object({
        duration: z.number().optional(),
        tokens: z.number().optional(),
        cost: z.number().optional(),
        traceId: z.string().optional()
    }).optional()
});

/**
 * Global execution context for a single run
 */
export const RunContextSchema = z.object({
    runId: z.string().uuid(),
    correlationId: z.string().optional(),
    user: z.object({
        id: z.string(),
        role: z.string().default('user')
    }),
    workspace: z.object({
        path: z.string(),
        branch: z.string().optional()
    }),
    configSnapshot: z.record(z.string(), z.any()),
    timestamp: z.string().datetime()
});

export type PrimitiveResult<T> = z.infer<ReturnType<typeof PrimitiveResultSchema>>;
export type RunContext = z.infer<typeof RunContextSchema>;
