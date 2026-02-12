import path from 'path';
import { createLogger } from '../../utils/pino-logger.js';

const logger = createLogger('security-guardrails');

export class GuardrailManager {
    private workspaceRoot: string;
    private forbiddenPaths: string[] = [
        '/etc',
        '/var',
        '/usr/bin',
        '/bin',
        '/sbin'
    ];

    constructor(workspaceRoot: string = process.cwd()) {
        this.workspaceRoot = path.resolve(workspaceRoot);
    }

    /**
     * Validates if a path is within the workspace confinement.
     */
    public isPathSafe(targetPath: string): boolean {
        const resolvedPath = path.resolve(targetPath);

        // 1. Check against forbidden system paths
        for (const forbidden of this.forbiddenPaths) {
            if (resolvedPath.startsWith(forbidden)) {
                logger.warn({ path: resolvedPath, forbidden }, 'Security violation: Attempt to access forbidden system path');
                return false;
            }
        }

        // 2. Check SSH and Credential directories
        const home = process.env.HOME || '';
        if (home) {
            const sensitive = [
                path.join(home, '.ssh'),
                path.join(home, '.aws'),
                path.join(home, '.kube')
            ];
            for (const s of sensitive) {
                if (resolvedPath.startsWith(s)) {
                    logger.warn({ path: resolvedPath }, 'Security violation: Attempt to access sensitive user directory');
                    return false;
                }
            }
        }

        // 3. Workspace confinement check
        if (!resolvedPath.startsWith(this.workspaceRoot)) {
            logger.warn({ path: resolvedPath, root: this.workspaceRoot }, 'Security boundary: Path outside of workspace root');
            return false;
        }

        return true;
    }

    /**
     * Filters command arguments to prevent common shell injections.
     */
    public isCommandSafe(command: string): boolean {
        const riskyPatterns = [
            /rm\s+-rf\s+\//,
            />\s*\/etc/,
            /curl.*\|.*bash/,
            /wget.*\|.*bash/
        ];

        for (const pattern of riskyPatterns) {
            if (pattern.test(command)) {
                logger.warn({ command }, 'Security violation: Risky command pattern detected');
                return false;
            }
        }

        return true;
    }
}
