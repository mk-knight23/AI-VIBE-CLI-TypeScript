/**
 * Provider Setup UI - API Key configuration flow (FIXED)
 * True dropdown menus, no free-text where selection required
 */

import pc from 'picocolors';
import inquirer from 'inquirer';
import {
  getProviderInfo,
  hasApiKey,
  saveProviderApiKey,
  checkProviderHealth,
  ProviderInfo
} from '../providers/enhanced-registry';

// ============================================
// API KEY SETUP FLOW - FIXED
// ============================================

export async function showApiKeySetup(providerId: string): Promise<boolean> {
  const provider = getProviderInfo(providerId);
  if (!provider) {
    console.log(pc.red('✖ Unknown provider'));
    return false;
  }
  
  if (!provider.requiresApiKey) {
    console.log(pc.green(`✔ ${provider.displayName} doesn't require an API key`));
    return true;
  }
  
  if (hasApiKey(providerId)) {
    console.log(pc.green(`✔ ${provider.displayName} is already configured`));
    return true;
  }
  
  console.log();
  console.log(pc.bold(pc.cyan(`Setup ${provider.displayName}`)));
  console.log(pc.gray('─'.repeat(50)));
  console.log();
  console.log(`API key required for ${provider.displayName}`);
  console.log();
  console.log(pc.bold('Get your API key:'));
  console.log(`  ${pc.cyan(provider.apiKeyHelp.url)}`);
  console.log();
  
  // Action menu - TRUE DROPDOWN, no free text
  const { action } = await inquirer.prompt<{ action: string }>([{
    type: 'list',
    name: 'action',
    message: 'Choose an option:',
    choices: [
      { name: `${pc.green('●')} Paste API key now`, value: 'paste' },
      { name: `${pc.blue('●')} Copy setup URL to clipboard`, value: 'copy' },
      { name: `${pc.cyan('●')} Open URL in browser`, value: 'open' },
      { name: `${pc.gray('○')} Skip for now`, value: 'skip' }
    ],
    loop: false
  }]);
  
  switch (action) {
    case 'paste':
      return await promptApiKey(provider);
    case 'copy':
      await copyToClipboard(provider.apiKeyHelp.url);
      console.log(pc.green('✔ URL copied to clipboard'));
      return await showApiKeySetup(providerId);
    case 'open':
      await openUrl(provider.apiKeyHelp.url);
      console.log(pc.gray(`Opening ${provider.apiKeyHelp.url}...`));
      return await showApiKeySetup(providerId);
    case 'skip':
      console.log(pc.gray('Skipped. Configure later with /provider setup'));
      return false;
  }
  
  return false;
}

async function promptApiKey(provider: ProviderInfo): Promise<boolean> {
  console.log();
  console.log(pc.gray('Paste your API key (input is hidden):'));
  
  try {
    const { apiKey } = await inquirer.prompt<{ apiKey: string }>([{
      type: 'password',
      name: 'apiKey',
      message: `${provider.displayName} API key:`,
      mask: '*',
      validate: (input: string) => {
        if (!input || !input.trim()) {
          return 'API key cannot be empty. Press Ctrl+C to cancel.';
        }
        if (input.startsWith('/')) {
          return 'This looks like a command. Please paste your API key.';
        }
        if (input.length < 10) {
          return 'API key seems too short. Please check and try again.';
        }
        return true;
      }
    }]);
    
    // Save location - dropdown
    const { saveLocation } = await inquirer.prompt<{ saveLocation: string }>([{
      type: 'list',
      name: 'saveLocation',
      message: 'Where to save?',
      choices: [
        { name: `${pc.green('●')} Config file (~/.vibe/config.json) ${pc.green('recommended')}`, value: 'config' },
        { name: `${pc.gray('●')} Show env export command`, value: 'env' }
      ],
      loop: false
    }]);
    
    if (saveLocation === 'config') {
      saveProviderApiKey(provider.id, apiKey);
      console.log(pc.green('✔ API key saved'));
    } else {
      console.log();
      console.log(pc.bold('Add to your shell profile:'));
      console.log(pc.cyan(`  export ${provider.apiKeyEnvVar}="${apiKey}"`));
      console.log();
    }
    
    // Validate
    console.log(pc.gray('Validating...'));
    const health = await checkProviderHealth(provider.id);
    
    if (health.ok) {
      console.log(pc.green(`✔ ${provider.displayName} configured successfully!`));
      return true;
    } else {
      console.log(pc.yellow(`⚠ Saved, but validation returned: ${health.error}`));
      console.log(pc.gray('The key has been saved. You can try using the provider.'));
      return true;
    }
  } catch {
    console.log(pc.gray('Cancelled'));
    return false;
  }
}

