import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';

export interface EmbeddedChatTurn {
  id: string;
  turn: number;
  message: string;
  role: 'user' | 'assistant';
  embedding: number[];
  metadata: {
    timestamp: Date;
    tokens: number;
    task: string;
  };
}

export interface SearchResult {
  id: string;
  message: string;
  similarity: number;
  metadata: object;
}

export interface ChatTurn {
  id: string;
  turn: number;
  message: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  tokens: number;
  task: string;
}

export class EmbeddingGenerator {
  private apiUrl = 'http://localhost:11434/api/embeddings';

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'nomic-embed-text',
          prompt: text
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.embedding;
      }
    } catch {}

    return this.fallbackEmbedding(text);
  }

  private fallbackEmbedding(text: string): number[] {
    const embedding = new Array(384).fill(0);
    const words = text.toLowerCase().split(/\s+/);
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      for (let j = 0; j < word.length; j++) {
        const idx = (word.charCodeAt(j) * (i + 1) * (j + 1)) % 384;
        embedding[idx] += 1 / words.length;
      }
    }
    
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
  }
}

export class VectorStore {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  async init(): Promise<void> {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS embeddings (
        id TEXT PRIMARY KEY,
        turn_number INTEGER,
        message TEXT,
        role TEXT,
        embedding BLOB,
        timestamp TEXT,
        tokens INTEGER,
        task TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_timestamp ON embeddings(timestamp);
      CREATE INDEX IF NOT EXISTS idx_task ON embeddings(task);
    `);
  }

  async insert(record: EmbeddedChatTurn): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const embeddingBlob = Buffer.from(new Float32Array(record.embedding).buffer);
    
    this.db.prepare(`
      INSERT OR REPLACE INTO embeddings (id, turn_number, message, role, embedding, timestamp, tokens, task)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.id,
      record.turn,
      record.message,
      record.role,
      embeddingBlob,
      record.metadata.timestamp.toISOString(),
      record.metadata.tokens,
      record.metadata.task
    );
  }

  async search(queryEmbedding: number[], limit: number = 10): Promise<SearchResult[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = this.db.prepare('SELECT * FROM embeddings').all() as any[];
    
    const results = rows.map(row => {
      const storedEmbedding = new Float32Array(row.embedding.buffer);
      const similarity = this.cosineSimilarity(queryEmbedding, Array.from(storedEmbedding));
      
      return {
        id: row.id,
        message: row.message,
        similarity,
        metadata: {
          turn: row.turn_number,
          role: row.role,
          timestamp: row.timestamp,
          tokens: row.tokens,
          task: row.task
        }
      };
    });

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator > 0 ? dotProduct / denominator : 0;
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export class SemanticMemory {
  private vectorStore: VectorStore;
  private embedder: EmbeddingGenerator;
  private turnCounter = 0;

  constructor(dbPath: string = '.vibe/semantic.db') {
    this.vectorStore = new VectorStore(dbPath);
    this.embedder = new EmbeddingGenerator();
  }

  async init(): Promise<void> {
    await this.vectorStore.init();
  }

  async addTurn(message: string, role: 'user' | 'assistant', task: string = 'general'): Promise<void> {
    const embedding = await this.embedder.generateEmbedding(message);
    
    await this.vectorStore.insert({
      id: `turn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      turn: this.turnCounter++,
      message,
      role,
      embedding,
      metadata: {
        timestamp: new Date(),
        tokens: Math.ceil(message.length / 4),
        task
      }
    });
  }

  async searchSimilar(query: string, limit: number = 5): Promise<SearchResult[]> {
    const queryEmbedding = await this.embedder.generateEmbedding(query);
    return this.vectorStore.search(queryEmbedding, limit);
  }

  async close(): Promise<void> {
    await this.vectorStore.close();
  }
}
