import pc from 'picocolors';
import { ApiClient } from '../core/api';
import { commands, findCommand, getCommandsByCategory } from '../commands/registry';
import { agentCommand } from '../commands/misc';
import { tools } from '../tools';
import { getHealthStatus, formatHealthStatus } from '../core/health';
import { 
  getSecurityLists, 
  isDryRun, 
  AuditLogger,
  getRiskIndicator 
} from '../core/security';
import { executeCustomCommand, getCustomCommandHelp } from '../commands/custom/executor';
import { 
  getInteractiveHelp, 
  getModeHelp, 
  getAgentHelp, 
  getMcpHelp, 
  getToolsHelp,
  getProvidersHelp,
  showCommandPalette,
  showModePalette,
  showAgentPalette,
  showProviderPalette,
  showSessionUI,
  showBatchApprovalUI
} from '../ui';

export async function handleCommand(
  input: string,
  client: ApiClient,
  currentModel: string
): Promise<string | void> {
  const parts = input.slice(1).trim().split(' ');
  const cmdName = parts[0].toLowerCase();
  const args = parts.slice(1);

  // Handle health command directly (not in registry)
  if (cmdName === 'health') {
    const health = await getHealthStatus();
    console.log('\n' + formatHealthStatus(health) + '\n');
    return;
  }

  // Handle security command
  if (cmdName === 'security') {
    showSecurityStatus(args[0]);
    return;
  }

  const command = findCommand(cmdName);
  
  if (!command) {
    console.log(pc.red(`Unknown command: ${cmdName}`));
    console.log(pc.yellow('Type /help for available commands'));
    return;
  }

  switch (command.name) {
    case 'help':
      showHelp(args[0]);
      break;
    
    case 'palette':
      const paletteResult = await showCommandPalette();
      if (paletteResult.action === 'quit') return 'quit';
      if (paletteResult.action === 'clear') return 'clear';
      if (paletteResult.action === 'model') return 'model';
      if (paletteResult.action === 'provider') return 'provider';
      if (paletteResult.action === 'mode') return `mode:${paletteResult.data}`;
      if (paletteResult.action === 'agent') return `agent:${paletteResult.data}`;
      if (paletteResult.action === 'execute' && paletteResult.data) {
        // Recursively handle the command
        return handleCommand(paletteResult.data, client, currentModel);
      }
      break;
    
    case 'quit':
      console.log(pc.cyan('\n👋 Goodbye\n'));
      return 'quit';
    
    case 'clear':
      console.log(pc.green('✓ Cleared'));
      return 'clear';
    
    case 'version':
      console.log(pc.cyan('\nVIBE CLI v10.1.0'));
      console.log(pc.gray(`${tools.length} Tools | 15+ Providers | 27+ Models\n`));
      break;
    
    case 'model':
      return 'model';
    
    case 'provider':
      // Handle subcommands: /provider setup, /provider status, /provider list
      if (args[0] === 'setup') {
        const { showApiKeySetup } = await import('../ui/provider-setup');
        const providerId = args[1];
        if (providerId) {
          await showApiKeySetup(providerId);
        } else {
          // Show provider selector then setup
          const { showProviderSelector } = await import('../ui/provider-selector');
          const result = await showProviderSelector();
          if (result.providerId) {
            await showApiKeySetup(result.providerId);
          }
        }
        return;
      }
      if (args[0] === 'status') {
        const { showProviderStatus } = await import('../ui/provider-setup');
        await showProviderStatus(args[1] || 'openai');
        return;
      }
      if (args[0] === 'list') {
        console.log(getProvidersHelp());
        return;
      }
      return 'provider';
    
    case 'create':
      return 'create';
    
    case 'tools':
      showAllTools();
      break;
    
    case 'memory':
      return 'memory';
    
    case 'analyze':
      await executeTool('analyze_code_quality', { file_path: args[0] || '.' });
      break;
    
    case 'refactor':
      if (!args[0]) {
        console.log(pc.yellow('Usage: /refactor <file> [extract|inline]'));
        return;
      }
      await executeTool('smart_refactor', { file_path: args[0], type: args[1] || 'extract' });
      break;
    
    case 'test':
      if (!args[0]) {
        console.log(pc.yellow('Usage: /test <file> [vitest|jest|mocha]'));
        return;
      }
      await executeTool('generate_tests', { file_path: args[0], framework: args[1] || 'vitest' });
      break;
    
    case 'optimize':
      await executeTool('optimize_bundle', { project_path: args[0] || '.' });
      break;
    
    case 'security':
      await executeTool('security_scan', { project_path: args[0] || '.' });
      break;
    
    case 'benchmark':
      if (!args[0]) {
        console.log(pc.yellow('Usage: /benchmark <file>'));
        return;
      }
      await executeTool('performance_benchmark', { file_path: args[0] });
      break;
    
    case 'docs':
      if (!args[0]) {
        console.log(pc.yellow('Usage: /docs <file>'));
        return;
      }
      await executeTool('generate_documentation', { file_path: args[0] });
      break;
    
    case 'migrate':
      if (!args[0] || !args[1] || !args[2]) {
        console.log(pc.yellow('Usage: /migrate <file> <from> <to>'));
        console.log(pc.gray('Example: /migrate app.js commonjs esm'));
        return;
      }
      await executeTool('migrate_code', { file_path: args[0], from: args[1], to: args[2] });
      break;
    
    case 'agent':
    case 'agents':
      if (args[0]) {
        // Switch to specific agent
        const { BUILTIN_AGENTS } = await import('../agents/builtin');
        if (BUILTIN_AGENTS[args[0]]) {
          console.log(pc.green(`✓ Switched to ${args[0]} agent`));
          console.log(pc.gray(BUILTIN_AGENTS[args[0]].description));
        } else {
          console.log(pc.red(`Unknown agent: ${args[0]}`));
          console.log(pc.gray('Available: ' + Object.keys(BUILTIN_AGENTS).join(', ')));
        }
      } else {
        // Show agent palette
        const result = await showAgentPalette();
        if (result.data) {
          console.log(pc.green(`✓ Switched to ${result.data} agent`));
        }
      }
      break;
    
    case 'scan':
      await runProjectScan(args[0] || '.');
      break;

    case 'session':
      await handleSessionCommand(args);
      break;

    case 'diff':
      await handleDiffCommand(args);
      break;

    case 'bug':
      await handleBugCommand();
      break;

    case 'context':
      await handleContextCommand(args);
      break;

    case 'mode':
      return handleModeCommand(args);

    case 'mcp':
      await handleMcpCommand(args);
      break;

    case 'audit':
      await handleAuditCommand(args);
      break;

    case 'approve':
      await handleApproveCommand(args);
      break;

    case 'cmd':
      await handleCmdCommand(args);
      break;
    
    default:
      console.log(pc.yellow(`Command not implemented: ${command.name}`));
  }
}

