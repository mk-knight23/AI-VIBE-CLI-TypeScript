/**
 * Steering Files - Project-specific AI guidance
 * Inspired by Kiro CLI steering system
 * Supports: .vibe/steering/, .kiro/steering/, global ~/.vibe/steering/
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Steering file locations (in priority order)
const STEERING_LOCATIONS = [
  '.vibe/steering.md',
  '.vibe/STEERING.md',
  '.kiro/steering.md',    // Kiro compatibility
  'VIBE.md',
  '.vibeconfig'
];

// Steering directory locations
const STEERING_DIRS = [
  '.vibe/steering',
  '.kiro/steering'        // Kiro compatibility
];

// Global steering location
const GLOBAL_STEERING_DIR = path.join(os.homedir(), '.vibe', 'steering');

export interface SteeringConfig {
  content: string;
  path: string;
  rules: string[];
  context: string[];
  tools: string[];
  hooks?: SteeringHook[];
  priority?: number;
}

export interface SteeringHook {
  event: 'onPromptSubmitted' | 'onToolCallProposed' | 'onToolCallCompleted' | 'onFileWrite' | 'onSessionStart';
  action: 'prompt' | 'tool' | 'shell';
  value: string;
}

export interface MergedSteering {
  global: SteeringConfig | null;
  workspace: SteeringConfig[];
  merged: {
    rules: string[];
    context: string[];
    tools: string[];
    hooks: SteeringHook[];
  };
}

/**
 * Load steering from a single file
 */
export function loadSteering(projectPath: string = process.cwd()): SteeringConfig | null {
  for (const loc of STEERING_LOCATIONS) {
    const fullPath = path.join(projectPath, loc);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      return parseSteering(content, fullPath);
    }
  }
  return null;
}

/**
 * Load all steering files from a directory
 */
export function loadSteeringDir(dirPath: string): SteeringConfig[] {
  const configs: SteeringConfig[] = [];
  
  if (!fs.existsSync(dirPath)) return configs;
  
  const files = fs.readdirSync(dirPath)
    .filter(f => f.endsWith('.md'))
    .sort(); // Alphabetical order for predictable priority
  
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    const config = parseSteering(content, fullPath);
    
    // Extract priority from filename (e.g., 01-rules.md, 02-context.md)
    const match = file.match(/^(\d+)-/);
    if (match) {
      config.priority = parseInt(match[1], 10);
    }
    
    configs.push(config);
  }
  
  return configs.sort((a, b) => (a.priority || 99) - (b.priority || 99));
}

/**
 * Load and merge all steering (global + workspace)
 */
export function loadAllSteering(projectPath: string = process.cwd()): MergedSteering {
  // Load global steering
  const globalConfigs = loadSteeringDir(GLOBAL_STEERING_DIR);
  const globalMerged = globalConfigs.length > 0 ? mergeConfigs(globalConfigs) : null;
  
  // Load workspace steering directories
  const workspaceConfigs: SteeringConfig[] = [];
  for (const dir of STEERING_DIRS) {
    const fullDir = path.join(projectPath, dir);
    workspaceConfigs.push(...loadSteeringDir(fullDir));
  }
  
  // Also load single-file steering
  const singleFile = loadSteering(projectPath);
  if (singleFile) {
    workspaceConfigs.push(singleFile);
  }
  
  // Merge all
  const allConfigs = [...(globalMerged ? [globalMerged] : []), ...workspaceConfigs];
  const merged = mergeConfigs(allConfigs);
  
  return {
    global: globalMerged,
    workspace: workspaceConfigs,
    merged: {
      rules: merged.rules,
      context: merged.context,
      tools: merged.tools,
      hooks: merged.hooks || []
    }
  };
}

function mergeConfigs(configs: SteeringConfig[]): SteeringConfig {
  const rules: string[] = [];
  const context: string[] = [];
  const tools: string[] = [];
  const hooks: SteeringHook[] = [];
  
  for (const config of configs) {
    rules.push(...config.rules);
    context.push(...config.context);
    tools.push(...config.tools);
    if (config.hooks) hooks.push(...config.hooks);
  }
  
  return {
    content: configs.map(c => c.content).join('\n\n'),
    path: configs[0]?.path || '',
    rules: [...new Set(rules)], // Dedupe
    context,
    tools: [...new Set(tools)],
    hooks
  };
}

