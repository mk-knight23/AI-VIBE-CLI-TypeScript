/**
 * VIBE-CLI v0.0.2 - AST Analyzer
 * Parse AST and extract code definitions
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * AST node types
 */
export type ASTNodeType =
  | 'program'
  | 'function'
  | 'class'
  | 'interface'
  | 'type-alias'
  | 'variable'
  | 'import'
  | 'export'
  | 'property'
  | 'method'
  | 'parameter'
  | 'call-expression'
  | 'condition'
  | 'loop';

/**
 * AST node interface
 */
export interface ASTNode {
  id: string;
  type: ASTNodeType;
  name: string;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  content: string;
  children: ASTNode[];
  parent?: string;
  metadata: Record<string, unknown>;
}

/**
 * Code definition extracted from AST
 */
export interface CodeDefinition {
  id: string;
  type: ASTNodeType;
  name: string;
  filePath: string;
  startLine: number;
  endLine: number;
  signature?: string;
  visibility?: 'public' | 'private' | 'protected' | 'internal';
  parameters?: ParameterInfo[];
  returnType?: string;
  dependencies: string[];
  docComment?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Parameter information
 */
export interface ParameterInfo {
  name: string;
  type: string;
  optional: boolean;
  defaultValue?: string;
}

/**
 * Import/export statement
 */
export interface ImportExportInfo {
  type: 'import' | 'export' | 'require';
  modulePath: string;
  namedImports: string[];
  defaultImport?: string;
  filePath: string;
  line: number;
}

/**
 * AST Analyzer
 */
export class ASTAnalyzer {
  private readonly cache: Map<string, CodeDefinition[]> = new Map();

  /**
   * Analyze a file and extract definitions
   */
  analyzeFile(filePath: string): CodeDefinition[] {
    // Check cache
    if (this.cache.has(filePath)) {
      return this.cache.get(filePath)!;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const ext = path.extname(filePath).toLowerCase();

      let definitions: CodeDefinition[] = [];

      if (ext === '.ts' || ext === '.tsx') {
        definitions = this.analyzeTypeScript(content, filePath);
      } else if (ext === '.js' || ext === '.jsx') {
        definitions = this.analyzeJavaScript(content, filePath);
      } else if (ext === '.py') {
        definitions = this.analyzePython(content, filePath);
      }

      this.cache.set(filePath, definitions);
      return definitions;
    } catch (error) {
      console.error(`Failed to analyze file: ${filePath}`, error);
      return [];
    }
  }

