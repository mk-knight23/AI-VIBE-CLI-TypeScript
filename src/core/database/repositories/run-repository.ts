import { DatabaseManager } from '../database-manager.js';
import { RunContext } from '../../../types/contracts/run-context.js';
import { WorkflowStep } from '../../../types/contracts/workflow.js';

export class RunRepository {
    constructor(private dbManager: DatabaseManager) { }

    public createRun(context: RunContext) {
        const stmt = this.dbManager.getClient().prepare(`
            INSERT INTO runs (id, user_id, workspace_path, status, config_snapshot)
            VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run(
            context.runId,
            context.user.id,
            context.workspace.path,
            'started',
            JSON.stringify(context.configSnapshot)
        );
    }

    public updateRunStatus(runId: string, status: string) {
        const stmt = this.dbManager.getClient().prepare('UPDATE runs SET status = ? WHERE id = ?');
        stmt.run(status, runId);
    }

    public createStep(runId: string, step: WorkflowStep, input: any) {
        const stmt = this.dbManager.getClient().prepare(`
            INSERT INTO workflow_steps (id, run_id, step_number, primitive, task, status, input)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
            step.id,
            runId,
            step.step,
            step.primitive,
            step.task,
            'pending',
            JSON.stringify(input)
        );
    }

    public updateStepResult(stepId: string, output: any, status: 'success' | 'failed', error?: string, durationMs?: number) {
        const stmt = this.dbManager.getClient().prepare(`
            UPDATE workflow_steps 
            SET status = ?, output = ?, error = ?, duration_ms = ?
            WHERE id = ?
        `);
        stmt.run(status, JSON.stringify(output), error || null, durationMs || null, stepId);
    }
}
