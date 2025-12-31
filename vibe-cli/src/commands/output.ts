/**
 * Output Command - Format and export data
 */

import * as fs from 'fs';
import { formatOutput, exportOutput, detectFormat, OutputFormat } from '../output/formatters';
import pc from 'picocolors';

export function outputCommand(action?: string, arg?: string, options: Record<string, unknown> = {}): void {
  switch (action) {
    case 'table':
    case 'json':
    case 'csv':
    case 'yaml':
    case 'markdown':
    case 'html':
      if (!arg) {
        console.log(`Usage: vibe output ${action} <file-or-data>`);
        return;
      }
      formatData(action as OutputFormat, arg, options);
      break;

    case 'convert':
      if (!arg) {
        console.log('Usage: vibe output convert <file> --to <format>');
        return;
      }
      convertFile(arg, options);
      break;

    default:
      showHelp();
  }
}

function formatData(format: OutputFormat, input: string, options: Record<string, unknown>): void {
  let data: unknown;

  // Try to read as file first
  if (fs.existsSync(input)) {
    const content = fs.readFileSync(input, 'utf-8');
    try {
      data = JSON.parse(content);
    } catch {
      // Treat as raw content
      data = content.split('\n').filter(Boolean);
    }
  } else {
    // Try to parse as JSON
    try {
      data = JSON.parse(input);
    } catch {
      // Treat as raw string
      data = input;
    }
  }

  const output = formatOutput(data, format);
  
  if (options.output) {
    fs.writeFileSync(String(options.output), output);
    console.log(pc.green(`✅ Saved to ${options.output}`));
  } else {
    console.log(output);
  }
}

function convertFile(filePath: string, options: Record<string, unknown>): void {
  if (!fs.existsSync(filePath)) {
    console.log(pc.red(`File not found: ${filePath}`));
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFormat = detectFormat(filePath);
  const targetFormat = (options.to as OutputFormat) || 'json';

  let data: unknown;
  
  // Parse source
  try {
    if (sourceFormat === 'json') {
      data = JSON.parse(content);
    } else if (sourceFormat === 'csv') {
      data = parseCsv(content);
    } else {
      // Treat as text lines
      data = content.split('\n').filter(Boolean);
    }
  } catch (err) {
    console.log(pc.red(`Failed to parse ${filePath}: ${err}`));
    return;
  }

  const output = formatOutput(data, targetFormat);

  if (options.output) {
    fs.writeFileSync(String(options.output), output);
    console.log(pc.green(`✅ Converted to ${options.output}`));
  } else {
    console.log(output);
  }
}

function parseCsv(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] || '';
    });
    return obj;
  });
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

function showHelp(): void {
  console.log(`
${pc.cyan('Output Formatting')}

${pc.bold('Usage:')} vibe output <format> <data> [options]

${pc.bold('Formats:')}
  table       Terminal table
  json        JSON (pretty-printed)
  csv         CSV format
  yaml        YAML format
  markdown    Markdown
  html        HTML table

${pc.bold('Commands:')}
  vibe output table <file>           Format as table
  vibe output json <file>            Format as JSON
  vibe output csv <file>             Format as CSV
  vibe output convert <file> --to <format>

${pc.bold('Options:')}
  --output <file>    Save to file instead of stdout
  --to <format>      Target format for conversion

${pc.bold('Examples:')}
  vibe output table data.json
  vibe output csv data.json --output data.csv
  vibe output convert data.csv --to json
  echo '[{"a":1},{"a":2}]' | vibe output table -
`);
}
