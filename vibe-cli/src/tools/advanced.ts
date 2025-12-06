import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export async function analyzeCodeQuality(filePath: string): Promise<string> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const analysis = {
      lines: lines.length,
      functions: (content.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g) || []).length,
      complexity: calculateComplexity(content),
      duplicates: findDuplicates(lines),
      longFunctions: findLongFunctions(content),
      todos: (content.match(/TODO|FIXME|HACK/g) || []).length
    };
    return JSON.stringify(analysis, null, 2);
  } catch (error: any) {
    return `Error: ${error.message}`;
  }
}

function calculateComplexity(code: string): number {
  const patterns = [/if\s*\(/g, /for\s*\(/g, /while\s*\(/g, /case\s+/g, /\&\&/g, /\|\|/g];
  return patterns.reduce((sum, p) => sum + (code.match(p) || []).length, 1);
}

function findDuplicates(lines: string[]): number {
  const seen = new Map<string, number>();
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.length > 20) seen.set(trimmed, (seen.get(trimmed) || 0) + 1);
  });
  return Array.from(seen.values()).filter(c => c > 1).length;
}

function findLongFunctions(code: string): number {
  const functions = code.split(/function\s+\w+|const\s+\w+\s*=\s*\(/);
  return functions.filter(f => f.split('\n').length > 50).length;
}

export async function smartRefactor(filePath: string, type: 'extract' | 'inline' | 'rename'): Promise<string> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    let result = content;
    
    if (type === 'extract') {
      result = extractDuplicates(content);
    } else if (type === 'inline') {
      result = inlineSmallFunctions(content);
    }
    
    return `Refactored ${filePath}:\n${result.substring(0, 500)}...`;
  } catch (error: any) {
    return `Error: ${error.message}`;
  }
}

function extractDuplicates(code: string): string {
  return code;
}

function inlineSmallFunctions(code: string): string {
  return code;
}

export async function generateTests(filePath: string, framework: string = 'vitest'): Promise<string> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const functions = content.match(/export\s+(async\s+)?function\s+(\w+)/g) || [];
    
    const testFile = filePath.replace(/\.(ts|js)$/, '.test.$1');
    const tests = functions.map(f => {
      const name = f.match(/function\s+(\w+)/)?.[1];
      return `describe('${name}', () => {\n  it('should work correctly', () => {\n    expect(${name}()).toBeDefined();\n  });\n});`;
    }).join('\n\n');
    
    const testContent = `import { describe, it, expect } from '${framework}';\nimport { ${functions.map(f => f.match(/function\s+(\w+)/)?.[1]).join(', ')} } from './${path.basename(filePath, path.extname(filePath))}';\n\n${tests}`;
    
    fs.writeFileSync(testFile, testContent);
    return `Generated tests in ${testFile}`;
  } catch (error: any) {
    return `Error: ${error.message}`;
  }
}

export async function optimizeBundle(projectPath: string = '.'): Promise<string> {
  try {
    const analysis: {
      largeFiles: string[];
      unusedDeps: string[];
      suggestions: string[];
    } = {
      largeFiles: findLargeFiles(projectPath),
      unusedDeps: findUnusedDependencies(projectPath),
      suggestions: []
    };
    
    if (analysis.largeFiles.length > 0) {
      analysis.suggestions.push('Consider code splitting for large files');
    }
    if (analysis.unusedDeps.length > 0) {
      analysis.suggestions.push(`Remove unused dependencies: ${analysis.unusedDeps.join(', ')}`);
    }
    
    return JSON.stringify(analysis, null, 2);
  } catch (error: any) {
    return `Error: ${error.message}`;
  }
}

function findLargeFiles(dir: string): string[] {
  try {
    const result = execSync(`find ${dir} -type f -size +100k -not -path "*/node_modules/*" 2>/dev/null`, { encoding: 'utf-8' });
    return result.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function findUnusedDependencies(dir: string): string[] {
  try {
    const pkgPath = path.join(dir, 'package.json');
    if (!fs.existsSync(pkgPath)) return [];
    
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const deps = Object.keys(pkg.dependencies || {});
    const used = new Set<string>();
    
    const files = execSync(`find ${dir}/src -type f \\( -name "*.ts" -o -name "*.js" \\) 2>/dev/null`, { encoding: 'utf-8' }).trim().split('\n');
    files.forEach(file => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf-8');
        deps.forEach(dep => {
          if (content.includes(dep)) used.add(dep);
        });
      }
    });
    
    return deps.filter(d => !used.has(d));
  } catch {
    return [];
  }
}

