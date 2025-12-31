/**
 * Report Pipeline - Generate structured reports
 * Enables: report generation, documentation, policy analysis
 */

import { AgentExecutor } from '../agents/executor';
import { ApiClient } from '../core/api';
import * as fs from 'fs';
import * as path from 'path';
import pc from 'picocolors';

export interface ReportConfig {
  title: string;
  type: 'technical' | 'executive' | 'analysis' | 'audit' | 'proposal';
  sections?: string[];
  sources?: string[];
  outputPath?: string;
  format?: 'markdown' | 'html';
}

export interface ReportResult {
  title: string;
  content: string;
  sections: Array<{ title: string; content: string }>;
  path?: string;
  metadata: { duration: number; wordCount: number };
}

const DEFAULT_SECTIONS: Record<string, string[]> = {
  technical: ['Overview', 'Architecture', 'Implementation', 'Testing', 'Deployment'],
  executive: ['Executive Summary', 'Key Findings', 'Recommendations', 'Next Steps'],
  analysis: ['Introduction', 'Methodology', 'Findings', 'Analysis', 'Conclusions'],
  audit: ['Scope', 'Findings', 'Risk Assessment', 'Recommendations', 'Action Items'],
  proposal: ['Problem Statement', 'Proposed Solution', 'Benefits', 'Timeline', 'Budget']
};

export async function runReportPipeline(
  config: ReportConfig,
  client: ApiClient,
  model: string,
  sessionId: string
): Promise<ReportResult> {
  const startTime = Date.now();
  const executor = new AgentExecutor(client, model, sessionId);
  
  const sections = config.sections || DEFAULT_SECTIONS[config.type] || DEFAULT_SECTIONS.analysis;
  const generatedSections: Array<{ title: string; content: string }> = [];

  console.log(pc.cyan(`\n━━━ Report: ${config.title} ━━━\n`));

  // Gather source content if provided
  let sourceContent = '';
  if (config.sources) {
    for (const source of config.sources) {
      if (fs.existsSync(source)) {
        try {
          sourceContent += `\n\n--- ${source} ---\n${fs.readFileSync(source, 'utf8').slice(0, 5000)}`;
        } catch {}
      }
    }
  }

  // Generate each section
  for (const section of sections) {
    console.log(pc.gray(`Writing: ${section}...`));
    
    const result = await executor.execute('writer', {
      task: `Write the "${section}" section for a ${config.type} report titled "${config.title}".${sourceContent ? `\n\nSource material:\n${sourceContent.slice(0, 3000)}` : ''}\n\nWrite 2-4 paragraphs. Be professional and concise.`,
      params: { section, type: config.type }
    }, { autoApprove: true, maxSteps: 3 });

    generatedSections.push({
      title: section,
      content: String(result.output?.data || `[${section} content pending]`)
    });
  }

  // Assemble report
  const format = config.format || 'markdown';
  let content: string;

  if (format === 'html') {
    content = `<!DOCTYPE html>
<html><head><title>${config.title}</title>
<style>body{font-family:system-ui;max-width:800px;margin:0 auto;padding:20px}h1{border-bottom:2px solid #333}h2{color:#444;margin-top:2em}p{line-height:1.6}</style>
</head><body>
<h1>${config.title}</h1>
<p><em>${config.type.charAt(0).toUpperCase() + config.type.slice(1)} Report • ${new Date().toLocaleDateString()}</em></p>
${generatedSections.map(s => `<h2>${s.title}</h2>\n${s.content.split('\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('\n')}`).join('\n')}
</body></html>`;
  } else {
    content = `# ${config.title}\n\n*${config.type.charAt(0).toUpperCase() + config.type.slice(1)} Report • ${new Date().toLocaleDateString()}*\n\n${generatedSections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n')}`;
  }

  // Save if path provided
  let savedPath: string | undefined;
  if (config.outputPath) {
    const dir = path.dirname(config.outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(config.outputPath, content);
    savedPath = config.outputPath;
    console.log(pc.green(`\n✓ Saved to ${savedPath}`));
  }

  const wordCount = content.split(/\s+/).length;
  console.log(pc.green(`\n✓ Report complete (${wordCount} words)\n`));

  return {
    title: config.title,
    content,
    sections: generatedSections,
    path: savedPath,
    metadata: { duration: Date.now() - startTime, wordCount }
  };
}
