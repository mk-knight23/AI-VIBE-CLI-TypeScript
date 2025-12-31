/**
 * Agents Command - Agent management and execution
 */

import { getAgentRegistry, AgentDefinition } from '../agents';
import pc from 'picocolors';

export function agentsCommand(action?: string, arg?: string): void {
  const registry = getAgentRegistry();

  switch (action) {
    case 'list':
    case undefined:
      listAgents(registry);
      break;

    case 'info':
      if (!arg) {
        console.log('Usage: vibe agents info <name>');
        return;
      }
      showAgentInfo(registry, arg);
      break;

    case 'create':
      showCreateHelp();
      break;

    case 'delete':
      if (!arg) {
        console.log('Usage: vibe agents delete <name>');
        return;
      }
      deleteAgent(registry, arg);
      break;

    case 'reload':
      registry.reload();
      console.log(pc.green('✅ Agent registry reloaded'));
      break;

    default:
      showHelp();
  }
}

function listAgents(registry: ReturnType<typeof getAgentRegistry>): void {
  const agents = registry.listWithDetails();
  const builtins = agents.filter(a => !a.name.startsWith('custom-'));
  const custom = agents.filter(a => a.name.startsWith('custom-'));

  console.log(pc.cyan('\n━━━ Agents ━━━\n'));

  console.log(pc.bold('Built-in Agents:\n'));
  for (const agent of builtins) {
    const tools = agent.tools.length;
    const delegates = agent.canDelegate.length;
    console.log(`  ${pc.green(agent.name.padEnd(12))} ${agent.description}`);
    console.log(`  ${' '.repeat(12)} ${pc.dim(`${tools} tools, delegates to: ${delegates > 0 ? agent.canDelegate.join(', ') : 'none'}`)}`);
  }

  if (custom.length > 0) {
    console.log(pc.bold('\nCustom Agents:\n'));
    for (const agent of custom) {
      console.log(`  ${pc.yellow(agent.name.padEnd(12))} ${agent.description}`);
    }
  }

  console.log(pc.dim('\nUse "vibe agents info <name>" for details'));
  console.log(pc.dim('Use "/agent <name>" in chat to switch agents\n'));
}

function showAgentInfo(registry: ReturnType<typeof getAgentRegistry>, name: string): void {
  const agent = registry.get(name);
  
  if (!agent) {
    console.log(pc.red(`Agent not found: ${name}`));
    console.log(pc.dim(`Available: ${registry.list().join(', ')}`));
    return;
  }

  console.log(pc.cyan(`\n━━━ ${agent.name} ━━━\n`));
  console.log(`${pc.bold('Description:')} ${agent.description}`);
  console.log(`${pc.bold('Priority:')} ${agent.priority}`);
  console.log(`${pc.bold('Timeout:')} ${agent.timeout / 1000}s`);
  console.log(`${pc.bold('Memory Scope:')} ${agent.memoryScope}`);
  console.log(`${pc.bold('Output Formats:')} ${agent.outputs.join(', ')}`);
  
  console.log(`\n${pc.bold('Tools:')}`);
  for (const tool of agent.tools) {
    console.log(`  - ${tool}`);
  }

  if (agent.canDelegate.length > 0) {
    console.log(`\n${pc.bold('Can Delegate To:')}`);
    for (const delegate of agent.canDelegate) {
      console.log(`  - ${delegate}`);
    }
  }

  console.log(`\n${pc.bold('System Prompt:')}`);
  console.log(pc.dim(agent.systemPrompt));
}

function showCreateHelp(): void {
  console.log(`
${pc.cyan('Creating Custom Agents')}

Add a YAML or JSON file to ${pc.bold('.vibe/agents/')}

${pc.bold('Example .vibe/agents/my-agent.yaml:')}

${pc.dim(`name: my-agent
description: Custom agent for my workflow
systemPrompt: |
  You are a specialized assistant that...
tools:
  - read_file
  - write_file
  - run_shell_command
outputs:
  - markdown
  - json
canDelegate:
  - reviewer
memoryScope: project
timeout: 180000
priority: 2`)}

${pc.bold('Available tools:')}
  filesystem: read_file, write_file, glob, search_file_content
  shell: run_shell_command
  web: google_web_search, web_fetch
  git: git_status, git_diff, git_log
  analysis: analyze_code_quality, security_scan

${pc.bold('Memory scopes:')} session, project, global
${pc.bold('Output formats:')} markdown, json, table, csv, yaml
`);
}

function deleteAgent(registry: ReturnType<typeof getAgentRegistry>, name: string): void {
  if (registry.remove(name)) {
    console.log(pc.green(`✅ Deleted agent: ${name}`));
  } else {
    console.log(pc.red(`❌ Cannot delete agent: ${name}`));
    console.log(pc.dim('Built-in agents cannot be deleted'));
  }
}

function showHelp(): void {
  console.log(`
${pc.cyan('Agent Management')}

${pc.bold('Usage:')} vibe agents [command]

${pc.bold('Commands:')}
  list              List all agents (default)
  info <name>       Show agent details
  create            Show how to create custom agents
  delete <name>     Delete custom agent
  reload            Reload agent registry

${pc.bold('Quick Commands:')}
  vibe plan <goal>      Run planner agent
  vibe research <topic> Run researcher agent
  vibe analyze <data>   Run analyst agent
  vibe build <task>     Run builder agent
  vibe review <target>  Run reviewer agent
`);
}
