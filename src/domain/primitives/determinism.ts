import { BasePrimitive, PrimitiveResult } from './types.js';
import { simpleGit } from 'simple-git';
import { createLogger } from '../../utils/pino-logger.js';

const logger = createLogger('DeterminismPrimitive');
const git = simpleGit();

export class DeterminismPrimitive extends BasePrimitive {
    public id = 'determinism';
    public name = 'Determinism Primitive';

    public async execute(input: { action: 'checkpoint' | 'rollback'; name: string }): Promise<PrimitiveResult> {
        try {
            const isRepo = await git.checkIsRepo();
            if (!isRepo) {
                return { success: false, error: 'Not a git repository. Determinism requires git.' };
            }

            if (input.action === 'checkpoint') {
                logger.info(`Creating git checkpoint: ${input.name}`);

                await git.add('.');
                const commitMessage = `VIBE_CHECKPOINT: ${input.name}`;
                await git.commit(commitMessage, { '--allow-empty': null });

                // Create a branch for this checkpoint to make it easy to find
                const branchName = `vibe-ckpt-${input.name.replace(/\s+/g, '-')}-${Date.now()}`;
                await git.branch([branchName]);

                return { success: true, data: { branch: branchName } };
            } else if (input.action === 'rollback') {
                logger.warn(`Rolling back to checkpoint: ${input.name}`);

                // Rollback strategy: reset --hard to the last VIBE_CHECKPOINT
                // Or if name is provided as a branch, checkout that branch.
                // For now, let's just reset to the most recent checkpoint commit.
                const log = await git.log();
                const lastCheckpoint = log.all.find((c: any) => c.message.includes('VIBE_CHECKPOINT'));

                if (!lastCheckpoint) {
                    return { success: false, error: 'No VIBE checkpoints found in git history.' };
                }

                await git.reset(['--hard', lastCheckpoint.hash]);
                return { success: true };
            }
            return { success: false, error: 'Invalid determinism action' };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}
