import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs-extra';

export class ConnectionManager {
    private static instance: ConnectionManager;
    private connections: Map<string, Database.Database> = new Map();

    private constructor() {}

    public static getInstance(): ConnectionManager {
        if (!ConnectionManager.instance) {
            ConnectionManager.instance = new ConnectionManager();
        }
        return ConnectionManager.instance;
    }

    public getConnection(dbPath: string): Database.Database {
        const resolvedPath = path.resolve(dbPath);

        // Check if we have a cached connection
        if (this.connections.has(resolvedPath)) {
            const db = this.connections.get(resolvedPath)!;
            // Check if the cached connection is still open
            if (db.open) {
                return db;
            } else {
                // Connection is closed, remove from cache
                this.connections.delete(resolvedPath);
            }
        }

        // Create new connection
        const dbDir = path.dirname(resolvedPath);
        fs.ensureDirSync(dbDir);

        const db = new Database(resolvedPath);

        // Apply standard pragmas for performance and safety (P1-037, P3-057, P3-058)
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        db.pragma('busy_timeout = 5000');
        db.pragma('cache_size = -64000'); // 64MB cache
        db.pragma('temp_store = memory'); // Use memory for temp tables
        db.pragma('mmap_size = 268435456'); // 256MB memory map

        this.connections.set(resolvedPath, db);
        return db;
    }

    public closeAll() {
        for (const [path, db] of this.connections) {
            db.close();
            this.connections.delete(path);
        }
    }
}

export const connectionManager = ConnectionManager.getInstance();
