/**
 * VIBE-CLI v0.0.2 - Completion Engine
 * Real-time intelligent code completion suggestions
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

/**
 * Completion type
 */
export type CompletionType =
  | 'function'
  | 'method'
  | 'property'
  | 'variable'
  | 'constant'
  | 'class'
  | 'interface'
  | 'type'
  | 'module'
  | 'file'
  | 'keyword'
  | 'snippet';

/**
 * Completion item
 */
export interface CompletionItem {
  id: string;
  type: CompletionType;
  text: string;
  displayText: string;
  description: string;
  detail?: string;
  kind: string;
  score: number;
  source: 'codebase' | 'language' | 'common' | 'ai';
  prefixMatch: boolean;
  documentation?: string;
  example?: string;
  params?: string[];
  returnType?: string;
}

/**
 * Completion context
 */
export interface CompletionContext {
  filePath: string;
  language: string;
  cursorLine: number;
  cursorColumn: number;
  prefix: string;
  suffix: string;
  currentLine: string;
  surroundingCode: string;
  importedModules: string[];
  definedSymbols: string[];
}

/**
 * Snippet template
 */
export interface SnippetTemplate {
  id: string;
  name: string;
  description: string;
  trigger: string;
  body: string[];
  params: string[];
}

/**
 * Completion result
 */
export interface CompletionResult {
  suggestions: CompletionItem[];
  context: CompletionContext;
  isIncomplete: boolean;
  duration: number;
}

/**
 * Completion Engine
 */
export class CompletionEngine {
  private readonly snippets: SnippetTemplate[];
  private readonly keywords: Map<string, string[]>;
  private readonly commonPatterns: Map<string, CompletionItem[]>;
  private indexedSymbols: Map<string, Set<string>>;

  constructor() {
    this.snippets = this.initializeSnippets();
    this.keywords = this.initializeKeywords();
    this.commonPatterns = this.initializeCommonPatterns();
    this.indexedSymbols = new Map();
  }

  /**
   * Initialize snippet templates
   */
  private initializeSnippets(): SnippetTemplate[] {
    return [
      {
        id: 'console-log',
        name: 'console.log',
        description: 'Log to console',
        trigger: 'log',
        body: ['console.log($1);'],
        params: ['message'],
      },
      {
        id: 'console-error',
        name: 'console.error',
        description: 'Log error to console',
        trigger: 'err',
        body: ['console.error($1);'],
        params: ['message'],
      },
      {
        id: 'try-catch',
        name: 'try-catch',
        description: 'Try-catch block',
        trigger: 'try',
        body: ['try {', '\t$1', '} catch (error) {', '\tconsole.error(error);', '}'],
        params: ['code'],
      },
      {
        id: 'async-await',
        name: 'async function',
        description: 'Async function declaration',
        trigger: 'async',
        body: ['async function ${1:functionName}($2) {', '\t$3', '}'],
        params: ['functionName', 'params', 'body'],
      },
      {
        id: 'arrow-function',
        name: 'Arrow function',
        description: 'Arrow function expression',
        trigger: 'arrow',
        body: ['($1) => {', '\t$2', '}'],
        params: ['params', 'body'],
      },
      {
        id: 'if-statement',
        name: 'if statement',
        description: 'If statement',
        trigger: 'if',
        body: ['if ($1) {', '\t$2', '}'],
        params: ['condition', 'body'],
      },
      {
        id: 'for-loop',
        name: 'for loop',
        description: 'For loop',
        trigger: 'for',
        body: ['for (let i = 0; i < $1; i++) {', '\t$2', '}'],
        params: ['count', 'body'],
      },
      {
        id: 'foreach-loop',
        name: 'forEach loop',
        description: 'Array forEach',
        trigger: 'foreach',
        body: ['$1.forEach(($2) => {', '\t$3', '});'],
        params: ['array', 'item', 'body'],
      },
      {
        id: 'map-function',
        name: 'map function',
        description: 'Array map',
        trigger: 'map',
        body: ['$1.map(($2) => $3);'],
        params: ['array', 'item', 'transform'],
      },
      {
        id: 'filter-function',
        name: 'filter function',
        description: 'Array filter',
        trigger: 'filter',
        body: ['$1.filter(($2) => $2);'],
        params: ['array', 'predicate'],
      },
      {
        id: 'class-template',
        name: 'class',
        description: 'Class template',
        trigger: 'class',
        body: ['class ${1:ClassName} {', '\tconstructor($2) {', '\t\t$3', '\t}', '', '\t$4', '}'],
        params: ['className', 'params', 'body', 'methods'],
      },
      {
        id: 'interface-template',
        name: 'interface',
        description: 'TypeScript interface',
        trigger: 'interface',
        body: ['interface ${1:InterfaceName} {', '\t$2', '}'],
        params: ['name', 'properties'],
      },
      {
        id: 'export-default',
        name: 'export default',
        description: 'Export default',
        trigger: 'export',
        body: ['export default $1;'],
        params: ['exported'],
      },
      {
        id: 'react-component',
        name: 'React component',
        description: 'React functional component',
        trigger: 'rfc',
        body: [
          'import React from \'react\';',
          '',
          'interface ${1:ComponentName}Props {',
          '\t$2',
          '}',
          '',
          'export const ${1:ComponentName}: React.FC<${1:ComponentName}Props> = ({ $3 }) => {',
          '\treturn (',
          '\t\t<div>',
          '\t\t\t$4',
          '\t\t</div>',
          '\t);',
          '};',
        ],
        params: ['name', 'props', 'destructured', 'content'],
      },
      {
        id: 'test-describe',
        name: 'describe block',
        description: 'Jest test describe block',
        trigger: 'describe',
        body: ['describe(\'$1\', () => {', '\tit(\'$2\', () => {', '\t\t$3', '\t});', '});'],
        params: ['suite', 'test', 'body'],
      },
      {
        id: 'test-it',
        name: 'it block',
        description: 'Jest it block',
        trigger: 'it',
        body: ['it(\'$1\', async () => {', '\t$2', '});'],
        params: ['testName', 'body'],
      },
    ];
  }

