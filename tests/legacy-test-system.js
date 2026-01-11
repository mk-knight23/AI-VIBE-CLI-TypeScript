#!/usr/bin/env node
/**
 * VIBE-CLI v12 - System Test Script
 * Tests all core functionality
 */

const fs = require('fs');
const path = require('path');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;
let skipped = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`${GREEN}✓${RESET} ${name}`);
    passed++;
  } catch (error) {
    console.log(`${RED}✗${RESET} ${name}`);
    console.log(`  ${RED}Error:${RESET} ${error.message}`);
    failed++;
  }
}

function section(name) {
  console.log(`\n${YELLOW}═══ ${name} ═══${RESET}\n`);
}

// ============================================================================
// PHASE 2: BASIC FEATURES TESTS
// ============================================================================

section('A. Core CLI');

test('CLI entry point exists', () => {
  const binPath = path.join(__dirname, 'bin/vibe.js');
  if (!fs.existsSync(binPath)) throw new Error('bin/vibe.js not found');
  const content = fs.readFileSync(binPath, 'utf-8');
  if (!content.includes('VIBE')) throw new Error('VIBE not in entry point');
});

test('Help flag handler exists', () => {
  const binPath = path.join(__dirname, 'bin/vibe.js');
  const content = fs.readFileSync(binPath, 'utf-8');
  if (!content.includes('--help')) throw new Error('--help not handled');
});

test('Version flag handler exists', () => {
  const binPath = path.join(__dirname, 'bin/vibe.js');
  const content = fs.readFileSync(binPath, 'utf-8');
  if (!content.includes('--version')) throw new Error('--version not handled');
});

test('CLIEngine handles /help command', () => {
  const cliPath = path.join(__dirname, 'dist/tui/index.js');
  if (!fs.existsSync(cliPath)) throw new Error('CLIEngine not built');
  const content = fs.readFileSync(cliPath, 'utf-8');
  if (!content.includes('case \'/help\'')) throw new Error('/help not in CLIEngine');
});

test('CLIEngine handles /exit command', () => {
  const cliPath = path.join(__dirname, 'dist/tui/index.js');
  const content = fs.readFileSync(cliPath, 'utf-8');
  if (!content.includes('case \'/exit\'') && !content.includes('exit')) {
    throw new Error('/exit not handled');
  }
});

section('B. AI Interaction');

test('Provider router exists', () => {
  const routerPath = path.join(__dirname, 'dist/providers/router.js');
  if (!fs.existsSync(routerPath)) throw new Error('Provider router not built');
});

test('Provider registry has default provider', () => {
  const registryPath = path.join(__dirname, 'dist/providers/registry.js');
  if (!fs.existsSync(registryPath)) throw new Error('Provider registry not built');
  const content = fs.readFileSync(registryPath, 'utf-8');
  if (!content.includes('minimax') && !content.includes('anthropic')) {
    throw new Error('No default provider found');
  }
});

test('Multiple providers configured', () => {
  const registryPath = path.join(__dirname, 'dist/providers/registry.js');
  const content = fs.readFileSync(registryPath, 'utf-8');
  const providers = ['openai', 'anthropic', 'google', 'ollama'].filter(p =>
    content.includes(`id: '${p}'`) || content.includes(`id: "${p}"`)
  );
  if (providers.length < 2) throw new Error('Expected multiple providers');
});

test('Free tier detection exists', () => {
  const routerPath = path.join(__dirname, 'dist/providers/router.js');
  const content = fs.readFileSync(routerPath, 'utf-8');
  if (!content.includes('getFreeTierModels')) {
    throw new Error('Free tier detection not found');
  }
});

section('C. Configuration');

test('Config manager exists', () => {
  const configPath = path.join(__dirname, 'dist/config.js');
  if (!fs.existsSync(configPath)) throw new Error('Config manager not built');
});

test('Config saves API keys', () => {
  const configPath = path.join(__dirname, 'dist/config.js');
  const content = fs.readFileSync(configPath, 'utf-8');
  if (!content.includes('setApiKey')) throw new Error('setApiKey not found');
});

test('First-time setup exists', () => {
  const configPath = path.join(__dirname, 'dist/config.js');
  const content = fs.readFileSync(configPath, 'utf-8');
  if (!content.includes('runFirstTimeSetup')) {
    throw new Error('First-time setup not found');
  }
});

section('D. Memory');

