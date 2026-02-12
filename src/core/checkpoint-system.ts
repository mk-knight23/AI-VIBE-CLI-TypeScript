import { simpleGit, LogResult, DefaultLogFields } from 'simple-git';
import { StateManager } from './state-manager.js';
import { createLogger } from '../utils/pino-logger.js';

const git = simpleGit();
const logger = createLogger('checkpoint-system');

interface CheckpointState {
    commit: string;
    timestamp: string;
}

interface CheckpointEntry {
    hash: string;
    message: string;
    date: string;
}

export class CheckpointSystem {
    constructor(private state: StateManager) { }

    async create(name: string): Promise<string> {
        try {
            if (!(await git.checkIsRepo())) {
                return 'Not a git repository';
            }

            const timestamp = new Date().toISOString();
            const message = `VIBE_CHECKPOINT: ${name} (${timestamp})`;

            await git.add('.');
            await git.commit(message, { '--allow-empty': null });

            const commit = await git.revparse(['HEAD']);
            this.state.set(`checkpoint_${name}`, { commit, timestamp });

            return commit.trim();
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            logger.error(`Checkpoint failed: ${message}`);
            throw e;
        }
    }

    async rollback(name?: string): Promise<boolean> {
        try {
            const log: LogResult<DefaultLogFields> = await git.log();
            let targetHash = '';

            if (name) {
                const stored = this.state.get<CheckpointState>(`checkpoint_${name}`);
                if (stored) {
                    targetHash = stored.commit;
                } else {
                    // Try to find in git log
                    const entry = log.all.find(c => c.message.includes(`VIBE_CHECKPOINT: ${name}`));
                    if (entry) targetHash = entry.hash;
                }
            } else {
                // Rollback to very last VIBE_CHECKPOINT
                const entry = log.all.find(c => c.message.includes('VIBE_CHECKPOINT'));
                if (entry) targetHash = entry.hash;
            }

            if (!targetHash) return false;

            await git.reset(['--hard', targetHash]);
            return true;
        } catch (e) {
            return false;
        }
    }

    async list(): Promise<CheckpointEntry[]> {
        const log: LogResult<DefaultLogFields> = await git.log();
        return log.all
            .filter(c => c.message.includes('VIBE_CHECKPOINT'))
            .map(c => ({
                hash: c.hash,
                message: c.message.replace('VIBE_CHECKPOINT: ', ''),
                date: c.date,
            }));
    }
}
