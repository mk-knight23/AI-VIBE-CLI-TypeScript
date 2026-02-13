/**
 * VIBE-CLI v0.0.2 - Agent Audit Logger
 * Records actions and tool calls for traceability.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AgentStep } from './index.js';

export interface AuditLogEntry {
    timestamp: string;
    sessionId: string;
    phase: string;
    action: string;
    result: string;
    approved: boolean;
    duration: number;
}

export class AgentAuditLogger {
    private logPath: string;

    constructor() {
        this.logPath = path.join(process.cwd(), '.vibe', 'audit.log');
        this.ensureDir();
    }

    private ensureDir() {
        const dir = path.dirname(this.logPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    /**
     * Log an agent step
     */
    logStep(sessionId: string, step: AgentStep): void {
        const entry: AuditLogEntry = {
            timestamp: step.timestamp.toISOString(),
            sessionId,
            phase: step.phase,
            action: step.action,
            result: step.result.slice(0, 500), // Truncate long results
            approved: step.approved ?? true,
            duration: step.duration,
        };

        fs.appendFileSync(this.logPath, JSON.stringify(entry) + '\n');
    }

    /**
     * Get logs for a session
     */
    getLogs(sessionId?: string): AuditLogEntry[] {
        if (!fs.existsSync(this.logPath)) return [];

        const lines = fs.readFileSync(this.logPath, 'utf-8').split('\n').filter(Boolean);
        const logs = lines.map(line => JSON.parse(line) as AuditLogEntry);

        if (sessionId) {
            return logs.filter(l => l.sessionId === sessionId);
        }
        return logs;
    }
}

export const agentAuditLogger = new AgentAuditLogger();