function parseSteering(content: string, filePath: string): SteeringConfig {
  const rules: string[] = [];
  const context: string[] = [];
  const tools: string[] = [];
  const hooks: SteeringHook[] = [];

  // Parse markdown sections
  const sections = content.split(/^##\s+/m);
  
  for (const section of sections) {
    const lines = section.trim().split('\n');
    const header = lines[0]?.toLowerCase() || '';
    const body = lines.slice(1).join('\n').trim();

    if (header.includes('rule') || header.includes('guideline')) {
      rules.push(...extractListItems(body));
    } else if (header.includes('context') || header.includes('about')) {
      context.push(body);
    } else if (header.includes('tool') || header.includes('permission')) {
      tools.push(...extractListItems(body));
    } else if (header.includes('hook')) {
      hooks.push(...parseHooks(body));
    }
  }

  return { content, path: filePath, rules, context, tools, hooks };
}

function extractListItems(text: string): string[] {
  return text
    .split('\n')
    .filter(line => line.match(/^[-*]\s+/))
    .map(line => line.replace(/^[-*]\s+/, '').trim())
    .filter(Boolean);
}

function parseHooks(text: string): SteeringHook[] {
  const hooks: SteeringHook[] = [];
  const lines = extractListItems(text);
  
  for (const line of lines) {
    // Format: "onEvent: action: value"
    const match = line.match(/^(on\w+):\s*(prompt|tool|shell):\s*(.+)$/i);
    if (match) {
      hooks.push({
        event: match[1] as SteeringHook['event'],
        action: match[2].toLowerCase() as SteeringHook['action'],
        value: match[3]
      });
    }
  }
  
  return hooks;
}

export function createDefaultSteering(projectPath: string = process.cwd()): string {
  const steeringPath = path.join(projectPath, '.vibe', 'steering.md');
  const dir = path.dirname(steeringPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const template = `# VIBE Steering

## About This Project
Describe your project here. VIBE will use this context.

## Rules
- Follow existing code style
- Write tests for new features
- Use TypeScript strict mode

## Tools
- Allow file operations
- Allow shell commands with approval
- Allow git operations

## Preferences
- Prefer functional programming
- Use descriptive variable names
- Add JSDoc comments

## Hooks
- onFileWrite: prompt: Verify the changes look correct
- onSessionStart: prompt: Review project context
`;

  fs.writeFileSync(steeringPath, template);
  return steeringPath;
}

export function getSteeringSummary(): string {
  const steering = loadSteering();
  if (!steering) return '';
  
  let summary = '\n--- Project Steering ---\n';
  if (steering.context.length) {
    summary += steering.context.join('\n') + '\n';
  }
  if (steering.rules.length) {
    summary += '\nRules:\n' + steering.rules.map(r => `- ${r}`).join('\n') + '\n';
  }
  return summary;
}

/**
 * Get full steering context for system prompt
 */
export function getSteeringForPrompt(projectPath: string = process.cwd()): string {
  const { merged } = loadAllSteering(projectPath);
  
  if (merged.rules.length === 0 && merged.context.length === 0) {
    return '';
  }
  
  let prompt = '\n\n--- PROJECT STEERING ---\n';
  
  if (merged.context.length > 0) {
    prompt += '\nContext:\n' + merged.context.join('\n') + '\n';
  }
  
  if (merged.rules.length > 0) {
    prompt += '\nRules (you MUST follow these):\n';
    prompt += merged.rules.map(r => `- ${r}`).join('\n') + '\n';
  }
  
  if (merged.tools.length > 0) {
    prompt += '\nTool Permissions:\n';
    prompt += merged.tools.map(t => `- ${t}`).join('\n') + '\n';
  }
  
  prompt += '\n--- END STEERING ---\n';
  
  return prompt;
}

/**
 * Get hooks for a specific event
 */
export function getHooksForEvent(event: SteeringHook['event'], projectPath: string = process.cwd()): SteeringHook[] {
  const { merged } = loadAllSteering(projectPath);
  return merged.hooks.filter(h => h.event === event);
}
