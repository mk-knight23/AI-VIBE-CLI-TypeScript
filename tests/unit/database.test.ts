import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseManager } from '../../src/core/database/database-manager';
import { RunRepository } from '../../src/core/database/repositories/run-repository';
import fs from 'fs-extra';
import path from 'path';

describe('Database Layer', () => {
    const testWorkspace = path.resolve(__dirname, '../../temp-test-workspace');
    let dbManager: DatabaseManager;
    let runRepo: RunRepository;

    beforeEach(() => {
        fs.ensureDirSync(testWorkspace);
        dbManager = new DatabaseManager(testWorkspace);
        runRepo = new RunRepository(dbManager);
    });

    afterEach(() => {
        dbManager.close();
        fs.removeSync(testWorkspace);
    });

    it('should initialize database and apply migrations', () => {
        const tables = dbManager.getClient().prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        const tableNames = tables.map((t: any) => t.name);

        expect(tableNames).toContain('runs');
        expect(tableNames).toContain('workflow_steps');
        expect(tableNames).toContain('persistence_items');
    });

    it('should create and update runs', () => {
        const context = {
            runId: '550e8400-e29b-41d4-a716-446655440000',
            user: { id: 'test-user' },
            workspace: { path: '/test/path' },
            configSnapshot: { foo: 'bar' },
            timestamp: new Date().toISOString()
        } as any;

        runRepo.createRun(context);

        const run = dbManager.getClient().prepare('SELECT * FROM runs WHERE id = ?').get(context.runId) as any;
        expect(run).toBeDefined();
        expect(run.status).toBe('started');
        expect(JSON.parse(run.config_snapshot)).toEqual({ foo: 'bar' });

        runRepo.updateRunStatus(context.runId, 'completed');
        const updatedRun = dbManager.getClient().prepare('SELECT * FROM runs WHERE id = ?').get(context.runId) as any;
        expect(updatedRun.status).toBe('completed');
    });

    it('should create and update steps', () => {
        const runId = 'r123';
        const step = {
            id: 's1',
            step: 1,
            primitive: 'planning',
            task: 'test task'
        } as any;

        // Dummy run first due to FK
        dbManager.getClient().prepare('INSERT INTO runs (id) VALUES (?)').run(runId);

        runRepo.createStep(runId, step, { input: 'data' });

        const dbStep = dbManager.getClient().prepare('SELECT * FROM workflow_steps WHERE id = ?').get(step.id) as any;
        expect(dbStep).toBeDefined();
        expect(dbStep.status).toBe('pending');

        runRepo.updateStepResult(step.id, { output: 'result' }, 'success', undefined, 150);
        const updatedStep = dbManager.getClient().prepare('SELECT * FROM workflow_steps WHERE id = ?').get(step.id) as any;
        expect(updatedStep.status).toBe('success');
        expect(updatedStep.duration_ms).toBe(150);
    });
});
