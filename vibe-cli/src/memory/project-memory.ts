/**
 * Project Memory - Long-term knowledge base for project context
 * Stores facts, decisions, patterns learned across sessions
 */

import * as fs from 'fs';
import * as path from 'path';
import { getDb, generateId } from '../storage/database';

export interface MemoryEntry {
  id: string;
  type: 'fact' | 'decision' | 'pattern' | 'preference' | 'context';
  content: string;
  tags: string[];
  confidence: number;
  source: string;
  createdAt: number;
  updatedAt: number;
  accessCount: number;
}

const MEMORY_FILE = path.join(process.cwd(), '.vibe', 'memory.json');

export class ProjectMemory {
  private entries: Map<string, MemoryEntry> = new Map();
  private dirty = false;

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(MEMORY_FILE)) {
        const data = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
        for (const entry of data.entries || []) {
          this.entries.set(entry.id, entry);
        }
      }
    } catch {}
  }

  save(): void {
    if (!this.dirty) return;
    
    const dir = path.dirname(MEMORY_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const data = {
      version: 1,
      entries: Array.from(this.entries.values())
    };

    fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2));
    this.dirty = false;
  }

  add(entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'accessCount'>): string {
    const id = generateId('mem-');
    const now = Date.now();
    
    this.entries.set(id, {
      ...entry,
      id,
      createdAt: now,
      updatedAt: now,
      accessCount: 0
    });
    
    this.dirty = true;
    return id;
  }

  get(id: string): MemoryEntry | undefined {
    const entry = this.entries.get(id);
    if (entry) {
      entry.accessCount++;
      entry.updatedAt = Date.now();
      this.dirty = true;
    }
    return entry;
  }

  search(query: string, options: { type?: MemoryEntry['type']; tags?: string[]; limit?: number } = {}): MemoryEntry[] {
    const queryLower = query.toLowerCase();
    const results: Array<{ entry: MemoryEntry; score: number }> = [];

    for (const entry of this.entries.values()) {
      if (options.type && entry.type !== options.type) continue;
      if (options.tags && !options.tags.some(t => entry.tags.includes(t))) continue;

      let score = 0;
      
      // Content match
      if (entry.content.toLowerCase().includes(queryLower)) {
        score += 10;
      }
      
      // Tag match
      for (const tag of entry.tags) {
        if (tag.toLowerCase().includes(queryLower)) {
          score += 5;
        }
      }
      
      // Boost by confidence and access count
      score *= entry.confidence;
      score += Math.log(entry.accessCount + 1);

      if (score > 0) {
        results.push({ entry, score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || 10)
      .map(r => r.entry);
  }

  getByType(type: MemoryEntry['type']): MemoryEntry[] {
    return Array.from(this.entries.values())
      .filter(e => e.type === type)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  getByTags(tags: string[]): MemoryEntry[] {
    return Array.from(this.entries.values())
      .filter(e => tags.some(t => e.tags.includes(t)))
      .sort((a, b) => b.confidence - a.confidence);
  }

  update(id: string, updates: Partial<Pick<MemoryEntry, 'content' | 'tags' | 'confidence'>>): boolean {
    const entry = this.entries.get(id);
    if (!entry) return false;

    if (updates.content !== undefined) entry.content = updates.content;
    if (updates.tags !== undefined) entry.tags = updates.tags;
    if (updates.confidence !== undefined) entry.confidence = updates.confidence;
    entry.updatedAt = Date.now();
    
    this.dirty = true;
    return true;
  }

  remove(id: string): boolean {
    const deleted = this.entries.delete(id);
    if (deleted) this.dirty = true;
    return deleted;
  }

  getContextPrompt(query?: string): string {
    let entries: MemoryEntry[];
    
    if (query) {
      entries = this.search(query, { limit: 5 });
    } else {
      // Get most relevant entries
      entries = Array.from(this.entries.values())
        .sort((a, b) => {
          const scoreA = a.confidence * Math.log(a.accessCount + 1);
          const scoreB = b.confidence * Math.log(b.accessCount + 1);
          return scoreB - scoreA;
        })
        .slice(0, 10);
    }

    if (entries.length === 0) return '';

    const sections: Record<string, string[]> = {
      fact: [],
      decision: [],
      pattern: [],
      preference: [],
      context: []
    };

    for (const entry of entries) {
      sections[entry.type].push(`- ${entry.content}`);
    }

    const parts: string[] = ['# Project Memory'];
    
    if (sections.fact.length) parts.push(`\n## Facts\n${sections.fact.join('\n')}`);
    if (sections.decision.length) parts.push(`\n## Decisions\n${sections.decision.join('\n')}`);
    if (sections.pattern.length) parts.push(`\n## Patterns\n${sections.pattern.join('\n')}`);
    if (sections.preference.length) parts.push(`\n## Preferences\n${sections.preference.join('\n')}`);
    if (sections.context.length) parts.push(`\n## Context\n${sections.context.join('\n')}`);

    return parts.join('\n');
  }

  // Auto-learn from conversation
  learnFromConversation(messages: Array<{ role: string; content: string }>): void {
    for (const msg of messages) {
      if (msg.role !== 'assistant') continue;
      
      // Extract decisions
      const decisionMatch = msg.content.match(/(?:decided|choosing|will use|going with)\s+(.+?)(?:\.|$)/gi);
      if (decisionMatch) {
        for (const match of decisionMatch) {
          this.add({
            type: 'decision',
            content: match,
            tags: ['auto-learned'],
            confidence: 0.7,
            source: 'conversation'
          });
        }
      }

      // Extract patterns
      const patternMatch = msg.content.match(/(?:pattern|convention|standard|always|never)\s+(.+?)(?:\.|$)/gi);
      if (patternMatch) {
        for (const match of patternMatch) {
          this.add({
            type: 'pattern',
            content: match,
            tags: ['auto-learned'],
            confidence: 0.6,
            source: 'conversation'
          });
        }
      }
    }
  }

  stats(): { total: number; byType: Record<string, number>; avgConfidence: number } {
    const entries = Array.from(this.entries.values());
    const byType: Record<string, number> = {};
    let totalConfidence = 0;

    for (const entry of entries) {
      byType[entry.type] = (byType[entry.type] || 0) + 1;
      totalConfidence += entry.confidence;
    }

    return {
      total: entries.length,
      byType,
      avgConfidence: entries.length > 0 ? totalConfidence / entries.length : 0
    };
  }
}

// Singleton
let instance: ProjectMemory | null = null;

export function getProjectMemory(): ProjectMemory {
  if (!instance) {
    instance = new ProjectMemory();
  }
  return instance;
}
