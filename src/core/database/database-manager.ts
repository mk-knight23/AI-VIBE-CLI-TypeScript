import { connectionManager } from './connection-manager.js';
import SQLite from 'better-sqlite3';
import { createLogger } from '../../utils/pino-logger.js';
import path from 'path';
import fs from 'fs-extra';

const logger = createLogger('database');

export class DatabaseManager {
    private db: SQLite.Database;
    private dbPath: string;

    constructor(workspacePath: string) {
        const vibeDir = path.join(workspacePath, '.vibe');
        fs.ensureDirSync(vibeDir);
        this.dbPath = path.join(vibeDir, 'vibe.db');
        this.db = connectionManager.getConnection(this.dbPath);
        this.initialize();
    }

    private initialize() {
        this.applyMigrations();
    }

    private applyMigrations() {
        // Create migrations table if it doesn't exist
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        const migrations = [
            {
                name: 'initial_schema',
                up: `
                    CREATE TABLE IF NOT EXISTS runs (
                        id TEXT PRIMARY KEY,
                        user_id TEXT,
                        workspace_path TEXT,
                        status TEXT,
                        config_snapshot TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );

                    CREATE TABLE IF NOT EXISTS workflow_steps (
                        id TEXT PRIMARY KEY,
                        run_id TEXT,
                        step_number INTEGER,
                        primitive TEXT,
                        task TEXT,
                        status TEXT,
                        input TEXT,
                        output TEXT,
                        error TEXT,
                        duration_ms INTEGER,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY(run_id) REFERENCES runs(id) ON DELETE CASCADE
                    );

                    CREATE TABLE IF NOT EXISTS persistence_items (
                        key TEXT PRIMARY KEY,
                        value TEXT,
                        metadata TEXT,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );

                    CREATE INDEX IF NOT EXISTS idx_workflow_steps_run_id ON workflow_steps(run_id);
                    CREATE INDEX IF NOT EXISTS idx_workflow_steps_status ON workflow_steps(status);
                    CREATE INDEX IF NOT EXISTS idx_runs_user_id ON runs(user_id);
                    CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
                    CREATE INDEX IF NOT EXISTS idx_persistence_items_updated ON persistence_items(updated_at);
                `
            }
        ];

        for (const migration of migrations) {
            const row = this.db.prepare('SELECT id FROM migrations WHERE name = ?').get(migration.name);
            if (!row) {
                logger.info({ migration: migration.name }, 'Applying migration');
                this.db.transaction(() => {
                    this.db.exec(migration.up);
                    this.db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migration.name);
                })();
            }
        }
        
        logger.info({ path: this.dbPath }, 'Database migrations verified');
    }

    /**
     * Execute operations within a transaction
     * Uses better-sqlite3's built-in transaction support
     */
    transaction<T>(operations: (db: SQLite.Database) => T): T {
        const tx = this.db.transaction(operations);
        return tx(this.db);
    }

    public getClient(): SQLite.Database {
        return this.db;
    }

    public close() {
        this.db.close();
    }
}
