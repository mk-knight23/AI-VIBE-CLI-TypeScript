/**
 * Providers Command - List providers and status
 */

import { providerRegistry } from '../core/llm/provider-registry';
import { credentialStore } from '../core/llm/credentials';
import { createClient } from '../core/llm/llm-client';

export function providersCommand(): void {
  const providers = providerRegistry.list();

  console.log('\n📡 Providers:\n');

  const cloud = providers.filter(p => p.type === 'cloud');
  const gateways = providers.filter(p => p.type === 'gateway');
  const local = providers.filter(p => p.type === 'local');

  const printProvider = (p: typeof providers[0]) => {
    const hasKey = credentialStore.getApiKey(p.id);
    const status = hasKey ? '✅' : '⚪';
    const envHint = p.env?.[0] ? ` (${p.env[0]})` : '';
    console.log(`  ${status} ${p.id.padEnd(15)} ${p.name}${envHint}`);
  };

  console.log('Cloud:');
  cloud.forEach(printProvider);

  console.log('\nGateways:');
  gateways.forEach(printProvider);

  console.log('\nLocal:');
  local.forEach(printProvider);

  console.log('\n✅ = configured  ⚪ = not configured');
  console.log('Run `vibe connect <provider>` to add credentials');
}

export async function checkProviderHealth(providerId: string): Promise<{
  ok: boolean;
  latency?: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    const client = createClient(providerId);
    const ok = await client.healthCheck();
    return { ok, latency: Date.now() - start };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
