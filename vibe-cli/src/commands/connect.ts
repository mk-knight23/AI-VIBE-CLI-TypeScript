/**
 * Connect Command - Interactive credential setup
 */

import * as readline from 'readline';
import { providerRegistry } from '../core/llm/provider-registry';
import { credentialStore } from '../core/llm/credentials';
import { createClient } from '../core/llm/llm-client';

export async function connectCommand(providerId?: string): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (q: string): Promise<string> =>
    new Promise(resolve => rl.question(q, resolve));

  try {
    // Select provider
    let provider = providerId;
    if (!provider) {
      console.log('\n📡 Available Providers:\n');
      const providers = providerRegistry.list();
      const cloud = providers.filter(p => p.type === 'cloud');
      const gateways = providers.filter(p => p.type === 'gateway');
      const local = providers.filter(p => p.type === 'local');

      console.log('  Cloud:');
      cloud.forEach(p => console.log(`    ${p.id.padEnd(15)} ${p.name}`));
      console.log('\n  Gateways:');
      gateways.forEach(p => console.log(`    ${p.id.padEnd(15)} ${p.name}`));
      console.log('\n  Local:');
      local.forEach(p => console.log(`    ${p.id.padEnd(15)} ${p.name}`));

      provider = await question('\nProvider ID: ');
    }

    const providerDef = providerRegistry.get(provider);
    if (!providerDef) {
      console.log(`❌ Unknown provider: ${provider}`);
      return;
    }

    // Local providers don't need API keys
    if (providerDef.type === 'local') {
      const baseURL = await question(`Base URL [${providerDef.baseURL}]: `);
      credentialStore.set(provider, {
        baseURL: baseURL || providerDef.baseURL
      });
      console.log(`\n✅ ${providerDef.name} configured`);

      // Test connection
      console.log('Testing connection...');
      const client = createClient(provider);
      const ok = await client.healthCheck();
      console.log(ok ? '✅ Connected!' : '⚠️  Could not connect. Is the server running?');
      return;
    }

    // Cloud/gateway providers need API key
    const envKey = providerDef.env?.[0];
    if (envKey && process.env[envKey]) {
      console.log(`\n✅ Using ${envKey} from environment`);
      credentialStore.set(provider, { apiKey: `env:${envKey}` });
    } else {
      const apiKey = await question('API Key: ');
      if (!apiKey) {
        console.log('❌ API key required');
        return;
      }
      credentialStore.set(provider, { apiKey });
    }

    // Optional custom base URL
    const customURL = await question(`Custom Base URL [${providerDef.baseURL}]: `);
    if (customURL) {
      const creds = credentialStore.get(provider);
      credentialStore.set(provider, { ...creds, baseURL: customURL });
    }

    console.log(`\n✅ ${providerDef.name} credentials saved`);

    // Test connection
    console.log('Testing connection...');
    const client = createClient(provider);
    const ok = await client.healthCheck();
    console.log(ok ? '✅ Connected!' : '⚠️  Could not verify connection');

  } finally {
    rl.close();
  }
}
