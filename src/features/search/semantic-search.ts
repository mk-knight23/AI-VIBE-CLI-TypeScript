/**
 * VIBE-CLI v0.0.2 - Semantic Search
 * Intelligent code search with semantic understanding
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

/**
 * Search result
 */
export interface SearchResult {
  filePath: string;
  lineNumber: number;
  lineContent: string;
  context: string;
  score: number;
  matches: SearchMatch[];
  relevance: 'high' | 'medium' | 'low';
}

/**
 * Individual search match
 */
export interface SearchMatch {
  text: string;
  start: number;
  end: number;
  type: 'exact' | 'fuzzy' | 'semantic';
  matchedTerm: string;
}

/**
 * Search options
 */
export interface SearchOptions {
  query: string;
  filePatterns?: string[];
  ignorePatterns?: string[];
  maxResults?: number;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  fuzzyMatch?: boolean;
  semanticSearch?: boolean;
  useIndex?: boolean;
}

/**
 * Indexed document
 */
export interface IndexedDocument {
  filePath: string;
  content: string;
  tokens: string[];
  symbols: Map<string, number[]>;
  lastModified: Date;
}

/**
 * Semantic Search Engine
 */
export class SemanticSearchEngine {
  private index: Map<string, IndexedDocument>;
  private readonly stopWords: Set<string>;
  private readonly fuzzyThreshold: number;

  constructor() {
    this.index = new Map();
    this.stopWords = this.initializeStopWords();
    this.fuzzyThreshold = 0.6;
  }

  /**
   * Initialize stop words
   */
  private initializeStopWords(): Set<string> {
    return new Set([
      'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
      'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
      'she', 'we', 'they', 'what', 'which', 'who', 'whom', 'where', 'when',
      'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
      'other', 'some', 'such', 'no', 'not', 'only', 'same', 'so', 'than',
      'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then', 'once',
    ]);
  }

  /**
   * Index a file
   */
  indexFile(filePath: string): boolean {
    if (!fs.existsSync(filePath)) return false;

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const tokens = this.tokenize(content);
      const symbols = this.extractSymbols(content);

      this.index.set(filePath, {
        filePath,
        content,
        tokens,
        symbols,
        lastModified: new Date(fs.statSync(filePath).mtime),
      });

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Index a directory
   */
  indexDirectory(dirPath: string, patterns = ['**/*.{ts,js,py,java,go,rb,php}']): number {
    const { glob } = require('fast-glob');
    const files = glob.sync(patterns, {
      cwd: dirPath,
      ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**', '*.min.js'],
    });

    let indexed = 0;
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      if (this.indexFile(filePath)) {
        indexed++;
      }
    }

    return indexed;
  }

