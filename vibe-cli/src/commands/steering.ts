/**
 * Steering Command - Project steering management
 */

import { loadSteering, createDefaultSteering, getSteeringSummary } from '../core/steering';

export function steeringCommand(action?: string): void {
  switch (action) {
    case 'show':
    case undefined:
      const steering = loadSteering();
      
      if (!steering) {
        console.log('\n📋 No steering file found');
        console.log('Create one with: vibe steering init');
        return;
      }

      console.log(`\n📋 Steering: ${steering.path}\n`);
      
      if (steering.context.length) {
        console.log('Context:');
        steering.context.forEach(c => console.log(`  ${c.slice(0, 100)}...`));
      }

      if (steering.rules.length) {
        console.log('\nRules:');
        steering.rules.forEach(r => console.log(`  • ${r}`));
      }

      if (steering.tools.length) {
        console.log('\nTools:');
        steering.tools.forEach(t => console.log(`  • ${t}`));
      }
      break;

    case 'init':
      const path = createDefaultSteering();
      console.log(`\n✅ Created steering file: ${path}`);
      console.log('Edit this file to customize VIBE behavior for your project.');
      break;

    case 'help':
    default:
      console.log(`
Usage: vibe steering [command]

Commands:
  show    Show current steering configuration
  init    Create default steering file

Steering files tell VIBE how to work with your project.
They can include:
  - Project context and description
  - Coding rules and guidelines
  - Tool permissions
  - Style preferences

Locations (checked in order):
  .vibe/steering.md
  .vibe/STEERING.md
  VIBE.md
  .vibeconfig
`);
  }
}
