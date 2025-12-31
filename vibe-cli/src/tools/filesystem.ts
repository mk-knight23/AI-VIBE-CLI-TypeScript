import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import { trackChange, updateChangeContent } from '../core/checkpoints';

const rootDir = process.cwd();

// Session ID for tracking (set by caller)
let currentSessionId: string | undefined;

export function setTrackingSession(sessionId: string | undefined): void {
  currentSessionId = sessionId;
}

export async function listDirectory(dirPath: string, ignore: string[] = [], respectGitIgnore = true): Promise<string> {
  const absPath = path.resolve(rootDir, dirPath);
  const entries = fs.readdirSync(absPath, { withFileTypes: true });
  
  const filtered = entries.filter(e => {
    if (ignore.some(pattern => e.name.match(new RegExp(pattern)))) return false;
    return true;
  });

  const sorted = filtered.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  const lines = sorted.map(e => e.isDirectory() ? `[DIR] ${e.name}` : e.name);
  return `Directory listing for ${absPath}:\n${lines.join('\n')}`;
}

export async function readFile(filePath: string, offset?: number, limit?: number): Promise<any> {
  const absPath = path.resolve(rootDir, filePath);
  if (!fs.existsSync(absPath)) throw new Error(`File not found: ${absPath}`);

  const ext = path.extname(absPath).toLowerCase();
  const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'];
  
  if (imageExts.includes(ext)) {
    const data = fs.readFileSync(absPath).toString('base64');
    return { inlineData: { mimeType: `image/${ext.slice(1)}`, data } };
  }

  if (ext === '.pdf') {
    const data = fs.readFileSync(absPath).toString('base64');
    return { inlineData: { mimeType: 'application/pdf', data } };
  }

  const content = fs.readFileSync(absPath, 'utf-8');
  const lines = content.split('\n');
  
  if (offset !== undefined && limit !== undefined) {
    const slice = lines.slice(offset, offset + limit);
    return `[File content: lines ${offset + 1}-${offset + slice.length} of ${lines.length}]\n${slice.join('\n')}`;
  }

  return lines.length > 2000 ? `[File truncated: showing first 2000 lines]\n${lines.slice(0, 2000).join('\n')}` : content;
}

export async function writeFile(filePath: string, content: string): Promise<string> {
  const absPath = path.resolve(rootDir, filePath);
  const dir = path.dirname(absPath);
  
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  const exists = fs.existsSync(absPath);
  
  // Track change before writing
  if (currentSessionId) {
    trackChange(currentSessionId, filePath, exists ? 'modify' : 'create');
  }
  
  fs.writeFileSync(absPath, content, 'utf-8');
  
  // Update with new content
  if (currentSessionId) {
    updateChangeContent(currentSessionId, filePath, content);
  }
  
  return exists ? `Successfully overwrote file: ${absPath}` : `Successfully created file: ${absPath}`;
}

export async function globFiles(pattern: string, searchPath?: string, caseSensitive = false, respectGitIgnore = true): Promise<string> {
  const base = searchPath ? path.resolve(rootDir, searchPath) : rootDir;
  const files = await fg(pattern, {
    cwd: base,
    absolute: true,
    caseSensitiveMatch: caseSensitive,
    ignore: respectGitIgnore ? ['**/node_modules/**', '**/.git/**'] : []
  });

  const sorted = files.sort((a, b) => {
    const statA = fs.statSync(a);
    const statB = fs.statSync(b);
    return statB.mtimeMs - statA.mtimeMs;
  });

  return `Found ${sorted.length} file(s) matching "${pattern}":\n${sorted.join('\n')}`;
}

export async function searchFileContent(pattern: string, searchPath?: string, include?: string): Promise<string> {
  const base = searchPath ? path.resolve(rootDir, searchPath) : rootDir;
  const files = await fg(include || '**/*', {
    cwd: base,
    absolute: true,
    ignore: ['**/node_modules/**', '**/.git/**']
  });

  const matches: string[] = [];
  const regex = new RegExp(pattern, 'gi');

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (regex.test(line)) {
          matches.push(`File: ${path.relative(base, file)}\nL${i + 1}: ${line.trim()}`);
        }
      });
    } catch {}
  }

  return matches.length ? `Found ${matches.length} matches:\n---\n${matches.join('\n---\n')}` : 'No matches found';
}

export async function replaceInFile(filePath: string, oldString: string, newString: string, expectedReplacements = 1): Promise<string> {
  const absPath = path.resolve(rootDir, filePath);

  if (!oldString && !fs.existsSync(absPath)) {
    // Track as create
    if (currentSessionId) {
      trackChange(currentSessionId, filePath, 'create');
    }
    fs.writeFileSync(absPath, newString, 'utf-8');
    if (currentSessionId) {
      updateChangeContent(currentSessionId, filePath, newString);
    }
    return `Created new file: ${absPath}`;
  }

  if (!fs.existsSync(absPath)) throw new Error(`File not found: ${absPath}`);

  // Track as modify
  if (currentSessionId) {
    trackChange(currentSessionId, filePath, 'modify');
  }

  let content = fs.readFileSync(absPath, 'utf-8');
  const count = (content.match(new RegExp(oldString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;

  if (count !== expectedReplacements) {
    throw new Error(`Expected ${expectedReplacements} occurrences but found ${count}`);
  }

  content = content.replace(oldString, newString);
  fs.writeFileSync(absPath, content, 'utf-8');
  
  if (currentSessionId) {
    updateChangeContent(currentSessionId, filePath, content);
  }

  return `Successfully modified file: ${absPath} (${expectedReplacements} replacements)`;
}
