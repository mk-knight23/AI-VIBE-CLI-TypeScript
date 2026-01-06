/**
 * VIBE-CLI v12 - Documentation Module
 * Generate and maintain project documentation
 */

import * as fs from 'fs';
import * as path from 'path';
import { BaseModule, ModuleResult } from '../base.module';
import { VibeProviderRouter } from '../../providers/router';

export class DocumentationModule extends BaseModule {
  private provider: VibeProviderRouter;

  constructor() {
    super({
      name: 'documentation',
      version: '1.0.0',
      description: 'Generate and maintain project documentation',
    });
    this.provider = new VibeProviderRouter();
  }

  async execute(params: Record<string, any>): Promise<ModuleResult> {
    const action = params.action || params.type || 'generate';

    try {
      switch (action) {
        case 'generate':
          return this.generateDocs(params);
        case 'readme':
          return this.generateReadme(params);
        case 'api':
          return this.generateAPIDocs(params);
        case 'update':
          return this.updateDocs(params);
        default:
          return this.failure(`Unknown action: ${action}`);
      }
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async generateDocs(params: Record<string, any>): Promise<ModuleResult> {
    const { scope = 'project', format = 'markdown' } = params;

    this.logInfo(`Generating ${scope} documentation...`);

    switch (scope) {
      case 'project':
        return this.generateProjectDocs();
      case 'module':
        return this.generateModuleDocs(params.module);
      case 'file':
        return this.generateFileDocs(params.file);
      default:
        return this.failure(`Unknown scope: ${scope}`);
    }
  }

  private async generateProjectDocs(): Promise<ModuleResult> {
    const structure = this.analyzeProjectStructure();

    const response = await this.provider.chat([
      { role: 'system', content: 'You are a technical writer. Create comprehensive project documentation.' },
      { role: 'user', content: `Create a comprehensive README.md for this project with this structure: ${JSON.stringify(structure)}` },
    ]);

    return this.success({
      type: 'project',
      documentation: response.content,
      structure,
    });
  }

  private async generateModuleDocs(moduleName: string): Promise<ModuleResult> {
    if (!moduleName) {
      return this.failure('Missing required parameter: module');
    }

    this.logInfo(`Generating documentation for ${moduleName}...`);

    const modulePath = path.join(process.cwd(), 'src', 'modules', moduleName);

    if (!fs.existsSync(modulePath)) {
      return this.failure(`Module not found: ${moduleName}`);
    }

    const files = this.collectFiles(modulePath);

    const response = await this.provider.chat([
      { role: 'system', content: 'You are a technical writer. Create detailed module documentation.' },
      { role: 'user', content: `Create comprehensive documentation for this module: ${moduleName}. Files: ${JSON.stringify(files)}` },
    ]);

    return this.success({
      type: 'module',
      module: moduleName,
      documentation: response.content,
    });
  }

  private async generateFileDocs(filePath: string): Promise<ModuleResult> {
    if (!filePath) {
      return this.failure('Missing required parameter: file');
    }

    this.logInfo(`Generating documentation for ${filePath}...`);

    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);

    if (!fs.existsSync(absolutePath)) {
      return this.failure(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(absolutePath, 'utf-8');
    const fileName = path.basename(absolutePath);

    const response = await this.provider.chat([
      { role: 'system', content: 'You are a technical writer. Create detailed code documentation.' },
      { role: 'user', content: `Create comprehensive documentation for this file: ${fileName}\n\nCode:\n${content}` },
    ]);

    return this.success({
      type: 'file',
      file: filePath,
      documentation: response.content,
    });
  }

  private async generateReadme(params: Record<string, any>): Promise<ModuleResult> {
    this.logInfo('Generating README.md...');

    const structure = this.analyzeProjectStructure();

    const response = await this.provider.chat([
      { role: 'system', content: 'You are a technical writer. Create a professional README.md.' },
      { role: 'user', content: `Create a comprehensive README.md for this project:\n\nStructure:\n${JSON.stringify(structure, null, 2)}\n\nInclude: Installation, Usage, Features, Configuration, Contributing, License.` },
    ]);

    // Save to file
    const readmePath = path.join(process.cwd(), 'README.md');
    fs.writeFileSync(readmePath, response.content);

    return this.success({
      file: 'README.md',
      content: response.content,
    });
  }

  private async generateAPIDocs(params: Record<string, any>): Promise<ModuleResult> {
    const { format = 'markdown' } = params;

    this.logInfo('Generating API documentation...');

    const apiFiles = this.findAPIFiles();

    const response = await this.provider.chat([
      { role: 'system', content: 'You are a technical writer. Create API documentation.' },
      { role: 'user', content: `Create API documentation from these files: ${JSON.stringify(apiFiles)}` },
    ]);

    return this.success({
      type: 'api',
      documentation: response.content,
      files: apiFiles,
    });
  }

  private async updateDocs(params: Record<string, any>): Promise<ModuleResult> {
    const { file, content } = params;

    if (!file) {
      return this.failure('Missing required parameter: file');
    }

    this.logInfo(`Updating documentation for ${file}...`);

    const filePath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);

    if (!fs.existsSync(filePath)) {
      return this.failure(`File not found: ${file}`);
    }

    const currentContent = fs.readFileSync(filePath, 'utf-8');

    const response = await this.provider.chat([
      { role: 'system', content: 'You are a technical writer. Update documentation to reflect changes.' },
      { role: 'user', content: `Update this documentation:\n\nCurrent:\n${currentContent}\n\nNew content to incorporate:\n${content || 'See file changes'}` },
    ]);

    fs.writeFileSync(filePath, response.content);

    return this.success({
      file,
      updated: true,
      content: response.content,
    });
  }

  private analyzeProjectStructure(): any {
    const structure: any = {
      name: path.basename(process.cwd()),
      files: [],
      languages: {} as Record<string, number>,
      mainFiles: [],
      directories: [] as string[],
    };

    const collectStats = (dir: string, prefix = '') => {
      if (!fs.existsSync(dir)) return;

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            structure.directories = structure.directories || [];
            structure.directories.push(relativePath);
            collectStats(fullPath, relativePath);
          }
        } else {
          structure.files.push(relativePath);
          const ext = path.extname(entry.name);
          structure.languages[ext] = (structure.languages[ext] || 0) + 1;

          if (['index.ts', 'index.js', 'main.ts', 'main.js', 'app.ts', 'app.js'].includes(entry.name)) {
            structure.mainFiles.push(relativePath);
          }
        }
      }
    };

    collectStats(process.cwd());

    return structure;
  }

  private collectFiles(dir: string): any[] {
    const files: any[] = [];

    const walk = (currentDir: string) => {
      if (!fs.existsSync(currentDir)) return;

      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
          files.push({
            name: entry.name,
            path: fullPath,
            content: fs.readFileSync(fullPath, 'utf-8').substring(0, 500),
          });
        } else if (entry.isDirectory() && !entry.name.startsWith('.')) {
          walk(fullPath);
        }
      }
    };

    walk(dir);
    return files;
  }

  private findAPIFiles(): string[] {
    const patterns = ['**/*.api.ts', '**/types.ts', '**/interfaces.ts', '**/*.d.ts'];
    const files: string[] = [];

    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return;

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isFile() && patterns.some(p => new RegExp(p.replace('**/', '.*')).test(fullPath))) {
          files.push(fullPath);
        } else if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          walk(fullPath);
        }
      }
    };

    walk(process.cwd());
    return files;
  }
}
