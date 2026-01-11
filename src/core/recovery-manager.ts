import { stateManager } from './state-manager';
import { logger } from '../utils/structured-logger';

export class RecoveryManager {
    static saveCheckpoint(taskId: string, state: any): void {
        stateManager.set(`checkpoint_${taskId}`, state);
        logger.info(`Checkpoint saved for task: ${taskId}`);
    }

    static getCheckpoint(taskId: string): any | null {
        return stateManager.get(`checkpoint_${taskId}`);
    }

    static clearCheckpoint(taskId: string): void {
        stateManager.set(`checkpoint_${taskId}`, null);
    }

    static listCheckpoints(): string[] {
        // This would ideally query the DB keys starting with checkpoint_
        return [];
    }
}