// ============================================
// API KEY WARNING (inline)
// ============================================

export function showApiKeyWarning(providerId: string): void {
  const provider = getProviderInfo(providerId);
  if (!provider) return;
  
  console.log();
  console.log(pc.yellow(`⚠ ${provider.displayName} requires an API key`));
  console.log(pc.gray(`→ Run /provider to configure`));
  console.log();
}

// ============================================
// PROVIDER STATUS DISPLAY
// ============================================

export async function showProviderStatus(providerId: string): Promise<void> {
  const provider = getProviderInfo(providerId);
  if (!provider) {
    console.log(pc.red('✖ Unknown provider'));
    return;
  }
  
  console.log();
  console.log(pc.bold(pc.cyan(`Provider: ${provider.displayName}`)));
  console.log(pc.gray('─'.repeat(40)));
  
  const configured = !provider.requiresApiKey || hasApiKey(providerId);
  const statusIcon = configured ? pc.green('✔') : pc.yellow('⚠');
  const statusText = configured ? 'Configured' : 'API key missing';
  
  console.log(`Status: ${statusIcon} ${statusText}`);
  console.log(`Type: ${provider.tags.join(', ')}`);
  console.log(`Models: ${provider.defaultModels.slice(0, 3).join(', ')}`);
  
  if (!configured) {
    console.log();
    console.log(pc.gray(`→ Run /provider setup to configure`));
  }
  console.log();
}

// ============================================
// NO PROVIDER ERROR
// ============================================

export function showNoProviderError(): void {
  console.log();
  console.log(pc.yellow('⚠ No provider configured'));
  console.log();
  console.log(pc.gray('To start using VIBE, configure an AI provider:'));
  console.log();
  console.log(pc.gray('→ Run /provider to select and configure'));
  console.log(pc.gray('→ Or run: vibe setup'));
  console.log();
}

// ============================================
// PROVIDER ERROR (friendly)
// ============================================

export function showProviderError(error: any): void {
  console.log();
  console.log(pc.yellow('⚠ Could not connect to AI provider'));
  console.log();
  
  const errorMsg = error?.message || String(error);
  
  if (errorMsg.includes('API key') || errorMsg.includes('401') || errorMsg.includes('403')) {
    console.log(pc.gray('Possible cause: API key is invalid or expired'));
    console.log(pc.gray('→ Run /provider setup to reconfigure'));
  } else if (errorMsg.includes('500') || errorMsg.includes('502') || errorMsg.includes('503')) {
    console.log(pc.gray('Possible cause: Provider service temporarily unavailable'));
    console.log(pc.gray('→ Try again in a moment, or /provider to switch'));
  } else if (errorMsg.includes('network') || errorMsg.includes('ECONNREFUSED')) {
    console.log(pc.gray('Possible cause: Network connection issue'));
    console.log(pc.gray('→ Check your internet connection'));
  } else {
    console.log(pc.gray('→ Try /provider to switch providers'));
    console.log(pc.gray('→ Or /provider setup to reconfigure'));
  }
  console.log();
}

// ============================================
// HELPERS
// ============================================

async function copyToClipboard(text: string): Promise<void> {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const platform = process.platform;
    if (platform === 'darwin') {
      await execAsync(`echo "${text}" | pbcopy`);
    } else if (platform === 'linux') {
      await execAsync(`echo "${text}" | xclip -selection clipboard 2>/dev/null || echo "${text}" | xsel --clipboard 2>/dev/null`);
    } else if (platform === 'win32') {
      await execAsync(`echo ${text} | clip`);
    }
  } catch {
    // Silent fail
  }
}

async function openUrl(url: string): Promise<void> {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const platform = process.platform;
    if (platform === 'darwin') {
      await execAsync(`open "${url}"`);
    } else if (platform === 'linux') {
      await execAsync(`xdg-open "${url}" 2>/dev/null`);
    } else if (platform === 'win32') {
      await execAsync(`start "${url}"`);
    }
  } catch {
    // Silent fail
  }
}
