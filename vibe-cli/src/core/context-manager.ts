/**
 * Context Manager - @workspace, file references, smart context
 * Inspired by Kiro CLI context management
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface ContextItem {
  type: 'file' | 'folder' | 'workspace' | 'url' | 'symbol';
  path: string;
  content?: string;
  summary?: string;
}

export interface ContextUsage {
  tokens: number;
  percentage: number;
  items: { name: string; tokens: number }[];
}

// Parse @mentions in user input
export function parseContextMentions(input: string): { cleanInput: string; mentions: ContextItem[] } {
  const mentions: ContextItem[] = [];
  let cleanInput = input;

  // @workspace - include project overview
  if (input.includes('@workspace')) {
    mentions.push({
      type: 'workspace',
      path: process.cwd(),
      content: getWorkspaceContext()
    });
    cleanInput = cleanInput.replace(/@workspace/g, '');
  }

  // @file:path - include specific file
  const fileMatches = input.matchAll(/@file:([^\s]+)/g);
  for (const match of fileMatches) {
    const filePath = match[1];
    if (fs.existsSync(filePath)) {
      mentions.push({
        type: 'file',
        path: filePath,
        content: fs.readFileSync(filePath, 'utf8').slice(0, 50000)
      });
    }
    cleanInput = cleanInput.replace(match[0], '');
  }

  // @folder:path - include folder structure
  const folderMatches = input.matchAll(/@folder:([^\s]+)/g);
  for (const match of folderMatches) {
    const folderPath = match[1];
    if (fs.existsSync(folderPath)) {
      mentions.push({
        type: 'folder',
        path: folderPath,
        content: getFolderStructure(folderPath)
      });
    }
    cleanInput = cleanInput.replace(match[0], '');
  }

  // @url:link - fetch URL content (placeholder)
  const urlMatches = input.matchAll(/@url:([^\s]+)/g);
  for (const match of urlMatches) {
    mentions.push({
      type: 'url',
      path: match[1],
      summary: `[URL: ${match[1]}]`
    });
    cleanInput = cleanInput.replace(match[0], '');
  }

  return { cleanInput: cleanInput.trim(), mentions };
}

// Build context string from mentions
export function buildContextString(mentions: ContextItem[]): string {
  if (mentions.length === 0) return '';

  let context = '\n--- Context ---\n';
  
  for (const item of mentions) {
    switch (item.type) {
      case 'workspace':
        context += `\n[Workspace: ${item.path}]\n${item.content}\n`;
        break;
      case 'file':
        context += `\n[File: ${item.path}]\n\`\`\`\n${item.content}\n\`\`\`\n`;
        break;
      case 'folder':
        context += `\n[Folder: ${item.path}]\n${item.content}\n`;
        break;
      case 'url':
        context += `\n${item.summary}\n`;
        break;
    }
  }

  return context + '--- End Context ---\n';
}

// Get workspace overview
function getWorkspaceContext(): string {
  const cwd = process.cwd();
  const lines: string[] = [];

  // Project name
  lines.push(`Project: ${path.basename(cwd)}`);

  // Package.json info
  const pkgPath = path.join(cwd, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      lines.push(`Type: ${pkg.type || 'commonjs'}`);
      lines.push(`Dependencies: ${Object.keys(pkg.dependencies || {}).length}`);
    } catch {}
  }

  // Git info
  try {
    const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    lines.push(`Git branch: ${branch}`);
  } catch {}

  // File structure (top level)
  lines.push('\nStructure:');
  lines.push(getFolderStructure(cwd, 2));

  return lines.join('\n');
}

// Get folder structure
function getFolderStructure(folderPath: string, maxDepth = 3): string {
  const lines: string[] = [];
  
  function scan(dir: string, depth: number, prefix: string) {
    if (depth > maxDepth) return;
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
        .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules')
        .slice(0, 20);

      for (const entry of entries) {
        const icon = entry.isDirectory() ? '📁' : '📄';
        lines.push(`${prefix}${icon} ${entry.name}`);
        
        if (entry.isDirectory()) {
          scan(path.join(dir, entry.name), depth + 1, prefix + '  ');
        }
      }
    } catch {}
  }

  scan(folderPath, 0, '');
  return lines.join('\n');
}

// Estimate context usage
export function estimateContextUsage(messages: any[], maxTokens = 128000): ContextUsage {
  const items: { name: string; tokens: number }[] = [];
  let total = 0;

  for (const msg of messages) {
    const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
    const tokens = Math.ceil(content.length / 4); // Rough estimate
    items.push({ name: msg.role, tokens });
    total += tokens;
  }

  return {
    tokens: total,
    percentage: Math.round((total / maxTokens) * 100),
    items
  };
}
