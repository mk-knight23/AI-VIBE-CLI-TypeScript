/**
 * Memory Command - Project and session memory management
 */

import * as fs from 'fs';
import * as path from 'path';
import pc from 'picocolors';

const MEMORY_DIR = '.vibe/memory';

interface MemoryEntry {
  key: string;
  content: string;
  scope: 'project' | 'global';
  updated: string;
  tokens?: number;
}

export function memoryCommand(action?: string, arg?: string, content?: string): void {
  switch (action) {
    case 'list':
    case undefined:
      listMemory();
      break;

    case 'add':
      if (!arg) {
        console.log('Usage: vibe memory add <file-or-key> [content]');
        return;
      }
      addMemory(arg, content);
      break;

    case 'show':
      if (!arg) {
        console.log('Usage: vibe memory show <key>');
        return;
      }
      showMemory(arg);
      break;

    case 'remove':
      if (!arg) {
        console.log('Usage: vibe memory remove <key>');
        return;
      }
      removeMemory(arg);
      break;

    case 'clear':
      clearMemory(arg as 'project' | 'session' | undefined);
      break;

    case 'query':
      if (!arg) {
        console.log('Usage: vibe memory query <question>');
        return;
      }
      queryMemory(arg);
      break;

    default:
      showHelp();
  }
}

function getMemoryDir(scope: 'project' | 'global' = 'project'): string {
  if (scope === 'global') {
    const home = process.env.HOME || process.env.USERPROFILE || '.';
    return path.join(home, '.vibe', 'memory');
  }
  return path.join(process.cwd(), MEMORY_DIR);
}

function ensureMemoryDir(scope: 'project' | 'global' = 'project'): string {
  const dir = getMemoryDir(scope);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function listMemory(): void {
  console.log(pc.cyan('\n━━━ Memory ━━━\n'));

  // Project memory
  const projectDir = getMemoryDir('project');
  if (fs.existsSync(projectDir)) {
    const files = fs.readdirSync(projectDir).filter(f => f.endsWith('.md'));
    if (files.length > 0) {
      console.log(pc.bold('Project Memory:'));
      for (const file of files) {
        const key = path.basename(file, '.md');
        const stat = fs.statSync(path.join(projectDir, file));
        const content = fs.readFileSync(path.join(projectDir, file), 'utf-8');
        const tokens = Math.ceil(content.length / 4); // Rough estimate
        console.log(`  ${pc.green(key.padEnd(20))} ${pc.dim(`~${tokens} tokens, updated ${stat.mtime.toLocaleDateString()}`)}`);
      }
    }
  }

  // Global memory
  const globalDir = getMemoryDir('global');
  if (fs.existsSync(globalDir)) {
    const files = fs.readdirSync(globalDir).filter(f => f.endsWith('.md'));
    if (files.length > 0) {
      console.log(pc.bold('\nGlobal Memory:'));
      for (const file of files) {
        const key = path.basename(file, '.md');
        const stat = fs.statSync(path.join(globalDir, file));
        console.log(`  ${pc.yellow(key.padEnd(20))} ${pc.dim(`updated ${stat.mtime.toLocaleDateString()}`)}`);
      }
    }
  }

  console.log(pc.dim('\nUse "vibe memory add <file>" to add context'));
  console.log(pc.dim('Use "vibe memory show <key>" to view content\n'));
}

function addMemory(arg: string, content?: string): void {
  const scope: 'project' | 'global' = arg.startsWith('global:') ? 'global' : 'project';
  const key = arg.replace(/^(global:|project:)/, '');
  const dir = ensureMemoryDir(scope);

  let memoryContent: string;
  let sourceName: string;

  if (content) {
    // Direct content
    memoryContent = content;
    sourceName = key;
  } else if (fs.existsSync(key)) {
    // File path
    memoryContent = fs.readFileSync(key, 'utf-8');
    sourceName = path.basename(key, path.extname(key));
  } else {
    console.log(pc.red(`File not found: ${key}`));
    return;
  }

  // Add frontmatter
  const now = new Date().toISOString();
  const tokens = Math.ceil(memoryContent.length / 4);
  const finalContent = `---
scope: ${scope}
updated: ${now}
tokens: ${tokens}
---

${memoryContent}`;

  const filePath = path.join(dir, `${sourceName}.md`);
  fs.writeFileSync(filePath, finalContent);

  console.log(pc.green(`✅ Added to ${scope} memory: ${sourceName}`));
  console.log(pc.dim(`   ~${tokens} tokens`));
}

function showMemory(key: string): void {
  // Check project first, then global
  for (const scope of ['project', 'global'] as const) {
    const filePath = path.join(getMemoryDir(scope), `${key}.md`);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      console.log(pc.cyan(`\n━━━ ${key} (${scope}) ━━━\n`));
      console.log(content);
      return;
    }
  }

  console.log(pc.red(`Memory not found: ${key}`));
}

