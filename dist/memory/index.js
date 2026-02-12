/**
 * VIBE-CLI v0.0.1 - Memory Module
 * Project context and memory management
 */
import * as fs from 'fs';
import * as path from 'path';
export class VibeMemoryManager {
    storageDir;
    memories = new Map();
    constructor(storageDir) {
        this.storageDir = storageDir || path.join(process.cwd(), '.vibe', 'memory');
        this.ensureStorageDir();
        this.loadMemories();
    }
    ensureStorageDir() {
        if (!fs.existsSync(this.storageDir)) {
            fs.mkdirSync(this.storageDir, { recursive: true });
        }
    }
    /**
     * Load memories from disk
     */
    loadMemories() {
        const memoryFile = path.join(this.storageDir, 'memories.json');
        if (fs.existsSync(memoryFile)) {
            try {
                const data = JSON.parse(fs.readFileSync(memoryFile, 'utf-8'));
                for (const entry of data) {
                    entry.createdAt = new Date(entry.createdAt);
                    if (entry.lastAccessed)
                        entry.lastAccessed = new Date(entry.lastAccessed);
                    this.memories.set(entry.id, entry);
                }
            }
            catch {
                // Ignore corrupt memory file
            }
        }
    }
    /**
     * Save memories to disk
     */
    saveMemories() {
        const memoryFile = path.join(this.storageDir, 'memories.json');
        const data = Array.from(this.memories.values());
        fs.writeFileSync(memoryFile, JSON.stringify(data, null, 2));
    }
    /**
     * Get entry count
     */
    getEntryCount() {
        return this.memories.size;
    }
    /**
     * Search memories
     */
    search(query) {
        const normalizedQuery = query.toLowerCase();
        return Array.from(this.memories.values())
            .filter(entry => entry.content.toLowerCase().includes(normalizedQuery) ||
            entry.tags.some(tag => tag.toLowerCase().includes(normalizedQuery)));
    }
    /**
     * Get all memories
     */
    getAll() {
        return Array.from(this.memories.values());
    }
    /**
     * Add a memory entry
     */
    add(entry) {
        const fullEntry = {
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
    get(id) {
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
    query(query) {
        let results = Array.from(this.memories.values());
        if (query.type) {
            results = results.filter(m => m.type === query.type);
        }
        if (query.source) {
            results = results.filter(m => m.source === query.source);
        }
        if (query.keys && query.keys.length > 0) {
            results = results.filter(m => query.keys.some((k) => m.tags.includes(k)));
        }
        if (query.tags && query.tags.length > 0) {
            results = results.filter(m => query.tags.some((t) => m.tags.includes(t)));
        }
        if (query.limit) {
            results = results.slice(0, query.limit);
        }
        return results;
    }
    /**
     * Update a memory entry
     */
    update(id, updates) {
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
    delete(id) {
        const deleted = this.memories.delete(id);
        if (deleted) {
            this.saveMemories();
        }
        return deleted;
    }
    /**
     * Clear all memories
     */
    clear() {
        this.memories.clear();
        this.saveMemories();
    }
}
// Export as VibeMemory for compatibility
export const VibeMemory = VibeMemoryManager;
//# sourceMappingURL=index.js.map