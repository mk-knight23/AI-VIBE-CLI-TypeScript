/**
 * Privacy Command - Privacy settings management
 */

import { privacyManager } from '../core/privacy';

export function privacyCommand(args: string[]): void {
  if (args.length === 0) {
    console.log('\n🔒 Privacy Settings:\n');
    console.log(privacyManager.getSummary());
    console.log('\nRun `vibe privacy --help` for options');
    return;
  }

  const arg = args[0];

  if (arg === '--help' || arg === '-h') {
    console.log(`
Usage: vibe privacy [options]

Options:
  --local-only        Enable local-only mode (no cloud)
  --allow-storage     Enable conversation storage
  --no-storage        Disable conversation storage
  --allow-share       Enable share links
  --no-share          Disable share links
  --allow-telemetry   Enable anonymous telemetry
  --no-telemetry      Disable telemetry
  --reset             Reset to defaults

Current settings are privacy-first by default.
`);
    return;
  }

  switch (arg) {
    case '--local-only':
      privacyManager.enableLocalOnly();
      console.log('✅ Local-only mode enabled. No data sent to cloud.');
      break;

    case '--allow-storage':
      privacyManager.set('storeConversations', true);
      privacyManager.set('storeContext', true);
      console.log('✅ Conversation storage enabled');
      break;

    case '--no-storage':
      privacyManager.set('storeConversations', false);
      privacyManager.set('storeContext', false);
      console.log('✅ Conversation storage disabled');
      break;

    case '--allow-share':
      privacyManager.set('allowShareLinks', true);
      console.log('✅ Share links enabled');
      break;

    case '--no-share':
      privacyManager.set('allowShareLinks', false);
      console.log('✅ Share links disabled');
      break;

    case '--allow-telemetry':
      privacyManager.set('sendAnonymousUsage', true);
      console.log('✅ Anonymous telemetry enabled');
      break;

    case '--no-telemetry':
      privacyManager.set('sendAnonymousUsage', false);
      privacyManager.set('sendCrashReports', false);
      console.log('✅ Telemetry disabled');
      break;

    case '--reset':
      privacyManager.setAll({
        storeConversations: false,
        storeContext: false,
        sendAnonymousUsage: false,
        sendCrashReports: false,
        allowShareLinks: false,
        sendCodeToCloud: true,
        localOnlyMode: false
      });
      console.log('✅ Privacy settings reset to defaults');
      break;

    default:
      console.log(`Unknown option: ${arg}. Run 'vibe privacy --help'`);
  }
}