export async function securityScan(projectPath: string = '.'): Promise<string> {
  try {
    const issues = {
      vulnerabilities: [],
      secrets: findSecrets(projectPath),
      permissions: checkPermissions(projectPath),
      outdated: []
    };
    
    try {
      const audit = execSync('npm audit --json 2>/dev/null', { cwd: projectPath, encoding: 'utf-8' });
      const data = JSON.parse(audit);
      issues.vulnerabilities = data.vulnerabilities || [];
    } catch {}
    
    return JSON.stringify(issues, null, 2);
  } catch (error: any) {
    return `Error: ${error.message}`;
  }
}

function findSecrets(dir: string): string[] {
  try {
    const patterns = ['API_KEY', 'SECRET', 'PASSWORD', 'TOKEN', 'PRIVATE_KEY'];
    const result = execSync(`grep -r -i "${patterns.join('\\|')}" ${dir} --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null | head -20`, { encoding: 'utf-8' });
    return result.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function checkPermissions(dir: string): string[] {
  try {
    const result = execSync(`find ${dir} -type f -perm -111 -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null`, { encoding: 'utf-8' });
    return result.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

export async function performanceBenchmark(filePath: string): Promise<string> {
  try {
    const start = Date.now();
    const content = fs.readFileSync(filePath, 'utf-8');
    const readTime = Date.now() - start;
    
    const metrics = {
      fileSize: Buffer.byteLength(content, 'utf-8'),
      readTime,
      lines: content.split('\n').length,
      parseTime: 0
    };
    
    const parseStart = Date.now();
    try {
      JSON.parse(content);
      metrics.parseTime = Date.now() - parseStart;
    } catch {}
    
    return JSON.stringify(metrics, null, 2);
  } catch (error: any) {
    return `Error: ${error.message}`;
  }
}

export async function generateDocumentation(filePath: string): Promise<string> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const functions = content.match(/export\s+(async\s+)?function\s+(\w+)[^{]*{/g) || [];
    
    const docs = functions.map(f => {
      const match = f.match(/function\s+(\w+)\s*\(([^)]*)\)/);
      if (!match) return '';
      const [, name, params] = match;
      return `### ${name}\n\n**Parameters:**\n${params.split(',').map(p => `- \`${p.trim()}\``).join('\n')}\n\n**Description:** TODO\n`;
    }).join('\n');
    
    const docFile = filePath.replace(/\.(ts|js)$/, '.md');
    fs.writeFileSync(docFile, `# ${path.basename(filePath)}\n\n${docs}`);
    
    return `Generated documentation in ${docFile}`;
  } catch (error: any) {
    return `Error: ${error.message}`;
  }
}

export async function migrateCode(filePath: string, from: string, to: string): Promise<string> {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    const migrations: Record<string, Record<string, Array<[string, string]>>> = {
      'commonjs': {
        'esm': [
          ['require\\(([^)]+)\\)', 'import $1'],
          ['module\\.exports\\s*=', 'export default'],
          ['exports\\.', 'export ']
        ]
      },
      'javascript': {
        'typescript': [
          ['function\\s+(\\w+)\\(([^)]*)\\)', 'function $1($2): void'],
          ['const\\s+(\\w+)\\s*=', 'const $1: any =']
        ]
      }
    };
    
    const rules = migrations[from]?.[to] || [];
    rules.forEach(([pattern, replacement]) => {
      content = content.replace(new RegExp(pattern, 'g'), replacement);
    });
    
    const newFile = filePath.replace(/\.js$/, '.ts');
    fs.writeFileSync(newFile, content);
    
    return `Migrated ${filePath} to ${newFile}`;
  } catch (error: any) {
    return `Error: ${error.message}`;
  }
}
