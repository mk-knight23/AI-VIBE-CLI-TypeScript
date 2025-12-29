/**
 * Doctor Command - Diagnose configuration issues
 */

import { providerRegistry } from '../core/llm/provider-registry';
import { credentialStore } from '../core/llm/credentials';
import { createClient } from '../core/llm/llm-client';
import { getRuntimeConfig } from '../core/config';

interface DiagnosticResult {
  check: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
}

export async function doctorCommand(): Promise<void> {
  console.log('\n🩺 VIBE Doctor\n');
  const results: DiagnosticResult[] = [];

  // Check 1: At least one provider configured
  const configuredProviders = providerRegistry.list()
    .filter(p => credentialStore.getApiKey(p.id));

  results.push({
    check: 'Provider credentials',
    status: configuredProviders.length > 0 ? 'pass' : 'fail',
    message: configuredProviders.length > 0
      ? `${configuredProviders.length} provider(s) configured`
      : 'No providers configured. Run `vibe connect`'
  });

  // Check 2: Default model parseable
  const config = getRuntimeConfig();
  const defaultModel = config.model;
  results.push({
    check: 'Default model',
    status: defaultModel ? 'pass' : 'warn',
    message: defaultModel || 'No default model set'
  });

  // Check 3: Test connectivity to configured providers
  console.log('Testing provider connectivity...\n');
  for (const provider of configuredProviders.slice(0, 3)) {
    try {
      const client = createClient(provider.id);
      const start = Date.now();
      const ok = await client.healthCheck();
      const latency = Date.now() - start;

      results.push({
        check: `${provider.name} connectivity`,
        status: ok ? 'pass' : 'warn',
        message: ok ? `Connected (${latency}ms)` : 'Could not connect'
      });
    } catch (err) {
      results.push({
        check: `${provider.name} connectivity`,
        status: 'fail',
        message: (err as Error).message
      });
    }
  }

  // Check 4: Local providers
  const localProviders = providerRegistry.listByType('local');
  for (const provider of localProviders) {
    try {
      const client = createClient(provider.id);
      const ok = await client.healthCheck();
      if (ok) {
        results.push({
          check: `${provider.name} (local)`,
          status: 'pass',
          message: 'Running'
        });
      }
    } catch {
      // Local provider not running - not an error
    }
  }

  // Print results
  console.log('Results:\n');
  for (const r of results) {
    const icon = { pass: '✅', warn: '⚠️', fail: '❌' }[r.status];
    console.log(`${icon} ${r.check}: ${r.message}`);
  }

  const failures = results.filter(r => r.status === 'fail');
  const warnings = results.filter(r => r.status === 'warn');

  console.log();
  if (failures.length === 0 && warnings.length === 0) {
    console.log('✨ All checks passed!');
  } else if (failures.length > 0) {
    console.log(`❌ ${failures.length} issue(s) need attention`);
  } else {
    console.log(`⚠️  ${warnings.length} warning(s)`);
  }
}
