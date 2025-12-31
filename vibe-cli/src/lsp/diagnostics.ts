/**
 * LSP Diagnostics - Read-only access to language server diagnostics
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface Diagnostic {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'info' | 'hint';
  message: string;
  source?: string;
  code?: string;
}

export interface DiagnosticsResult {
  diagnostics: Diagnostic[];
  errorCount: number;
  warningCount: number;
}

export async function getDiagnostics(projectPath: string = process.cwd()): Promise<DiagnosticsResult> {
  const diagnostics: Diagnostic[] = [];

  // TypeScript diagnostics
  const tsDiags = await getTypeScriptDiagnostics(projectPath);
  diagnostics.push(...tsDiags);

  // ESLint diagnostics
  const eslintDiags = await getESLintDiagnostics(projectPath);
  diagnostics.push(...eslintDiags);

  return {
    diagnostics,
    errorCount: diagnostics.filter(d => d.severity === 'error').length,
    warningCount: diagnostics.filter(d => d.severity === 'warning').length
  };
}

async function getTypeScriptDiagnostics(projectPath: string): Promise<Diagnostic[]> {
  const tsconfig = path.join(projectPath, 'tsconfig.json');
  if (!fs.existsSync(tsconfig)) return [];

  try {
    const output = execSync('npx tsc --noEmit --pretty false 2>&1 || true', {
      cwd: projectPath,
      encoding: 'utf8',
      timeout: 30000
    });

    return parseTscOutput(output);
  } catch {
    return [];
  }
}

function parseTscOutput(output: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    // Format: file(line,col): error TS1234: message
    const match = line.match(/^(.+)\((\d+),(\d+)\):\s*(error|warning)\s+(TS\d+):\s*(.+)$/);
    if (match) {
      diagnostics.push({
        file: match[1],
        line: parseInt(match[2]),
        column: parseInt(match[3]),
        severity: match[4] as 'error' | 'warning',
        code: match[5],
        message: match[6],
        source: 'typescript'
      });
    }
  }

  return diagnostics;
}

async function getESLintDiagnostics(projectPath: string): Promise<Diagnostic[]> {
  const eslintConfig = ['.eslintrc', '.eslintrc.js', '.eslintrc.json', 'eslint.config.js']
    .some(f => fs.existsSync(path.join(projectPath, f)));
  
  if (!eslintConfig) return [];

  try {
    const output = execSync('npx eslint . --format json 2>/dev/null || true', {
      cwd: projectPath,
      encoding: 'utf8',
      timeout: 60000
    });

    return parseESLintOutput(output);
  } catch {
    return [];
  }
}

function parseESLintOutput(output: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  try {
    const results = JSON.parse(output);
    for (const file of results) {
      for (const msg of file.messages || []) {
        diagnostics.push({
          file: file.filePath,
          line: msg.line || 1,
          column: msg.column || 1,
          severity: msg.severity === 2 ? 'error' : 'warning',
          message: msg.message,
          code: msg.ruleId,
          source: 'eslint'
        });
      }
    }
  } catch {}

  return diagnostics;
}

export function formatDiagnostics(result: DiagnosticsResult): string {
  if (result.diagnostics.length === 0) {
    return '✅ No diagnostics found';
  }

  const lines: string[] = [];
  lines.push(`Found ${result.errorCount} errors, ${result.warningCount} warnings\n`);

  const byFile = new Map<string, Diagnostic[]>();
  for (const d of result.diagnostics) {
    if (!byFile.has(d.file)) byFile.set(d.file, []);
    byFile.get(d.file)!.push(d);
  }

  for (const [file, diags] of byFile) {
    lines.push(`📄 ${file}`);
    for (const d of diags.slice(0, 10)) {
      const icon = d.severity === 'error' ? '❌' : '⚠️';
      lines.push(`  ${icon} ${d.line}:${d.column} ${d.message} [${d.code || d.source}]`);
    }
    if (diags.length > 10) {
      lines.push(`  ... and ${diags.length - 10} more`);
    }
  }

  return lines.join('\n');
}
