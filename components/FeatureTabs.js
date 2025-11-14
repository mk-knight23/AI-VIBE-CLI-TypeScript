import { useState } from 'react';
import TerminalDemo from './TerminalDemo';

/**
 * FeatureTabs: Tabbed interface for exploring Core CLI, Agents, Integrations, and Comparison.
 * Accessibility:
 * - Tabs implemented with buttons inside a role="tablist"
 * - aria-selected, aria-controls, and id relationships
 * - Keyboard navigation (Left/Right/Home/End)
 *
 * Future Enhancements:
 * - Animate transitions (Framer Motion / CSS transitions)
 * - Lazy-load heavy demo assets
 * - Persist last active tab in localStorage
 * - Add WASM or xterm.js embedded demo in Agents tab
 */

const tabs = [
  { id: 'core', label: 'Core CLI' },
  { id: 'agents', label: 'Agents' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'comparison', label: 'Comparison' },
];

const coreItems = [
  {
    title: 'Terminal-first workflows',
    desc: 'Chat, refactor, test-gen, and review without leaving your shell. Claude Code–style but fully local routing.',
  },
  {
    title: 'Context injection primitives',
    desc: 'Inject diffs, globs, command output, docs, file sets, and system prompts precisely.',
  },
  {
    title: 'Defensive-only stance',
    desc: 'Hard refusal logic for abusive security prompts; green-lit for defensive analysis and remediation.',
  },
  {
    title: 'Git-native operations',
    desc: 'Smart commit messages, PR descriptions, status insights, code reviews, and release artifact assistance.',
  },
  {
    title: 'Structured file editing',
    desc: 'Multi-file diff planning with explicit confirmation before applying writes. Zero silent mutations.',
  },
  {
    title: 'Multi-model free access',
    desc: 'Rotate among community free OpenRouter models: resilience if one is slow or degraded.',
  },
];

const agentItems = [
  {
    title: 'Autonomous planning',
    desc: 'Decompose user tasks into step plans stored as sessions for reproducibility.',
  },
  {
    title: 'Bounded execution',
    desc: 'Optional --max-steps ensures agents never run indefinitely; each step logged.',
  },
  {
    title: 'Watcher mode (experimental)',
    desc: 'Observe file changes, propose lint/test/fix tasks (currently placeholder events).',
  },
  {
    title: 'Safety gating',
    desc: 'Agent actions require explicit approval on destructive operations (write/delete/move).',
  },
  {
    title: 'Session persistence',
    desc: 'Resumable sessions (plan|fix|debug|agent) so iterative improvements don’t lose context.',
  },
];

const integrationItems = [
  {
    title: 'Editor ecosystem (roadmap)',
    desc: 'VS Code sidebar & JetBrains plugin planned; mirror terminal context panels.',
  },
  {
    title: 'Shell compatibility',
    desc: 'Works across bash, zsh, fish on macOS/Linux; Windows Terminal support via Node 18 runtime.',
  },
  {
    title: 'GitHub workflow alignment',
    desc: 'Simplify commit/PR flows, enable review scaffolding & release notes generation.',
  },
  {
    title: 'OpenRouter flexible model layer',
    desc: 'Single environment variable wires in multi-provider access. BYO key, no auth wall.',
  },
  {
    title: 'Plugin architecture',
    desc: 'Install simple JS plugins (/plugins) to transform or augment tasks (extensible placeholder).',
  },
];

const comparisonRows = [
  {
    feature: 'Pricing model',
    vibe: 'Free (BYO OpenRouter key; free models only)',
    copilot: '$10/mo (individual)',
    claude: '$20/mo+ (usage tiers)',
  },
  {
    feature: 'Terminal-first UX',
    vibe: 'Primary surface',
    copilot: 'Editor only',
    claude: 'Secondary (Claude Code preview)',
  },
  {
    feature: 'Model flexibility',
    vibe: 'Multi-provider free rotation',
    copilot: 'Proprietary stack',
    claude: 'Anthropic models only',
  },
  {
    feature: 'Agentic tasks',
    vibe: 'Planned & partial (bounded)',
    copilot: 'Limited suggestions',
    claude: 'Emerging iterative refactors',
  },
  {
    feature: 'Security stance',
    vibe: 'Defensive-only hard gates',
    copilot: 'General purpose',
    claude: 'General purpose + policies',
  },
  {
    feature: 'Offline friendliness',
    vibe: 'Core flows except model calls',
    copilot: 'Requires cloud',
    claude: 'Requires cloud',
  },
];