  /**
   * Initialize language keywords
   */
  private initializeKeywords(): Map<string, string[]> {
    return new Map([
      ['typescript', [
        'abstract', 'any', 'as', 'async', 'await', 'boolean', 'break', 'case', 'catch',
        'class', 'const', 'continue', 'debugger', 'declare', 'default', 'delete', 'do',
        'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'from', 'function',
        'get', 'if', 'implements', 'import', 'in', 'instanceof', 'interface', 'is', 'keyof',
        'let', 'module', 'namespace', 'never', 'new', 'null', 'number', 'of', 'package',
        'private', 'protected', 'public', 'readonly', 'require', 'return', 'set', 'static',
        'string', 'super', 'switch', 'symbol', 'this', 'throw', 'true', 'try', 'type',
        'typeof', 'unique', 'unknown', 'var', 'void', 'while', 'with', 'yield',
      ]],
      ['javascript', [
        'abstract', 'arguments', 'async', 'await', 'boolean', 'break', 'case', 'catch',
        'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else',
        'enum', 'eval', 'export', 'extends', 'false', 'finally', 'for', 'function',
        'if', 'implements', 'import', 'in', 'instanceof', 'interface', 'let', 'module',
        'new', 'null', 'package', 'private', 'protected', 'public', 'return', 'static',
        'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void',
        'while', 'with', 'yield',
      ]],
      ['python', [
        'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def',
        'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if',
        'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise',
        'return', 'try', 'while', 'with', 'yield', 'True', 'False', 'None',
      ]],
    ]);
  }

  /**
   * Initialize common patterns
   */
  private initializeCommonPatterns(): Map<string, CompletionItem[]> {
    return new Map([
      ['typescript', [
        { id: 'ts-string', type: 'keyword', text: 'string', displayText: 'string', description: 'String type', kind: 'type', score: 0.9, source: 'language', prefixMatch: true },
        { id: 'ts-number', type: 'keyword', text: 'number', displayText: 'number', description: 'Number type', kind: 'type', score: 0.9, source: 'language', prefixMatch: true },
        { id: 'ts-boolean', type: 'keyword', text: 'boolean', displayText: 'boolean', description: 'Boolean type', kind: 'type', score: 0.9, source: 'language', prefixMatch: true },
        { id: 'ts-any', type: 'keyword', text: 'any', displayText: 'any', description: 'Any type', kind: 'type', score: 0.8, source: 'language', prefixMatch: true },
        { id: 'ts-void', type: 'keyword', text: 'void', displayText: 'void', description: 'Void type', kind: 'type', score: 0.8, source: 'language', prefixMatch: true },
        { id: 'ts-never', type: 'keyword', text: 'never', displayText: 'never', description: 'Never type', kind: 'type', score: 0.7, source: 'language', prefixMatch: true },
        { id: 'ts-unknown', type: 'keyword', text: 'unknown', displayText: 'unknown', description: 'Unknown type', kind: 'type', score: 0.7, source: 'language', prefixMatch: true },
      ]],
      ['javascript', [
        { id: 'js-require', type: 'module', text: 'require', displayText: 'require', description: 'CommonJS require', kind: 'function', score: 0.9, source: 'common', prefixMatch: true },
        { id: 'js-module-exports', type: 'module', text: 'module.exports', displayText: 'module.exports', description: 'Module exports', kind: 'property', score: 0.9, source: 'common', prefixMatch: true },
        { id: 'js-exports', type: 'module', text: 'exports', displayText: 'exports', description: 'Exports shorthand', kind: 'property', score: 0.8, source: 'common', prefixMatch: true },
      ]],
    ]);
  }

