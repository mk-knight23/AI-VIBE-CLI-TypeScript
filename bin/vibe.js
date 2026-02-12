#!/usr/bin/env node

/**
 * VIBE CLI v0.0.1 - Production Entry Point
 */

// Load environment variables
import 'dotenv/config';

// Attempt to run the compiled source
try {
  const { run } = await import('../dist/cli/main.js');
  run().catch(err => {
    console.error('❌ Fatal Error:', err.message);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  });
} catch (err) {
  console.error('❌ Error loading VIBE CLI:', err.message);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
}
