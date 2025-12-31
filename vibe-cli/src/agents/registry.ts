/**
 * Agent Registry - Central registry for agent management
 */

import * as fs from 'fs';
import * as path from 'path';
import { AgentDefinition } from './types';
import { BUILTIN_AGENTS, getBuiltinAgent } from './builtin';

const CUSTOM_AGENTS_DIR = '.vibe/agents';

// Simple YAML parser for agent configs
function parseYaml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split('\n');
  let currentKey = '';
  let currentArray: unknown[] | null = null;
  let inMultiline = false;
  let multilineContent = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (inMultiline) {
      if (line.startsWith('  ') || line.startsWith('\t')) {
        multilineContent += line.slice(2) + '\n';
        continue;
      } else {
        result[currentKey] = multilineContent.trim();
        inMultiline = false;
      }
    }

    if (trimmed.startsWith('- ')) {
      if (currentArray) {
        currentArray.push(trimmed.slice(2));
      }
      continue;
    }

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx > 0) {
      currentKey = trimmed.slice(0, colonIdx).trim();
      const value = trimmed.slice(colonIdx + 1).trim();

      if (value === '|') {
        inMultiline = true;
        multilineContent = '';
      } else if (value === '') {
        currentArray = [];
        result[currentKey] = currentArray;
      } else {
        currentArray = null;
        // Parse value
        if (value === 'true') result[currentKey] = true;
        else if (value === 'false') result[currentKey] = false;
        else if (/^\d+$/.test(value)) result[currentKey] = parseInt(value, 10);
        else result[currentKey] = value.replace(/^["']|["']$/g, '');
      }
    }
  }

  if (inMultiline) {
    result[currentKey] = multilineContent.trim();
  }

  return result;
}

function stringifyYaml(obj: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${item}`);
      }
    } else if (typeof value === 'string' && value.includes('\n')) {
      lines.push(`${key}: |`);
      for (const line of value.split('\n')) {
        lines.push(`  ${line}`);
      }
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  return lines.join('\n');
}

export class AgentRegistry {
  private agents: Map<string, AgentDefinition> = new Map();
  private customDir: string;

  constructor(projectPath: string = process.cwd()) {
    this.customDir = path.join(projectPath, CUSTOM_AGENTS_DIR);
    this.loadBuiltinAgents();
    this.loadCustomAgents();
  }

  private loadBuiltinAgents(): void {
    for (const [name, def] of Object.entries(BUILTIN_AGENTS)) {
      this.agents.set(name, def);
    }
  }

  private loadCustomAgents(): void {
    if (!fs.existsSync(this.customDir)) return;

    const files = fs.readdirSync(this.customDir);
    for (const file of files) {
      if (!file.endsWith('.yaml') && !file.endsWith('.yml') && !file.endsWith('.json')) continue;
      
      try {
        const content = fs.readFileSync(path.join(this.customDir, file), 'utf-8');
        const def = file.endsWith('.json') ? JSON.parse(content) : parseYaml(content);
        
        if (this.validateDefinition(def)) {
          this.agents.set(def.name as string, this.normalizeDefinition(def as Partial<AgentDefinition>));
        }
      } catch {
        // Skip invalid files
      }
    }
  }

  private validateDefinition(def: unknown): def is Partial<AgentDefinition> {
    if (!def || typeof def !== 'object') return false;
    const d = def as Record<string, unknown>;
    return typeof d.name === 'string' && typeof d.description === 'string';
  }

  private normalizeDefinition(partial: Partial<AgentDefinition>): AgentDefinition {
    const base = getBuiltinAgent('builder')!; // Use builder as template
    return {
      name: partial.name!,
      description: partial.description!,
      systemPrompt: (partial.systemPrompt as string) || base.systemPrompt,
      tools: (partial.tools as string[]) || base.tools,
      outputs: (partial.outputs as AgentDefinition['outputs']) || ['markdown', 'json'],
      canDelegate: (partial.canDelegate as string[]) || [],
      memoryScope: (partial.memoryScope as AgentDefinition['memoryScope']) || 'project',
      timeout: (partial.timeout as number) || 180000,
      priority: (partial.priority as number) || 2
    };
  }

  get(name: string): AgentDefinition | undefined {
    return this.agents.get(name);
  }

  has(name: string): boolean {
    return this.agents.has(name);
  }

  list(): string[] {
    return Array.from(this.agents.keys());
  }

  listWithDetails(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  register(def: AgentDefinition): void {
    this.agents.set(def.name, def);
  }

  save(def: AgentDefinition): void {
    if (!fs.existsSync(this.customDir)) {
      fs.mkdirSync(this.customDir, { recursive: true });
    }
    
    const filePath = path.join(this.customDir, `${def.name}.yaml`);
    fs.writeFileSync(filePath, stringifyYaml(def as unknown as Record<string, unknown>));
    this.agents.set(def.name, def);
  }

  remove(name: string): boolean {
    if (BUILTIN_AGENTS[name]) return false; // Can't remove builtins
    
    const filePath = path.join(this.customDir, `${name}.yaml`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return this.agents.delete(name);
  }

  getByCapability(capability: string): AgentDefinition[] {
    const cap = capability.toLowerCase();
    return this.listWithDetails().filter(a => 
      a.description.toLowerCase().includes(cap) ||
      a.tools.some(t => t.toLowerCase().includes(cap))
    );
  }

  getByTool(toolName: string): AgentDefinition[] {
    return this.listWithDetails().filter(a => a.tools.includes(toolName));
  }

  reload(): void {
    this.agents.clear();
    this.loadBuiltinAgents();
    this.loadCustomAgents();
  }
}

// Singleton instance
let registryInstance: AgentRegistry | null = null;

export function getAgentRegistry(projectPath?: string): AgentRegistry {
  if (!registryInstance || projectPath) {
    registryInstance = new AgentRegistry(projectPath);
  }
  return registryInstance;
}
