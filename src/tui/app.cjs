#!/usr/bin/env node
// Placeholder TUI entry. Ink-based panes planned; for now, detects TTY and prints a preview layout.
const pc = require('picocolors');

function main() {
  if (!process.stdout.isTTY) {
    console.log('TUI requires a TTY. Run in a terminal.');
    process.exit(0);
  }
  console.log(pc.cyan('\nVibe TUI (preview)'));
  console.log('Chat | Files | Preview | Shell');
  console.log(pc.gray('This is a placeholder. Full Ink UI coming soon.'));
}

if (require.main === module) main();
module.exports = { main };
