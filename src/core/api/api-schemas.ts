import { z } from 'zod';

// Projects
export const CreateProjectSchema = z.object({
    name: z.string().min(1).max(100),
    template: z.string().optional(),
    options: z.record(z.string(), z.any()).optional()
});

export const ProjectResponseSchema = z.object({
    projects: z.array(z.string())
});

// Marketplace
export const MarketplaceQuerySchema = z.object({
    query: z.string().optional(),
    type: z.enum(['plugin', 'template']).optional(),
    limit: z.number().int().positive().optional()
});

export const MarketplaceInstallSchema = z.object({
    id: z.string().min(1),
    type: z.enum(['plugin', 'template']),
    version: z.string().optional()
});

export const MarketplacePublishSchema = z.object({
    type: z.enum(['plugin', 'template']),
    manifest: z.object({
        name: z.string().min(1),
        version: z.string(),
        description: z.string().optional(),
        author: z.string().optional()
    }),
    content: z.string().optional() // Base64 or path
});

// Generic
export const ErrorResponseSchema = z.object({
    error: z.string(),
    code: z.string().optional(),
    suggestions: z.array(z.string()).optional()
});

export const StatusResponseSchema = z.object({
    status: z.string(),
    version: z.string(),
    timestamp: z.string(),
    analytics: z.object({
        activeProjects: z.number(),
        throughput: z.number(),
        systemHealth: z.number(),
        lastScan: z.string()
    })
});
