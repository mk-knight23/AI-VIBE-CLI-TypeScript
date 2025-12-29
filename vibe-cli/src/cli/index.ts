#!/usr/bin/env node

/**
 * VIBE CLI v9.1.0 - The Open Source AI Coding Agent
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
 * 
 * @author KAZI
 * @version 9.1.0
 */

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
import { loadConfig } from '../config/loader';
import { detectProjectLanguages } from '../core/lsp-detect';
import { privacyManager } from '../core/privacy';
import { loadSteering } from '../core/steering';
import { listAgents } from '../core/custom-agents';

const VERSION = '10.0.0';

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
    console.log(BANNER);
    console.log(`
Usage: vibe [command] [options]

Core Commands:
  vibe                Start interactive AI assistant
  vibe connect        Add provider credentials
  vibe providers      List available providers
  vibe models         List available models
  vibe doctor         Diagnose configuration

Agent Commands:
  vibe agents         List available agents
  vibe agents info    Show agent details
  vibe steering       Project steering configuration
  vibe hooks          Automation hooks

Session Commands:
  vibe sessions       Manage multiple sessions
  vibe sessions new   Create new session
  vibe sessions share Create share link

Settings:
  vibe privacy        Privacy settings
  vibe lsp            Language server status

Model Filters:
  --local    Local models only
  --cheap    Low-cost models
  --fast     Fast models
  --free     Free tier models

Keyboard Shortcuts (in chat):
  ctrl+t     Start tangent conversation
  ctrl+j     Multi-line input
  ctrl+k     Fuzzy search
  !cmd       Execute shell command

Context Mentions:
  @workspace Include project context
  @file:path Include specific file
  @folder:p  Include folder structure

Free models included - no API key required!
    `);
    process.exit(0);
  }

  // Subcommands
  switch (command) {
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
  }

  // Default: interactive mode
  console.log(BANNER);
  
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
  
  console.log('\n/help commands • ctrl+t tangent • @workspace context\n');
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
