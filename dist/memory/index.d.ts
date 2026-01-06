/**
 * VIBE-CLI v12 - Memory Module
 * Project context and memory management
 */
import type { VibeMemoryEntry, MemoryType, MemoryQuery } from '../types';
export type { MemoryQuery } from '../types';
export { VibeMemoryEntry, MemoryType };
export declare class VibeMemoryManager {
    private storageDir;
    private memories;
    constructor(storageDir?: string);
    private ensureStorageDir;
    /**
     * Load memories from disk
     */
    private loadMemories;
    /**
     * Save memories to disk
     */
    private saveMemories;
    /**
     * Get entry count
     */
    getEntryCount(): number;
    /**
     * Search memories
     */
    search(query: string): VibeMemoryEntry[];
    /**
     * Get all memories
     */
    getAll(): VibeMemoryEntry[];
    /**
     * Add a memory entry
     */
    add(entry: {
        type: MemoryType;
        content: string;
        tags: string[];
        confidence?: number;
        source?: 'user' | 'session' | 'inference' | 'git';
    }): VibeMemoryEntry;
    /**
     * Get a memory entry by ID
     */
    get(id: string): VibeMemoryEntry | undefined;
    /**
     * Query memories
     */
    query(query: MemoryQuery): VibeMemoryEntry[];
    /**
     * Update a memory entry
     */
    update(id: string, updates: Partial<VibeMemoryEntry>): boolean;
    /**
     * Delete a memory entry
     */
    delete(id: string): boolean;
    /**
     * Clear all memories
     */
    clear(): void;
}
export declare const VibeMemory: typeof VibeMemoryManager;
//# sourceMappingURL=index.d.ts.map