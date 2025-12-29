/**
 * Status Command - Expose observability data
 */

import pc from 'picocolors';
import { getHealthStatus, getMetrics, getRecentTraces } from '../core/observability';
import { getHealthStatus as getProviderHealth } from '../core/health';

export async function handleStatusCommand(args?: string): Promise<void> {
  const subcommand = args?.trim().toLowerCase();

  switch (subcommand) {
    case 'health':
      await showHealth();
      break;
    case 'metrics':
      showMetrics();
      break;
    case 'traces':
      showTraces();
      break;
    default:
      await showAll();
  }
}

async function showAll(): Promise<void> {
  console.log();
  console.log(pc.cyan('═'.repeat(50)));
  console.log(pc.cyan('📊 VIBE CLI Status'));
  console.log(pc.cyan('═'.repeat(50)));
  
  await showHealth();
  console.log();
  showMetrics();
  console.log();
  showTraces();
}

async function showHealth(): Promise<void> {
  const health = getHealthStatus();
  const providerHealth = await getProviderHealth();
  
  const statusIcon = {
    healthy: pc.green('🟢 HEALTHY'),
    degraded: pc.yellow('🟡 DEGRADED'),
    unhealthy: pc.red('🔴 UNHEALTHY'),
  }[health.status];

  console.log();
  console.log(pc.bold('Health Status'));
  console.log(`  Status: ${statusIcon}`);
  console.log(`  Uptime: ${formatDuration(health.uptime)}`);
  console.log(`  Active Traces: ${health.activeTraces}`);
  if (health.lastError) {
    console.log(`  Last Error: ${pc.red(health.lastError)}`);
  }
  
  console.log();
  console.log(pc.bold('Provider Status'));
  console.log(`  Provider: ${providerHealth.provider || 'none'}`);
  console.log(`  Config: ${providerHealth.checks.config ? pc.green('✓') : pc.red('✗')}`);
  console.log(`  Connection: ${providerHealth.checks.provider ? pc.green('✓') : pc.red('✗')}`);
  console.log(`  Memory: ${providerHealth.checks.memory ? pc.green('✓') : pc.red('✗')}`);
}

function showMetrics(): void {
  const m = getMetrics();
  
  console.log(pc.bold('Metrics'));
  console.log(`  Requests: ${m.requests}`);
  console.log(`  Errors: ${m.errors} (${(m.errorRate * 100).toFixed(1)}%)`);
  console.log(`  Avg Latency: ${m.avgLatency.toFixed(0)}ms`);
  
  if (Object.keys(m.toolCalls).length > 0) {
    console.log();
    console.log(pc.bold('Tool Usage'));
    const sorted = Object.entries(m.toolCalls).sort((a, b) => b[1] - a[1]);
    for (const [tool, count] of sorted.slice(0, 5)) {
      console.log(`  ${tool}: ${count}`);
    }
  }
  
  if (Object.keys(m.providerCalls).length > 0) {
    console.log();
    console.log(pc.bold('Provider Usage'));
    for (const [provider, count] of Object.entries(m.providerCalls)) {
      console.log(`  ${provider}: ${count}`);
    }
  }
  
  if (Object.keys(m.commandCalls).length > 0) {
    console.log();
    console.log(pc.bold('Command Usage'));
    const sorted = Object.entries(m.commandCalls).sort((a, b) => b[1] - a[1]);
    for (const [cmd, count] of sorted.slice(0, 5)) {
      console.log(`  /${cmd}: ${count}`);
    }
  }
}

function showTraces(): void {
  const traces = getRecentTraces();
  
  console.log(pc.bold('Recent Agent Traces'));
  
  if (traces.length === 0) {
    console.log(pc.gray('  No traces recorded'));
    return;
  }
  
  for (const trace of traces.slice(-5)) {
    const statusIcon = {
      running: '🔄',
      completed: '✅',
      failed: '❌',
      cancelled: '⚠️',
    }[trace.status];
    
    const duration = trace.endTime 
      ? `${trace.endTime - trace.startTime}ms`
      : 'running';
    
    console.log(`  ${statusIcon} ${trace.traceId} | ${trace.steps.length} steps | ${duration}`);
    
    if (trace.rollbackCount > 0) {
      console.log(pc.yellow(`     ↩️ ${trace.rollbackCount} rollback(s)`));
    }
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}