  /**
   * Get completions for a context
   */
  getCompletions(context: CompletionContext): CompletionResult {
    const startTime = Date.now();
    const suggestions: CompletionItem[] = [];

    // Get language-specific keywords
    const langKeywords = this.keywords.get(context.language.toLowerCase()) || [];
    const langPatterns = this.commonPatterns.get(context.language.toLowerCase()) || [];

    // Add keyword completions
    for (const keyword of langKeywords) {
      if (keyword.startsWith(context.prefix.toLowerCase())) {
        suggestions.push(this.createKeywordCompletion(keyword, context.language));
      }
    }

    // Add common pattern completions
    for (const pattern of langPatterns) {
      if (pattern.text.startsWith(context.prefix)) {
        suggestions.push(pattern);
      }
    }

    // Add snippet completions
    for (const snippet of this.snippets) {
      if (snippet.trigger.startsWith(context.prefix)) {
        suggestions.push(this.createSnippetCompletion(snippet));
      }
    }

    // Add indexed symbol completions
    for (const [file, symbols] of this.indexedSymbols.entries()) {
      for (const symbol of symbols) {
        if (symbol.startsWith(context.prefix)) {
          suggestions.push(this.createSymbolCompletion(symbol, 'codebase', file));
        }
      }
    }

    // Add common built-in completions
    suggestions.push(...this.getBuiltInCompletions(context));

    // Sort by score
    suggestions.sort((a, b) => b.score - a.score);

    // Limit suggestions
    const maxSuggestions = 20;
    const limitedSuggestions = suggestions.slice(0, maxSuggestions);

    const duration = Date.now() - startTime;

    return {
      suggestions: limitedSuggestions,
      context,
      isIncomplete: suggestions.length > maxSuggestions,
      duration,
    };
  }

  /**
   * Create keyword completion
   */
  private createKeywordCompletion(keyword: string, language: string): CompletionItem {
    return {
      id: `keyword-${keyword}`,
      type: 'keyword',
      text: keyword,
      displayText: keyword,
      description: `${language} keyword`,
      kind: 'keyword',
      score: this.calculateScore(keyword, keyword),
      source: 'language',
      prefixMatch: true,
    };
  }

  /**
   * Create snippet completion
   */
  private createSnippetCompletion(snippet: SnippetTemplate): CompletionItem {
    return {
      id: `snippet-${snippet.id}`,
      type: 'snippet',
      text: snippet.body.join('\n'),
      displayText: snippet.name,
      description: snippet.description,
      detail: snippet.body.join('\n'),
      kind: 'snippet',
      score: snippet.trigger.length / snippet.name.length,
      source: 'common',
      prefixMatch: true,
    };
  }

  /**
   * Create symbol completion
   */
  private createSymbolCompletion(symbol: string, source: 'codebase' | 'ai', filePath?: string): CompletionItem {
    return {
      id: `symbol-${symbol}-${Date.now()}`,
      type: 'variable',
      text: symbol,
      displayText: symbol,
      description: source === 'codebase' ? `Defined in ${path.basename(filePath || '')}` : 'AI suggestion',
      kind: 'variable',
      score: 0.5 + Math.random() * 0.3,
      source,
      prefixMatch: true,
    };
  }

  /**
   * Get built-in completions
   */
  private getBuiltInCompletions(context: CompletionContext): CompletionItem[] {
    const completions: CompletionItem[] = [];

    // Common JavaScript/TypeScript globals
    const globals = [
      { text: 'console', description: 'Console object', kind: 'object' },
      { text: 'document', description: 'Document object', kind: 'object' },
      { text: 'window', description: 'Window object', kind: 'object' },
      { text: 'global', description: 'Global object', kind: 'object' },
      { text: 'process', description: 'Process object', kind: 'object' },
      { text: 'Buffer', description: 'Node.js Buffer', kind: 'class' },
      { text: 'setTimeout', description: 'Set timeout function', kind: 'function' },
      { text: 'setInterval', description: 'Set interval function', kind: 'function' },
      { text: 'Promise', description: 'Promise class', kind: 'class' },
      { text: 'JSON', description: 'JSON object', kind: 'object' },
      { text: 'Math', description: 'Math object', kind: 'object' },
      { text: 'Array', description: 'Array class', kind: 'class' },
      { text: 'Object', description: 'Object class', kind: 'class' },
      { text: 'String', description: 'String class', kind: 'class' },
      { text: 'Number', description: 'Number class', kind: 'class' },
      { text: 'Boolean', description: 'Boolean class', kind: 'class' },
      { text: 'Error', description: 'Error class', kind: 'class' },
      { text: 'Map', description: 'Map class', kind: 'class' },
      { text: 'Set', description: 'Set class', kind: 'class' },
      { text: 'WeakMap', description: 'WeakMap class', kind: 'class' },
      { text: 'WeakSet', description: 'WeakSet class', kind: 'class' },
    ];

    for (const global of globals) {
      if (global.text.startsWith(context.prefix)) {
        completions.push({
          id: `global-${global.text}`,
          type: 'variable',
          text: global.text,
          displayText: global.text,
          description: global.description,
          kind: global.kind,
          score: 0.6,
          source: 'common',
          prefixMatch: true,
        });
      }
    }

    return completions;
  }

