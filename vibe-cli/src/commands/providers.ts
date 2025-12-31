/**
 * Providers Command - Show AI configuration status
 * 
 * Simplified: No provider switching, just shows config status
 */

import { UniversalAI } from '../core/universal-ai';
import { listAllProviders, hasApiKey } from '../providers/enhanced-registry';
import pc from 'picocolors';

export function providersCommand(): void {
  console.log('\n' + pc.bold('AI Configuration Status') + '\n');
  
  const providers = listAllProviders();
  const models = UniversalAI.getModels();
  
  // Show configured status
  console.log(pc.gray('Providers:'));
  for (const provider of providers) {
    const configured = hasApiKey(provider.id);
    const icon = configured ? pc.green('✔') : pc.yellow('○');
    const status = configured ? pc.green('configured') : pc.gray('not configured');
    console.log(`  ${icon} ${provider.displayName.padEnd(15)} ${status}`);
  }
  
  // Show available models by task
  console.log('\n' + pc.gray('Models by task:'));
  const tasks = ['chat', 'code', 'debug', 'agent'] as const;
  for (const task of tasks) {
    const taskModels = models.filter(m => m.task === task);
    const freeModels = taskModels.filter(m => m.free);
    console.log(`  ${task.padEnd(8)} ${freeModels.length} free, ${taskModels.length - freeModels.length} paid`);
  }
  
  // Show config file location
  console.log('\n' + pc.gray('Config: vibe.config.ai.json'));
  console.log(pc.gray('Edit this file to add providers or models.'));
}

export async function checkProviderHealth(_providerId: string): Promise<{
  ok: boolean;
  latency?: number;
  error?: string;
}> {
  return { ok: UniversalAI.isConfigured() };
}
