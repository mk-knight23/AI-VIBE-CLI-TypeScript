/**
 * First-Run Setup Wizard
 * Phase 5: Guided provider setup on first run
 */

import pc from 'picocolors';
import inquirer from 'inquirer';
import * as fs from 'fs';
import * as path from 'path';
import {
  listAllProviders,
  hasApiKey,
  getConfiguredProviders,
  ProviderInfo
} from '../providers/enhanced-registry';
import { showProviderSelector } from './provider-selector';
import { showApiKeySetup } from './provider-setup';

const SETUP_FLAG_PATH = path.join(process.env.HOME || '~', '.vibe', '.setup-complete');

// ============================================
// SETUP WIZARD
// ============================================

export async function runSetupWizard(force: boolean = false): Promise<boolean> {
  // Check if already completed
  if (!force && isSetupComplete()) {
    return true;
  }
  
  console.clear();
  showWelcomeBanner();
  
  // Step 1: Welcome
  const { proceed } = await inquirer.prompt<{ proceed: boolean }>([{
    type: 'confirm',
    name: 'proceed',
    message: 'Would you like to set up a provider now?',
    default: true
  }]);
  
  if (!proceed) {
    console.log(pc.gray('\nYou can run setup later with: vibe setup'));
    console.log(pc.gray('Or configure providers with: /provider\n'));
    markSetupComplete();
    return false;
  }
  
  // Step 2: Provider selection
  console.log();
  const result = await showProviderSelector();
  
  if (!result.providerId) {
    markSetupComplete();
    return false;
  }
  
  // Step 3: API key setup if needed
  if (result.needsSetup) {
    const success = await showApiKeySetup(result.providerId);
    if (!success) {
      console.log(pc.gray('\nYou can configure this provider later with: /provider'));
    }
  }
  
  // Step 4: Summary
  showSetupSummary();
  
  markSetupComplete();
  return true;
}

// ============================================
// QUICK SETUP (for vibe setup command)
// ============================================

export async function runQuickSetup(): Promise<void> {
  console.log();
  console.log(pc.bold(pc.cyan('VIBE Provider Setup')));
  console.log(pc.gray('─'.repeat(50)));
  
  // Show current status
  const configured = getConfiguredProviders();
  if (configured.length > 0) {
    console.log(pc.green(`\n✓ ${configured.length} provider(s) configured:`));
    configured.forEach(p => console.log(`  ${pc.green('●')} ${p.displayName}`));
  }
  
  const unconfigured = listAllProviders().filter(p => p.requiresApiKey && !hasApiKey(p.id));
  if (unconfigured.length > 0) {
    console.log(pc.yellow(`\n○ ${unconfigured.length} provider(s) need API keys`));
  }
  
  console.log();
  
  const { action } = await inquirer.prompt<{ action: string }>([{
    type: 'list',
    name: 'action',
    message: 'What would you like to do?',
    choices: [
      { name: 'Add a new provider', value: 'add' },
      { name: 'View all providers', value: 'list' },
      { name: 'Done', value: 'done' }
    ]
  }]);
  
  if (action === 'add') {
    const result = await showProviderSelector();
    if (result.providerId && result.needsSetup) {
      await showApiKeySetup(result.providerId);
    }
    await runQuickSetup(); // Recurse
  } else if (action === 'list') {
    showAllProviders();
    await runQuickSetup(); // Recurse
  }
}

// ============================================
// HELPERS
// ============================================

function showWelcomeBanner(): void {
  console.log(pc.bold(pc.cyan(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎨 Welcome to VIBE CLI                                  ║
║                                                           ║
║   VIBE supports 15+ AI providers.                         ║
║   You bring your own API keys - we don't store any.       ║
║                                                           ║
║   Let's get you set up!                                   ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`)));
}

function showSetupSummary(): void {
  const configured = getConfiguredProviders();
  
  console.log();
  console.log(pc.bold(pc.cyan('Setup Complete!')));
  console.log(pc.gray('─'.repeat(40)));
  
  if (configured.length > 0) {
    console.log(pc.green(`\n✓ Ready to use:`));
    configured.forEach(p => console.log(`  ${pc.green('●')} ${p.displayName}`));
  }
  
  console.log(pc.gray(`
Quick commands:
  /provider     Switch provider
  /model        Switch model
  /help         Show all commands
`));
}

function showAllProviders(): void {
  const providers = listAllProviders();
  
  console.log();
  console.log(pc.bold(pc.cyan('All Providers')));
  console.log(pc.gray('─'.repeat(60)));
  
  providers.forEach(p => {
    const status = hasApiKey(p.id) ? pc.green('✓') : (p.requiresApiKey ? pc.yellow('○') : pc.blue('●'));
    const tags = p.tags.length > 0 ? pc.gray(` [${p.tags.join(', ')}]`) : '';
    console.log(`${status} ${p.displayName.padEnd(16)} ${pc.gray(p.description)}${tags}`);
    if (!hasApiKey(p.id) && p.requiresApiKey) {
      console.log(pc.gray(`   └─ ${p.apiKeyHelp.url}`));
    }
  });
  
  console.log();
  console.log(pc.gray('Legend: ✓ configured  ○ needs key  ● local/free'));
  console.log();
}

function isSetupComplete(): boolean {
  try {
    return fs.existsSync(SETUP_FLAG_PATH);
  } catch {
    return false;
  }
}

function markSetupComplete(): void {
  try {
    const dir = path.dirname(SETUP_FLAG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SETUP_FLAG_PATH, new Date().toISOString());
  } catch {
    // Ignore
  }
}

export function shouldShowSetupWizard(): boolean {
  // Show wizard if no providers configured and setup not complete
  const configured = getConfiguredProviders();
  return configured.length === 0 && !isSetupComplete();
}