  /**
   * Index symbols from a file
   */
  indexFile(filePath: string): void {
    if (!fs.existsSync(filePath)) return;

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const symbols = new Set<string>();

      // Extract variable declarations
      const varRegex = /(?:const|let|var)\s+(\w+)/g;
      let match;
      while ((match = varRegex.exec(content)) !== null) {
        symbols.add(match[1]);
      }

      // Extract function declarations
      const funcRegex = /function\s+(\w+)/g;
      while ((match = funcRegex.exec(content)) !== null) {
        symbols.add(match[1]);
      }

      // Extract class declarations
      const classRegex = /class\s+(\w+)/g;
      while ((match = classRegex.exec(content)) !== null) {
        symbols.add(match[1]);
      }

      // Extract interface declarations
      const interfaceRegex = /interface\s+(\w+)/g;
      while ((match = interfaceRegex.exec(content)) !== null) {
        symbols.add(match[1]);
      }

      // Extract type aliases
      const typeRegex = /type\s+(\w+)/g;
      while ((match = typeRegex.exec(content)) !== null) {
        symbols.add(match[1]);
      }

      this.indexedSymbols.set(filePath, symbols);
    } catch {
      // Skip files that can't be read
    }
  }

  /**
   * Index a directory
   */
  indexDirectory(dirPath: string): void {
    const { glob } = require('fast-glob');
    const files = glob.sync(['**/*.{ts,js,py}'], {
      cwd: dirPath,
      ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
    });

    for (const file of files) {
      this.indexFile(path.join(dirPath, file));
    }
  }

  /**
   * Calculate relevance score
   */
  private calculateScore(text: string, prefix: string): number {
    const textLower = text.toLowerCase();
    const prefixLower = prefix.toLowerCase();

    if (textLower === prefixLower) {
      return 1.0; // Exact match
    }

    if (textLower.startsWith(prefixLower)) {
      return 0.8; // Prefix match
    }

    // Fuzzy match score
    let matchLength = 0;
    for (let i = 0; i < Math.min(text.length, prefix.length); i++) {
      if (textLower[i] === prefixLower[i]) {
        matchLength++;
      }
    }

    return matchLength / text.length;
  }

  /**
   * Format completions for display
   */
  formatCompletions(result: CompletionResult): string {
    const lines: string[] = [];

    lines.push(chalk.bold('\n💡 Completions'));
    lines.push(chalk.gray(`Found ${result.suggestions.length} suggestions (${result.duration}ms)`));
    lines.push('');

    // Group by type
    const byType = new Map<CompletionType, CompletionItem[]>();
    for (const suggestion of result.suggestions) {
      if (!byType.has(suggestion.type)) {
        byType.set(suggestion.type, []);
      }
      byType.get(suggestion.type)!.push(suggestion);
    }

    for (const [type, items] of byType) {
      lines.push(chalk.bold(type.charAt(0).toUpperCase() + type.slice(1) + 's:'));

      for (const item of items.slice(0, 5)) {
        const icon = this.getTypeIcon(item.type);
        lines.push(`  ${icon} ${item.displayText} - ${item.description}`);
      }

      if (items.length > 5) {
        lines.push(chalk.gray(`  ... and ${items.length - 5} more`));
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Get icon for completion type
   */
  private getTypeIcon(type: CompletionType): string {
    switch (type) {
      case 'function':
      case 'method':
        return 'ƒ';
      case 'class':
        return '🅲';
      case 'interface':
        return '🅸';
      case 'type':
        return '𝚃';
      case 'variable':
        return '𝕧';
      case 'constant':
        return '🅲';
      case 'module':
        return '📦';
      case 'keyword':
        return '🔑';
      case 'snippet':
        return '📝';
      default:
        return '•';
    }
  }

  /**
   * Clear indexed symbols
   */
  clearIndex(): void {
    this.indexedSymbols.clear();
  }
}

/**
 * Singleton instance
 */
export const completionEngine = new CompletionEngine();
