/**
 * VIBE-CLI v12 - Web Generation Module
 * Generate complete web applications and components
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { BaseModule, ModuleResult } from '../base.module';
import { VibeProviderRouter } from '../../providers/router';
import { writeFileSync, verifyFilesExist } from '../../utils/file-writer';

export class WebGenerationModule extends BaseModule {
  private provider: VibeProviderRouter;

  constructor() {
    super({
      name: 'web_generation',
      version: '1.0.0',
      description: 'Generate complete web applications and components',
    });
    this.provider = new VibeProviderRouter();
  }

  async execute(params: Record<string, any>): Promise<ModuleResult> {
    const action = params.action || params.type || 'generate';
    const debug = params.debug === true;

    try {
      switch (action) {
        case 'generate':
          return this.generateWeb(params, debug);
        case 'component':
          return this.generateComponent(params, debug);
        case 'page':
          return this.generatePage(params, debug);
        case 'layout':
          return this.generateLayout(params, debug);
        case 'api':
          return this.generateAPI(params, debug);
        default:
          return this.failure(`Unknown action: ${action}`);
      }
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async generateWeb(params: Record<string, any>, debug: boolean): Promise<ModuleResult> {
    const { type = 'react', name, features = [], outputDir } = params;

    if (!name) {
      return this.failure('Missing required parameter: name');
    }

    this.logInfo(`Generating ${type} application: ${name}...`);

    if (debug) {
      console.log(chalk.gray(`  Debug: cwd=${process.cwd()}`));
      console.log(chalk.gray(`  Debug: outputDir=${outputDir || 'current directory'}`));
    }

    const response = await this.provider.chat([
      { role: 'system', content: 'You are a full-stack web developer. Generate production-ready web applications. Return ONLY code blocks with file paths.' },
      { role: 'user', content: `Generate a complete ${type} application structure with these features: ${JSON.stringify(features)}. Include folder structure and key files. Return files in this format:

=== FILENAME ===
[relative path from project root]
=== CODE ===
[complete file content]
=== END ===

Write all files to disk.` },
    ]);

    // Parse and write files
    const files = this.parseCodeBlocks(response.content);
    const writtenFiles = this.writeGeneratedFiles(files, debug);

    if (writtenFiles.length === 0) {
      return this.failure('No files were generated');
    }

    // Verify files exist
    const filePaths = writtenFiles.map(f => f.path);
    const { exists, missing } = verifyFilesExist(filePaths);

    if (missing.length > 0) {
      return this.failure(`File verification failed for: ${missing.join(', ')}`);
    }

    return this.success({
      type,
      name,
      filesGenerated: exists.length,
      files: writtenFiles.map(f => ({
        path: path.relative(process.cwd(), f.path),
        type: f.type,
      })),
    });
  }

  private async generateComponent(params: Record<string, any>, debug: boolean): Promise<ModuleResult> {
    const { name, type = 'react', props = [], style = 'css', outputDir } = params;

    if (!name) {
      return this.failure('Missing required parameter: name');
    }

    this.logInfo(`Generating ${type} component: ${name}...`);

    if (debug) {
      console.log(chalk.gray(`  Debug: cwd=${process.cwd()}`));
      console.log(chalk.gray(`  Debug: outputDir=${outputDir || 'components/'}`));
    }

    const componentCode = this.getComponentTemplate(name, type, props, style);

    // Write files
    const files = Object.entries(componentCode).map(([filename, content]) => ({
      filename: outputDir ? path.join(outputDir, filename) : filename,
      code: content as string,
    }));

    const writtenFiles = this.writeGeneratedFiles(files, debug);

    if (writtenFiles.length === 0) {
      return this.failure('Component files were not written to disk');
    }

    // Verify files exist
    const filePaths = writtenFiles.map(f => f.path);
    const { exists, missing } = verifyFilesExist(filePaths);

    if (missing.length > 0) {
      return this.failure(`File verification failed for: ${missing.join(', ')}`);
    }

    return this.success({
      type,
      name,
      filesGenerated: exists.length,
      files: writtenFiles.map(f => ({
        path: path.relative(process.cwd(), f.path),
        type: f.type,
      })),
    });
  }

  private getComponentTemplate(name: string, type: string, props: string[], style: string): Record<string, string> {
    const pascalName = name.charAt(0).toUpperCase() + name.slice(1);

    if (type === 'react' || type === 'react-tsx') {
      const propsInterface = props.length > 0
        ? `interface ${pascalName}Props {\n  ${props.map(p => `${p}: string;`).join('\n  ')}\n}`
        : '';

      const component = `import React from 'react';
${propsInterface ? `\n${propsInterface}` : ''}

export const ${pascalName}: React.FC<${props.length > 0 ? pascalName + 'Props' : ''}> = (${props.length > 0 ? '{ ' + props.join(', ') + ' }' : 'props'}) => {
  return (
    <div className="${name.toLowerCase()}">
      {/* TODO: Implement ${pascalName} component */}
    </div>
  );
};`;

      let styles = '';
      if (style === 'css') {
        styles = '.' + name.toLowerCase() + ' {\n  /* TODO: Add styles */\n}';
      } else if (style === 'styled') {
        styles = 'import styled from \'styled-components\';\n\nexport const Styled' + pascalName + ' = styled.div`\n  /* TODO: Add styled component */\n`;';
      }

      return {
        [`${name}.tsx`]: component,
        [`${name}.module.css`]: styles,
      };
    }

    return { [`${name}.html`]: `<div class="${name.toLowerCase()}">${pascalName}</div>` };
  }

  private async generatePage(params: Record<string, any>, debug: boolean): Promise<ModuleResult> {
    const { name, type = 'react', route, layout = 'default', outputDir } = params;

    if (!name) {
      return this.failure('Missing required parameter: name');
    }

    this.logInfo(`Generating ${type} page: ${name}...`);

    if (debug) {
      console.log(chalk.gray(`  Debug: cwd=${process.cwd()}`));
      console.log(chalk.gray(`  Debug: outputDir=${outputDir || 'pages/'}`));
    }

    const pageCode = this.getPageTemplate(name, type, route, layout);

    // Write files
    const files = Object.entries(pageCode).map(([filename, content]) => ({
      filename: outputDir ? path.join(outputDir, filename) : filename,
      code: content as string,
    }));

    const writtenFiles = this.writeGeneratedFiles(files, debug);

    if (writtenFiles.length === 0) {
      return this.failure('Page files were not written to disk');
    }

    // Verify files exist
    const filePaths = writtenFiles.map(f => f.path);
    const { exists, missing } = verifyFilesExist(filePaths);

    if (missing.length > 0) {
      return this.failure(`File verification failed for: ${missing.join(', ')}`);
    }

    return this.success({
      type,
      name,
      route: route || `/${name.toLowerCase()}`,
      filesGenerated: exists.length,
      files: writtenFiles.map(f => ({
        path: path.relative(process.cwd(), f.path),
        type: f.type,
      })),
    });
  }

  private getPageTemplate(name: string, type: string, route?: string, layout?: string): Record<string, string> {
    const pascalName = name.charAt(0).toUpperCase() + name.slice(1);

    if (type === 'nextjs' || type === 'react') {
      return {
        [`${name}.tsx`]: `import React from 'react';