function removeMemory(key: string): void {
  for (const scope of ['project', 'global'] as const) {
    const filePath = path.join(getMemoryDir(scope), `${key}.md`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(pc.green(`✅ Removed from ${scope} memory: ${key}`));
      return;
    }
  }

  console.log(pc.red(`Memory not found: ${key}`));
}

function clearMemory(scope?: 'project' | 'session'): void {
  if (scope === 'session') {
    // Session memory is in-memory, handled elsewhere
    console.log(pc.green('✅ Session memory cleared'));
    return;
  }

  const dir = getMemoryDir('project');
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      fs.unlinkSync(path.join(dir, file));
    }
    console.log(pc.green(`✅ Cleared ${files.length} memory entries`));
  } else {
    console.log(pc.dim('No memory to clear'));
  }
}

function queryMemory(question: string): void {
  // Collect all memory content
  const memories: string[] = [];
  
  for (const scope of ['project', 'global'] as const) {
    const dir = getMemoryDir(scope);
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(dir, file), 'utf-8');
        memories.push(`[${scope}/${path.basename(file, '.md')}]\n${content}`);
      }
    }
  }

  if (memories.length === 0) {
    console.log(pc.dim('No memory available to query'));
    return;
  }

  // Simple keyword search
  const keywords = question.toLowerCase().split(/\s+/);
  const matches: Array<{ source: string; snippet: string; score: number }> = [];

  for (const memory of memories) {
    const lines = memory.split('\n');
    const source = lines[0];
    const content = lines.slice(1).join('\n').toLowerCase();
    
    let score = 0;
    for (const keyword of keywords) {
      if (content.includes(keyword)) score++;
    }

    if (score > 0) {
      // Find relevant snippet
      const contentLines = memory.split('\n').slice(1);
      for (const line of contentLines) {
        if (keywords.some(k => line.toLowerCase().includes(k))) {
          matches.push({ source, snippet: line.slice(0, 100), score });
          break;
        }
      }
    }
  }

  matches.sort((a, b) => b.score - a.score);

  console.log(pc.cyan('\n━━━ Memory Query Results ━━━\n'));
  
  if (matches.length === 0) {
    console.log(pc.dim('No relevant memory found'));
  } else {
    for (const match of matches.slice(0, 5)) {
      console.log(`${pc.green(match.source)}`);
      console.log(`  ${pc.dim(match.snippet)}...`);
    }
  }
}

function showHelp(): void {
  console.log(`
${pc.cyan('Memory Management')}

${pc.bold('Usage:')} vibe memory [command]

${pc.bold('Commands:')}
  list                    List all memory entries
  add <file>              Add file to project memory
  add <key> <content>     Add content with key
  add global:<key>        Add to global memory
  show <key>              Show memory content
  remove <key>            Remove memory entry
  clear [project|session] Clear memory
  query <question>        Search memory

${pc.bold('Memory Scopes:')}
  project   Stored in .vibe/memory/ (per-project)
  global    Stored in ~/.vibe/memory/ (user-wide)
  session   In-memory only (cleared on exit)

${pc.bold('Examples:')}
  vibe memory add README.md
  vibe memory add style-guide "Use TypeScript, prefer const"
  vibe memory add global:preferences "Always use dark mode"
  vibe memory query "coding conventions"
`);
}
