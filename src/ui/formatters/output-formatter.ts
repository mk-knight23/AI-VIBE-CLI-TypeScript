/**
 * VIBE-CLI v0.0.2 - Output Formatter
 * Generate reports and exports in multiple formats
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Output format types
 */
export type OutputFormat = 'markdown' | 'json' | 'html' | 'plain-text' | 'csv' | 'yaml';

/**
 * Export options
 */
export interface ExportOptions {
  format: OutputFormat;
  title?: string;
  includeMetadata?: boolean;
  prettyPrint?: boolean;
  template?: string;
}

/**
 * Report type
 */
export type ReportType =
  | 'analysis'
  | 'summary'
  | 'metrics'
  | 'diff'
  | 'checkpoints'
  | 'history'
  | 'dependencies'
  | 'custom';

/**
 * Report data interface
 */
export interface ReportData {
  type: ReportType;
  title?: string;
  sections: ReportSection[];
  metadata?: Record<string, unknown>;
  generatedAt?: Date;
}

/**
 * Report section
 */
export interface ReportSection {
  title: string;
  content: string | Record<string, unknown> | unknown[];
  level?: number;
}

/**
 * Export result
 */
export interface ExportResult {
  success: boolean;
  content: string;
  format: OutputFormat;
  filePath?: string;
  error?: string;
}

/**
 * Code snippet export
 */
export interface CodeSnippetExport {
  filePath: string;
  content: string;
  language: string;
  lineStart?: number;
  lineEnd?: number;
  annotations?: CodeAnnotation[];
}

/**
 * Code annotation
 */
export interface CodeAnnotation {
  line: number;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

/**
 * Output Formatter
 */
export class OutputFormatter {
  /**
   * Format data as the specified format
   */
  format(
    data: unknown,
    format: OutputFormat,
    options: Partial<ExportOptions> = {}
  ): string {
    switch (format) {
      case 'json':
        return this.formatAsJSON(data, options.prettyPrint);
      case 'markdown':
        return this.formatAsMarkdown(data as ReportData, options.title);
      case 'html':
        return this.formatAsHTML(data as ReportData, options.title);
      case 'csv':
        return this.formatAsCSV(data as Record<string, unknown>[]);
      case 'yaml':
        return this.formatAsYAML(data);
      case 'plain-text':
      default:
        return this.formatAsPlainText(data);
    }
  }

  /**
   * Format as JSON
   */
  formatAsJSON(data: unknown, prettyPrint: boolean = true): string {
    if (prettyPrint) {
      return JSON.stringify(data, null, 2);
    }
    return JSON.stringify(data);
  }

