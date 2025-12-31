/**
 * Rules Command - Manage project rules
 * Usage: vibe rules [list|add|remove|show]
 */

import { loadRules, createRule, listRules, Rule } from '../rules';
import pc from 'picocolors';

export function rulesCommand(action?: string, ...args: string[]): void {
  switch (action) {
    case 'list':
    case undefined:
      showRulesList();
      break;
    case 'add':
      addRule(args);
      break;
    case 'remove':
      removeRule(args[0]);
      break;
    case 'show':
      showRule(args[0]);
      break;
    default:
      console.log(pc.red(`Unknown action: ${action}`));
      showHelp();
  }
}

function showRulesList(): void {
  const rules = listRules();

  if (rules.length === 0) {
    console.log(pc.yellow('No rules defined.'));
    console.log(pc.gray('\nCreate rules in:'));
    console.log(pc.gray('  .vibe/rules/*.md (project)'));
    console.log(pc.gray('  ~/.vibe/rules/*.md (user)'));
    console.log(pc.gray('\nExample:'));
    console.log(pc.cyan(`---
name: code-style
priority: 10
scope: code
---
Always use TypeScript strict mode.
Prefer const over let.
Use async/await over callbacks.`));
    return;
  }

  console.log(pc.bold('\nProject Rules:\n'));

  const projectRules = rules.filter(r => r.source === 'project');
  const userRules = rules.filter(r => r.source === 'user');

  if (projectRules.length > 0) {
    console.log(pc.cyan('Project (.vibe/rules/):'));
    for (const r of projectRules) {
      console.log(`  ${pc.green(r.name)} [${r.scope}] priority:${r.priority}`);
    }
  }

  if (userRules.length > 0) {
    console.log(pc.cyan('\nUser (~/.vibe/rules/):'));
    for (const r of userRules) {
      console.log(`  ${pc.green(r.name)} [${r.scope}] priority:${r.priority}`);
    }
  }

  console.log(pc.gray('\nUse "vibe rules show <name>" to view a rule'));
}

function addRule(args: string[]): void {
  if (args.length < 2) {
    console.log(pc.red('Usage: vibe rules add <name> <content> [--scope <scope>] [--priority <n>]'));
    return;
  }

  const name = args[0];
  let content = '';
  let scope: Rule['scope'] = 'always';
  let priority = 50;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--scope' && args[i + 1]) {
      scope = args[++i] as Rule['scope'];
    } else if (args[i] === '--priority' && args[i + 1]) {
      priority = parseInt(args[++i], 10);
    } else {
      content += (content ? ' ' : '') + args[i];
    }
  }

  if (!content) {
    console.log(pc.red('Content required'));
    return;
  }

  const path = createRule(name, content, { scope, priority });
  console.log(pc.green(`✓ Created rule: ${name}`));
  console.log(pc.gray(`  Path: ${path}`));
}

function removeRule(name?: string): void {
  if (!name) {
    console.log(pc.red('Usage: vibe rules remove <name>'));
    return;
  }

  const fs = require('fs');
  const path = require('path');
  const rulePath = path.join(process.cwd(), '.vibe', 'rules', `${name}.md`);

  if (!fs.existsSync(rulePath)) {
    console.log(pc.red(`Rule not found: ${name}`));
    return;
  }

  fs.unlinkSync(rulePath);
  console.log(pc.green(`✓ Removed rule: ${name}`));
}

function showRule(name?: string): void {
  if (!name) {
    console.log(pc.red('Usage: vibe rules show <name>'));
    return;
  }

  const rules = loadRules();
  const rule = rules.find(r => r.name === name);

  if (!rule) {
    console.log(pc.red(`Rule not found: ${name}`));
    return;
  }

  console.log(pc.bold(`\n${rule.name}`));
  console.log(pc.gray(`Source: ${rule.source} | Scope: ${rule.scope} | Priority: ${rule.priority}`));
  console.log(pc.cyan('─'.repeat(50)));
  console.log(rule.content);
  console.log(pc.cyan('─'.repeat(50)));
}

function showHelp(): void {
  console.log(`
Usage: vibe rules <action> [args]

Actions:
  list              List all rules
  add <name> <text> Add a new rule
  remove <name>     Remove a rule
  show <name>       Show rule content

Options for add:
  --scope <scope>   Rule scope: always, code, docs, tests, shell
  --priority <n>    Priority (lower = higher priority)

Examples:
  vibe rules list
  vibe rules add no-console "Never use console.log in production code" --scope code
  vibe rules show no-console
  vibe rules remove no-console
`);
}
