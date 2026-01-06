"use strict";
/**
 * VIBE-CLI v12 - Memory Module
 * Project context and memory management
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.VibeMemory = exports.VibeMemoryManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class VibeMemoryManager {
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
exports.VibeMemoryManager = VibeMemoryManager;
// Export as VibeMemory for compatibility
exports.VibeMemory = VibeMemoryManager;
//# sourceMappingURL=index.js.map