  /**
   * Format as Markdown
   */
  formatAsMarkdown(data: ReportData, customTitle?: string): string {
    const lines: string[] = [];

    // Title
    const title = customTitle || data.title || data.type.toUpperCase();
    lines.push(`# ${title}`);
    lines.push('');

    // Metadata
    if (data.metadata || data.generatedAt) {
      lines.push('## Metadata');
      lines.push('');
      if (data.generatedAt) {
        lines.push(`- **Generated:** ${data.generatedAt.toLocaleString()}`);
      }
      if (data.metadata) {
        for (const [key, value] of Object.entries(data.metadata)) {
          lines.push(`- **${this.titleCase(key)}:** ${JSON.stringify(value)}`);
        }
      }
      lines.push('');
    }

    // Sections
    for (const section of data.sections) {
      const heading = '='.repeat(Math.min(section.level || 2, 6));
      lines.push(`${heading}`);
      lines.push(`## ${section.title}`);
      lines.push('');

      if (typeof section.content === 'string') {
        lines.push(section.content);
      } else if (Array.isArray(section.content)) {
        for (const item of section.content) {
          if (typeof item === 'string') {
            lines.push(`- ${item}`);
          } else {
            lines.push(`- ${JSON.stringify(item)}`);
          }
        }
      } else if (typeof section.content === 'object') {
        lines.push('```json');
        lines.push(JSON.stringify(section.content, null, 2));
        lines.push('```');
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format as HTML
   */
  formatAsHTML(data: ReportData, customTitle?: string): string {
    const lines: string[] = [];

    const title = customTitle || data.title || data.type.toUpperCase();

    lines.push('<!DOCTYPE html>');
    lines.push('<html lang="en">');
    lines.push('<head>');
    lines.push('  <meta charset="UTF-8">');
    lines.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
    lines.push(`  <title>${title}</title>`);
    lines.push('  <style>');
    lines.push('    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;');
    lines.push('             max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }');
    lines.push('    h1 { color: #06b6d4; border-bottom: 2px solid #06b6d4; padding-bottom: 10px; }');
    lines.push('    h2 { color: #334155; margin-top: 30px; }');
    lines.push('    pre { background: #1e293b; color: #e2e8f0; padding: 15px; border-radius: 8px; overflow-x: auto; }');
    lines.push('    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }');
    lines.push('    .metadata { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }');
    lines.push('    .success { color: #16a34a; }');
    lines.push('    .error { color: #dc2626; }');
    lines.push('    .warning { color: #d97706; }');
    lines.push('  </style>');
    lines.push('</head>');
    lines.push('<body>');
    lines.push('');
    lines.push(`<h1>${title}</h1>`);

    // Metadata
    if (data.metadata || data.generatedAt) {
      lines.push('<div class="metadata">');
      lines.push('<strong>Metadata</strong>');
      lines.push('<ul>');
      if (data.generatedAt) {
        lines.push(`<li><strong>Generated:</strong> ${data.generatedAt.toLocaleString()}</li>`);
      }
      if (data.metadata) {
        for (const [key, value] of Object.entries(data.metadata)) {
          lines.push(`<li><strong>${this.titleCase(key)}:</strong> ${JSON.stringify(value)}</li>`);
        }
      }
      lines.push('</ul>');
      lines.push('</div>');
    }

    // Sections
    for (const section of data.sections) {
      lines.push(`<h2>${section.title}</h2>`);

      if (typeof section.content === 'string') {
        lines.push(`<p>${section.content.replace(/\n/g, '<br>')}</p>`);
      } else if (Array.isArray(section.content)) {
        lines.push('<ul>');
        for (const item of section.content) {
          if (typeof item === 'string') {
            lines.push(`<li>${item}</li>`);
          } else {
            lines.push(`<li><pre>${JSON.stringify(item, null, 2)}</pre></li>`);
          }
        }
        lines.push('</ul>');
      } else if (typeof section.content === 'object') {
        lines.push(`<pre><code>${JSON.stringify(section.content, null, 2)}</code></pre>`);
      }
    }

    lines.push('');
    lines.push('</body>');
    lines.push('</html>');

    return lines.join('\n');
  }

  /**
   * Format as CSV
   */
  formatAsCSV(data: Record<string, unknown>[]): string {
    if (data.length === 0) return '';

    const lines: string[] = [];
    const headers = Object.keys(data[0]);

    // Header row
    lines.push(headers.join(','));

    // Data rows
    for (const row of data) {
      const values = headers.map((header) => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      });
      lines.push(values.join(','));
    }

    return lines.join('\n');
  }

  /**
   * Format as YAML
   */
  formatAsYAML(data: unknown, indent: number = 0): string {
    const lines: string[] = [];
    const spaces = '  '.repeat(indent);

    if (typeof data === 'object' && data !== null) {
      if (Array.isArray(data)) {
        for (const item of data) {
          if (typeof item === 'object' && item !== null) {
            lines.push(`${spaces}-`);
            lines.push(this.formatAsYAML(item, indent + 1));
          } else {
            lines.push(`${spaces}- ${item}`);
          }
        }
      } else {
        const obj = data as Record<string, unknown>;
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'object' && value !== null) {
            lines.push(`${this.titleCase(key)}:`);
            lines.push(this.formatAsYAML(value, indent + 1));
          } else {
            lines.push(`${this.titleCase(key)}: ${value}`);
          }
        }
      }
    } else {
      lines.push(String(data));
    }

    return lines.join('\n');
  }

