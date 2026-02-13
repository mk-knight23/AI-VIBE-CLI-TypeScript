/**
 * VIBE-CLI v0.0.2 - Semantic Indexer
 * Build semantic index for intelligent code retrieval
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Regex patterns - defined once at module level to avoid recompilation
 */
const REGEX_PATTERNS = {
  SINGLE_LINE_COMMENT: /\/\/.*$/gm,
  BLOCK_COMMENT: /\/\*[\s\S]*?\*\//g,
  STRINGS: /['"`][^'"`]*['"`]/g,
  WHITESPACE: /\s+/g,
  WORD_SPLIT: /[^a-zA-Z0-9_]+/g,
} as const;

/**
 * Stop words - defined once at module level to avoid recreation
 */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
  'this', 'that', 'these', 'those', 'it', 'its', 'if', 'then', 'else',
  'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few',
  'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
  'own', 'same', 'so', 'than', 'too', 'very', 'just', 'also',
]);

/**
 * Indexed item
 */
export interface IndexedItem {
  id: string;
  type: 'file' | 'function' | 'class' | 'interface' | 'variable' | 'comment';
  filePath: string;
  name: string;
  content: string;
  tokens: string[];
  embedding?: number[];
  lineStart: number;
  lineEnd: number;
  metadata: Record<string, unknown>;
}

/**
 * Search result
 */
export interface SearchResult {
  item: IndexedItem;
  score: number;
  highlights: string[];
}

/**
 * Semantic index configuration
 */
export interface SemanticIndexConfig {
  chunkSize: number;
  chunkOverlap: number;
  minTokenLength: number;
  maxTokenLength: number;
}

/**
 * Semantic Indexer
 */
export class SemanticIndexer {
  private index: Map<string, IndexedItem> = new Map();
  private invertedIndex: Map<string, Set<string>> = new Map();
  private fileContentCache: Map<string, string> = new Map();
  private indexAccessOrder: string[] = [];
  private readonly maxIndexSize = 5000;
  private readonly maxCacheSize = 100;
  private config: SemanticIndexConfig;

  constructor(config?: Partial<SemanticIndexConfig>) {
    this.config = {
      chunkSize: 1000,
      chunkOverlap: 100,
      minTokenLength: 2,
      maxTokenLength: 50,
      ...config,
    };
  }

  /**
   * Index a file
   */
  indexFile(filePath: string): IndexedItem[] {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return [];
    }

    // Read file content
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      return [];
    }

    // Cache content
    this.fileContentCache.set(filePath, content);
    if (this.fileContentCache.size > this.maxCacheSize) {
      const firstKey = this.fileContentCache.keys().next().value;
      if (firstKey) this.fileContentCache.delete(firstKey);
    }

    const items: IndexedItem[] = [];
    const ext = path.extname(filePath).toLowerCase();

    // Extract tokens from content
    const tokens = this.tokenize(content);

    // Create file-level index item
    const fileItem: IndexedItem = {
      id: this.generateId(filePath),
      type: 'file',
      filePath,
      name: path.basename(filePath),
      content,
      tokens,
      lineStart: 1,
      lineEnd: content.split('\n').length,
      metadata: {
        extension: ext,
        size: content.length,
        lastModified: fs.statSync(filePath).mtime.getTime(),
      },
    };

    this.addToIndex(fileItem);
    items.push(fileItem);

    // Extract and index functions/classes
    const definitions = this.extractDefinitions(content, filePath);
    for (const def of definitions) {
      const defTokens = this.tokenize(def.content);
      const item: IndexedItem = {
        id: this.generateId(`${filePath}:${def.name}`),
        type: def.type,
        filePath,
        name: def.name,
        content: def.content,
        tokens: defTokens,
        lineStart: def.startLine,
        lineEnd: def.endLine,
        metadata: {
          signature: def.signature,
          parameters: def.parameters,
          returnType: def.returnType,
        },
      };

      this.addToIndex(item);
      items.push(item);
    }

    // Index comments
    const comments = this.extractComments(content);
    for (const comment of comments) {
      const commentTokens = this.tokenize(comment.content);
      const item: IndexedItem = {
        id: this.generateId(`${filePath}:comment:${comment.line}`),
        type: 'comment',
        filePath,
        name: `comment-${comment.line}`,
        content: comment.content,
        tokens: commentTokens,
        lineStart: comment.line,
        lineEnd: comment.line,
        metadata: {
          isBlockComment: comment.isBlock,
        },
      };

      this.addToIndex(item);
      items.push(item);
    }

    return items;
  }

  /**
   * Index a directory
   */
  indexDirectory(dirPath: string, patterns: string[] = ['**/*.ts', '**/*.js', '**/*.py', '**/*.md']): number {
    const { glob } = require('fast-glob');
    const files = glob.sync(patterns, {
      cwd: dirPath,
      absolute: true,
      ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**', '*.min.js'],
    });

    let count = 0;
    for (const file of files) {
      count += this.indexFile(file).length;
    }

    return count;
  }

  /**
   * Search the index
   */
  search(query: string, options: { limit?: number; type?: string; filePath?: string } = {}): SearchResult[] {
    const { limit = 10, type, filePath } = options;

    // Tokenize query
    const queryTokens = this.tokenize(query.toLowerCase());

    // Score all items
    const results: SearchResult[] = [];

    for (const [id, item] of this.index) {
      // Filter by type
      if (type && item.type !== type) continue;

      // Filter by file path
      if (filePath && !item.filePath.includes(filePath)) continue;

      // Calculate similarity score
      const score = this.calculateSimilarity(queryTokens, item.tokens);

      if (score > 0) {
        // Find highlights
        const highlights = this.findHighlights(item.content, queryTokens);

        results.push({
          item,
          score,
          highlights,
        });
      }
    }

    // Sort by score descending and limit
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Find similar code
   */
  findSimilar(filePath: string, lineStart: number, lineEnd: number, limit: number = 5): SearchResult[] {
    // Get the content to find similar for
    const items = this.findByFile(filePath);
    const targetItem = items.find(
      (item) => item.lineStart <= lineStart && item.lineEnd >= lineEnd
    );

    if (!targetItem) {
      return [];
    }

    // Search for similar content
    return this.search(targetItem.content, { limit });
  }

  /**
   * Find items by file path
   */
  findByFile(filePath: string): IndexedItem[] {
    const results: IndexedItem[] = [];

    for (const item of this.index.values()) {
      if (item.filePath === filePath) {
        results.push(item);
      }
    }

    return results;
  }

  /**
   * Find items by type
   */
  findByType(type: IndexedItem['type']): IndexedItem[] {
    const results: IndexedItem[] = [];

    for (const item of this.index.values()) {
      if (item.type === type) {
        results.push(item);
      }
    }

    return results;
  }

  /**
   * Add item to index
   */
  private addToIndex(item: IndexedItem): void {
    if (this.index.has(item.id)) {
      const idx = this.indexAccessOrder.indexOf(item.id);
      if (idx > -1) this.indexAccessOrder.splice(idx, 1);
    }

    this.index.set(item.id, item);
    this.indexAccessOrder.push(item.id);

    // Enforce limits
    if (this.index.size > this.maxIndexSize) {
      const lruId = this.indexAccessOrder.shift();
      if (lruId) {
        const removedItem = this.index.get(lruId);
        if (removedItem) {
          // Remove from inverted index
          for (const token of removedItem.tokens) {
            const set = this.invertedIndex.get(token);
            if (set) {
              set.delete(lruId);
              if (set.size === 0) this.invertedIndex.delete(token);
            }
          }
        }
        this.index.delete(lruId);
      }
    }

    // Build inverted index
    for (const token of item.tokens) {
      if (!this.invertedIndex.has(token)) {
        this.invertedIndex.set(token, new Set());
      }
      this.invertedIndex.get(token)!.add(item.id);
    }
  }

  /**
   * Tokenize content
   */
  private tokenize(content: string): string[] {
    // Remove comments and strings
    const cleaned = content
      .replace(REGEX_PATTERNS.SINGLE_LINE_COMMENT, '') // Remove single-line comments
      .replace(REGEX_PATTERNS.BLOCK_COMMENT, '') // Remove block comments
      .replace(REGEX_PATTERNS.STRINGS, '') // Remove strings
      .replace(REGEX_PATTERNS.WHITESPACE, ' '); // Normalize whitespace

    // Split into words
    const words = cleaned.toLowerCase().split(REGEX_PATTERNS.WORD_SPLIT);

    // Filter and return unique tokens
    return [...new Set(
      words.filter(
        (word) =>
          word.length >= this.config.minTokenLength &&
          word.length <= this.config.maxTokenLength &&
          !this.isStopWord(word)
      )
    )];
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    return STOP_WORDS.has(word);
  }

  /**
   * Calculate similarity score between query and item
   */
  private calculateSimilarity(queryTokens: string[], itemTokens: string[]): number {
    if (queryTokens.length === 0 || itemTokens.length === 0) return 0;

    const querySet = new Set(queryTokens);
    const itemSet = new Set(itemTokens);

    // Jaccard similarity
    const intersection = [...querySet].filter((t) => itemSet.has(t)).length;
    const union = new Set([...querySet, ...itemSet]).size;

    // Boost exact matches
    const exactMatches = [...querySet].filter((t) => itemSet.has(t)).length;

    return intersection / union + exactMatches * 0.5;
  }

  /**
   * Find text highlights for query terms
   */
  private findHighlights(content: string, queryTokens: string[]): string[] {
    const highlights: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      for (const token of queryTokens) {
        if (lowerLine.includes(token)) {
          const trimmed = line.trim();
          if (trimmed.length > 0 && !highlights.includes(trimmed)) {
            highlights.push(trimmed);
            if (highlights.length >= 5) return highlights;
          }
        }
      }
    }

    return highlights;
  }

  /**
   * Extract definitions from code
   */
  private extractDefinitions(
    content: string,
    filePath: string
  ): Array<{
    type: 'function' | 'class' | 'interface' | 'variable';
    name: string;
    content: string;
    startLine: number;
    endLine: number;
    signature?: string;
    parameters?: string[];
    returnType?: string;
  }> {
    const definitions: Array<{
      type: 'function' | 'class' | 'interface' | 'variable';
      name: string;
      content: string;
      startLine: number;
      endLine: number;
      signature?: string;
      parameters?: string[];
      returnType?: string;
    }> = [];

    const lines = content.split('\n');

    // Match functions
    const funcRegex = /(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g;
    let match;

    while ((match = funcRegex.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length - 1;
      const blockEnd = this.findBlockEnd(lines, startLine);
      const funcContent = lines.slice(startLine, blockEnd + 1).join('\n');

      definitions.push({
        type: 'function',
        name: match[1],
        content: funcContent,
        startLine,
        endLine: blockEnd,
        signature: match[0],
        parameters: match[2].split(',').filter(Boolean),
      });
    }

    // Match arrow functions assigned to variables
    const arrowRegex = /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[^=]+)=>/g;
    while ((match = arrowRegex.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length - 1;
      definitions.push({
        type: 'function',
        name: match[1],
        content: lines[startLine],
        startLine,
        endLine: startLine,
      });
    }

    // Match classes
    const classRegex = /class\s+(\w+)(?:\s+extends\s+\w+)?(?:\s+implements\s+[^{]+)?\s*{/g;
    while ((match = classRegex.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length - 1;
      const blockEnd = this.findBlockEnd(lines, startLine);

      definitions.push({
        type: 'class',
        name: match[1],
        content: lines.slice(startLine, blockEnd + 1).join('\n'),
        startLine,
        endLine: blockEnd,
      });
    }

    // Match interfaces
    const interfaceRegex = /interface\s+(\w+)\s*(?:extends\s+[^=]+)?\s*{/g;
    while ((match = interfaceRegex.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length - 1;
      const blockEnd = this.findBlockEnd(lines, startLine);

      definitions.push({
        type: 'interface',
        name: match[1],
        content: lines.slice(startLine, blockEnd + 1).join('\n'),
        startLine,
        endLine: blockEnd,
      });
    }

    return definitions;
  }

  /**
   * Extract comments from code
   */
  private extractComments(content: string): Array<{ content: string; line: number; isBlock: boolean }> {
    const comments: Array<{ content: string; line: number; isBlock: boolean }> = [];
    const lines = content.split('\n');

    // Block comments
    const blockRegex = /\/\*[\s\S]*?\*\//g;
    let match;

    while ((match = blockRegex.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length - 1;
      comments.push({
        content: match[0],
        line: startLine,
        isBlock: true,
      });
    }

    // Line comments
    const lineRegex = /\/\/.*$/gm;
    while ((match = lineRegex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length - 1;
      comments.push({
        content: match[0],
        line,
        isBlock: false,
      });
    }

    return comments;
  }

  /**
   * Find end of a block
   */
  private findBlockEnd(lines: string[], startLine: number): number {
    let braceCount = 0;
    let foundStart = false;

    for (let i = startLine; i < lines.length; i++) {
      for (const char of lines[i]) {
        if (char === '{') {
          braceCount++;
          foundStart = true;
        } else if (char === '}') {
          braceCount--;
          if (foundStart && braceCount === 0) {
            return i;
          }
        }
      }
    }

    return startLine;
  }

  /**
   * Generate unique ID
   */
  private generateId(key: string): string {
    return crypto.createHash('md5').update(key).digest('hex').substring(0, 16);
  }

  /**
   * Save index to disk
   */
  saveIndex(filePath: string): void {
    const data = {
      index: Array.from(this.index.entries()),
      config: this.config,
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Load index from disk
   */
  loadIndex(filePath: string): boolean {
    if (!fs.existsSync(filePath)) return false;

    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      this.index = new Map(data.index);
      this.config = { ...this.config, ...data.config };

      // Rebuild inverted index
      this.invertedIndex.clear();
      for (const item of this.index.values()) {
        for (const token of item.tokens) {
          if (!this.invertedIndex.has(token)) {
            this.invertedIndex.set(token, new Set());
          }
          this.invertedIndex.get(token)!.add(item.id);
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear index
   */
  clear(): void {
    this.index.clear();
    this.invertedIndex.clear();
    this.fileContentCache.clear();
  }

  /**
   * Get index statistics
   */
  getStats(): { itemCount: number; tokenCount: number; filesIndexed: number } {
    const files = new Set<string>();
    let tokenCount = 0;

    for (const item of this.index.values()) {
      files.add(item.filePath);
      tokenCount += item.tokens.length;
    }

    return {
      itemCount: this.index.size,
      tokenCount,
      filesIndexed: files.size,
    };
  }
}

/**
 * Singleton instance
 */
export const semanticIndexer = new SemanticIndexer();
