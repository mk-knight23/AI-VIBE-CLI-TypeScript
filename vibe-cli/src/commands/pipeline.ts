/**
 * Pipeline Command - Run specialized pipelines
 * Usage: vibe pipeline <type> [options]
 */

import { ApiClient } from '../core/api';
import { DEFAULT_MODEL } from '../cli/system-prompt';
import { createSession } from '../storage';
import { runResearchPipeline } from '../pipelines/research';
import { runAnalysisPipeline } from '../pipelines/analysis';
import { runReportPipeline } from '../pipelines/report';
import { runAutomationPipeline } from '../pipelines/automation';
import pc from 'picocolors';

export async function pipelineCommand(type?: string, ...args: string[]): Promise<void> {
  if (!type || type === '--help' || type === '-h') {
    showHelp();
    return;
  }

  const client = new ApiClient();
  const model = DEFAULT_MODEL;
  const session = createSession(model, client.getProvider());
  const options = parseArgs(args);

  try {
    switch (type) {
      case 'research': {
        const topic = options.topic || args.filter(a => !a.startsWith('-')).join(' ');
        if (!topic) {
          console.error(pc.red('Usage: vibe pipeline research "topic" [--depth quick|standard|deep]'));
          return;
        }
        const result = await runResearchPipeline({
          topic,
          depth: options.depth as any || 'standard',
          sources: options.sources?.split(',') as any,
          outputFormat: options.format as any
        }, client, model, session.id);
        
        console.log(pc.bold('\nSummary:'));
        console.log(result.summary);
        if (result.recommendations?.length) {
          console.log(pc.bold('\nRecommendations:'));
          result.recommendations.forEach(r => console.log(`  • ${r}`));
        }
        break;
      }

      case 'analyze': {
        const data = options.data || options.file 
          ? require('fs').readFileSync(options.file, 'utf8')
          : args.filter(a => !a.startsWith('-')).join(' ');
        
        const result = await runAnalysisPipeline({
          type: (options.type as any) || 'summarize',
          data,
          criteria: options.criteria?.split(','),
          outputFormat: options.format as any
        }, client, model, session.id);
        
        console.log(pc.bold('\nOutput:'));
        console.log(result.formatted);
        console.log(pc.bold('\nInsights:'));
        result.insights.forEach(i => console.log(`  • ${i}`));
        break;
      }

      case 'report': {
        const title = options.title || args.filter(a => !a.startsWith('-')).join(' ');
        if (!title) {
          console.error(pc.red('Usage: vibe pipeline report "title" --type technical|executive|analysis'));
          return;
        }
        const result = await runReportPipeline({
          title,
          type: (options.type as any) || 'analysis',
          sections: options.sections?.split(','),
          sources: options.sources?.split(','),
          outputPath: options.output,
          format: options.format as any
        }, client, model, session.id);
        
        if (!options.output) {
          console.log(result.content);
        }
        break;
      }

      case 'automate': {
        const action = args.filter(a => !a.startsWith('-')).join(' ');
        if (!action) {
          console.error(pc.red('Usage: vibe pipeline automate "action" --type ci|deploy|docker|script'));
          return;
        }
        const result = await runAutomationPipeline({
          type: (options.type as any) || 'script',
          action,
          target: options.target,
          dryRun: options.dryRun === 'true' || options.dry === true,
          params: options
        }, client, model, session.id);
        
        console.log(pc.bold('\nOutput:'));
        console.log(result.output);
        if (result.commands?.length) {
          console.log(pc.bold('\nCommands:'));
          result.commands.forEach(c => console.log(`  $ ${c}`));
        }
        break;
      }

      default:
        console.error(pc.red(`Unknown pipeline: ${type}`));
        showHelp();
    }
  } catch (err) {
    console.error(pc.red(`Pipeline error: ${(err as Error).message}`));
  }
}

function parseArgs(args: string[]): Record<string, any> {
  const options: Record<string, any> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        options[key] = next;
        i++;
      } else {
        options[key] = true;
      }
    }
  }
  return options;
}

function showHelp(): void {
  console.log(`
${pc.bold('Pipeline Command')} - Run specialized AI pipelines

${pc.cyan('Usage:')} vibe pipeline <type> [options]

${pc.cyan('Types:')}
  research    Multi-source research with synthesis
  analyze     Data analysis and comparison
  report      Generate structured reports
  automate    DevOps and automation tasks

${pc.cyan('Research Options:')}
  --depth     quick | standard | deep
  --sources   web,files,memory (comma-separated)
  --format    summary | report | bullets | json

${pc.cyan('Analyze Options:')}
  --type      compare | extract | summarize | trend | matrix
  --file      Input file path
  --criteria  Comma-separated criteria
  --format    json | csv | table | markdown

${pc.cyan('Report Options:')}
  --type      technical | executive | analysis | audit | proposal
  --sections  Comma-separated section names
  --sources   Comma-separated source files
  --output    Output file path
  --format    markdown | html

${pc.cyan('Automate Options:')}
  --type      ci | deploy | docker | script | infra
  --target    Target system/service
  --dry       Dry run (don't execute)

${pc.cyan('Examples:')}
  vibe pipeline research "React vs Vue in 2025" --depth deep
  vibe pipeline analyze --file data.json --type compare
  vibe pipeline report "Q4 Review" --type executive --output report.md
  vibe pipeline automate "setup CI for Node.js" --type ci --dry
`);
}
