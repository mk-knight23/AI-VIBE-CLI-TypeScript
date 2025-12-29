/**
 * Steering Files - Project-specific AI guidance
 * Inspired by Kiro CLI steering system
 */

import * as fs from 'fs';
import * as path from 'path';

const STEERING_LOCATIONS = [
  '.vibe/steering.md',
  '.vibe/STEERING.md',
  'VIBE.md',
  '.vibeconfig'
];

export interface SteeringConfig {
  content: string;
  path: string;
  rules: string[];
  context: string[];
  tools: string[];
}

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

function parseSteering(content: string, filePath: string): SteeringConfig {
  const rules: string[] = [];
  const context: string[] = [];
  const tools: string[] = [];

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
    }
  }

  return { content, path: filePath, rules, context, tools };
}

function extractListItems(text: string): string[] {
  return text
    .split('\n')
    .filter(line => line.match(/^[-*]\s+/))
    .map(line => line.replace(/^[-*]\s+/, '').trim())
    .filter(Boolean);
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
