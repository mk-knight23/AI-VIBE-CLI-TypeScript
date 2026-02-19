import { describe, it, expect, vi, afterEach } from 'vitest';
import { CreateProjectSchema, MarketplaceInstallSchema } from '../../src/core/api/api-schemas';
import { authMiddleware } from '../../src/core/api/middlewares/auth-middleware';
import { validateRequest } from '../../src/core/api/middlewares/validate-request';
import { z } from 'zod';

describe('API Hardening', () => {
    describe('Zod Schemas', () => {
        it('should validate valid project creation', () => {
            const result = CreateProjectSchema.safeParse({ name: 'test-project', template: 'nextjs' });
            expect(result.success).toBe(true);
        });

        it('should fail on missing project name', () => {
            const result = CreateProjectSchema.safeParse({ template: 'nextjs' });
            expect(result.success).toBe(false);
        });

        it('should fail on empty project name', () => {
            const result = CreateProjectSchema.safeParse({ name: '' });
            expect(result.success).toBe(false);
        });
    });

    describe('Auth Middleware', () => {
        const originalApiKey = process.env.VIBE_API_KEY;

        afterEach(() => {
            if (originalApiKey !== undefined) {
                process.env.VIBE_API_KEY = originalApiKey;
            } else {
                delete process.env.VIBE_API_KEY;
            }
        });

        it('should allow valid API key', () => {
            process.env.VIBE_API_KEY = 'vibe-secret-key';
            const req = { headers: { 'x-api-key': 'vibe-secret-key' } } as any;
            const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
            const next = vi.fn();

            authMiddleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        it('should block missing API key', () => {
            process.env.VIBE_API_KEY = 'vibe-secret-key';
            const req = { headers: {}, query: {} } as any;
            const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
            const next = vi.fn();

            authMiddleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('Validation Middleware', () => {
        it('should pass valid request', async () => {
            const schema = z.object({ body: z.object({ name: z.string() }) });
            const middleware = validateRequest(schema as any);
            const req = { body: { name: 'test' } } as any;
            const res = {} as any;
            const next = vi.fn();

            await middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        it('should return 400 on invalid request', async () => {
            const schema = z.object({ body: z.object({ name: z.string() }) });
            const middleware = validateRequest(schema as any);
            const req = { body: { name: 123 } } as any;
            const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
            const next = vi.fn();

            await middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(next).not.toHaveBeenCalled();
        });
    });
});
