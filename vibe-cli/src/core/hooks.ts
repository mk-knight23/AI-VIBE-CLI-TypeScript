/**
 * Hooks - Pre/post command automation
 * Inspired by Kiro CLI hooks system
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const HOOKS_FILE = '.vibe/hooks.json';

export interface Hook {
  name: string;
  trigger: 'pre-commit' | 'post-commit' | 'pre-push' | 'on-save' | 'on-create' | 'on-error' | 'custom';
  command: string;
  pattern?: string;  // File pattern to match
  enabled: boolean;
}

export interface HooksConfig {
  hooks: Hook[];
  autoFormat: boolean;
  autoTest: boolean;
  autoLint: boolean;
}

const DEFAULT_CONFIG: HooksConfig = {
  hooks: [],
  autoFormat: false,
  autoTest: false,
  autoLint: false
};

export function loadHooks(projectPath: string = process.cwd()): HooksConfig {
  const hooksPath = path.join(projectPath, HOOKS_FILE);
  try {
    if (fs.existsSync(hooksPath)) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(hooksPath, 'utf8')) };
    }
  } catch {}
  return DEFAULT_CONFIG;
}

export function saveHooks(config: HooksConfig, projectPath: string = process.cwd()): void {
  const hooksPath = path.join(projectPath, HOOKS_FILE);
  const dir = path.dirname(hooksPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(hooksPath, JSON.stringify(config, null, 2));
}

export function runHook(trigger: Hook['trigger'], context?: { file?: string; error?: string }): string[] {
  const config = loadHooks();
  const results: string[] = [];

  const matchingHooks = config.hooks.filter(h => 
    h.enabled && h.trigger === trigger &&
    (!h.pattern || !context?.file || new RegExp(h.pattern).test(context.file))
  );

  for (const hook of matchingHooks) {
    try {
      let cmd = hook.command;
      if (context?.file) cmd = cmd.replace('${file}', context.file);
      if (context?.error) cmd = cmd.replace('${error}', context.error);
      
      const output = execSync(cmd, { encoding: 'utf8', timeout: 30000 });
      results.push(`✅ ${hook.name}: ${output.trim().slice(0, 100)}`);
    } catch (err) {
      results.push(`❌ ${hook.name}: ${(err as Error).message}`);
    }
  }

  // Auto-actions
  if (trigger === 'on-save' && context?.file) {
    if (config.autoFormat) {
      results.push(...runAutoFormat(context.file));
    }
    if (config.autoLint) {
      results.push(...runAutoLint(context.file));
    }
  }

  return results;
}

function runAutoFormat(file: string): string[] {
  const ext = path.extname(file);
  const formatters: Record<string, string> = {
    '.ts': 'npx prettier --write',
    '.tsx': 'npx prettier --write',
    '.js': 'npx prettier --write',
    '.py': 'black',
    '.rs': 'rustfmt',
    '.go': 'gofmt -w'
  };

  const formatter = formatters[ext];
  if (!formatter) return [];

  try {
    execSync(`${formatter} "${file}"`, { encoding: 'utf8', timeout: 10000 });
    return [`✅ Formatted ${path.basename(file)}`];
  } catch {
    return [];
  }
}

function runAutoLint(file: string): string[] {
  const ext = path.extname(file);
  const linters: Record<string, string> = {
    '.ts': 'npx eslint --fix',
    '.tsx': 'npx eslint --fix',
    '.js': 'npx eslint --fix',
    '.py': 'ruff check --fix'
  };

  const linter = linters[ext];
  if (!linter) return [];

  try {
    execSync(`${linter} "${file}"`, { encoding: 'utf8', timeout: 10000 });
    return [`✅ Linted ${path.basename(file)}`];
  } catch {
    return [];
  }
}

export function addHook(hook: Hook): void {
  const config = loadHooks();
  config.hooks.push(hook);
  saveHooks(config);
}

export function removeHook(name: string): boolean {
  const config = loadHooks();
  const idx = config.hooks.findIndex(h => h.name === name);
  if (idx >= 0) {
    config.hooks.splice(idx, 1);
    saveHooks(config);
    return true;
  }
  return false;
}

export function listHooks(): Hook[] {
  return loadHooks().hooks;
}
