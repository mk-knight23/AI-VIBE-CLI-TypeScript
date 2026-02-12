/**
 * Quick CLI for testing without API key - shows what tests WOULD be generated
 */

import * as fs from 'fs';
import * as path from 'path';
import { analyzeForTests } from '../commands/test.js';

const filePath = process.argv[2];

if (!filePath) {
  console.log('Usage: node test-cli.js <file-to-analyze.ts>');
  process.exit(1);
}

analyzeForTests(filePath, {} as any).then(result => {
  if (result.success) {
    console.log('\n✅ Analysis complete');
  } else {
    console.log(`\n❌ Error: ${result.error}`);
  }
});
