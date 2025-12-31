/**
 * Workflow Parser - Parse and validate workflow definitions
 */

import * as fs from 'fs';
import * as path from 'path';
import { WorkflowDefinition, WorkflowStep } from './types';
import { getAgentRegistry } from '../agents/registry';

const WORKFLOWS_DIR = '.vibe/workflows';

// Simple YAML parser for workflow configs
function parseYaml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split('\n');
  let currentKey = '';
  let currentArray: unknown[] | null = null;
  let currentObject: Record<string, unknown> | null = null;
  let inMultiline = false;
  let multilineContent = '';
  let arrayOfObjects: Record<string, unknown>[] | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const indent = line.search(/\S/);

    if (inMultiline) {
      if (indent >= 2) {
        multilineContent += line.slice(2) + '\n';
        continue;
      } else {
        result[currentKey] = multilineContent.trim();
        inMultiline = false;
      }
    }

    // Array item that's an object (like steps)
    if (trimmed.startsWith('- ') && trimmed.includes(':')) {
      if (arrayOfObjects) {
        const obj: Record<string, unknown> = {};
        // Parse first key-value on same line
        const firstPart = trimmed.slice(2);
        const colonIdx = firstPart.indexOf(':');
        if (colonIdx > 0) {
          const key = firstPart.slice(0, colonIdx).trim();
          const value = firstPart.slice(colonIdx + 1).trim();
          obj[key] = parseValue(value);
        }
        // Look ahead for more properties at same indent
        let j = i + 1;
        while (j < lines.length) {
          const nextLine = lines[j];
          const nextTrimmed = nextLine.trim();
          const nextIndent = nextLine.search(/\S/);
          if (!nextTrimmed || nextIndent <= indent) break;
          if (nextTrimmed.startsWith('- ')) break;
          const nextColonIdx = nextTrimmed.indexOf(':');
          if (nextColonIdx > 0) {
            const key = nextTrimmed.slice(0, nextColonIdx).trim();
            const value = nextTrimmed.slice(nextColonIdx + 1).trim();
            obj[key] = parseValue(value);
          }
          j++;
        }
        arrayOfObjects.push(obj);
        i = j - 1;
        continue;
      }
    }

    // Simple array item
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
        currentArray = null;
        arrayOfObjects = null;
      } else if (value === '') {
        // Could be array or object - check next line
        const nextLine = lines[i + 1];
        if (nextLine && nextLine.trim().startsWith('- ')) {
          // Check if it's array of objects or simple array
          if (nextLine.trim().includes(':')) {
            arrayOfObjects = [];
            result[currentKey] = arrayOfObjects;
            currentArray = null;
          } else {
            currentArray = [];
            result[currentKey] = currentArray;
            arrayOfObjects = null;
          }
        } else {
          currentArray = null;
          arrayOfObjects = null;
        }
      } else {
        currentArray = null;
        arrayOfObjects = null;
        result[currentKey] = parseValue(value);
      }
    }
  }

  if (inMultiline) {
    result[currentKey] = multilineContent.trim();
  }

  return result;
}

function parseValue(value: string): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  return value.replace(/^["']|["']$/g, '');
}

function stringifyYaml(obj: Record<string, unknown>, indent = 0): string {
  const prefix = '  '.repeat(indent);
  const lines: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      lines.push(`${prefix}${key}:`);
      for (const item of value) {
        if (typeof item === 'object' && item !== null) {
          const entries = Object.entries(item);
          if (entries.length > 0) {
            const [firstKey, firstVal] = entries[0];
            lines.push(`${prefix}  - ${firstKey}: ${firstVal}`);
            for (const [k, v] of entries.slice(1)) {
              lines.push(`${prefix}    ${k}: ${v}`);
            }
          }
        } else {
          lines.push(`${prefix}  - ${item}`);
        }
      }
    } else if (typeof value === 'string' && value.includes('\n')) {
      lines.push(`${prefix}${key}: |`);
      for (const line of value.split('\n')) {
        lines.push(`${prefix}  ${line}`);
      }
    } else if (typeof value === 'object' && value !== null) {
      lines.push(`${prefix}${key}:`);
      lines.push(stringifyYaml(value as Record<string, unknown>, indent + 1));
    } else {
      lines.push(`${prefix}${key}: ${value}`);
    }
  }
  return lines.join('\n');
}

export class WorkflowParser {
  private workflowsDir: string;

  constructor(projectPath: string = process.cwd()) {
    this.workflowsDir = path.join(projectPath, WORKFLOWS_DIR);
  }

  parse(source: string): WorkflowDefinition {
    const def = source.trim().startsWith('{') 
      ? JSON.parse(source) 
      : parseYaml(source);
    
    this.validate(def);
    return this.normalize(def);
  }

  parseFile(filePath: string): WorkflowDefinition {
    const content = fs.readFileSync(filePath, 'utf-8');
    return this.parse(content);
  }

  load(name: string): WorkflowDefinition | null {
    const yamlPath = path.join(this.workflowsDir, `${name}.yaml`);
    const jsonPath = path.join(this.workflowsDir, `${name}.json`);
    
    if (fs.existsSync(yamlPath)) return this.parseFile(yamlPath);
    if (fs.existsSync(jsonPath)) return this.parseFile(jsonPath);
    return null;
  }

  list(): string[] {
    if (!fs.existsSync(this.workflowsDir)) return [];
    
    return fs.readdirSync(this.workflowsDir)
      .filter(f => f.endsWith('.yaml') || f.endsWith('.yml') || f.endsWith('.json'))
      .map(f => path.basename(f, path.extname(f)));
  }

  save(def: WorkflowDefinition): void {
    if (!fs.existsSync(this.workflowsDir)) {
      fs.mkdirSync(this.workflowsDir, { recursive: true });
    }
    
    const filePath = path.join(this.workflowsDir, `${def.name}.yaml`);
    fs.writeFileSync(filePath, stringifyYaml(def as unknown as Record<string, unknown>));
  }

  private validate(def: unknown): asserts def is Partial<WorkflowDefinition> {
    if (!def || typeof def !== 'object') {
      throw new Error('Workflow must be an object');
    }

    const d = def as Record<string, unknown>;
    
    if (typeof d.name !== 'string' || !d.name) {
      throw new Error('Workflow must have a name');
    }

    if (!Array.isArray(d.steps) || d.steps.length === 0) {
      throw new Error('Workflow must have at least one step');
    }

    const registry = getAgentRegistry();
    for (let i = 0; i < d.steps.length; i++) {
      const step = d.steps[i] as Record<string, unknown>;
      
      if (typeof step.agent !== 'string') {
        throw new Error(`Step ${i + 1}: agent is required`);
      }

      if (!registry.has(step.agent)) {
        throw new Error(`Step ${i + 1}: unknown agent "${step.agent}"`);
      }
    }
  }

  private normalize(partial: Partial<WorkflowDefinition>): WorkflowDefinition {
    return {
      name: partial.name!,
      description: partial.description,
      steps: (partial.steps || []).map((s, i) => this.normalizeStep(s, i)),
      inputs: partial.inputs || {},
      outputs: partial.outputs || []
    };
  }

  private normalizeStep(step: Partial<WorkflowStep>, index: number): WorkflowStep {
    return {
      id: step.id || `step-${index + 1}`,
      agent: step.agent!,
      input: step.input,
      output: step.output,
      template: step.template,
      rules: step.rules,
      condition: step.condition,
      onError: step.onError || 'stop',
      maxRetries: step.maxRetries || 0
    };
  }
}
