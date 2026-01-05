#!/usr/bin/env node

/**
 * VIBE CLI v12 - Entry Point
 * 
 * One command to rule them all.
 * Run `vibe` to start the interactive TUI.
 */

const { CommandLineArgs } = require('../dist/cli/args');
const { VIBE_SYSTEM_PROMPT, getSystemPrompt } = require('../dist/cli/system-prompt');
const { VibeProviderRouter } = require('../dist/providers/router');
const { VibeMemoryManager } = require('../dist/memory');
const { Orchestrator } = require('../dist/orchestration');
const { IntentRouter } = require('../dist/intent/router');
const { CLIEngine } = require('../dist/tui');
const { VibeSession } = require('../dist/types');

// Get session
function getSession() {
  return {
    id: `session-${Date.now()}`,
    projectRoot: process.cwd(),
    createdAt: new Date(),
    lastActivity: new Date(),
  };
}

async function main() {
  const args = new CommandLineArgs(process.argv);
  
  // Show version
  if (args.hasFlag('--version') || args.hasFlag('-v')) {
    console.log('VIBE v12.0.0');
    return;
  }
  
  // Show help
  if (args.hasFlag('--help') || args.hasFlag('-h')) {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   V I B E  v12.0.0                                            ║
║   AI-Powered Development Environment                          ║
║                                                               ║
║   Usage:                                                      ║
║     vibe                    - Start interactive TUI           ║
║     vibe --help             - Show this help                  ║
║     vibe --version          - Show version                    ║
║                                                               ║
║   Examples:                                                   ║
║     vibe build a REST API                                     ║
║     vibe fix the failing tests                                ║
║     vibe deploy to gcp                                        ║
║     vibe remember we use PostgreSQL                           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);
    return;
  }
  
  // Start interactive TUI
  console.log('\n🎨 VIBE v12.0.0\n');
  console.log('Initializing...');
  
  try {
    const provider = new VibeProviderRouter();
    const memory = new VibeMemoryManager();
    const orchestrator = new Orchestrator({ provider, memory });
    const session = getSession();
    
    console.log('Ready!\n');
    
    const cli = new CLIEngine(provider, memory, orchestrator, session);
    await cli.start();
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
