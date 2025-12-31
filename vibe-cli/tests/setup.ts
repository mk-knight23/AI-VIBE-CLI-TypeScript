import fs from 'fs';
import os from 'os';
import path from 'path';

// Create isolated temp directory for tests that don't manage their own
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-test-'));

// Set env var for source code that uses getProjectRoot()
process.env.VIBE_PROJECT_ROOT = tempRoot;

// Cleanup after all tests complete
afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true });
});