async function executeTool(toolName: string, params: any): Promise<void> {
  const tool = tools.find(t => t.name === toolName);
  if (!tool) {
    console.log(pc.red(`Tool not found: ${toolName}`));
    return;
  }
  
  try {
    console.log(pc.cyan(`\n⚡ ${tool.displayName}\n`));
    const result = await tool.handler(params);
    console.log(result);
    console.log();
  } catch (error: any) {
    console.log(pc.red(`✗ ${error.message}\n`));
  }
}

async function runProjectScan(projectPath: string): Promise<void> {
  console.log(pc.cyan('\n🔍 Project Scan\n'));
  
  const scanTools = [
    { name: 'get_project_info', params: {} },
    { name: 'analyze_code_quality', params: { file_path: projectPath } },
    { name: 'security_scan', params: { project_path: projectPath } },
    { name: 'optimize_bundle', params: { project_path: projectPath } }
  ];
  
  for (const { name, params } of scanTools) {
    const tool = tools.find(t => t.name === name);
    if (tool) {
      try {
        console.log(pc.gray(`Running ${tool.displayName}...`));
        const result = await tool.handler(params);
        console.log(result);
        console.log();
      } catch (error: any) {
        console.log(pc.red(`✗ ${error.message}`));
      }
    }
  }
}

