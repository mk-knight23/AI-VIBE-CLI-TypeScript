/**
 * Custom Agents - Task-specific AI agents
 * Inspired by Kiro CLI custom agents
 */

import * as fs from 'fs';
import * as path from 'path';

const AGENTS_DIR = '.vibe/agents';

export interface CustomAgent {
  name: string;
  description: string;
  prompt: string;
  tools: string[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// Built-in agents
export const BUILTIN_AGENTS: Record<string, CustomAgent> = {
  auto: {
    name: 'Auto',
    description: 'Adaptive agent that selects the best approach',
    prompt: 'You are an adaptive AI assistant. Analyze the task and choose the best approach.',
    tools: ['*']
  },
  coder: {
    name: 'Coder',
    description: 'Specialized for code generation and refactoring',
    prompt: 'You are an expert programmer. Write clean, efficient, well-documented code.',
    tools: ['read_file', 'write_file', 'search', 'shell'],
    temperature: 0.3
  },
  reviewer: {
    name: 'Reviewer',
    description: 'Code review and quality analysis',
    prompt: 'You are a senior code reviewer. Analyze code for bugs, security issues, and improvements.',
    tools: ['read_file', 'search'],
    temperature: 0.2
  },
  debugger: {
    name: 'Debugger',
    description: 'Error analysis and bug fixing',
    prompt: 'You are a debugging expert. Analyze errors, trace issues, and suggest fixes.',
    tools: ['read_file', 'search', 'shell'],
    temperature: 0.4
  },
  architect: {
    name: 'Architect',
    description: 'System design and architecture planning',
    prompt: 'You are a software architect. Design scalable, maintainable systems.',
    tools: ['read_file', 'search'],
    temperature: 0.5
  },
  docs: {
    name: 'Docs',
    description: 'Documentation and README generation',
    prompt: 'You are a technical writer. Create clear, comprehensive documentation.',
    tools: ['read_file', 'write_file'],
    temperature: 0.4
  },
  test: {
    name: 'Test',
    description: 'Test generation and coverage analysis',
    prompt: 'You are a QA engineer. Write comprehensive tests with good coverage.',
    tools: ['read_file', 'write_file', 'shell'],
    temperature: 0.3
  }
};

export function loadCustomAgents(projectPath: string = process.cwd()): CustomAgent[] {
  const agentsPath = path.join(projectPath, AGENTS_DIR);
  const agents: CustomAgent[] = [];

  if (!fs.existsSync(agentsPath)) return agents;

  const files = fs.readdirSync(agentsPath).filter(f => f.endsWith('.json'));
  for (const file of files) {
    try {
      const agent = JSON.parse(fs.readFileSync(path.join(agentsPath, file), 'utf8'));
      agents.push(agent);
    } catch {}
  }

  return agents;
}

export function getAgent(name: string): CustomAgent | null {
  // Check built-in first
  const builtin = BUILTIN_AGENTS[name.toLowerCase()];
  if (builtin) return builtin;

  // Check custom agents
  const custom = loadCustomAgents().find(a => a.name.toLowerCase() === name.toLowerCase());
  return custom || null;
}

export function listAgents(): { builtin: CustomAgent[]; custom: CustomAgent[] } {
  return {
    builtin: Object.values(BUILTIN_AGENTS),
    custom: loadCustomAgents()
  };
}

export function createAgent(agent: CustomAgent, projectPath: string = process.cwd()): string {
  const agentsPath = path.join(projectPath, AGENTS_DIR);
  if (!fs.existsSync(agentsPath)) {
    fs.mkdirSync(agentsPath, { recursive: true });
  }

  const fileName = `${agent.name.toLowerCase().replace(/\s+/g, '-')}.json`;
  const filePath = path.join(agentsPath, fileName);
  fs.writeFileSync(filePath, JSON.stringify(agent, null, 2));
  return filePath;
}

export function deleteAgent(name: string, projectPath: string = process.cwd()): boolean {
  const agentsPath = path.join(projectPath, AGENTS_DIR);
  const fileName = `${name.toLowerCase().replace(/\s+/g, '-')}.json`;
  const filePath = path.join(agentsPath, fileName);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

export function getAgentSystemPrompt(agent: CustomAgent): string {
  return `${agent.prompt}

Available tools: ${agent.tools.join(', ')}
${agent.temperature ? `Temperature: ${agent.temperature}` : ''}`;
}
