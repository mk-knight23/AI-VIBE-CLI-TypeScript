/**
 * Rules System - Project-level rules for AI behavior
 * Location: .vibe/rules/*.md or ~/.vibe/rules/*.md
 */

import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

export interface Rule {
  name: string;
  content: string;
  priority: number;
  scope: 'always' | 'code' | 'docs' | 'tests' | 'shell';
  source: 'project' | 'user';
}

const PROJECT_RULES_DIR = path.join(process.cwd(), '.vibe', 'rules');
const USER_RULES_DIR = path.join(homedir(), '.vibe', 'rules');

export function loadRules(scope?: string): Rule[] {
  const rules: Rule[] = [];

  // Load project rules (higher priority)
  if (fs.existsSync(PROJECT_RULES_DIR)) {
    rules.push(...loadRulesFromDir(PROJECT_RULES_DIR, 'project'));
  }

  // Load user rules
  if (fs.existsSync(USER_RULES_DIR)) {
    const userRules = loadRulesFromDir(USER_RULES_DIR, 'user');
    for (const rule of userRules) {
      if (!rules.find(r => r.name === rule.name)) {
        rules.push(rule);
      }
    }
  }

  // Filter by scope if provided
  const filtered = scope 
    ? rules.filter(r => r.scope === 'always' || r.scope === scope)
    : rules;

  return filtered.sort((a, b) => a.priority - b.priority);
}

function loadRulesFromDir(dir: string, source: 'project' | 'user'): Rule[] {
  const rules: Rule[] = [];
  
  try {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const rule = parseRuleFile(content, file, source);
      if (rule) rules.push(rule);
    }
  } catch {}

  return rules;
}

function parseRuleFile(content: string, filename: string, source: 'project' | 'user'): Rule | null {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  
  let name = filename.replace('.md', '');
  let priority = 50;
  let scope: Rule['scope'] = 'always';
  let ruleContent = content;

  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    ruleContent = frontmatterMatch[2].trim();
    
    const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
    const priorityMatch = frontmatter.match(/^priority:\s*(\d+)$/m);
    const scopeMatch = frontmatter.match(/^scope:\s*(.+)$/m);
    
    if (nameMatch) name = nameMatch[1].trim();
    if (priorityMatch) priority = parseInt(priorityMatch[1], 10);
    if (scopeMatch) scope = scopeMatch[1].trim() as Rule['scope'];
  }

  if (!ruleContent) return null;

  return { name, content: ruleContent, priority, scope, source };
}

export function getRulesPrompt(scope?: string): string {
  const rules = loadRules(scope);
  if (rules.length === 0) return '';

  const sections = rules.map(r => `## ${r.name}\n${r.content}`);
  return `# Project Rules\n\n${sections.join('\n\n')}`;
}

export function createRule(name: string, content: string, options: Partial<Rule> = {}): string {
  const dir = PROJECT_RULES_DIR;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const frontmatter = [
    '---',
    `name: ${name}`,
    `priority: ${options.priority || 50}`,
    `scope: ${options.scope || 'always'}`,
    '---'
  ].join('\n');

  const fullContent = `${frontmatter}\n${content}`;
  const filePath = path.join(dir, `${name}.md`);
  fs.writeFileSync(filePath, fullContent);
  return filePath;
}

export function listRules(): { name: string; scope: string; source: string; priority: number }[] {
  return loadRules().map(r => ({
    name: r.name,
    scope: r.scope,
    source: r.source,
    priority: r.priority
  }));
}
