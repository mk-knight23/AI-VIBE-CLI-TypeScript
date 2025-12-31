/**
 * Output Export - Export conversation/results to various formats
 */

import * as fs from 'fs';
import * as path from 'path';
import { getMessages, Message } from '../storage/messages';
import { getSession } from '../storage/sessions';

export type ExportFormat = 'json' | 'markdown' | 'html' | 'csv' | 'text';

export interface ExportOptions {
  format: ExportFormat;
  sessionId?: string;
  outputPath?: string;
  includeMetadata?: boolean;
  includeToolCalls?: boolean;
}

export interface ExportResult {
  content: string;
  format: ExportFormat;
  path?: string;
}

export function exportSession(options: ExportOptions): ExportResult {
  const { format, sessionId, outputPath, includeMetadata = true, includeToolCalls = true } = options;

  if (!sessionId) {
    throw new Error('Session ID required');
  }

  const session = getSession(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const messages = getMessages(sessionId);
  let content: string;

  switch (format) {
    case 'json':
      content = exportToJson(session, messages, includeMetadata, includeToolCalls);
      break;
    case 'markdown':
      content = exportToMarkdown(session, messages, includeMetadata, includeToolCalls);
      break;
    case 'html':
      content = exportToHtml(session, messages, includeMetadata, includeToolCalls);
      break;
    case 'csv':
      content = exportToCsv(messages);
      break;
    case 'text':
    default:
      content = exportToText(messages);
  }

  if (outputPath) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, content);
  }

  return { content, format, path: outputPath };
}

function exportToJson(session: any, messages: Message[], includeMetadata: boolean, includeToolCalls: boolean): string {
  const data: any = {
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
      ...(includeToolCalls && m.toolCalls ? { toolCalls: m.toolCalls } : {}),
      timestamp: new Date(m.createdAt).toISOString()
    }))
  };

  if (includeMetadata) {
    data.metadata = {
      sessionId: session.id,
      model: session.model,
      provider: session.provider,
      tokenCount: session.tokenCount,
      createdAt: new Date(session.createdAt).toISOString(),
      exportedAt: new Date().toISOString()
    };
  }

  return JSON.stringify(data, null, 2);
}

function exportToMarkdown(session: any, messages: Message[], includeMetadata: boolean, includeToolCalls: boolean): string {
  const lines: string[] = ['# Conversation Export\n'];

  if (includeMetadata) {
    lines.push('## Metadata\n');
    lines.push(`- **Session:** ${session.id}`);
    lines.push(`- **Model:** ${session.model}`);
    lines.push(`- **Provider:** ${session.provider}`);
    lines.push(`- **Tokens:** ${session.tokenCount}`);
    lines.push(`- **Created:** ${new Date(session.createdAt).toISOString()}`);
    lines.push(`- **Exported:** ${new Date().toISOString()}\n`);
    lines.push('---\n');
  }

  lines.push('## Messages\n');

  for (const msg of messages) {
    if (msg.role === 'system') continue;

    const roleLabel = msg.role === 'user' ? '👤 User' : msg.role === 'assistant' ? '🤖 Assistant' : '🔧 Tool';
    lines.push(`### ${roleLabel}\n`);
    lines.push(msg.content);
    lines.push('');

    if (includeToolCalls && msg.toolCalls) {
      lines.push('**Tool Calls:**');
      for (const call of msg.toolCalls) {
        lines.push(`- \`${call.function?.name || call.name}\``);
      }
      lines.push('');
    }

    lines.push('---\n');
  }

  return lines.join('\n');
}

function exportToHtml(session: any, messages: Message[], includeMetadata: boolean, includeToolCalls: boolean): string {
  const styles = `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
      .metadata { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
      .message { margin-bottom: 20px; padding: 15px; border-radius: 8px; }
      .user { background: #e3f2fd; }
      .assistant { background: #f5f5f5; }
      .tool { background: #fff3e0; }
      .role { font-weight: bold; margin-bottom: 10px; }
      .content { white-space: pre-wrap; }
      .tool-calls { margin-top: 10px; font-size: 0.9em; color: #666; }
      code { background: #eee; padding: 2px 6px; border-radius: 4px; }
    </style>
  `;

  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Conversation Export</title>
  ${styles}
</head>
<body>
  <h1>Conversation Export</h1>
`;

  if (includeMetadata) {
    html += `
  <div class="metadata">
    <strong>Session:</strong> ${session.id}<br>
    <strong>Model:</strong> ${session.model}<br>
    <strong>Provider:</strong> ${session.provider}<br>
    <strong>Tokens:</strong> ${session.tokenCount}<br>
    <strong>Created:</strong> ${new Date(session.createdAt).toISOString()}<br>
    <strong>Exported:</strong> ${new Date().toISOString()}
  </div>
`;
  }

  for (const msg of messages) {
    if (msg.role === 'system') continue;

    const roleLabel = msg.role === 'user' ? '👤 User' : msg.role === 'assistant' ? '🤖 Assistant' : '🔧 Tool';
    const roleClass = msg.role;
    const escapedContent = escapeHtml(msg.content);

    html += `
  <div class="message ${roleClass}">
    <div class="role">${roleLabel}</div>
    <div class="content">${escapedContent}</div>
`;

    if (includeToolCalls && msg.toolCalls) {
      html += `    <div class="tool-calls">Tool calls: ${msg.toolCalls.map(c => `<code>${c.function?.name || c.name}</code>`).join(', ')}</div>\n`;
    }

    html += `  </div>\n`;
  }

  html += `</body>\n</html>`;
  return html;
}

function exportToCsv(messages: Message[]): string {
  const lines = ['role,content,timestamp'];
  
  for (const msg of messages) {
    if (msg.role === 'system') continue;
    const content = msg.content.replace(/"/g, '""').replace(/\n/g, '\\n');
    lines.push(`"${msg.role}","${content}","${new Date(msg.createdAt).toISOString()}"`);
  }

  return lines.join('\n');
}

function exportToText(messages: Message[]): string {
  const lines: string[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') continue;
    const roleLabel = msg.role === 'user' ? 'USER' : msg.role === 'assistant' ? 'ASSISTANT' : 'TOOL';
    lines.push(`[${roleLabel}]`);
    lines.push(msg.content);
    lines.push('');
  }

  return lines.join('\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}

// Export data structures
export function exportToStructured(data: unknown, format: 'json' | 'csv' | 'table'): string {
  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  }

  if (!Array.isArray(data)) {
    return JSON.stringify(data, null, 2);
  }

  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);

  if (format === 'csv') {
    const lines = [headers.join(',')];
    for (const row of data) {
      const values = headers.map(h => {
        const v = (row as any)[h];
        const str = String(v ?? '').replace(/"/g, '""');
        return `"${str}"`;
      });
      lines.push(values.join(','));
    }
    return lines.join('\n');
  }

  // Table format
  const colWidths = headers.map(h => Math.max(h.length, ...data.map(r => String((r as any)[h] ?? '').length)));
  const separator = colWidths.map(w => '-'.repeat(w + 2)).join('+');
  
  const lines = [
    '|' + headers.map((h, i) => ` ${h.padEnd(colWidths[i])} `).join('|') + '|',
    '|' + separator + '|'
  ];

  for (const row of data) {
    const values = headers.map((h, i) => ` ${String((row as any)[h] ?? '').padEnd(colWidths[i])} `);
    lines.push('|' + values.join('|') + '|');
  }

  return lines.join('\n');
}