import Head from 'next/head';

export default function ${pascalName}Page() {
  return (
    <>
      <Head>
        <title>${pascalName}</title>
        <meta name="description" content="${pascalName} page" />
      </Head>
      <main className="${layout === 'auth' ? 'auth-layout' : 'main-layout'}">
        <h1>${pascalName}</h1>
        {/* TODO: Implement page content */}
      </main>
    </>
  );
}`,
        [`${name}.module.css`]: `/* ${pascalName} page styles */`,
      };
    }

    return { [`${name}.html`]: `<!DOCTYPE html>
<html>
<head>
  <title>${pascalName}</title>
</head>
<body>
  <h1>${pascalName}</h1>
</body>
</html>` };
  }

  private async generateLayout(params: Record<string, any>, debug: boolean): Promise<ModuleResult> {
    const { type = 'react', name = 'default', header = true, sidebar = false, outputDir } = params;

    this.logInfo(`Generating ${type} layout: ${name}...`);

    if (debug) {
      console.log(chalk.gray(`  Debug: cwd=${process.cwd()}`));
      console.log(chalk.gray(`  Debug: outputDir=${outputDir || 'layouts/'}`));
    }

    const layoutCode = this.getLayoutTemplate(type, name, header, sidebar);

    // Write files
    const files = Object.entries(layoutCode).map(([filename, content]) => ({
      filename: outputDir ? path.join(outputDir, filename) : filename,
      code: content as string,
    }));

    const writtenFiles = this.writeGeneratedFiles(files, debug);

    if (writtenFiles.length === 0) {
      return this.failure('Layout files were not written to disk');
    }

    // Verify files exist
    const filePaths = writtenFiles.map(f => f.path);
    const { exists, missing } = verifyFilesExist(filePaths);

    if (missing.length > 0) {
      return this.failure(`File verification failed for: ${missing.join(', ')}`);
    }

    return this.success({
      type,
      name,
      filesGenerated: exists.length,
      files: writtenFiles.map(f => ({
        path: path.relative(process.cwd(), f.path),
        type: f.type,
      })),
    });
  }

  private getLayoutTemplate(type: string, name: string, header: boolean, sidebar: boolean): Record<string, string> {
    if (type === 'react' || type === 'nextjs') {
      return {
        [`${name}-layout.tsx`]: `import React from 'react';
import Link from 'next/link';

interface LayoutProps {
  children: React.ReactNode;
}

export default function ${name.charAt(0).toUpperCase() + name.slice(1)}Layout({ children }: LayoutProps) {
  return (
    <div className="layout">
      ${header ? `
      <header className="layout-header">
        <nav>
          <Link href="/">Home</Link>
          <Link href="/docs">Docs</Link>
        </nav>
      </header>` : ''}
      <div className="layout-body">
        ${sidebar ? `
        <aside className="layout-sidebar">
          {/* Sidebar content */}
        </aside>` : ''}
        <main className="layout-content">
          {children}
        </main>
      </div>
    </div>
  );
}`,
        [`${name}-layout.module.css`]: `.layout {
  min-height: 100vh;
}

