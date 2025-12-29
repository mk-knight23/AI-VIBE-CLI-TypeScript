/**
 * LSP Command - Language server status
 */

import { detectProjectLanguages, getLSPStatus } from '../core/lsp-detect';

export function lspCommand(action?: string): void {
  if (action === 'status' || !action) {
    const detected = detectProjectLanguages();
    
    if (detected.length === 0) {
      console.log('\n📦 No languages detected in this project');
      return;
    }

    console.log('\n🔧 LSP Status:\n');
    for (const lsp of detected) {
      const icon = lsp.detected ? '✅' : '⚪';
      console.log(`${icon} ${lsp.language.padEnd(12)} ${lsp.extensions.join(', ')}`);
    }
    console.log('\nLSPs are automatically loaded for detected languages.');
    return;
  }

  if (action === 'help') {
    console.log(`
Usage: vibe lsp [command]

Commands:
  status    Show detected languages and LSP status
  help      Show this help

VIBE automatically detects project languages and loads
appropriate language servers for enhanced code intelligence.

Supported: TypeScript, Python, Rust, Go, Java, Ruby, C/C++
`);
  }
}