function colorDiff(diff: string): string {
  return diff.split('\n').map(line => {
    if (line.startsWith('+++') || line.startsWith('---')) return pc.bold(line);
    if (line.startsWith('+')) return pc.green(line);
    if (line.startsWith('-')) return pc.red(line);
    if (line.startsWith('@@')) return pc.cyan(line);
    return line;
  }).join('\n');
}

function showHelp(specificCommand?: string): void {
  if (specificCommand) {
    // Check for special help topics
    if (specificCommand === 'mode' || specificCommand === 'modes') {
      console.log(getModeHelp());
      return;
    }
    if (specificCommand === 'agent' || specificCommand === 'agents') {
      console.log(getAgentHelp());
      return;
    }
    if (specificCommand === 'mcp') {
      console.log(getMcpHelp());
      return;
    }
    if (specificCommand === 'tools') {
      console.log(getToolsHelp(tools));
      return;
    }
    if (specificCommand === 'provider' || specificCommand === 'providers') {
      console.log(getProvidersHelp());
      return;
    }
  }
  
  console.log(getInteractiveHelp(specificCommand));
}

function showAllTools(): void {
  console.log(getToolsHelp(tools));
}

function showSecurityStatus(subcommand?: string): void {
  const lists = getSecurityLists();
  const dryRun = isDryRun();
  const logger = new AuditLogger();
  const recentAudit = logger.getRecent(10);

  console.log(`\n${pc.bold(pc.cyan('🔒 SECURITY STATUS'))}\n`);
  
  // Mode
  console.log(pc.bold('Mode:'));
  console.log(`  ${dryRun ? pc.yellow('🔍 DRY-RUN (write operations blocked)') : pc.green('🟢 NORMAL')}`);
  console.log();

  if (subcommand === 'audit') {
    // Show audit log
    console.log(pc.bold('Recent Audit Log:'));
    if (recentAudit.length === 0) {
      console.log(pc.gray('  No audit entries'));
    } else {
      recentAudit.slice(0, 10).forEach(entry => {
        const indicator = getRiskIndicator(entry.riskLevel);
        const time = new Date(entry.timestamp).toLocaleTimeString();
        console.log(`  ${indicator} [${time}] ${entry.action} ${entry.command || ''}`);
      });
    }
    console.log();
    return;
  }

  if (subcommand === 'lists') {
    // Show allow/deny lists
    console.log(pc.bold('Allowed Commands (always safe):'));
    lists.allowedCommands.slice(0, 10).forEach(cmd => {
      console.log(`  ${pc.green('✓')} ${cmd}`);
    });
    console.log(pc.gray(`  ... and ${lists.allowedCommands.length - 10} more`));
    console.log();
    return;
  }

  // Default: show summary
  console.log(pc.bold('Risk Levels:'));
  console.log(`  ${getRiskIndicator('safe')} SAFE - Read-only, no approval needed`);
  console.log(`  ${getRiskIndicator('low')} LOW - Minor changes, approval recommended`);
  console.log(`  ${getRiskIndicator('medium')} MEDIUM - Write operations, approval required`);
  console.log(`  ${getRiskIndicator('high')} HIGH - Destructive operations, explicit approval`);
  console.log(`  ${getRiskIndicator('blocked')} BLOCKED - Never allowed`);
  console.log();

  console.log(pc.bold('Operation Types:'));
  console.log(`  📖 READ (${lists.readOperations.length} tools) - No side effects`);
  console.log(`  ✏️  WRITE (${lists.writeOperations.length} tools) - Has side effects`);
  console.log();

  console.log(pc.bold('Commands:'));
  console.log(`  ${pc.cyan('/security audit')} - View recent audit log`);
  console.log(`  ${pc.cyan('/security lists')} - View allow/deny lists`);
  console.log();

  console.log(pc.bold('Environment:'));
  console.log(`  VIBE_DRY_RUN=${dryRun ? 'true' : 'false'} - ${dryRun ? 'Write ops blocked' : 'Normal mode'}`);
  console.log(`  VIBE_AUDIT=${process.env.VIBE_AUDIT !== 'false' ? 'true' : 'false'} - Audit logging`);
  console.log();
}

