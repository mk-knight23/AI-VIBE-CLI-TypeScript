/**
 * MCP Commands - Manage MCP server connections
 */

import pc from 'picocolors';
import { mcpClient, createDefaultMCPConfig, MCPServerConfig } from '../mcp';

export async function handleMCPCommand(args: string[]): Promise<void> {
  const subcommand = args[0] || 'status';

  switch (subcommand) {
    case 'init':
      await initMCP();
      break;
    case 'connect':
      await connectServer(args[1]);
      break;
    case 'disconnect':
      disconnectServer(args[1]);
      break;
    case 'tools':
      listTools(args[1]);
      break;
    case 'status':
    default:
      showStatus();
      break;
  }
}

async function initMCP(): Promise<void> {
  const configPath = createDefaultMCPConfig();
  console.log(pc.green(`✓ Created MCP config: ${configPath}`));
  console.log(pc.gray('Edit .vibe/mcp.json to add MCP servers'));
}

async function connectServer(name?: string): Promise<void> {
  const configs = mcpClient.loadConfig();
  
  if (configs.length === 0) {
    console.log(pc.yellow('No MCP servers configured. Run /mcp init first.'));
    return;
  }

  const toConnect = name 
    ? configs.filter(c => c.name === name)
    : configs;

  for (const config of toConnect) {
    try {
      console.log(pc.gray(`Connecting to ${config.name}...`));
      await mcpClient.connect(config);
      const tools = mcpClient.getServerTools(config.name);
      console.log(pc.green(`✓ Connected: ${config.name} (${tools.length} tools)`));
    } catch (err) {
      console.log(pc.red(`✗ Failed: ${config.name} - ${(err as Error).message}`));
    }
  }
}

function disconnectServer(name?: string): void {
  if (name) {
    mcpClient.disconnect(name);
    console.log(pc.green(`✓ Disconnected: ${name}`));
  } else {
    mcpClient.disconnectAll();
    console.log(pc.green('✓ Disconnected all MCP servers'));
  }
}

function listTools(server?: string): void {
  const tools = server 
    ? mcpClient.getServerTools(server).map(t => ({ server, tool: t }))
    : mcpClient.getAllTools();

  if (tools.length === 0) {
    console.log(pc.yellow('No MCP tools available. Connect to a server first.'));
    return;
  }

  console.log(pc.cyan('\n📦 MCP Tools\n'));
  
  let currentServer = '';
  for (const { server: s, tool } of tools) {
    if (s !== currentServer) {
      currentServer = s;
      console.log(pc.bold(`\n${s}:`));
    }
    console.log(`  ${pc.green(tool.name)} - ${tool.description}`);
  }
  console.log();
}

function showStatus(): void {
  const servers = mcpClient.listServers();
  const configs = mcpClient.loadConfig();

  console.log(pc.cyan('\n🔌 MCP Status\n'));
  
  if (configs.length === 0) {
    console.log(pc.gray('No MCP servers configured.'));
    console.log(pc.gray('Run /mcp init to create config.'));
    return;
  }

  for (const config of configs) {
    const connected = mcpClient.isConnected(config.name);
    const status = connected ? pc.green('● connected') : pc.gray('○ disconnected');
    const tools = connected ? mcpClient.getServerTools(config.name).length : 0;
    
    console.log(`  ${config.name}: ${status}${connected ? ` (${tools} tools)` : ''}`);
  }

  console.log();
  console.log(pc.gray('Commands: /mcp connect | /mcp disconnect | /mcp tools'));
  console.log();
}