export default function FeatureTabs() {
  const [active, setActive] = useState('core');

  function onKeyNav(e) {
    const idx = tabs.findIndex((t) => t.id === active);
    if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      let nextIdx = idx;
      if (e.key === 'ArrowRight') nextIdx = (idx + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') nextIdx = 0;
      else if (e.key === 'End') nextIdx = tabs.length - 1;
      setActive(tabs[nextIdx].id);
      const btn = document.getElementById(`tab-${tabs[nextIdx].id}`);
      if (btn) btn.focus();
    }
  }

  return (
    <section
      id="feature-tabs"
      className="max-w-6xl mx-auto px-4 py-16"
      aria-labelledby="feature-tabs-heading"
    >
      <h2
        id="feature-tabs-heading"
        className="text-2xl md:text-3xl font-bold tracking-tight"
      >
        Explore Vibe capabilities
      </h2>
      <p className="mt-4 text-sm text-gray-300 max-w-prose">
        Compare perspectives: core CLI ergonomics, emerging agent automation,
        integration surfaces, and a neutral feature comparison snapshot. Tabs are
        keyboard navigable.
      </p>

      {/* Tablist */}
      <div
        role="tablist"
        aria-label="Vibe feature categories"
        className="mt-8 flex flex-wrap gap-2"
        onKeyDown={onKeyNav}
      >
        {tabs.map((t) => {
          const selected = active === t.id;
          return (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              role="tab"
              aria-selected={selected ? 'true' : 'false'}
              aria-controls={`panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(t.id)}
              className={
                'px-4 py-2 rounded-md text-sm font-medium transition-colors border ' +
                (selected
                  ? 'bg-primary text-black border-primary'
                  : 'bg-black/30 border-gray-700 text-gray-300 hover:border-gray-500')
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Panels */}
      <div className="mt-10">
        {active === 'core' && (
          <div
            id="panel-core"
            role="tabpanel"
            aria-labelledby="tab-core"
            className="space-y-5"
          >
            <div className="grid md:grid-cols-3 gap-4">
              {coreItems.map((it) => (
                <div
                  key={it.title}
                  className="p-5 rounded-lg border border-gray-800 bg-black/25 backdrop-blur-sm"
                >
                  <h3 className="font-semibold text-sm">{it.title}</h3>
                  <p className="mt-2 text-xs text-gray-300 leading-relaxed">
                    {it.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {active === 'agents' && (
          <div
            id="panel-agents"
            role="tabpanel"
            aria-labelledby="tab-agents"
            className="space-y-6"
          >
            <div className="grid md:grid-cols-2 gap-4">
              {agentItems.map((it) => (
                <div
                  key={it.title}
                  className="p-5 rounded-lg border border-gray-800 bg-gradient-to-br from-primary/10 to-accent/10"
                >
                  <h3 className="font-semibold text-sm">{it.title}</h3>
                  <p className="mt-2 text-xs text-gray-300 leading-relaxed">
                    {it.desc}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 text-xs text-gray-400">
              Agents remain bounded by explicit confirmations. Upcoming:
              dependency graph reasoning & codebase semantic indexing.
            </div>
            <div className="mt-6 space-y-3">
              <h4 className="text-xs font-semibold tracking-wide text-gray-400 uppercase">
                Live CLI Demo (Simulated)
              </h4>
              <TerminalDemo />
              <p className="text-[10px] text-gray-500">
                Read-only scripted playback. Shows sample agent planning, model listing, and git insights.
                For a real session run <code className="text-primary">vibe</code> in your terminal.
              </p>
            </div>
          </div>
        )}

        {active === 'integrations' && (
          <div
            id="panel-integrations"
            role="tabpanel"
            aria-labelledby="tab-integrations"
            className="space-y-6"
          >
            <div className="grid md:grid-cols-3 gap-4">
              {integrationItems.map((it) => (
                <div
                  key={it.title}
                  className="p-5 rounded-lg border border-gray-800 bg-black/20"
                >
                  <h3 className="font-semibold text-sm">{it.title}</h3>
                  <p className="mt-2 text-xs text-gray-300 leading-relaxed">
                    {it.desc}
                  </p>
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-500">
              Roadmap transparency encourages community alignment: contributions
              welcome on GitHub issues for prioritized integrations.
            </div>
          </div>
        )}

        {active === 'comparison' && (
          <div
            id="panel-comparison"
            role="tabpanel"
            aria-labelledby="tab-comparison"
            className="space-y-6"
          >
            <div className="overflow-x-auto rounded-lg border border-gray-800 bg-black/30">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left bg-black/40">
                    <th className="px-4 py-3 font-semibold border-b border-gray-700">
                      Feature
                    </th>
                    <th className="px-4 py-3 font-semibold border-b border-gray-700">
                      Vibe
                    </th>
                    <th className="px-4 py-3 font-semibold border-b border-gray-700">
                      Copilot
                    </th>
                    <th className="px-4 py-3 font-semibold border-b border-gray-700">
                      Claude
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.feature} className="even:bg-black/20">
                      <td className="px-4 py-3 border-b border-gray-800">
                        {row.feature}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-800 text-primary/90">
                        {row.vibe}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-800 text-gray-300">
                        {row.copilot}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-800 text-gray-300">
                        {row.claude}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400">
              Neutral comparison for context; trademarks belong to their
              respective owners. Data approximated for illustrative UX; verify
              official pricing & capabilities on vendor sites.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}