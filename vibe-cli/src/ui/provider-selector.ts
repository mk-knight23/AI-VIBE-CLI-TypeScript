/**
 * Provider & Model Selection UI - FIXED
 * True dropdown selection with locked input, no free-text where selection required
 */

import pc from 'picocolors';
import inquirer from 'inquirer';
import {
  ProviderInfo,
  listAllProviders,
  hasApiKey,
  getProviderInfo
} from '../providers/enhanced-registry';
import { modelRegistry } from '../core/llm/model-registry';

// ============================================
// PROVIDER SELECTOR - TRUE DROPDOWN
// ============================================

export interface ProviderSelectResult {
  providerId: string | null;
  needsSetup: boolean;
}

export async function showProviderSelector(currentProvider?: string): Promise<ProviderSelectResult> {
  const providers = listAllProviders();
  
  console.log();
  console.log(pc.bold(pc.cyan('Select Provider')));
  console.log(pc.gray('↑↓ navigate • Enter select • Esc cancel'));
  console.log(pc.gray('─'.repeat(50)));
  
  // Group and sort providers
  const configured = providers.filter(p => hasApiKey(p.id));
  const local = providers.filter(p => p.tags.includes('local') && !hasApiKey(p.id));
  const unconfigured = providers.filter(p => p.requiresApiKey && !hasApiKey(p.id) && !p.tags.includes('local'));
  
  const choices: any[] = [];
  
  // Configured first
  if (configured.length > 0) {
    choices.push(new inquirer.Separator(pc.green('─ Configured ─')));
    configured.forEach(p => {
      const current = p.id === currentProvider ? pc.green(' (current)') : '';
      choices.push({
        name: `${pc.green('✔')} ${p.displayName.padEnd(16)} ${pc.gray(p.description)}${current}`,
        value: p.id,
        short: p.displayName
      });
    });
  }
  
  // Local
  if (local.length > 0) {
    choices.push(new inquirer.Separator(pc.blue('─ Local (no key needed) ─')));
    local.forEach(p => {
      const current = p.id === currentProvider ? pc.green(' (current)') : '';
      choices.push({
        name: `${pc.blue('●')} ${p.displayName.padEnd(16)} ${pc.gray(p.description)}${current}`,
        value: p.id,
        short: p.displayName
      });
    });
  }
  
  // Unconfigured
  if (unconfigured.length > 0) {
    choices.push(new inquirer.Separator(pc.yellow('─ Needs API Key ─')));
    unconfigured.forEach(p => {
      choices.push({
        name: `${pc.yellow('⚠')} ${p.displayName.padEnd(16)} ${pc.gray(p.description)}`,
        value: p.id,
        short: p.displayName
      });
    });
  }
  
  choices.push(new inquirer.Separator(''));
  choices.push({ name: pc.gray('Cancel'), value: null, short: 'Cancel' });
  
  try {
    const { provider } = await inquirer.prompt<{ provider: string | null }>([{
      type: 'list',
      name: 'provider',
      message: '>',
      choices,
      pageSize: 15,
      loop: false
    }]);
    
    if (!provider) {
      return { providerId: null, needsSetup: false };
    }
    
    const info = getProviderInfo(provider);
    const needsSetup = info?.requiresApiKey && !hasApiKey(provider);
    
    // Show confirmation
    console.log();
    if (needsSetup) {
      console.log(pc.yellow(`⚠ ${info?.displayName || provider} requires an API key`));
    } else {
      console.log(pc.green(`✔ ${info?.displayName || provider} selected`));
    }
    
    return { providerId: provider, needsSetup: needsSetup || false };
  } catch {
    return { providerId: null, needsSetup: false };
  }
}

// ============================================
// MODEL SELECTOR - TRUE DROPDOWN
// ============================================

export interface ModelSelectResult {
  modelId: string | null;
  fullId: string | null;
}