  /**
   * Analyze TypeScript/JavaScript
   */
  private analyzeTypeScript(content: string, filePath: string): CodeDefinition[] {
    const definitions: CodeDefinition[] = [];
    const lines = content.split('\n');
    let currentLine = 0;

    // Simple regex-based parsing (for production, use proper AST parser like @typescript-eslint/parser)
    const patterns = {
      function: /(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g,
      arrowFunction: /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[^=]+)=>\s*(?:{|\([^)]*\)|[^;]+)/g,
      class: /class\s+(\w+)(?:\s+extends\s+\w+)?(?:\s+implements\s+[^{]+)?\s*{/g,
      interface: /interface\s+(\w+)\s*(?:extends\s+[^=]+)?\s*{/g,
      typeAlias: /type\s+(\w+)\s*=\s*[^;]+;/g,
      const: /(?:const|let|var)\s+(\w+)\s*[=:]\s*[{[]|function|=>|['"`]/g,
      import: /import\s+(?:\{[^}]*\}|\w+)(?:\s*,\s*(?:\{[^}]*\}|\w+))?\s+from\s+['"]([^'"]+)['"]/g,
      export: /export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|interface|type)\s+(\w+)/g,
    };

    // Extract function definitions
    let match;
    while ((match = patterns.function.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length - 1;
      definitions.push({
        id: `func-${match[1]}-${startLine}`,
        type: 'function',
        name: match[1],
        filePath,
        startLine,
        endLine: startLine + 1,
        signature: `function ${match[1]}(${match[2]})`,
        parameters: this.parseParameters(match[2]),
        dependencies: this.extractDependencies(match[0]),
        metadata: {},
      });
    }

    // Extract class definitions
    while ((match = patterns.class.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length - 1;
      definitions.push({
        id: `class-${match[1]}-${startLine}`,
        type: 'class',
        name: match[1],
        filePath,
        startLine,
        endLine: this.findBlockEnd(lines, startLine),
        dependencies: this.extractDependencies(match[0]),
        metadata: {},
      });
    }

    // Extract interface definitions
    while ((match = patterns.interface.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length - 1;
      definitions.push({
        id: `interface-${match[1]}-${startLine}`,
        type: 'interface',
        name: match[1],
        filePath,
        startLine,
        endLine: this.findBlockEnd(lines, startLine),
        dependencies: this.extractDependencies(match[0]),
        metadata: {},
      });
    }

    // Extract type aliases
    while ((match = patterns.typeAlias.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length - 1;
      definitions.push({
        id: `type-${match[1]}-${startLine}`,
        type: 'type-alias',
        name: match[1],
        filePath,
        startLine,
        endLine: startLine,
        signature: match[0],
        dependencies: this.extractDependencies(match[0]),
        metadata: {},
      });
    }

    // Extract exports
    while ((match = patterns.export.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length - 1;
      const type = this.inferExportType(content, match.index);
      definitions.push({
        id: `export-${match[1]}-${startLine}`,
        type,
        name: match[1],
        filePath,
        startLine,
        endLine: startLine,
        dependencies: this.extractDependencies(match[0]),
        metadata: {},
      });
    }

    return definitions;
  }

  /**
   * Analyze JavaScript
   */
  private analyzeJavaScript(content: string, filePath: string): CodeDefinition[] {
    return this.analyzeTypeScript(content, filePath);
  }

  /**
   * Analyze Python
   */
  private analyzePython(content: string, filePath: string): CodeDefinition[] {
    const definitions: CodeDefinition[] = [];
    const lines = content.split('\n');

    // Match function definitions
    const funcRegex = /^def\s+(\w+)\s*\(([^)]*)\):/gm;
    let match;

    while ((match = funcRegex.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length - 1;
      definitions.push({
        id: `func-${match[1]}-${startLine}`,
        type: 'function',
        name: match[1],
        filePath,
        startLine,
        endLine: this.findPythonBlockEnd(lines, startLine),
        signature: `def ${match[1]}(${match[2]}):`,
        parameters: this.parsePythonParameters(match[2]),
        dependencies: this.extractDependencies(match[0]),
        metadata: {},
      });
    }

    // Match class definitions
    const classRegex = /^class\s+(\w+)(?:\([^)]*\))?:/gm;
    while ((match = classRegex.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length - 1;
      definitions.push({
        id: `class-${match[1]}-${startLine}`,
        type: 'class',
        name: match[1],
        filePath,
        startLine,
        endLine: this.findPythonBlockEnd(lines, startLine),
        dependencies: this.extractDependencies(match[0]),
        metadata: {},
      });
    }

    return definitions;
  }

  /**
   * Parse function parameters
   */
  private parseParameters(paramsStr: string): ParameterInfo[] {
    if (!paramsStr.trim()) return [];

    return paramsStr.split(',').map((param) => {
      const [name, typeAndDefault] = param.split(':').map((s) => s.trim());
      const [type, defaultValue] = typeAndDefault?.split('=').map((s) => s.trim()) || ['', ''];

      return {
        name,
        type: type || 'any',
        optional: param.includes('?'),
        defaultValue,
      };
    });
  }

  /**
   * Parse Python parameters
   */
  private parsePythonParameters(paramsStr: string): ParameterInfo[] {
    if (!paramsStr.trim()) return [];

    return paramsStr.split(',').map((param) => {
      const parts = param.trim().split('=');
      const name = parts[0];
      const defaultValue = parts[1];

      return {
        name,
        type: 'any',
        optional: defaultValue !== undefined,
        defaultValue,
      };
    });
  }

  /**
   * Extract dependencies (imports) from code
   */
  private extractDependencies(code: string): string[] {
    const deps: string[] = [];

    // Match import statements
    const importRegex = /import\s+(?:\{[^}]*\}|\w+)(?:\s*,\s*(?:\{[^}]*\}|\w+))?\s+from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(code)) !== null) {
      deps.push(match[1]);
    }

    // Match require statements
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = requireRegex.exec(code)) !== null) {
      deps.push(match[1]);
    }

    return [...new Set(deps)];
  }

  /**
   * Find end of a block (for TypeScript/JavaScript)
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
   * Find end of a Python block
   */
  private findPythonBlockEnd(lines: string[], startLine: number): number {
    const baseIndent = lines[startLine]?.match(/^(\s*)/)?.[1].length || 0;

    for (let i = startLine + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === '') continue;

      const indent = line.match(/^(\s*)/)?.[1].length || 0;
      if (indent <= baseIndent && line.trim() !== '') {
        return i - 1;
      }
    }

    return lines.length - 1;
  }

  /**
   * Infer export type from context
   */
  private inferExportType(content: string, index: number): ASTNodeType {
    const context = content.substring(Math.max(0, index - 200), index + 200);

    if (context.includes('class ')) return 'class';
    if (context.includes('function ') || context.includes('=>')) return 'function';
    if (context.includes('interface ')) return 'interface';
    if (context.includes('type ')) return 'type-alias';

    return 'variable';
  }

  /**
   * Get all definitions from a directory
   */
  analyzeDirectory(dirPath: string, patterns: string[] = ['**/*.ts', '**/*.js', '**/*.py']): CodeDefinition[] {
    const definitions: CodeDefinition[] = [];
    const { glob } = require('fast-glob');

    const files = glob.sync(patterns, { cwd: dirPath, absolute: true });

    for (const file of files) {
      definitions.push(...this.analyzeFile(file));
    }

    return definitions;
  }

  /**
   * Find definitions by name
   */
  findByName(definitions: CodeDefinition[], name: string): CodeDefinition[] {
    return definitions.filter((d) => d.name === name);
  }

  /**
   * Find definitions by type
   */
  findByType(definitions: CodeDefinition[], type: ASTNodeType): CodeDefinition[] {
    return definitions.filter((d) => d.type === type);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Singleton instance
 */
export const astAnalyzer = new ASTAnalyzer();
