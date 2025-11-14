// Auto-generated static search index for global Fuse.js search.
// Each entry: { id, title, section, content, href, tags }
// Keep content concise (<= ~500 chars) for performance. Longer docs can be truncated.
// Future improvement: hydration via dynamic import + MD parsing of /docs/*.md or API route.

import Fuse from 'fuse.js';

export const SEARCH_ITEMS = [
  {
    id: 'quickstart-install',
    title: 'Install Vibe CLI',
    section: 'Quick Start',
    href: '/#quickstart',
    tags: ['install','npm','curl','setup'],
    content: `Install globally with npm or one-line curl bootstrap script. Supports Node >=18. Command: npm i -g github:mk-knight23/vibe-cli`
  },
  {
    id: 'quickstart-api-key',
    title: 'Set OpenRouter API Key',
    section: 'Quick Start',
    href: '/docs/openrouter',
    tags: ['openrouter','api key','auth','environment'],
    content: `Export OPENROUTER_API_KEY to enable free/open model usage. Privacy: BYO key; never committed.`
  },
  {
    id: 'quickstart-chat',
    title: 'Launch Interactive Chat',
    section: 'Quick Start',
    href: '/chat',
    tags: ['chat','terminal','interactive'],
    content: `Run 'vibe' for Claude Code–style terminal assistant: /help, /models, /agent, code gen, refactor, test.`
  },
  {
    id: 'cli-help',
    title: 'CLI Commands Overview',
    section: 'Docs',
    href: '/docs/cli-commands',
    tags: ['commands','help','reference','terminal'],
    content: `Key slash cmds: /help, /models, /system, /search <q>, /docs <page>, /run <cmd>, /open <glob>, /write, /edit, /generate, /refactor, /debug, /test, /review, /git, /agent, /multiline.`
  },
  {
    id: 'openrouter',
    title: 'OpenRouter Integration',
    section: 'Docs',
    href: '/docs/openrouter',
    tags: ['models','openrouter','free','integration'],
    content: `Uses OpenRouter free/open models. Multi-provider access, rotate among free models. Choose default model with 'vibe model use <id>'.`
  },
  {
    id: 'configuration',
    title: 'Configuration Basics',
    section: 'Docs',
    href: '/docs/configuration',
    tags: ['config','environment','defaults'],
    content: `Primary environment variable: OPENROUTER_API_KEY. Additional defaults: theme, autonomous flags, model rotation, sessions.`
  },
  {
    id: 'security-perms',
    title: 'Security & Permissions',
    section: 'Docs',
    href: '/docs/security-and-permissions',
    tags: ['security','defensive','permissions','refusals'],
    content: `Defensive-only stance. Refuses malicious requests (exploit payloads etc). Explicit confirmation before file writes, moves, deletes.`
  },
  {
    id: 'ide-plugins',
    title: 'IDE Plugins (Roadmap)',
    section: 'Docs',
    href: '/docs/ide-plugins',
    tags: ['vs code','jetbrains','roadmap','integration'],
    content: `Upcoming: VS Code sidebar, JetBrains plugin. Current surfaces: terminal-first workflows, planned mirrored context panels.`
  },
  {
    id: 'feature-terminal-first',
    title: 'Terminal-first Workflows',
    section: 'Features',
    href: '/features#terminal-first',
    tags: ['terminal','workflow','ergonomics'],
    content: `Operate entirely in shell: chat, refactor, test generation, git-assist. Reduces context switching; minimal overhead.`
  },
  {
    id: 'feature-context-injection',
    title: 'Context Injection',
    section: 'Features',
    href: '/features#context',
    tags: ['context','files','diffs','globs'],
    content: `Inject files, globs, diffs, command outputs, docs snippets. Precise targeted context improves relevance & reduces token waste.`
  },
  {
    id: 'feature-git-native',
    title: 'Git-native Operations',
    section: 'Features',
    href: '/features#git-native',
    tags: ['git','review','commit','pr'],
    content: `Smart commit messages, PR descriptions, code reviews, release notes. Integrates simple-git for status and diff introspection.`
  },
  {
    id: 'feature-agents',
    title: 'Agents & Automation',
    section: 'Features',
    href: '/features#agents',
    tags: ['agents','automation','planning'],
    content: `Bounded autonomous agent tasks with step planning. --max-steps limit, explicit approvals for destructive changes.`
  },
  {
    id: 'pricing-free',
    title: 'Free Forever Model',
    section: 'Pricing',
    href: '/pricing',
    tags: ['pricing','free','donations'],
    content: `Always free: routes to community free models via OpenRouter. Future donation tier may extend context limits without paywall.`
  },
  {
    id: 'theme-toggle',
    title: 'Dark/Light Theme Toggle',
    section: 'UI',
    href: '/',
    tags: ['theme','dark','light','accessibility'],
    content: `Persisted theme selection (localStorage). Light variant adjusts CSS variables (bg, text, border, accent).`
  },
  {
    id: 'search-global',
    title: 'Global Search',
    section: 'UI',
    href: '/#search',
    tags: ['search','fuse','index'],
    content: `Modal search (Fuse.js) across docs, features, quick start, pricing. Typing filters items with fuzzy scoring; keyboard navigation planned.`
  }
];

// Build Fuse index lazily (imported in Layout).
export function buildFuse() {
  // Fuse imported statically above so this stays synchronous.
  return new Fuse(SEARCH_ITEMS, {
    keys: ['title', 'content', 'tags'],
    includeScore: true,
    threshold: 0.4,
    minMatchCharLength: 2,
  });
}

// Simple search helper
export function performSearch(fuse, query) {
  if (!query || !fuse) return [];
  return fuse.search(query).slice(0, 12).map(r => ({
    ...r.item,
    score: r.score
  }));
}