// ============================================
// NEW SLASH COMMAND HANDLERS (v10.1)
// ============================================

async function handleSessionCommand(args: string[]): Promise<void> {
  const { listSessions, createSession, getSession } = await import('../storage/sessions');
  const subcommand = args[0];

  console.log(`\n${pc.bold(pc.cyan('📋 SESSIONS'))}\n`);

  if (!subcommand || subcommand === 'list') {
    const sessions = listSessions(10);
    if (sessions.length === 0) {
      console.log(pc.gray('No sessions found'));
    } else {
      sessions.forEach((s, i) => {
        const date = new Date(s.updatedAt).toLocaleString();
        const tokens = s.tokenCount ? `${s.tokenCount} tokens` : 'empty';
        const current = i === 0 ? pc.green(' (current)') : '';
        console.log(`  ${pc.cyan(s.id.slice(0, 12))}${current} - ${pc.gray(date)} - ${tokens}`);
      });
    }
  } else if (subcommand === 'new') {
    const session = createSession();
    console.log(pc.green(`✓ Created session: ${session.id}`));
  } else {
    console.log(pc.yellow('Usage: /session [list|new|switch <id>|delete <id>]'));
  }
  console.log();
}

async function handleDiffCommand(args: string[]): Promise<void> {
  const subcommand = args[0] || 'show';
  const { 
    getPendingChanges, 
    listCheckpoints, 
    createCheckpoint, 
    revertCheckpoint,
    getDiffSummary,
    getFullDiff,
    getFileDiff
  } = await import('../core/checkpoints');

  console.log(`\n${pc.bold(pc.cyan('📝 DIFF'))}\n`);

  if (subcommand === 'show') {
    const filePath = args[1];
    
    if (filePath) {
      // Show diff for specific file
      const diff = getFileDiff('current', filePath);
      if (diff) {
        console.log(colorDiff(diff));
      } else {
        console.log(pc.gray(`No changes for: ${filePath}`));
      }
    } else {
      // Show summary of pending changes
      const pending = getDiffSummary('current');
      console.log(pc.bold('Pending Changes:'));
      console.log(pending);
      
      // Also show git diff
      try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        const { stdout } = await execAsync('git diff --stat 2>/dev/null');
        if (stdout.trim()) {
          console.log(pc.bold('\nGit Working Directory:'));
          console.log(stdout);
        }
      } catch {}
    }
    
  } else if (subcommand === 'full') {
    // Show full unified diff
    const diff = getFullDiff('current');
    console.log(colorDiff(diff));
    
  } else if (subcommand === 'checkpoint' || subcommand === 'save') {
    const name = args[1];
    const checkpoint = createCheckpoint('current', name);
    if (checkpoint) {
      console.log(pc.green(`✓ Created checkpoint: ${checkpoint.id}`));
      console.log(pc.gray(`  ${checkpoint.changes.length} file(s) saved`));
    } else {
      console.log(pc.yellow('No pending changes to checkpoint'));
    }
    
  } else if (subcommand === 'list') {
    const checkpoints = listCheckpoints('current');
    if (checkpoints.length === 0) {
      console.log(pc.gray('No checkpoints found'));
    } else {
      checkpoints.forEach(cp => {
        const date = new Date(cp.createdAt).toLocaleString();
        const name = cp.name ? ` (${cp.name})` : '';
        console.log(`  ${pc.cyan(cp.id.slice(0, 12))}${name} - ${cp.changes.length} files - ${pc.gray(date)}`);
      });
    }
    
  } else if (subcommand === 'revert') {
    const checkpointId = args[1];
    if (!checkpointId) {
      console.log(pc.yellow('Usage: /diff revert <checkpoint-id>'));
      return;
    }
    
    // Find checkpoint by prefix
    const checkpoints = listCheckpoints('current');
    const match = checkpoints.find(cp => cp.id.startsWith(checkpointId));
    
    if (!match) {
      console.log(pc.red(`Checkpoint not found: ${checkpointId}`));
      return;
    }
    
    const { reverted, errors } = revertCheckpoint(match.id);
    if (reverted.length > 0) {
      console.log(pc.green('✓ Reverted:'));
      reverted.forEach(r => console.log(`  ${r}`));
    }
    if (errors.length > 0) {
      console.log(pc.red('✗ Errors:'));
      errors.forEach(e => console.log(`  ${e}`));
    }
    
  } else {
    console.log(pc.yellow('Usage: /diff [show|checkpoint|list|revert <id>]'));
  }
  console.log();
}