  /**
   * Format as plain text
   */
  formatAsPlainText(data: unknown): string {
    if (typeof data === 'string') return data;
    if (typeof data === 'object' && data !== null) {
      return JSON.stringify(data, null, 2);
    }
    return String(data);
  }

  /**
   * Export code snippet
   */
  exportCodeSnippet(snippet: CodeSnippetExport, format: OutputFormat): string {
    switch (format) {
      case 'html':
        return this.exportCodeAsHTML(snippet);
      case 'markdown':
        return this.exportCodeAsMarkdown(snippet);
      default:
        return snippet.content;
    }
  }

  /**
   * Export code as HTML with syntax highlighting (simplified)
   */
  private exportCodeAsHTML(snippet: CodeSnippetExport): string {
    const lines: string[] = [];

    lines.push('```html');
    lines.push('<div class="code-snippet">');
    lines.push(`  <div class="filename">${snippet.filePath}</div>`);
    lines.push('  <pre>');
    lines.push('    <code class="language-' + snippet.language + '">');

    let lineNum = snippet.lineStart || 1;
    for (const line of snippet.content.split('\n')) {
      let htmlLine = this.escapeHTML(line);

      // Add line number
      htmlLine = `<span class="line-number">${lineNum}</span>  ${htmlLine}`;

      // Add annotations
      if (snippet.annotations) {
        for (const ann of snippet.annotations) {
          if (ann.line === lineNum) {
            htmlLine += ` <span class="annotation ${ann.type}">${ann.message}</span>`;
          }
        }
      }

      lines.push(htmlLine);
      lineNum++;
    }

    lines.push('    </code>');
    lines.push('  </pre>');
    lines.push('</div>');
    lines.push('```');

    return lines.join('\n');
  }

  /**
   * Export code as Markdown with syntax highlighting
   */
  private exportCodeAsMarkdown(snippet: CodeSnippetExport): string {
    const lines: string[] = [];

    lines.push(`**File:** ${snippet.filePath}`);
    if (snippet.lineStart && snippet.lineEnd) {
      lines.push(`**Lines:** ${snippet.lineStart}-${snippet.lineEnd}`);
    }
    lines.push('');
    lines.push(`\`\`\`${snippet.language}`);

    let lineNum = snippet.lineStart || 1;
    for (const line of snippet.content.split('\n')) {
      lines.push(line);
      lineNum++;
    }

    lines.push('```');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate a report
   */
  generateReport(data: ReportData): string {
    return this.formatAsMarkdown(data);
  }

  /**
   * Export to file
   */
  async exportToFile(
    data: unknown,
    filePath: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const content = this.format(data, options.format, options);

      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(process.cwd(), filePath);

      const dir = path.dirname(absolutePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(absolutePath, content);

      return {
        success: true,
        content,
        format: options.format,
        filePath: absolutePath,
      };
    } catch (error) {
      return {
        success: false,
        content: '',
        format: options.format,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Convert string to title case
   */
  private titleCase(str: string): string {
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  }

  /**
   * Escape HTML characters
   */
  private escapeHTML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Get supported formats
   */
  getSupportedFormats(): OutputFormat[] {
    return ['markdown', 'json', 'html', 'plain-text', 'csv', 'yaml'];
  }

  /**
   * Detect format from file extension
   */
  detectFormat(filePath: string): OutputFormat {
    const ext = path.extname(filePath).toLowerCase();

    const formatMap: Record<string, OutputFormat> = {
      '.md': 'markdown',
      '.markdown': 'markdown',
      '.json': 'json',
      '.html': 'html',
      '.htm': 'html',
      '.txt': 'plain-text',
      '.csv': 'csv',
      '.yaml': 'yaml',
      '.yml': 'yaml',
    };

    return formatMap[ext] || 'plain-text';
  }
}

/**
 * Singleton instance
 */
export const outputFormatter = new OutputFormatter();
