/**
 * VIBE-CLI v12 - Memory Module
 * Project context and memory management
 */

import * as fs from 'fs';
import * as path from 'path';
import type { VibeMemoryEntry, MemoryType, MemoryQuery } from '../types';

export type { MemoryQuery } from '../types';
export { VibeMemoryEntry, MemoryType };

export class VibeMemoryManager {
  private storageDir: string;
  private memories: Map<string, VibeMemoryEntry> = new Map();

  constructor(storageDir?: string) {
    this.storageDir = storageDir || path.join(process.cwd(), '.vibe', 'memory');
    this.ensureStorageDir();
    this.loadMemories();
  }

  private ensureStorageDir(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  /**
   * Load memories from disk
   */
  private loadMemories(): void {
    const memoryFile = path.join(this.storageDir, 'memories.json');
    
    if (fs.existsSync(memoryFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(memoryFile, 'utf-8'));
        for (const entry of data) {
          entry.createdAt = new Date(entry.createdAt);
          if (entry.lastAccessed) entry.lastAccessed = new Date(entry.lastAccessed);
          this.memories.set(entry.id, entry);
        }
      } catch {
        // Ignore corrupt memory file
      }
    }
  }

  /**
   * Save memories to disk
   */
  private saveMemories(): void {
    const memoryFile = path.join(this.storageDir, 'memories.json');
    const data = Array.from(this.memories.values());
    fs.writeFileSync(memoryFile, JSON.stringify(data, null, 2));
  }

  /**
   * Get entry count
   */
  getEntryCount(): number {
    return this.memories.size;
  }

  /**
   * Search memories
   */
  search(query: string): VibeMemoryEntry[] {
    const normalizedQuery = query.toLowerCase();
    return Array.from(this.memories.values())
      .filter(entry => 
        entry.content.toLowerCase().includes(normalizedQuery) ||
        entry.tags.some(tag => tag.toLowerCase().includes(normalizedQuery))
      );
  }

  /**
   * Get all memories
   */
  getAll(): VibeMemoryEntry[] {
    return Array.from(this.memories.values());
  }

  /**
   * Add a memory entry
   */
  add(entry: {
    type: MemoryType;
    content: string;
    tags: string[];
    confidence?: number;
    source?: 'user' | 'session' | 'inference' | 'git';
  }): VibeMemoryEntry {
    const fullEntry: VibeMemoryEntry = {
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: entry.type,
      content: entry.content,
      tags: entry.tags,
      confidence: entry.confidence,
      source: entry.source,
      createdAt: new Date(),
      accessCount: 0,
    };

    this.memories.set(fullEntry.id, fullEntry);
    this.saveMemories();

    return fullEntry;
  }

  /**
   * Get a memory entry by ID
   */
  get(id: string): VibeMemoryEntry | undefined {
    const entry = this.memories.get(id);
    if (entry) {
      entry.lastAccessed = new Date();
      entry.accessCount = (entry.accessCount || 0) + 1;
    }
    return entry;
  }

  /**
   * Query memories
   */
  query(query: MemoryQuery): VibeMemoryEntry[] {
    let results = Array.from(this.memories.values());

    if (query.type) {
      results = results.filter(m => m.type === query.type);
    }

    if (query.source) {
      results = results.filter(m => m.source === query.source);
    }

    if (query.keys && query.keys.length > 0) {
      results = results.filter(m => query.keys!.some((k: string) => m.tags.includes(k)));
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter(m => query.tags!.some((t: string) => m.tags.includes(t)));
    }

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Update a memory entry
   */
  update(id: string, updates: Partial<VibeMemoryEntry>): boolean {
    const entry = this.memories.get(id);
    
    if (!entry) {
      return false;
    }

    const updated = {
      ...entry,
      ...updates,
      id: entry.id,
      createdAt: entry.createdAt,
      lastAccessed: new Date(),
    };

    this.memories.set(id, updated);
    this.saveMemories();

    return true;
  }

  /**
   * Delete a memory entry
   */
  delete(id: string): boolean {
    const deleted = this.memories.delete(id);
    
    if (deleted) {
      this.saveMemories();
    }

    return deleted;
  }

  /**
   * Clear all memories
   */
  clear(): void {
    this.memories.clear();
    this.saveMemories();
  }
}

// Export as VibeMemory for compatibility
export const VibeMemory = VibeMemoryManager;
