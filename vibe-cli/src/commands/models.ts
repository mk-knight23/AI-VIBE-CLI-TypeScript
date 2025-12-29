/**
 * Models Command - List and filter models
 */

import { modelRegistry } from '../core/llm/model-registry';
import { credentialStore } from '../core/llm/credentials';
import { CostTier, SpeedTier } from '../core/llm/types';

interface ModelsFilter {
  provider?: string;
  cost?: CostTier;
  speed?: SpeedTier;
  local?: boolean;
  code?: boolean;
  vision?: boolean;
  reasoning?: boolean;
}

export function modelsCommand(filter: ModelsFilter = {}): void {
  let models = modelRegistry.list();

  // Apply filters
  if (filter.provider) {
    models = models.filter(m => m.provider === filter.provider);
  }
  if (filter.cost) {
    models = models.filter(m => m.config.cost === filter.cost);
  }
  if (filter.speed) {
    models = models.filter(m => m.config.speed === filter.speed);
  }
  if (filter.local) {
    models = models.filter(m => m.config.local);
  }
  if (filter.code) {
    models = models.filter(m => m.config.supports.tools);
  }
  if (filter.vision) {
    models = models.filter(m => m.config.supports.vision);
  }
  if (filter.reasoning) {
    models = models.filter(m => m.config.supports.reasoning);
  }

  if (models.length === 0) {
    console.log('No models match the filter');
    return;
  }

  console.log('\n📦 Models:\n');

  // Group by provider
  const byProvider = new Map<string, typeof models>();
  for (const m of models) {
    const list = byProvider.get(m.provider) || [];
    list.push(m);
    byProvider.set(m.provider, list);
  }

  for (const [provider, providerModels] of byProvider) {
    const hasKey = credentialStore.getApiKey(provider);
    const status = hasKey ? '✅' : '⚪';
    console.log(`${status} ${provider}`);

    for (const m of providerModels) {
      const caps: string[] = [];
      if (m.config.supports.tools) caps.push('🔧');
      if (m.config.supports.vision) caps.push('👁️');
      if (m.config.supports.reasoning) caps.push('🧠');
      if (m.config.local) caps.push('💻');

      const cost = { low: '💚', medium: '💛', high: '❤️' }[m.config.cost];
      const speed = { fast: '⚡', medium: '🔄', slow: '🐢' }[m.config.speed];
      const ctx = formatContext(m.config.context);

      console.log(`   ${m.id.padEnd(35)} ${cost}${speed} ${ctx.padEnd(8)} ${caps.join('')}`);
    }
    console.log();
  }

  console.log('Legend: 💚low 💛med ❤️high | ⚡fast 🔄med 🐢slow | 🔧tools 👁️vision 🧠reasoning 💻local');
}

function formatContext(ctx: number): string {
  if (ctx >= 1000000) return `${(ctx / 1000000).toFixed(1)}M`;
  if (ctx >= 1000) return `${(ctx / 1000).toFixed(0)}k`;
  return `${ctx}`;
}

export function parseModelsArgs(args: string[]): ModelsFilter {
  const filter: ModelsFilter = {};
  for (const arg of args) {
    if (arg === '--local') filter.local = true;
    else if (arg === '--code') filter.code = true;
    else if (arg === '--vision') filter.vision = true;
    else if (arg === '--reasoning') filter.reasoning = true;
    else if (arg === '--cheap') filter.cost = 'low';
    else if (arg === '--fast') filter.speed = 'fast';
    else if (!arg.startsWith('--')) filter.provider = arg;
  }
  return filter;
}