  /**
   * Tokenize content
   */
  private tokenize(content: string): string[] {
    // Remove comments and strings for better tokenization
    const cleaned = content
      .replace(/\/\/.*$/gm, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .replace(/#.*$/gm, '') // Remove Python comments
      .replace(/"(?:[^"\\]|\\.)*"/g, 'STR') // Replace strings
      .replace(/(?:'(?:[^'\\]|\\.)*')/g, 'STR') // Replace single-quoted strings
      .replace(/`(?:[^`\\]|\\.)*`/g, 'TPL'); // Replace template literals

    // Split into words
    const words = cleaned
      .toLowerCase()
      .split(/[^a-zA-Z0-9_]+/)
      .filter((word) => word.length > 1 && !this.stopWords.has(word));

    return words;
  }

  /**
   * Extract symbols from content
   */
  private extractSymbols(content: string): Map<string, number[]> {
    const symbols = new Map<string, number[]>();

    // Extract function names
    const funcPatterns = [
      /(?:async\s+)?function\s+(\w+)/g,
      /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\s*(?:function|\([^)]*\)\s*=>)/g,
      /(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?:{|=>)/g,
    ];

    // Extract class names
    const classPattern = /class\s+(\w+)/g;

    // Extract interface/type names
    const typePattern = /(?:interface|type)\s+(\w+)/g;

    // Extract variable names
    const varPattern = /(?:const|let|var)\s+(\w+)/g;

    const patterns = [
      { regex: funcPatterns, type: 'function' },
      { regex: [classPattern], type: 'class' },
      { regex: [typePattern], type: 'type' },
      { regex: [varPattern], type: 'variable' },
    ];

    for (const patternSet of patterns) {
      for (const regex of patternSet.regex) {
        let match;
        const lines = content.split('\n');

        while ((match = regex.exec(content)) !== null) {
          const symbol = match[1];
          const lineNumber = content.substring(0, match.index).split('\n').length;

          if (!symbols.has(symbol)) {
            symbols.set(symbol, []);
          }
          symbols.get(symbol)!.push(lineNumber);
        }
      }
    }

    return symbols;
  }

  /**
   * Search the index
   */
  search(options: SearchOptions): SearchResult[] {
    const startTime = Date.now();
    const results: SearchResult[] = [];

    const {
      query,
      maxResults = 50,
      fuzzyMatch = false,
      semanticSearch = true,
      useIndex = true,
    } = options;

    const queryTokens = this.tokenize(' ' + query + ' ');
    const querySymbols = this.extractSymbols(query);

    // Search indexed documents
    if (useIndex && this.index.size > 0) {
      for (const doc of this.index.values()) {
        const docResults = this.searchDocument(doc, query, queryTokens, querySymbols, {
          fuzzyMatch,
          semanticSearch,
          maxResults,
        });
        results.push(...docResults);
      }
    } else {
      // Fallback to file-based search
      return this.searchFiles(query, options);
    }

    // Sort and limit results
    results.sort((a, b) => b.score - a.score);
    const limitedResults = results.slice(0, maxResults);

    // Calculate relevance
    for (const result of limitedResults) {
      result.relevance = this.calculateRelevance(result);
    }

    return limitedResults;
  }

  /**
   * Search a single document
   */
  private searchDocument(
    doc: IndexedDocument,
    query: string,
    queryTokens: string[],
    querySymbols: Map<string, number[]>,
    options: { fuzzyMatch: boolean; semanticSearch: boolean; maxResults: number }
  ): SearchResult[] {
    const results: SearchResult[] = [];
    const lines = doc.content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineLower = line.toLowerCase();
      const queryLower = query.toLowerCase();

      // Check for exact match
      if (lineLower.includes(queryLower)) {
        const match = this.findMatch(line, query, 'exact');
        const score = this.calculateMatchScore(match, query, doc.tokens, true);

        if (score > 0) {
          results.push({
            filePath: doc.filePath,
            lineNumber: i + 1,
            lineContent: line.trim(),
            context: this.getContext(lines, i),
            score,
            matches: [match],
            relevance: 'high',
          });
          continue;
        }
      }

      // Check for symbol match
      for (const [symbol, lineNumbers] of doc.symbols) {
        if (lineNumbers.includes(i + 1) && symbol.toLowerCase().includes(queryLower)) {
          results.push({
            filePath: doc.filePath,
            lineNumber: i + 1,
            lineContent: line.trim(),
            context: this.getContext(lines, i),
            score: 0.9,
            matches: [{
              text: symbol,
              start: line.toLowerCase().indexOf(symbol.toLowerCase()),
              end: line.toLowerCase().indexOf(symbol.toLowerCase()) + symbol.length,
              type: 'exact',
              matchedTerm: query,
            }],
            relevance: 'high',
          });
        }
      }

      // Fuzzy search if enabled
      if (options.fuzzyMatch) {
        const fuzzyMatches = this.findFuzzyMatches(line, query);
        for (const match of fuzzyMatches) {
          const score = this.calculateMatchScore(match, query, doc.tokens, false);
          if (score > 0.3) {
            results.push({
              filePath: doc.filePath,
              lineNumber: i + 1,
              lineContent: line.trim(),
              context: this.getContext(lines, i),
              score,
              matches: [match],
              relevance: 'medium',
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Search files without index (fallback)
   */
  private searchFiles(query: string, options: SearchOptions): SearchResult[] {
    const results: SearchResult[] = [];
    const { filePatterns = ['**/*.{ts,js,py}'], ignorePatterns = ['node_modules/**', '.git/**'] } = options;

    const { glob } = require('fast-glob');
    const files = glob.sync(filePatterns, { ignore: ignorePatterns });

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        const queryLower = query.toLowerCase();

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(queryLower)) {
            const match = this.findMatch(lines[i], query, 'exact');
            results.push({
              filePath: file,
              lineNumber: i + 1,
              lineContent: lines[i].trim(),
              context: this.getContext(lines, i),
              score: 0.8,
              matches: [match],
              relevance: 'high',
            });
          }
        }
      } catch {
        // Skip unreadable files
      }
    }

    return results;
  }

  /**
   * Find match in line
   */
  private findMatch(line: string, query: string, type: 'exact' | 'fuzzy' | 'semantic'): SearchMatch {
    const index = line.toLowerCase().indexOf(query.toLowerCase());
    return {
      text: line.substring(index, index + query.length),
      start: index,
      end: index + query.length,
      type,
      matchedTerm: query,
    };
  }

  /**
   * Find fuzzy matches
   */
  private findFuzzyMatches(line: string, query: string): SearchMatch[] {
    const matches: SearchMatch[] = [];
    const queryLower = query.toLowerCase();
    const words = line.toLowerCase().split(/[^a-zA-Z0-9_]+/);

    let position = 0;
    for (const word of words) {
      const wordStart = line.toLowerCase().indexOf(word, position);
      if (wordStart !== -1) {
        const similarity = this.calculateSimilarity(word, queryLower);
        if (similarity >= this.fuzzyThreshold && similarity < 1) {
          matches.push({
            text: line.substring(wordStart, wordStart + word.length),
            start: wordStart,
            end: wordStart + word.length,
            type: 'fuzzy',
            matchedTerm: query,
          });
        }
        position = wordStart + word.length;
      }
    }

    return matches;
  }

  /**
   * Calculate match score
   */
  private calculateMatchScore(
    match: SearchMatch,
    query: string,
    docTokens: string[],
    isExact: boolean
  ): number {
    let score = 0;

    // Base score
    if (match.type === 'exact') {
      score = 1.0;
    } else if (match.type === 'fuzzy') {
      score = 0.6;
    } else {
      score = 0.3;
    }

    // Query token presence
    const queryTokens = this.tokenize(' ' + query + ' ');
    const tokenOverlap = queryTokens.filter((t) => docTokens.includes(t)).length;
    score += (tokenOverlap / queryTokens.length) * 0.2;

    // Boost for symbol match
    if (match.text === query) {
      score += 0.1;
    }

    return Math.min(1.0, score);
  }

  /**
   * Calculate string similarity
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Levenshtein distance (P3-065)
   * Space-optimized version using two rows only: O(min(n,m)) space
   */
  private levenshteinDistance(str1: string, str2: string): number {
    if (str1.length < str2.length) {
      [str1, str2] = [str2, str1];
    }

    const n = str1.length;
    const m = str2.length;
    let prevRow = Array.from({ length: m + 1 }, (_, i) => i);
    let currentRow = new Array(m + 1);

    for (let i = 1; i <= n; i++) {
      currentRow[0] = i;
      for (let j = 1; j <= m; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        currentRow[j] = Math.min(
          currentRow[j - 1] + 1,
          prevRow[j] + 1,
          prevRow[j - 1] + cost
        );
      }
      [prevRow, currentRow] = [currentRow, prevRow];
    }

    return prevRow[m];
  }

  /**
   * Calculate relevance level
   */
  private calculateRelevance(result: SearchResult): 'high' | 'medium' | 'low' {
    if (result.score >= 0.8) return 'high';
    if (result.score >= 0.5) return 'medium';
    return 'low';
  }

  /**
   * Get context around a line
   */
  private getContext(lines: string[], lineIndex: number): string {
    const contextLines = 2;
    const start = Math.max(0, lineIndex - contextLines);
    const end = Math.min(lines.length, lineIndex + contextLines + 1);

    return lines.slice(start, end).join('\n');
  }

  /**
   * Find similar code
   */
  findSimilar(filePath: string, maxResults = 10): SearchResult[] {
    const doc = this.index.get(filePath);
    if (!doc) return [];

    const results: SearchResult[] = [];

    for (const [otherPath, otherDoc] of this.index.entries()) {
      if (otherPath === filePath) continue;

      // Calculate token overlap
      const tokens1 = new Set(doc.tokens);
      const tokens2 = new Set(otherDoc.tokens);
      const intersection = [...tokens1].filter((t) => tokens2.has(t));
      const union = new Set([...tokens1, ...tokens2]);
      const similarity = intersection.length / union.size;

      if (similarity > 0.3) {
        // Find matching lines
        const lines = otherDoc.content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const lineTokens = this.tokenize(lines[i]);
          const lineOverlap = lineTokens.filter((t) => tokens1.has(t)).length;
          if (lineOverlap > 0) {
            results.push({
              filePath: otherPath,
              lineNumber: i + 1,
              lineContent: lines[i].trim(),
              context: this.getContext(lines, i),
              score: similarity * lineOverlap / lineTokens.length,
              matches: [],
              relevance: similarity > 0.5 ? 'high' : 'medium',
            });
          }
        }
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, maxResults);
  }

  /**
   * Format search results
   */
  formatResults(results: SearchResult[], query: string): string {
    const lines: string[] = [];

    lines.push(chalk.bold('\n🔍 Search Results'));
    lines.push(chalk.gray(`Query: "${query}" | Found ${results.length} results`));
    lines.push('');

    // Group by file
    const byFile = new Map<string, SearchResult[]>();
    for (const result of results) {
      if (!byFile.has(result.filePath)) {
        byFile.set(result.filePath, []);
      }
      byFile.get(result.filePath)!.push(result);
    }

    for (const [filePath, fileResults] of byFile) {
      lines.push(chalk.bold(path.basename(filePath)));
      lines.push(chalk.gray(filePath));
      lines.push('');

      for (const result of fileResults) {
        const relevanceIcon = result.relevance === 'high' ? '🟢' : result.relevance === 'medium' ? '🟡' : '🔴';
        lines.push(`${relevanceIcon} Line ${result.lineNumber}: ${result.lineContent.substring(0, 100)}`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Clear the index
   */
  clearIndex(): void {
    this.index.clear();
  }

  /**
   * Get index stats
   */
  getIndexStats(): { documentCount: number; totalTokens: number } {
    let totalTokens = 0;
    for (const doc of this.index.values()) {
      totalTokens += doc.tokens.length;
    }
    return {
      documentCount: this.index.size,
      totalTokens,
    };
  }
}

/**
 * Singleton instance
 */
export const semanticSearchEngine = new SemanticSearchEngine();
