import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  EmbeddingGenerator, 
  VectorStore, 
  SemanticMemory,
  ChatTurn 
} from '../src/memory/semantic-search';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

global.fetch = vi.fn();

describe('EmbeddingGenerator', () => {
  let generator: EmbeddingGenerator;

  beforeEach(() => {
    generator = new EmbeddingGenerator();
    vi.clearAllMocks();
  });

  it('should generate embeddings using Ollama when available', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ embedding: [0.1, 0.2, 0.3] })
    };
    
    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    const embedding = await generator.generateEmbedding('test text');

    expect(embedding).toEqual([0.1, 0.2, 0.3]);
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/embeddings',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          model: 'nomic-embed-text',
          prompt: 'test text'
        })
      })
    );
  });

  it('should fallback to hash-based embedding when Ollama unavailable', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Connection failed'));

    const embedding = await generator.generateEmbedding('test text');

    expect(embedding).toHaveLength(384);
    expect(embedding.every(val => typeof val === 'number')).toBe(true);
  });

  it('should normalize fallback embeddings', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('No connection'));

    const embedding = await generator.generateEmbedding('a');

    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    expect(magnitude).toBeCloseTo(1, 5);
  });
});

describe('VectorStore', () => {
  let vectorStore: VectorStore;
  let tempDbPath: string;

  beforeEach(async () => {
    tempDbPath = path.join(os.tmpdir(), `vector-test-${Date.now()}.sqlite`);
    vectorStore = new VectorStore(tempDbPath);
    await vectorStore.init();
  });

  afterEach(async () => {
    await vectorStore.close();
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  });

  it('should initialize database with correct schema', async () => {
    expect(fs.existsSync(tempDbPath)).toBe(true);
  });

  it('should insert and retrieve embeddings', async () => {
    const testEmbedding = new Array(384).fill(0).map((_, i) => i / 384);
    
    await vectorStore.insert({
      id: 'test-1',
      turn: 1,
      message: 'Hello world',
      role: 'user',
      embedding: testEmbedding,
      metadata: {
        timestamp: new Date(),
        tokens: 2,
        task: 'greeting'
      }
    });

    const results = await vectorStore.search(testEmbedding, 5);
    
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].message).toBe('Hello world');
    expect(results[0].similarity).toBeCloseTo(1, 2);
  });

  it('should perform semantic search with embeddings', async () => {
    const testEmbedding = new Array(384).fill(0).map((_, i) => i / 384);
    
    await vectorStore.insert({
      id: 'test-1',
      turn: 1,
      message: 'Test message',
      role: 'user',
      embedding: testEmbedding,
      metadata: {
        timestamp: new Date(),
        tokens: 2,
        task: 'test'
      }
    });

    const results = await vectorStore.search(testEmbedding, 5);
    
    expect(results.length).toBe(1);
    expect(results[0].similarity).toBeGreaterThan(0.9);
  });
});

describe('SemanticMemory', () => {
  let memory: SemanticMemory;
  let tempDbPath: string;

  beforeEach(async () => {
    tempDbPath = path.join(os.tmpdir(), `memory-test-${Date.now()}.sqlite`);
    memory = new SemanticMemory(tempDbPath);
    await memory.init();
    vi.mocked(fetch).mockRejectedValue(new Error('No Ollama'));
  });

  afterEach(async () => {
    await memory.close();
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  });

  it('should add and search chat turns', async () => {
    await memory.addTurn('How do I create a React component?', 'user', 'react');
    await memory.addTurn('Here is how to create a React component...', 'assistant', 'react');

    const results = await memory.searchSimilar('React component creation', 5);
    
    expect(results.length).toBeGreaterThan(0);
  });

  it('should handle multiple chat turns', async () => {
    await memory.addTurn('First message', 'user', 'task1');
    await memory.addTurn('Second message', 'assistant', 'task1');
    await memory.addTurn('Third message', 'user', 'task2');

    const results = await memory.searchSimilar('message', 10);
    
    expect(results.length).toBe(3);
  });

  it('should handle empty search gracefully', async () => {
    const results = await memory.searchSimilar('nonexistent query', 5);
    expect(results).toEqual([]);
  });
});
