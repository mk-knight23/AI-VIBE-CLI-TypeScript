import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export class StateManager {
    private db: Database.Database;

    constructor(storagePath?: string) {
        const dbPath = storagePath || path.join(os.homedir(), '.vibe', 'state.db');
        const dbDir = path.dirname(dbPath);

        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        this.db = new Database(dbPath);
        this.init();
    }

    private init() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS state (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        command TEXT,
        input TEXT,
        output TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    }

    set(key: string, value: any) {
        const stmt = this.db.prepare('INSERT OR REPLACE INTO state (key, value) VALUES (?, ?)');
        stmt.run(key, JSON.stringify(value));
    }

    get<T>(key: string): T | null {
        const stmt = this.db.prepare('SELECT value FROM state WHERE key = ?');
        const row = stmt.get(key) as { value: string } | undefined;
        return row ? JSON.parse(row.value) : null;
    }

    addHistory(command: string, input: string, output: string) {
        const stmt = this.db.prepare('INSERT INTO history (command, input, output) VALUES (?, ?, ?)');
        stmt.run(command, input, output);
    }

    getHistory(limit: number = 50) {
        return this.db.prepare('SELECT * FROM history ORDER BY timestamp DESC LIMIT ?').all(limit);
    }

    clear() {
        this.db.exec('DELETE FROM state; DELETE FROM history;');
    }
}

export const stateManager = new StateManager();
