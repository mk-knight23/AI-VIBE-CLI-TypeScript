import { connectionManager } from '../../core/database/connection-manager.js';
import SQLite from 'better-sqlite3';
import { BasePrimitive, PrimitiveResult } from './types.js';
import path from 'path';
import fs from 'fs';
import { createLogger } from '../../utils/pino-logger.js';

const logger = createLogger('MemoryPrimitive');

export class MemoryPrimitive extends BasePrimitive {
    public id = 'memory';
    public name = 'Memory Primitive';
    private db: SQLite.Database;

    constructor() {
        super();
        const dbDir = path.join(process.cwd(), '.vibe');
        this.db = connectionManager.getConnection(path.join(dbDir, 'vibe.db'));
        this.init();
    }

    private init() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory (
        id TEXT PRIMARY KEY,
        key TEXT,
        value TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_memory_key ON memory(key);
      CREATE INDEX IF NOT EXISTS idx_memory_timestamp ON memory(timestamp);
    `);
    }

    public async execute(input: {
        action?: 'store' | 'retrieve' | 'search' | 'document';
        key?: string;
        value?: string;
        query?: string;
        task?: string;
        step?: number;
        primitive?: string;
    }): Promise<PrimitiveResult> {
        try {
            // Infer action from orchestration step data if not explicitly provided
            let action = input.action;
            let key = input.key;
            let value = input.value;

            // Handle orchestration steps that don't have explicit action
            if (!action && input.task) {
                // Default to 'document' for orchestration memory steps
                action = 'document';
                key = key || `step_${input.step || 'unknown'}`;
                value = value || input.task;
            }

            if (action === 'store' || action === 'document') {
                if (!key || !value) {
                    return { success: false, error: 'Missing key or value for store/document action' };
                }
                const id = Math.random().toString(36).substring(7);
                const stmt = this.db.prepare('INSERT INTO memory (id, key, value) VALUES (?, ?, ?)');
                stmt.run(id, key, value);
                return { success: true, data: { id, key, value, message: `Documented: ${key}` } };
            } else if (action === 'retrieve') {
                const stmt = this.db.prepare('SELECT * FROM memory WHERE key = ? ORDER BY timestamp DESC');
                const results = stmt.all(key);
                return { success: true, data: results };
            } else if (action === 'search') {
                // Safe: better-sqlite3 parameterization prevents SQL injection (P4-106)
                const stmt = this.db.prepare('SELECT * FROM memory WHERE value LIKE ? OR key LIKE ? ORDER BY timestamp DESC');
                const results = stmt.all(`%${input.query}%`, `%${input.query}%`);
                return { success: true, data: results };
            }

            return { success: false, error: `Invalid memory action: ${action || 'undefined'}. Supported actions: store, retrieve, search, document` };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}