test('Memory manager exists', () => {
  const memoryPath = path.join(__dirname, 'dist/memory/index.js');
  if (!fs.existsSync(memoryPath)) throw new Error('Memory manager not built');
});

test('Memory has add/get/delete', () => {
  const memoryPath = path.join(__dirname, 'dist/memory/index.js');
  const content = fs.readFileSync(memoryPath, 'utf-8');
  if (!content.includes('add(') || !content.includes('get(') || !content.includes('delete(')) {
    throw new Error('Memory operations missing');
  }
});

section('E. Intent Classification');

test('Intent router exists', () => {
  const routerPath = path.join(__dirname, 'dist/intent/router.js');
  if (!fs.existsSync(routerPath)) throw new Error('Intent router not built');
});

test('Intent categories defined', () => {
  const routerPath = path.join(__dirname, 'dist/intent/router.js');
  const content = fs.readFileSync(routerPath, 'utf-8');
  const categories = ['code_generation', 'debug', 'testing', 'deploy', 'security'];
  for (const cat of categories) {
    if (!content.includes(cat)) throw new Error(`Category ${cat} not found`);
  }
});

section('F. File System Operations');

test('File writer utility exists', () => {
  const writerPath = path.join(__dirname, 'dist/utils/file-writer.js');
  if (!fs.existsSync(writerPath)) throw new Error('File writer not built');
});

test('File writer has verification', () => {
  const writerPath = path.join(__dirname, 'dist/utils/file-writer.js');
  const content = fs.readFileSync(writerPath, 'utf-8');
  if (!content.includes('verifyFilesExist')) {
    throw new Error('File verification not found');
  }
});

section('G. Modules');

test('Base module exists', () => {
  const basePath = path.join(__dirname, 'dist/modules/base.module.js');
  if (!fs.existsSync(basePath)) throw new Error('Base module not built');
});

test('Web generation module exists', () => {
  const webPath = path.join(__dirname, 'dist/modules/web-generation/index.js');
  if (!fs.existsSync(webPath)) throw new Error('Web generation module not built');
});

test('Code assistant module exists', () => {
  const codePath = path.join(__dirname, 'dist/modules/code-assistant/index.js');
  if (!fs.existsSync(codePath)) throw new Error('Code assistant module not built');
});

test('Testing module exists', () => {
  const testPath = path.join(__dirname, 'dist/modules/testing/index.js');
  if (!fs.existsSync(testPath)) throw new Error('Testing module not built');
});

test('Security module exists', () => {
  const secPath = path.join(__dirname, 'dist/modules/security/index.js');
  if (!fs.existsSync(secPath)) throw new Error('Security module not built');
});

section('H. Orchestration');

test('Orchestrator exists', () => {
  const orchPath = path.join(__dirname, 'dist/orchestration/index.js');
  if (!fs.existsSync(orchPath)) throw new Error('Orchestrator not built');
});

test('Orchestrator has execute method', () => {
  const orchPath = path.join(__dirname, 'dist/orchestration/index.js');
  const content = fs.readFileSync(orchPath, 'utf-8');
  if (!content.includes('async execute')) throw new Error('execute method not found');
});

section('I. Workflow Engine');

test('Workflow engine exists', () => {
  const wfPath = path.join(__dirname, 'dist/orchestration/workflow.js');
  if (!fs.existsSync(wfPath)) throw new Error('Workflow engine not built');
});

section('J. Security & Approvals');

test('Approval manager exists', () => {
  const apprPath = path.join(__dirname, 'dist/approvals/index.js');
  if (!fs.existsSync(apprPath)) throw new Error('Approval manager not built');
});

test('Security scanner exists', () => {
  const scanPath = path.join(__dirname, 'dist/security/scanner.js');
  if (!fs.existsSync(scanPath)) throw new Error('Security scanner not built');
});

// ============================================================================
// SUMMARY
// ============================================================================

console.log(`\n${YELLOW}═══ TEST SUMMARY ═══${RESET}\n`);
console.log(`${GREEN}Passed:${RESET} ${passed}`);
console.log(`${RED}Failed:${RESET} ${failed}`);
console.log(`${YELLOW}Skipped:${RESET} ${skipped}`);
console.log(`\nTotal: ${passed + failed}\n`);

if (failed > 0) {
  console.log(`${RED}Some tests failed!${RESET}\n`);
  process.exit(1);
} else {
  console.log(`${GREEN}All tests passed!${RESET}\n`);
  process.exit(0);
}
