import { z } from 'zod';

/**
 * Metadata for deterministic replay and audit
 */
export const DeterminismContextSchema = z.object({
    seed: z.number().optional(),
    isReplay: z.boolean().default(false),
    recordedIO: z.array(z.object({
        tool: z.string(),
        input: z.any(),
        output: z.any(),
        timestamp: z.string().datetime()
    })).optional()
});

export type DeterminismContext = z.infer<typeof DeterminismContextSchema>;
