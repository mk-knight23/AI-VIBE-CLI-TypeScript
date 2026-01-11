import { execSync } from 'child_process';
import { Logger } from '../utils/structured-logger';

const logger = new Logger('SandboxManager');

export class SandboxManager {
    static execute(command: string, options: { timeout?: number; env?: any } = {}): { success: boolean; stdout: string; stderr: string } {
        logger.info(`Entering Sandbox for: ${command}`);

        try {
            const stdout = execSync(command, {
                timeout: options.timeout || 30000,
                env: { ...process.env, ...options.env, VIBE_SANDBOX: '1' },
            });

            this.audit(command, 'success');
            return { success: true, stdout: stdout.toString(), stderr: '' };
        } catch (e: any) {
            this.audit(command, 'failed', e.message);
            return { success: false, stdout: e.stdout?.toString() || '', stderr: e.stderr?.toString() || e.message };
        }
    }

    private static audit(command: string, status: string, error?: string): void {
        const log = `[AUDIT] ${new Date().toISOString()} | ${status} | ${command}${error ? ` | ${error}` : ''}`;
        // Future: Persistent audit log (Feature #88)
    }
}
