#!/usr/bin/env node

/**
 * VIBE CLI v12 - Entry Point
 *
 * One command to rule them all.
 * Run `vibe` to start the interactive TUI.
 *
 * Note: Uses require() for CommonJS entry point since package.json uses "type": "commonjs"
 */

// Load environment variables first
require('dotenv').config();

/**
 * Simple argument parser for flags
 */
function hasFlag(flags) {
  return process.argv.slice(2).some(arg =>
    flags.some(flag => arg === flag || arg.startsWith(`${flag}=`))
  );
}

/**
 * Show version
 */
function showVersion() {
  console.log('VIBE v12.0.0');
  process.exit(0);
}

/**
 * Show help
 */
function showHelp() {
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
  process.exit(0);
}

/**
 * Main entry point
 */
async function main() {
  // Handle --version / -v flag
  if (hasFlag(['--version', '-v'])) {
    showVersion();
  }

  // Handle --help / -h flag
  if (hasFlag(['--help', '-h'])) {
    showHelp();
  }

  // Display startup banner
  console.log('\n🎨 VIBE v12.0.0\n');
  console.log('Initializing...');

  try {
    // Import the core engine (the single source of truth)
    const { VibeCoreEngine } = require('../dist/core/engine');

    // Create and initialize the engine
    const engine = new VibeCoreEngine();

    // Initialize and start interactive mode
    console.log('Ready!\n');
    await engine.startInteractiveMode();

  } catch (error) {
    console.error('\n❌ Error starting VIBE:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    console.error('\nMake sure all dependencies are installed: npm install\n');
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Goodbye! Happy coding!\n');
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('\n❌ Unexpected error:', error.message);
  process.exit(1);
});

// Run main
main();
