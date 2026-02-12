import Database from 'better-sqlite3';
import { createLogger } from '../../utils/pino-logger.js';
import path from 'path';
import fs from 'fs-extra';

const logger = createLogger('database');

export class DatabaseManager {
    private db: Database.Database;
    private dbPath: string;

    constructor(workspacePath: string) {
        const vibeDir = path.join(workspacePath, '.vibe');
        fs.ensureDirSync(vibeDir);
        this.dbPath = path.join(vibeDir, 'vibe.db');
        this.db = new Database(this.dbPath);
        this.initialize();
    }

    private initialize() {
        // Enable WAL mode for better performance
        this.db.pragma('journal_mode = WAL');
        this.applyMigrations();
    }

    private applyMigrations() {
        // Simple migration system
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

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
                FOREIGN KEY(run_id) REFERENCES runs(id)
            );

            CREATE TABLE IF NOT EXISTS persistence_items (
                key TEXT PRIMARY KEY,
                value TEXT,
                metadata TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        logger.info({ path: this.dbPath }, 'Database initialized and migrations applied');
    }

    public getClient(): Database.Database {
        return this.db;
    }

    public close() {
        this.db.close();
    }
}
