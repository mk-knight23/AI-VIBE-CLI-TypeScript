import { stateManager } from './state-manager';

export class VibeStats {
    static getStats(): any {
        return {
            totalInteractions: stateManager.get('total_interactions') || 0,
            totalTasksSolved: stateManager.get('tasks_solved') || 0,
            averageHappiness: stateManager.get('avg_happiness') || 'Neutral',
            achievements: stateManager.get('achievements') || [],
        };
    }

    static recordTaskSolved(): void {
        const total = (stateManager.get<number>('tasks_solved') || 0) + 1;
        stateManager.set('tasks_solved', total);
    }
}