async function handleBugCommand(): Promise<void> {
  const os = await import('os');
  const pkg = await import('../../package.json');

  console.log(`\n${pc.bold(pc.cyan('🐛 BUG REPORT TEMPLATE'))}\n`);
  console.log(pc.gray('Copy this template to create a GitHub issue:\n'));

  const template = `## Bug Report

### Environment
- VIBE CLI Version: ${pkg.version}
- Node.js: ${process.version}
- OS: ${os.platform()} ${os.release()}
- Shell: ${process.env.SHELL || 'unknown'}

### Description
[Describe the bug]

### Steps to Reproduce
1. 
2. 
3. 

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Logs
\`\`\`
[Paste relevant logs here]
\`\`\`

### Additional Context
[Any other information]
`;

  console.log(template);
  console.log(pc.cyan('Submit at: https://github.com/mk-knight23/vibe/issues/new\n'));
}

async function handleContextCommand(args: string[]): Promise<void> {
  const subcommand = args[0] || 'show';

  console.log(`\n${pc.bold(pc.cyan('📚 CONTEXT'))}\n`);

  if (subcommand === 'show') {
    // Show active steering (enhanced)
    const { loadAllSteering } = await import('../core/steering');
    const { global, workspace, merged } = loadAllSteering();
    
    console.log(pc.bold('Steering:'));
    if (global) {
      console.log(`  ${pc.blue('Global:')} ~/.vibe/steering/`);
    }
    if (workspace.length > 0) {
      console.log(`  ${pc.green('Workspace:')} ${workspace.length} file(s)`);
      workspace.forEach(w => {
        const name = w.path.split('/').pop();
        console.log(`    • ${name}`);
      });
    }
    if (merged.rules.length === 0 && merged.context.length === 0) {
      console.log(`  ${pc.gray('None configured')}`);
    } else {
      console.log(`  ${pc.cyan('Rules:')} ${merged.rules.length}`);
      console.log(`  ${pc.cyan('Context:')} ${merged.context.length} section(s)`);
      console.log(`  ${pc.cyan('Hooks:')} ${merged.hooks.length}`);
    }

    // Show rules
    const fs = await import('fs');
    const path = await import('path');
    const rulesDir = path.join(process.cwd(), '.vibe', 'rules');
    console.log(pc.bold('\nRules:'));
    if (fs.existsSync(rulesDir)) {
      const rules = fs.readdirSync(rulesDir).filter(f => f.endsWith('.md'));
      if (rules.length > 0) {
        rules.forEach(r => console.log(`  ${pc.green('✓')} ${r}`));
      } else {
        console.log(`  ${pc.gray('None')}`);
      }
    } else {
      console.log(`  ${pc.gray('None')}`);
    }

    // Show MCP servers
    const { mcpClient } = await import('../mcp/client');
    const servers = mcpClient.listServers();
    console.log(pc.bold('\nMCP Servers:'));
    if (servers.length > 0) {
      servers.forEach(s => console.log(`  ${pc.green('✓')} ${s}`));
    } else {
      console.log(`  ${pc.gray('None connected')}`);
    }

    // Show current mode
    const { getMode, getModeConfig } = await import('../core/modes');
    const mode = getMode();
    const modeConfig = getModeConfig();
    console.log(pc.bold('\nMode:'));
    console.log(`  ${pc.cyan(modeConfig.name)} - ${pc.gray(modeConfig.description)}`);

  } else if (subcommand === 'steering') {
    // Show detailed steering
    const { loadAllSteering } = await import('../core/steering');
    const { merged } = loadAllSteering();
    
    if (merged.rules.length > 0) {
      console.log(pc.bold('Rules:'));
      merged.rules.forEach(r => console.log(`  • ${r}`));
    }
    if (merged.context.length > 0) {
      console.log(pc.bold('\nContext:'));
      merged.context.forEach(c => console.log(`  ${c.slice(0, 100)}...`));
    }
    if (merged.hooks.length > 0) {
      console.log(pc.bold('\nHooks:'));
      merged.hooks.forEach(h => console.log(`  ${h.event}: ${h.action}`));
    }

  } else if (subcommand === 'clear') {
    console.log(pc.yellow('Context cleared for this session'));
  } else {
    console.log(pc.yellow('Usage: /context [show|steering|clear]'));
  }
  console.log();
}

