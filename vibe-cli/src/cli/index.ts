#!/usr/bin/env node

/**
 * VIBE CLI v10.0.0 - The Open Source AI Coding Agent
 * 
 * Prompt to code to deployment in your terminal.
 * 
 * Features:
 * - 75+ LLM providers
 * - Free models included
 * - LSP auto-detection
 * - Custom agents
 * - Steering files
 * - Hooks automation
 * - Tangent conversations
 * - Privacy-first
 * - Non-interactive mode (vibe ask)
 * - Custom commands (vibe cmd)
 * - Auto-compact sessions
 * - 4-level permissions
 * - Batch processing (vibe batch)
 * - Project rules (vibe rules)
 * - Project memory
 * 
 * @author KAZI
 * @version 10.0.0
 */

// Initialize shutdown handlers early
import '../utils/shutdown';

import { startInteractive } from './interactive';
import { ApiClient } from '../core/api';
import { connectCommand } from '../commands/connect';
import { modelsCommand, parseModelsArgs } from '../commands/models';
import { providersCommand } from '../commands/providers';
import { doctorCommand } from '../commands/doctor';
import { privacyCommand } from '../commands/privacy';
import { lspCommand } from '../commands/lsp';
import { sessionsCommand } from '../commands/sessions';
import { agentsCommand } from '../commands/agents';
import { steeringCommand } from '../commands/steering';
import { hooksCommand } from '../commands/hooks';
import { workflowCommand } from '../commands/workflow';
import { memoryCommand } from '../commands/memory';
import { outputCommand } from '../commands/output';
import { rulesCommand } from '../commands/rules';
import { pipelineCommand } from '../commands/pipeline';
import { planCommand, researchCommand, analyzeCommand, buildCommand, reviewCommand, auditCommand } from '../commands/quick-agents';
import { loadConfig } from '../config/loader';
import { detectProjectLanguages } from '../core/lsp-detect';
import { privacyManager } from '../core/privacy';
import { loadSteering } from '../core/steering';
import { listAgents } from '../core/custom-agents';
import { askMode } from './modes/ask';
import { batchMode } from './modes/batch';
import { cmdMode } from '../commands/custom/executor';

import { getGlobalHelp, getWelcomeHints } from '../ui/help';

const VERSION = '10.1.0';

function parseOptions(args: string[]): Record<string, unknown> {
  const options: Record<string, unknown> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        options[key] = next;
        i++;
      } else {
        options[key] = true;
      }
    }
  }
  return options;
}

const BANNER = `
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎨 VIBE v${VERSION} - The Open Source AI Coding Agent       ║
║                                                           ║
║   Prompt to code to deployment in your terminal           ║
║                                                           ║
║   ✨ 75+ Providers • Custom Agents • Steering • Hooks    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  // Load project config
  const { config, errors } = loadConfig();

  // Version
  if (args.includes('--version') || args.includes('-v')) {
    console.log(`VIBE v${VERSION}`);
    process.exit(0);
  }

  // Help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(getGlobalHelp());
    process.exit(0);
  }

  // Subcommands
  switch (command) {
    // Setup wizard
    case 'setup':
      const { runQuickSetup } = await import('../ui/setup-wizard');
      await runQuickSetup();
      process.exit(0);

    // New modes
    case 'ask':
      await askMode(args.slice(1));
      process.exit(0);

    case 'cmd':
      await cmdMode(args.slice(1));
      process.exit(0);

    case 'batch':
      await batchMode(args.slice(1));
      process.exit(0);

    // Existing commands
    case 'connect':
      await connectCommand(args[1]);
      process.exit(0);

    case 'providers':
      providersCommand();
      process.exit(0);

    case 'models':
      modelsCommand(parseModelsArgs(args.slice(1)));
      process.exit(0);

    case 'doctor':
      await doctorCommand();
      process.exit(0);

    case 'privacy':
      privacyCommand(args.slice(1));
      process.exit(0);

    case 'lsp':
      lspCommand(args[1]);
      process.exit(0);

    case 'sessions':
      sessionsCommand(args[1], args[2]);
      process.exit(0);

    case 'agents':
      agentsCommand(args[1], args[2]);
      process.exit(0);

    case 'steering':
      steeringCommand(args[1]);
      process.exit(0);

    case 'hooks':
      hooksCommand(args[1], ...args.slice(2));
      process.exit(0);

    case 'rules':
      rulesCommand(args[1], ...args.slice(2));
      process.exit(0);

    case 'pipeline':
      await pipelineCommand(args[1], ...args.slice(2));
      process.exit(0);

    // Quick agent commands
    case 'plan':
      await planCommand(args.slice(1));
      process.exit(0);

    case 'research':
      await researchCommand(args.slice(1));
      process.exit(0);

    case 'analyze':
      await analyzeCommand(args.slice(1));
      process.exit(0);

    case 'build':
      await buildCommand(args.slice(1));
      process.exit(0);

    case 'review':
      await reviewCommand(args.slice(1));
      process.exit(0);

    case 'audit':
      await auditCommand(args.slice(1));
      process.exit(0);

    // Workflow and memory commands
    case 'workflow':
      await workflowCommand(args[1], args[2], parseOptions(args.slice(3)));
      process.exit(0);

    case 'memory':
      memoryCommand(args[1], args[2], args[3]);
      process.exit(0);

    case 'output':
      outputCommand(args[1], args[2], parseOptions(args.slice(3)));
      process.exit(0);
  }

  // Default: interactive mode
  console.log(BANNER);
  
  // Check for first-run setup
  const { shouldShowSetupWizard, runSetupWizard } = await import('../ui/setup-wizard');
  if (shouldShowSetupWizard()) {
    await runSetupWizard();
  }
  
  // Show project context
  const languages = detectProjectLanguages();
  const steering = loadSteering();
  const { builtin, custom } = listAgents();
  
  const status: string[] = [];
  if (languages.length > 0) status.push(`🔧 ${languages.map(l => l.language).join(', ')}`);
  if (steering) status.push('📋 Steering');
  if (custom.length > 0) status.push(`🤖 ${custom.length} custom agents`);
  if (privacyManager.isLocalOnly()) status.push('🏠 Local-only');
  
  if (status.length > 0) {
    console.log(status.join(' • '));
  }
  
  console.log('\n' + getWelcomeHints());
  console.log('🤖 You are chatting with Auto\n');
  
  try {
    const client = new ApiClient();
    await startInteractive(client);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
