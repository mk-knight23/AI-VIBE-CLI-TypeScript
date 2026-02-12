import { createLogger } from '../../utils/pino-logger.js';
import { DatabaseManager } from '../database/database-manager.js';

const logger = createLogger('memory-vector');

export interface MemoryItem {
    id?: string;
    content: string;
    metadata: Record<string, any>;
    embedding?: number[]; // Placeholder for future vector support
    timestamp: string;
}

export class VectorMemory {
    constructor(private dbManager: DatabaseManager) {
        this.initialize();
    }

    private initialize() {
        this.dbManager.getClient().exec(`
            CREATE TABLE IF NOT EXISTS semantic_memory (
                id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                metadata TEXT,
                embedding BLOB,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_memory_created ON semantic_memory(created_at);
        `);
    }

    public async store(content: string, metadata: Record<string, any> = {}): Promise<string> {
        const id = crypto.randomUUID();
        const stmt = this.dbManager.getClient().prepare(`
            INSERT INTO semantic_memory (id, content, metadata)
            VALUES (?, ?, ?)
        `);
        stmt.run(id, content, JSON.stringify(metadata));
        logger.debug({ id }, 'Stored item in semantic memory');
        return id;
    }

    public async search(query: string, limit: number = 5): Promise<MemoryItem[]> {
        // Placeholder for real vector search. 
        // For now, we perform a basic text search until an embedding provider is integrated.
        const stmt = this.dbManager.getClient().prepare(`
            SELECT * FROM semantic_memory 
            WHERE content LIKE ? 
            ORDER BY created_at DESC 
            LIMIT ?
        `);
        const rows = stmt.all(`%${query}%`, limit) as any[];

        return rows.map(row => ({
            id: row.id,
            content: row.content,
            metadata: JSON.parse(row.metadata),
            timestamp: row.created_at
        }));
    }

    public async getRecent(limit: number = 10): Promise<MemoryItem[]> {
        const stmt = this.dbManager.getClient().prepare(`
            SELECT * FROM semantic_memory 
            ORDER BY created_at DESC 
            LIMIT ?
        `);
        const rows = stmt.all(limit) as any[];

        return rows.map(row => ({
            id: row.id,
            content: row.content,
            metadata: JSON.parse(row.metadata),
            timestamp: row.created_at
        }));
    }
}