function handleModeCommand(args: string[]): string | void {
  const { MODE_CONFIGS, setMode, getMode, getModeConfig, getModeSummary } = require('../core/modes');
  const mode = args[0];
  const validModes = Object.keys(MODE_CONFIGS);

  console.log(`\n${pc.bold(pc.cyan('🎯 MODE'))}\n`);

  if (!mode) {
    const current = getMode();
    const config = getModeConfig();
    
    console.log(pc.bold(`Current: ${config.name}`));
    console.log(pc.gray(config.description));
    console.log();
    console.log(pc.bold('Available modes:'));
    Object.entries(MODE_CONFIGS).forEach(([key, cfg]: [string, any]) => {
      const indicator = key === current ? pc.green('→') : ' ';
      const tools = cfg.toolsEnabled ? pc.green('tools') : pc.yellow('no-tools');
      console.log(`  ${indicator} ${pc.cyan(key.padEnd(12))} ${tools.padEnd(15)} ${pc.gray(cfg.description)}`);
    });
    console.log();
    console.log(pc.gray('Usage: /mode <name>'));
    return;
  }

  if (!validModes.includes(mode)) {
    console.log(pc.red(`Invalid mode: ${mode}`));
    console.log(pc.gray(`Valid modes: ${validModes.join(', ')}`));
    return;
  }

  const config = setMode(mode);
  console.log(pc.green(`✓ Switched to ${config.name} mode`));
  console.log(pc.gray(config.description));
  console.log();
  console.log(getModeSummary());
  console.log();
  return `mode:${mode}`;
}

