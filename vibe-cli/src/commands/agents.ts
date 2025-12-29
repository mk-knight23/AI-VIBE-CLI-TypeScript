/**
 * Agents Command - Custom agent management
 */

import { listAgents, getAgent, createAgent, deleteAgent, BUILTIN_AGENTS, CustomAgent } from '../core/custom-agents';

export function agentsCommand(action?: string, arg?: string): void {
  switch (action) {
    case 'list':
    case undefined:
      const { builtin, custom } = listAgents();
      
      console.log('\n🤖 Built-in Agents:\n');
      for (const agent of builtin) {
        console.log(`  ${agent.name.padEnd(12)} ${agent.description}`);
      }

      if (custom.length > 0) {
        console.log('\n📦 Custom Agents:\n');
        for (const agent of custom) {
          console.log(`  ${agent.name.padEnd(12)} ${agent.description}`);
        }
      }

      console.log('\nUse /agent <name> in chat to switch agents');
      break;

    case 'info':
      if (!arg) {
        console.log('Usage: vibe agents info <name>');
        return;
      }
      const agent = getAgent(arg);
      if (!agent) {
        console.log(`Agent not found: ${arg}`);
        return;
      }
      console.log(`\n🤖 ${agent.name}`);
      console.log(`Description: ${agent.description}`);
      console.log(`Tools: ${agent.tools.join(', ')}`);
      if (agent.temperature) console.log(`Temperature: ${agent.temperature}`);
      console.log(`\nPrompt:\n${agent.prompt}`);
      break;

    case 'create':
      console.log(`
To create a custom agent, add a JSON file to .vibe/agents/

Example .vibe/agents/my-agent.json:
{
  "name": "MyAgent",
  "description": "Custom agent for my workflow",
  "prompt": "You are a specialized assistant...",
  "tools": ["read_file", "write_file", "shell"],
  "temperature": 0.3
}
`);
      break;

    case 'delete':
      if (!arg) {
        console.log('Usage: vibe agents delete <name>');
        return;
      }
      if (deleteAgent(arg)) {
        console.log(`✅ Deleted agent: ${arg}`);
      } else {
        console.log(`❌ Agent not found: ${arg}`);
      }
      break;

    default:
      console.log(`
Usage: vibe agents [command]

Commands:
  list              List all agents
  info <name>       Show agent details
  create            Show how to create custom agents
  delete <name>     Delete custom agent
`);
  }
}