.layout-header {
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  padding: 1rem 2rem;
}

.layout-body {
  display: flex;
  min-height: calc(100vh - 64px);
}

.layout-sidebar {
  width: 250px;
  border-right: 1px solid #e0e0e0;
  padding: 1rem;
}

.layout-content {
  flex: 1;
  padding: 2rem;
}`,
      };
    }

    return {};
  }

  private async generateAPI(params: Record<string, any>, debug: boolean): Promise<ModuleResult> {
    const { name, type = 'express', method = 'GET', endpoint, outputDir } = params;

    if (!name) {
      return this.failure('Missing required parameter: name');
    }

    this.logInfo(`Generating ${type} API: ${name}...`);

    if (debug) {
      console.log(chalk.gray(`  Debug: cwd=${process.cwd()}`));
      console.log(chalk.gray(`  Debug: outputDir=${outputDir || 'api/'}`));
    }

    const apiCode = this.getAPITemplate(type, name, method, endpoint);

    // Write files
    const files = Object.entries(apiCode).map(([filename, content]) => ({
      filename: outputDir ? path.join(outputDir, filename) : filename,
      code: content as string,
    }));

    const writtenFiles = this.writeGeneratedFiles(files, debug);

    if (writtenFiles.length === 0) {
      return this.failure('API files were not written to disk');
    }

    // Verify files exist
    const filePaths = writtenFiles.map(f => f.path);
    const { exists, missing } = verifyFilesExist(filePaths);

    if (missing.length > 0) {
      return this.failure(`File verification failed for: ${missing.join(', ')}`);
    }

    return this.success({
      type,
      name,
      method,
      endpoint: endpoint || `/${name.toLowerCase()}`,
      filesGenerated: exists.length,
      files: writtenFiles.map(f => ({
        path: path.relative(process.cwd(), f.path),
        type: f.type,
      })),
    });
  }

  private getAPITemplate(type: string, name: string, method: string, endpoint?: string): Record<string, string> {
    const route = endpoint || `/${name.toLowerCase()}`;

    if (type === 'express') {
      return {
        [`${name}.ts`]: `import { Request, Response } from 'express';

export async function ${name}(req: Request, res: Response) {
  switch (req.method) {
    case 'GET':
      return handleGet(req, res);
    case 'POST':
      return handlePost(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: \`Method \${req.method} not allowed\` });
  }
}

async function handleGet(req: Request, res: Response) {
  try {
    // TODO: Implement GET handler
    res.json({ success: true, data: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function handlePost(req: Request, res: Response) {
  try {
    // TODO: Implement POST handler
    res.status(201).json({ success: true, message: 'Created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}`,
        [`${name}.spec.ts`]: `import { describe, it, expect, vi } from 'vitest';
import { ${name} } from './${name}';
import type { Request, Response } from 'express';

describe('${name} API', () => {
  it('should handle GET requests', async () => {
    const req = { method: 'GET' } as Request;
    const res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await ${name}(req, res);

    expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
  });
});`,
      };
    }

    if (type === 'nextjs') {
      return {
        [`${route.replace(/\//g, '-').slice(1)}.ts`]: `import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case 'GET':
      return handleGet(req, res);
    case 'POST':
      return handlePost(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: \`Method \${req.method} not allowed\` });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  res.json({ success: true, data: [] });
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  res.status(201).json({ success: true, message: 'Created' });
}`,
      };
    }

    return {};
  }

  /**
   * Parse code blocks from LLM response
   */
  private parseCodeBlocks(content: string): Array<{ filename: string; code: string }> {
    const blocks: Array<{ filename: string; code: string }> = [];
    const filePattern = /===\s*FILENAME\s*===\s*\n([^\n]+)\s*\n=== CODE ===\s*([\s\S]*?)(?=== END ===|$)/g;

    let match;
    while ((match = filePattern.exec(content)) !== null) {
      const filename = match[1].trim();
      const code = match[2].trim();
      if (filename && code) {
        blocks.push({ filename, code });
      }
    }

    return blocks;
  }

  /**
   * Write generated files to disk with verification
   */
  private writeGeneratedFiles(
    files: Array<{ filename: string; code: string }>,
    debug: boolean
  ): Array<{ path: string; type: 'created' | 'modified' }> {
    const written: Array<{ path: string; type: 'created' | 'modified' }> = [];

    for (const file of files) {
      if (!file.filename) continue;

      if (debug) {
        console.log(chalk.gray(`  Debug: Writing ${file.filename}`));
      }

      const result = writeFileSync(file.filename, file.code, {
        recursive: true,
        overwrite: true,
      });

      if (result.success) {
        written.push({
          path: result.path,
          type: result.type,
        });
        this.logSuccess(`Written: ${path.relative(process.cwd(), result.path)}`);
      } else {
        this.logError(`Failed to write ${file.filename}: ${result.error}`);
      }
    }

    return written;
  }
}
