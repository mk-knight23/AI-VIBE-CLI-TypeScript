import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import path from 'path';

describe('VIBE CLI Smoke E2E', () => {
    const cliPath = path.resolve(__dirname, '../../dist/cli/main.js');

    const runVibe = (args: string[]) => {
        const result = spawnSync('node', [cliPath, ...args], {
            env: { ...process.env, DOTENV_SILENT: 'true' },
            encoding: 'utf-8'
        });
        return result.stdout + result.stderr;
    };

    it('should display help documentation', () => {
        const output = runVibe(['--help']);
        expect(output).toContain('vibe');
        expect(output).toContain('doctor');
        expect(output).toContain('scaffold');
    });

    it('should run system health check (vibe doctor)', () => {
        const output = runVibe(['doctor']);
        expect(output).toContain('VIBE Doctor');
        expect(output).toContain('Health check complete');
    });

    it('should display version', () => {
        const output = runVibe(['--version']);
        expect(output).toMatch(/\d+\.\d+\.\d+/);
    });
});