async function handleAuditCommand(args: string[]): Promise<void> {
  const { getAuditLogger, getRiskIndicator } = await import('../core/security');
  const logger = getAuditLogger();
  const subcommand = args[0] || 'recent';

  console.log(`\n${pc.bold(pc.cyan('📋 AUDIT LOG'))}\n`);

  if (subcommand === 'stats') {
    const stats = logger.getStats();
    console.log(pc.bold('Session Statistics:'));
    console.log(`  Total calls: ${stats.totalCalls}`);
    console.log(`  Approved: ${pc.green(String(stats.approved))}`);
    console.log(`  Denied: ${pc.yellow(String(stats.denied))}`);
    console.log(`  Blocked: ${pc.red(String(stats.blocked))}`);
    console.log();
    console.log(pc.bold('By Risk Level:'));
    console.log(`  ${getRiskIndicator('safe')} Safe: ${stats.byRisk.safe}`);
    console.log(`  ${getRiskIndicator('low')} Low: ${stats.byRisk.low}`);
    console.log(`  ${getRiskIndicator('medium')} Medium: ${stats.byRisk.medium}`);
    console.log(`  ${getRiskIndicator('high')} High: ${stats.byRisk.high}`);
    console.log(`  ${getRiskIndicator('blocked')} Blocked: ${stats.byRisk.blocked}`);
    
    if (Object.keys(stats.byTool).length > 0) {
      console.log();
      console.log(pc.bold('Top Tools:'));
      Object.entries(stats.byTool)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([tool, count]) => {
          console.log(`  ${tool}: ${count}`);
        });
    }

  } else if (subcommand === 'recent') {
    const count = parseInt(args[1]) || 10;
    const entries = logger.getRecent(count);
    
    if (entries.length === 0) {
      console.log(pc.gray('No audit entries'));
    } else {
      entries.forEach(entry => {
        const indicator = getRiskIndicator(entry.riskLevel);
        const time = new Date(entry.timestamp).toLocaleTimeString();
        const status = entry.approved ? pc.green('✓') : pc.red('✗');
        console.log(`  ${indicator} [${time}] ${status} ${entry.action} ${entry.command || ''}`);
      });
    }

  } else if (subcommand === 'export') {
    const format = args[1] === 'csv' ? 'csv' : 'json';
    const output = logger.exportLog(format);
    console.log(output);

  } else if (subcommand === 'clear') {
    logger.clear();
    console.log(pc.green('✓ Audit log cleared'));

  } else {
    console.log(pc.yellow('Usage: /audit [stats|recent [n]|export [json|csv]|clear]'));
  }
  console.log();
}

async function handleApproveCommand(args: string[]): Promise<void> {
  const { 
    getPendingApprovals, 
    approveOperation, 
    approveAll, 
    denyOperation, 
    denyAll,
    formatPendingApprovals 
  } = await import('../permissions');
  
  const sessionId = 'current'; // TODO: get actual session ID
  const subcommand = args[0] || 'list';

  console.log(`\n${pc.bold(pc.cyan('✅ APPROVALS'))}\n`);

  if (subcommand === 'list') {
    console.log(formatPendingApprovals(sessionId));

  } else if (subcommand === 'all') {
    const count = approveAll(sessionId, args[1] === '--session');
    if (count > 0) {
      console.log(pc.green(`✓ Approved ${count} operation(s)`));
    } else {
      console.log(pc.gray('No pending approvals'));
    }

  } else if (subcommand === 'deny') {
    if (args[1] === 'all') {
      const count = denyAll(sessionId);
      console.log(pc.yellow(`✗ Denied ${count} operation(s)`));
    } else {
      const pending = getPendingApprovals(sessionId);
      const idx = parseInt(args[1]) - 1;
      if (idx >= 0 && idx < pending.length) {
        denyOperation(sessionId, pending[idx].id, args[2] === '--session');
        console.log(pc.yellow(`✗ Denied: ${pending[idx].tool}`));
      } else {
        console.log(pc.red('Invalid operation number'));
      }
    }

  } else {
    // Try to approve by number
    const num = parseInt(subcommand);
    if (!isNaN(num)) {
      const pending = getPendingApprovals(sessionId);
      const idx = num - 1;
      if (idx >= 0 && idx < pending.length) {
        approveOperation(sessionId, pending[idx].id, args[1] === '--session');
        console.log(pc.green(`✓ Approved: ${pending[idx].tool}`));
      } else {
        console.log(pc.red('Invalid operation number'));
      }
    } else {
      console.log(pc.yellow('Usage: /approve [list|all|<n>|deny <n|all>]'));
      console.log(pc.gray('  Add --session to grant/deny for entire session'));
    }
  }
  console.log();
}

