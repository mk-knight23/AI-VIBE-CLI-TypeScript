import { describe, it, expect } from 'vitest';
import { RunContextSchema, PrimitiveResultSchema } from '../../src/types/contracts/run-context';
import { WorkflowStepSchema } from '../../src/types/contracts/workflow';
import { z } from 'zod';

describe('VIBE Core Contracts', () => {
    it('should validate a valid RunContext', () => {
        const context = {
            runId: '550e8400-e29b-41d4-a716-446655440000',
            user: { id: 'u123', role: 'admin' },
            workspace: { path: '/foo/bar', branch: 'main' },
            configSnapshot: { debug: true },
            timestamp: new Date().toISOString()
        };
        expect(() => RunContextSchema.parse(context)).not.toThrow();
    });

    it('should validate a standard PrimitiveResult', () => {
        const schema = PrimitiveResultSchema(z.string());
        const result = {
            success: true,
            data: 'hello world',
            meta: { duration: 150 }
        };
        expect(() => schema.parse(result)).not.toThrow();
    });

    it('should validate a WorkflowStep', () => {
        const step = {
            id: '550e8400-e29b-41d4-a716-446655440001',
            step: 1,
            primitive: 'planning',
            task: 'do thing'
        };
        expect(() => WorkflowStepSchema.parse(step)).not.toThrow();
    });
});
