import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DeterminismManager } from '../../src/core/memory/determinism-manager';
import { VectorMemory } from '../../src/core/memory/vector-memory';
import { DatabaseManager } from '../../src/core/database/database-manager';
import fs from 'fs-extra';
import path from 'path';

describe('Memory & Determinism', () => {
    describe('DeterminismManager', () => {
        it('should record calls in normal mode', async () => {
            const manager = new DeterminismManager();
            manager.setReplayMode(false);

            const result = await manager.executeProxy('test-tool', { arg: 1 }, async () => 'output');

            expect(result).toBe('output');
            const context = manager.getContext();
            expect(context.recordedIO).toHaveLength(1);
            expect(context.recordedIO![0].tool).toBe('test-tool');
        });

        it('should replay calls in replay mode', async () => {
            const history = [{ tool: 'test-tool', input: {}, output: 'cached', timestamp: new Date().toISOString() }];
            const manager = new DeterminismManager({ isReplay: true, recordedIO: history });

            const result = await manager.executeProxy('test-tool', {}, async () => 'new-output');

            expect(result).toBe('cached');
        });

        it('should throw mismatch error on replay mismatch', async () => {
            const history = [{ tool: 'expected-tool', input: {}, output: 'cached', timestamp: new Date().toISOString() }];
            const manager = new DeterminismManager({ isReplay: true, recordedIO: history });

            await expect(manager.executeProxy('actual-tool', {}, async () => 'output'))
                .rejects.toThrow('Determinism Replay Mismatch');
        });
    });

    describe('VectorMemory', () => {
        const testWorkspace = path.resolve(__dirname, '../../temp-memory-test');
        let dbManager: DatabaseManager;
        let memory: VectorMemory;

        beforeEach(() => {
            fs.ensureDirSync(testWorkspace);
            dbManager = new DatabaseManager(testWorkspace);
            memory = new VectorMemory(dbManager);
        });

        afterEach(() => {
            dbManager.close();
            fs.removeSync(testWorkspace);
        });

        it('should store and retrieve semantic memory', async () => {
            await memory.store('The quick brown fox', { topic: 'nature' });
            await memory.store('The silent blue ocean', { topic: 'nature' });

            const results = await memory.search('fox');
            expect(results).toHaveLength(1);
            expect(results[0].content).toBe('The quick brown fox');
            expect(results[0].metadata.topic).toBe('nature');
        });
    });
});
