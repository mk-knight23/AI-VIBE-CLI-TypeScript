/**
 * VIBE-CLI v12 - Code Search Module
 * Search and analyze code across the codebase
 */

import * as fs from 'fs';
import * as path from 'path';
import { BaseModule, ModuleResult } from '../base.module';
import { VibeProviderRouter } from '../../providers/router';

export class CodeSearchModule extends BaseModule {
  private provider: VibeProviderRouter;

  constructor() {
    super({
      name: 'code_search',
      version: '1.0.0',
      description: 'Search and analyze code across the codebase',
    });
    this.provider = new VibeProviderRouter();
  }

  async execute(params: Record<string, any>): Promise<ModuleResult> {
    const action = params.action || params.type || 'search';

    try {
      switch (action) {
        case 'search':
          return this.search(params);
        case 'find':
          return this.findFiles(params);
        case 'grep':
          return this.grep(params);
        case 'analyze':
          return this.analyzeStructure(params);
        default:
          return this.failure(`Unknown action: ${action}`);
      }
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async search(params: Record<string, any>): Promise<ModuleResult> {
    const { query, directory = '.', extensions = ['ts', 'js', 'tsx', 'jsx'] } = params;

    if (!query) {
      return this.failure('Missing required parameter: query');
    }

    this.logInfo(`Searching for "${query}"...`);

    const results = this.performSearch(query, directory, extensions);

    return this.success({
      query,
      directory,
      results,
      count: results.length,
    });
  }

  private performSearch(query: string, directory: string, extensions: string[]): any[] {
    const results: any[] = [];
    const searchDir = path.resolve(directory);

    if (!fs.existsSync(searchDir)) {
      return results;
    }

    this.walkDir(searchDir, (filePath) => {
      const ext = path.extname(filePath).slice(1);
      if (extensions.includes(ext)) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          if (content.toLowerCase().includes(query.toLowerCase())) {
            const lines = content.split('\n');
            const matchingLines = lines
              .map((line, i) => ({ line: i + 1, content: line.trim() }))
              .filter(l => l.content.toLowerCase().includes(query.toLowerCase()));

            if (matchingLines.length > 0) {
              results.push({
                file: path.relative(process.cwd(), filePath),
                matches: matchingLines,
              });
            }
          }
        } catch {
          // Skip unreadable files
        }
      }
    });

    return results;
  }

  private walkDir(dir: string, callback: (file: string) => void): void {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        this.walkDir(fullPath, callback);
      } else if (entry.isFile()) {
        callback(fullPath);
      }
    }
  }

  private async findFiles(params: Record<string, any>): Promise<ModuleResult> {
    const { pattern = '**/*', directory = '.' } = params;

    this.logInfo(`Finding files matching "${pattern}"...`);

    const results = this.findFilesByPattern(pattern, directory);

    return this.success({
      pattern,
      directory,
      files: results,
      count: results.length,
    });
  }

  private findFilesByPattern(pattern: string, directory: string): string[] {
    const results: string[] = [];
    const searchDir = path.resolve(directory);

    this.walkDir(searchDir, (filePath) => {
      const fileName = path.basename(filePath);
      if (this.matchPattern(pattern, fileName)) {
        results.push(path.relative(process.cwd(), filePath));
      }
    });

    return results;
  }

  private matchPattern(pattern: string, fileName: string): boolean {
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(regexPattern, 'i').test(fileName);
  }

  private async grep(params: Record<string, any>): Promise<ModuleResult> {
    const { pattern, filePattern = '*', context = 2 } = params;

    if (!pattern) {
      return this.failure('Missing required parameter: pattern');
    }

    this.logInfo(`Grepping for "${pattern}"...`);

    const results = this.performGrep(pattern, filePattern, context);

    return this.success({
      pattern,
      filePattern,
      results,
      count: results.length,
    });
  }

  private performGrep(pattern: string, filePattern: string, context: number): any[] {
    const results: any[] = [];

    this.walkDir(process.cwd(), (filePath) => {
      const fileName = path.basename(filePath);
      if (!this.matchPattern(filePattern, fileName)) return;

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, i) => {
          if (line.toLowerCase().includes(pattern.toLowerCase())) {
            const contextLines = [];
            for (let j = Math.max(0, i - context); j <= Math.min(lines.length - 1, i + context); j++) {
              contextLines.push({ line: j + 1, content: lines[j] });
            }
            results.push({
              file: path.relative(process.cwd(), filePath),
              match: { line: i + 1, content: line.trim() },
              context: contextLines,
            });
          }
        });
      } catch {
        // Skip unreadable files
      }
    });

    return results;
  }

  private async analyzeStructure(params: Record<string, any>): Promise<ModuleResult> {
    const { directory = '.' } = params;

    this.logInfo('Analyzing project structure...');

    const structure = this.analyzeDirStructure(directory);

    return this.success({
      directory,
      structure,
      summary: {
        totalFiles: structure.files.length,
        totalDirs: structure.directories.length,
        languages: this.detectLanguages(structure.files),
      },
    });
  }

  private analyzeDirStructure(directory: string): any {
    const files: string[] = [];
    const directories: string[] = [];

    this.walkDir(path.resolve(directory), (filePath) => {
      const relative = path.relative(process.cwd(), filePath);
      if (fs.statSync(filePath).isFile()) {
        files.push(relative);
      } else {
        directories.push(relative);
      }
    });

    return { files, directories };
  }

  private detectLanguages(files: string[]): Record<string, number> {
    const languages: Record<string, number> = {};
    const extMap: Record<string, string> = {
      '.ts': 'TypeScript',
      '.js': 'JavaScript',
      '.tsx': 'TypeScript React',
      '.jsx': 'JavaScript React',
      '.py': 'Python',
      '.go': 'Go',
      '.rs': 'Rust',
      '.java': 'Java',
    };

    for (const file of files) {
      const ext = path.extname(file);
      const lang = extMap[ext] || 'Other';
      languages[lang] = (languages[lang] || 0) + 1;
    }

    return languages;
  }
}
