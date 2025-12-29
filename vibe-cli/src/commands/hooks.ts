/**
 * Hooks Command - Automation hooks management
 */

import { listHooks, addHook, removeHook, loadHooks, saveHooks, Hook } from '../core/hooks';

export function hooksCommand(action?: string, ...args: string[]): void {
  switch (action) {
    case 'list':
    case undefined:
      const hooks = listHooks();
      const config = loadHooks();

      console.log('\n⚡ Hooks:\n');
      
      if (hooks.length === 0) {
        console.log('  No hooks configured');
      } else {
        for (const hook of hooks) {
          const status = hook.enabled ? '✅' : '⚪';
          console.log(`  ${status} ${hook.name.padEnd(15)} ${hook.trigger.padEnd(12)} ${hook.command}`);
        }
      }

      console.log('\n🔧 Auto-actions:');
      console.log(`  Format on save: ${config.autoFormat ? '✅' : '⚪'}`);
      console.log(`  Lint on save: ${config.autoLint ? '✅' : '⚪'}`);
      console.log(`  Test on save: ${config.autoTest ? '✅' : '⚪'}`);
      break;

    case 'add':
      if (args.length < 3) {
        console.log('Usage: vibe hooks add <name> <trigger> <command>');
        console.log('Triggers: pre-commit, post-commit, on-save, on-create, on-error');
        return;
      }
      const [name, trigger, ...cmdParts] = args;
      const newHook: Hook = {
        name,
        trigger: trigger as Hook['trigger'],
        command: cmdParts.join(' '),
        enabled: true
      };
      addHook(newHook);
      console.log(`✅ Added hook: ${name}`);
      break;

    case 'remove':
      if (!args[0]) {
        console.log('Usage: vibe hooks remove <name>');
        return;
      }
      if (removeHook(args[0])) {
        console.log(`✅ Removed hook: ${args[0]}`);
      } else {
        console.log(`❌ Hook not found: ${args[0]}`);
      }
      break;

    case 'auto-format':
      const cfg1 = loadHooks();
      cfg1.autoFormat = args[0] !== 'off';
      saveHooks(cfg1);
      console.log(`✅ Auto-format: ${cfg1.autoFormat ? 'ON' : 'OFF'}`);
      break;

    case 'auto-lint':
      const cfg2 = loadHooks();
      cfg2.autoLint = args[0] !== 'off';
      saveHooks(cfg2);
      console.log(`✅ Auto-lint: ${cfg2.autoLint ? 'ON' : 'OFF'}`);
      break;

    case 'auto-test':
      const cfg3 = loadHooks();
      cfg3.autoTest = args[0] !== 'off';
      saveHooks(cfg3);
      console.log(`✅ Auto-test: ${cfg3.autoTest ? 'ON' : 'OFF'}`);
      break;

    default:
      console.log(`
Usage: vibe hooks [command]

Commands:
  list                          List all hooks
  add <name> <trigger> <cmd>    Add a hook
  remove <name>                 Remove a hook
  auto-format [on|off]          Toggle auto-format
  auto-lint [on|off]            Toggle auto-lint
  auto-test [on|off]            Toggle auto-test

Triggers:
  pre-commit    Before git commit
  post-commit   After git commit
  on-save       When file is saved
  on-create     When file is created
  on-error      When error occurs

Example:
  vibe hooks add format on-save "prettier --write \${file}"
`);
  }
}