export async function showModelSelector(providerId: string, currentModel?: string): Promise<ModelSelectResult> {
  const provider = getProviderInfo(providerId);
  
  if (!provider) {
    console.log(pc.red('✖ Unknown provider'));
    return { modelId: null, fullId: null };
  }
  
  // Check if configured
  if (provider.requiresApiKey && !hasApiKey(providerId)) {
    console.log();
    console.log(pc.yellow(`⚠ ${provider.displayName} is not configured`));
    console.log(pc.gray('Use /provider to configure it first'));
    return { modelId: null, fullId: null };
  }
  
  console.log();
  console.log(pc.bold(pc.cyan(`Select Model (${provider.displayName})`)));
  console.log(pc.gray('↑↓ navigate • Enter select • Esc cancel'));
  console.log(pc.gray('─'.repeat(50)));
  
  const models = modelRegistry.listByProvider(providerId);
  const defaultModels = provider.defaultModels;
  
  const choices: any[] = [];
  
  // Recommended models
  if (defaultModels.length > 0) {
    choices.push(new inquirer.Separator(pc.green('─ Recommended ─')));
    defaultModels.forEach((modelId, idx) => {
      const regModel = models.find(m => m.id === modelId);
      const current = modelId === currentModel ? pc.green(' (current)') : '';
      const ctx = regModel?.config?.context ? pc.gray(` ${formatContext(regModel.config.context)}`) : '';
      const rec = idx === 0 ? pc.cyan(' ★') : '';
      choices.push({
        name: `${rec} ${modelId}${ctx}${current}`,
        value: modelId,
        short: modelId
      });
    });
  }
  
  // Other models
  const otherModels = models.filter(m => !defaultModels.includes(m.id));
  if (otherModels.length > 0) {
    choices.push(new inquirer.Separator(pc.gray('─ Other ─')));
    otherModels.forEach(m => {
      const current = m.id === currentModel ? pc.green(' (current)') : '';
      const ctx = m.config.context ? pc.gray(` ${formatContext(m.config.context)}`) : '';
      choices.push({
        name: `  ${m.id}${ctx}${current}`,
        value: m.id,
        short: m.id
      });
    });
  }
  
  // Custom option (only place where text input is allowed)
  choices.push(new inquirer.Separator(''));
  choices.push({ name: pc.gray('Enter custom model ID...'), value: '__custom__', short: 'Custom' });
  choices.push({ name: pc.gray('Cancel'), value: null, short: 'Cancel' });
  
  try {
    const { model } = await inquirer.prompt<{ model: string | null }>([{
      type: 'list',
      name: 'model',
      message: '>',
      choices,
      pageSize: 12,
      loop: false
    }]);
    
    if (!model) {
      return { modelId: null, fullId: null };
    }
    
    if (model === '__custom__') {
      return await promptCustomModel(providerId);
    }
    
    console.log(pc.green(`✔ Model set to ${model}`));
    return { modelId: model, fullId: `${providerId}/${model}` };
  } catch {
    return { modelId: null, fullId: null };
  }
}

async function promptCustomModel(providerId: string): Promise<ModelSelectResult> {
  console.log();
  console.log(pc.gray('Enter the model ID (e.g., gpt-4o, claude-3-opus):'));
  
  try {
    const { customModel } = await inquirer.prompt<{ customModel: string }>([{
      type: 'input',
      name: 'customModel',
      message: 'Model ID:',
      validate: (input: string) => {
        if (!input.trim()) return 'Model ID required';
        if (input.startsWith('/')) return 'This looks like a command, not a model ID';
        if (input.includes(' ')) return 'Model ID should not contain spaces';
        return true;
      }
    }]);
    
    if (customModel) {
      console.log(pc.green(`✔ Model set to ${customModel}`));
      return { modelId: customModel, fullId: `${providerId}/${customModel}` };
    }
  } catch {
    // Cancelled
  }
  
  return { modelId: null, fullId: null };
}

// ============================================
// HELPERS
// ============================================

function formatContext(ctx: number): string {
  if (ctx >= 1000000) return `${(ctx / 1000000).toFixed(0)}M ctx`;
  if (ctx >= 1000) return `${(ctx / 1000).toFixed(0)}K ctx`;
  return `${ctx} ctx`;
}
