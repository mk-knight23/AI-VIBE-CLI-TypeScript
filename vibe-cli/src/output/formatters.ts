/**
 * Output Formatters - Convert agent outputs to various formats
 */

import * as fs from 'fs';
import * as path from 'path';

export type OutputFormat = 'markdown' | 'json' | 'table' | 'csv' | 'yaml' | 'html';

interface TableData {
  headers: string[];
  rows: (string | number)[][];
}

export function formatOutput(data: unknown, format: OutputFormat): string {
  switch (format) {
    case 'json':
      return formatJson(data);
    case 'table':
      return formatTable(data);
    case 'csv':
      return formatCsv(data);
    case 'yaml':
      return formatYaml(data);
    case 'html':
      return formatHtml(data);
    case 'markdown':
    default:
      return formatMarkdown(data);
  }
}

function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

function formatMarkdown(data: unknown): string {
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) {
    return data.map(item => `- ${typeof item === 'object' ? JSON.stringify(item) : item}`).join('\n');
  }
  if (typeof data === 'object' && data !== null) {
    return Object.entries(data)
      .map(([k, v]) => `**${k}**: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join('\n');
  }
  return String(data);
}

function formatTable(data: unknown): string {
  const tableData = normalizeToTable(data);
  if (!tableData.headers.length) return '';

  const colWidths = tableData.headers.map((h, i) => 
    Math.max(h.length, ...tableData.rows.map(r => String(r[i] ?? '').length))
  );

  const header = tableData.headers.map((h, i) => h.padEnd(colWidths[i])).join(' │ ');
  const separator = colWidths.map(w => '─'.repeat(w)).join('─┼─');
  const rows = tableData.rows.map(row => 
    row.map((cell, i) => String(cell ?? '').padEnd(colWidths[i])).join(' │ ')
  );

  return [header, separator, ...rows].join('\n');
}

function formatCsv(data: unknown): string {
  const tableData = normalizeToTable(data);
  const escape = (s: string | number) => {
    const str = String(s);
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };

  const header = tableData.headers.map(escape).join(',');
  const rows = tableData.rows.map(row => row.map(escape).join(','));
  
  return [header, ...rows].join('\n');
}

function formatYaml(data: unknown): string {
  // Simple YAML serialization
  return serializeYaml(data, 0);
}

function serializeYaml(data: unknown, indent: number): string {
  const prefix = '  '.repeat(indent);
  
  if (data === null || data === undefined) return 'null';
  if (typeof data === 'boolean') return String(data);
  if (typeof data === 'number') return String(data);
  if (typeof data === 'string') {
    if (data.includes('\n')) return `|\n${data.split('\n').map(l => prefix + '  ' + l).join('\n')}`;
    if (data.includes(':') || data.includes('#')) return `"${data.replace(/"/g, '\\"')}"`;
    return data;
  }
  
  if (Array.isArray(data)) {
    if (data.length === 0) return '[]';
    return data.map(item => `${prefix}- ${serializeYaml(item, indent + 1).trimStart()}`).join('\n');
  }
  
  if (typeof data === 'object') {
    const entries = Object.entries(data);
    if (entries.length === 0) return '{}';
    return entries.map(([k, v]) => {
      const val = serializeYaml(v, indent + 1);
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        return `${prefix}${k}:\n${val}`;
      }
      return `${prefix}${k}: ${val}`;
    }).join('\n');
  }
  
  return String(data);
}

function formatHtml(data: unknown): string {
  const tableData = normalizeToTable(data);
  
  if (!tableData.headers.length) {
    return `<pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>`;
  }

  const headerRow = tableData.headers.map(h => `<th>${escapeHtml(String(h))}</th>`).join('');
  const bodyRows = tableData.rows.map(row => 
    `<tr>${row.map(cell => `<td>${escapeHtml(String(cell ?? ''))}</td>`).join('')}</tr>`
  ).join('\n');

  return `<table>
<thead><tr>${headerRow}</tr></thead>
<tbody>
${bodyRows}
</tbody>
</table>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function normalizeToTable(data: unknown): TableData {
  if (Array.isArray(data) && data.length > 0) {
    if (typeof data[0] === 'object' && data[0] !== null) {
      const headers = Object.keys(data[0]);
      const rows = data.map(item => headers.map(h => (item as Record<string, unknown>)[h] as string | number));
      return { headers, rows };
    }
    return { headers: ['Value'], rows: data.map(v => [v as string | number]) };
  }
  
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    return { headers: ['Key', 'Value'], rows: Object.entries(data) };
  }
  
  return { headers: [], rows: [] };
}

export function exportOutput(data: unknown, format: OutputFormat, filePath: string): void {
  const content = formatOutput(data, format);
  const dir = path.dirname(filePath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(filePath, content);
}

export function detectFormat(filePath: string): OutputFormat {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.json': return 'json';
    case '.csv': return 'csv';
    case '.yaml':
    case '.yml': return 'yaml';
    case '.html':
    case '.htm': return 'html';
    case '.md':
    case '.markdown': return 'markdown';
    default: return 'markdown';
  }
}
