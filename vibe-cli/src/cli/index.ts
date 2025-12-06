#!/usr/bin/env node

/**
 * VIBE CLI v8.0.0 - Ultimate AI Development Platform
 * 
 * Revolutionary features:
 * - Story Memory: Tracks project goals, milestones, challenges
 * - Chat History: 100 message buffer with semantic search
 * - 36 Advanced Tools: Code analysis, refactoring, security scanning
 * - Enhanced Memory: Dependencies, git info, user preferences
 * 
 * @module cli/index
 * @author KAZI
 * @version 8.0.0
 */

import { startInteractive } from './interactive';
import { ApiClient } from '../core/api';

const VERSION = '8.0.0';

const BANNER = `
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎨 VIBE v8.0.0 - ULTIMATE EDITION                      ║
║   AI-Powered Development Platform                        ║
║                                                           ║
║   ✨ Story Memory • Chat History • 36 Advanced Tools    ║
║   🔥 Made by KAZI                                        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--version') || args.includes('-v')) {
    console.log(`VIBE v${VERSION}`);
    process.exit(0);
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(BANNER);
    console.log(`
Usage: vibe [options]

Options:
  -v, --version     Show version number
  -h, --help        Show this help message
  
Commands:
  vibe              Start interactive AI assistant mode
  vibe8             Start VIBE v8.0.0 (alias)
  
New in v8.0.0:
  🧠 Story Memory - Tracks goals, milestones, challenges
  💬 Chat History - 100 message buffer with search
  🛠️  36 Tools - Code analysis, refactoring, security
  📊 Enhanced Memory - Dependencies, git, preferences
  
Examples:
  vibe              Start VIBE CLI
  vibe --version    Display current version
  vibe --help       Show detailed help
    `);
    process.exit(0);
  }

  console.log(BANNER);
  console.log('Type /help for available commands\n');
  
  try {
    const client = new ApiClient();
    await startInteractive(client);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 'EACCES') {
      console.error('💡 Tip: Check file permissions');
    } else if (error.code === 'ENOENT') {
      console.error('💡 Tip: Required file or directory not found');
    }
    
    process.exit(1);
  }
}

main();