async function handleCmdCommand(args: string[]): Promise<void> {
  const input = `/cmd ${args.join(' ')}`.trim();
  const result = executeCustomCommand(input);
  
  console.log(`\n${pc.bold(pc.cyan('📦 CUSTOM COMMANDS'))}\n`);
  
  if (result.success) {
    if (result.message) {
      console.log(result.message);
    } else if (result.prompt) {
      console.log(pc.green('Expanded prompt:'));
      console.log(pc.gray(result.prompt));
    }
  } else {
    console.log(pc.red(result.error));
    console.log(pc.gray('\n' + getCustomCommandHelp()));
  }
  console.log();
}


// ============================================
// MCP COMMAND HANDLER
// ============================================

async function handleMcpCommand(args: string[]): Promise<void> {
  const { mcpManager, MCP_TEMPLATES } = await import('../mcp/manager');
  const subcommand = args[0] || 'status';

  console.log(`\n${pc.bold(pc.cyan('🔗 MCP (Model Context Protocol)'))}\n`);

  if (subcommand === 'status') {
    const servers = mcpManager.listServers();
    if (servers.length === 0) {
      console.log(pc.gray('No MCP servers connected'));
      console.log(pc.gray('\nAvailable templates:'));
      Object.keys(MCP_TEMPLATES).forEach(t => console.log(`  ${pc.cyan(t)}`));
      console.log(pc.gray('\nConnect with: /mcp connect <name>'));
    } else {
      console.log(pc.bold('Connected Servers:'));
      servers.forEach(s => {
        console.log(`  ${pc.green('●')} ${s.name} (${s.transport})`);
      });
    }

  } else if (subcommand === 'connect') {
    const serverName = args[1];
    if (!serverName) {
      console.log(pc.yellow('Usage: /mcp connect <server-name>'));
      console.log(pc.gray('\nAvailable templates:'));
      Object.keys(MCP_TEMPLATES).forEach(t => console.log(`  ${pc.cyan(t)}`));
      return;
    }

    const template = MCP_TEMPLATES[serverName];
    if (template) {
      try {
        await mcpManager.connect(template);
        console.log(pc.green(`✓ Connected to ${serverName}`));
      } catch (err: any) {
        console.log(pc.red(`✗ Failed to connect: ${err.message}`));
      }
    } else {
      console.log(pc.red(`Unknown server: ${serverName}`));
      console.log(pc.gray('Available: ' + Object.keys(MCP_TEMPLATES).join(', ')));
    }

  } else if (subcommand === 'disconnect') {
    const serverName = args[1];
    if (!serverName) {
      mcpManager.disconnectAll();
      console.log(pc.green('✓ Disconnected all servers'));
    } else {
      mcpManager.disconnect(serverName);
      console.log(pc.green(`✓ Disconnected ${serverName}`));
    }

  } else if (subcommand === 'tools') {
    const allTools = mcpManager.getAllTools();
    if (allTools.length === 0) {
      console.log(pc.gray('No MCP tools available'));
      console.log(pc.gray('Connect a server first: /mcp connect <name>'));
    } else {
      console.log(pc.bold(`MCP Tools (${allTools.length}):`));
      const byServer: Record<string, typeof allTools> = {};
      allTools.forEach(t => {
        if (!byServer[t.server]) byServer[t.server] = [];
        byServer[t.server].push(t);
      });
      Object.entries(byServer).forEach(([server, serverTools]) => {
        console.log(`\n  ${pc.cyan(server)}:`);
        serverTools.forEach(t => {
          console.log(`    ${t.tool.name} - ${pc.gray(t.tool.description || '')}`);
        });
      });
    }

  } else if (subcommand === 'init') {
    mcpManager.saveConfig([], process.cwd());
    console.log(pc.green('✓ Created .vibe/mcp.json'));
    console.log(pc.gray('Add servers to the config file or use /mcp connect'));

  } else {
    console.log(pc.yellow('Usage: /mcp [status|connect|disconnect|tools|init]'));
  }
  console.log();
}
