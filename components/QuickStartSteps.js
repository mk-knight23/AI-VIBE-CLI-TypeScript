import { useState } from 'react';

/**
 * QuickStartSteps: Interactive numbered guide with accordion panels and copy buttons.
 * Future enhancements: progress tracking, animated terminal demo embed, analytics events.
 */
export default function QuickStartSteps() {
  const initialSteps = [
    {
      id: 1,
      title: 'Install Vibe CLI',
      desc: 'Install globally via npm (GitHub source) or one-line curl script.',
      code: `# Option A: npm (installs from GitHub)
npm i -g github:mk-knight23/vibe-cli

# Option B: curl bootstrap
curl -fsSL https://raw.githubusercontent.com/mk-knight23/vibe-cli/main/install.sh | bash`,
    },
    {
      id: 2,
      title: 'Set OpenRouter API key',
      desc: 'Export your key (never commit it). Only free/open models are leveraged by default.',
      code: `export OPENROUTER_API_KEY="sk-or-..."\n# macOS/Linux add to shell profile for persistence\n# echo 'export OPENROUTER_API_KEY="sk-or-..."' >> ~/.zshrc`,
    },
    {
      id: 3,
      title: 'Launch interactive chat',
      desc: 'Start a Claude Code–style defensive development assistant in your terminal.',
      code: `vibe\n# Use /help inside chat for advanced commands (generate, refactor, test, agent)`,
    },
    {
      id: 4,
      title: 'List & select free models',
      desc: 'Browse free provider models and optionally switch.',
      code: `vibe model list\nvibe model use z-ai/glm-4.5-air:free`,
    },
    {
      id: 5,
      title: 'Explore agents & automation',
      desc: 'Invoke autonomous multi-step tasks (bounded by safety rules).',
      code: `# Plan a task
vibe plan "add dark mode toggle"

# Run autonomous agent (with step cap)
vibe agent "refactor utils for clarity" --max-steps 6

# Terminal watcher prototype
vibe agent start --watch src/,lib/`,
    },
  ];

  const [openIds, setOpenIds] = useState([1]);
  const [copied, setCopied] = useState(null);

  function toggle(id) {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function copy(code, id) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(id);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      // ignore
    }
  }

  const total = initialSteps.length;
  const completed = openIds.length;
  const progressPct = Math.min(100, Math.round((completed / total) * 100));

  return (
    <section
      id="quickstart"
      className="max-w-6xl mx-auto px-4 py-16"
      aria-labelledby="quickstart-heading"
    >
      <div className="flex flex-col md:flex-row md:items-start gap-10">
        <div className="flex-1">
          <h2
            id="quickstart-heading"
            className="text-2xl md:text-3xl font-bold tracking-tight"
          >
            Quick start (≈2 minutes)
          </h2>
          <p className="mt-4 text-gray-300 text-sm md:text-base max-w-prose">
            Follow these numbered steps to get productive. Each panel is
            expandable—open all to reach 100% onboarding progress. Safe by
            design: privacy-first, defensive-only tasks.
          </p>

          {/* Progress bar */}
          <div
            className="mt-6"
            aria-label={`Onboarding progress: ${progressPct}%`}
          >
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Progress</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                style={{ width: progressPct + '%' }}
              />
            </div>
          </div>

          <div className="mt-8 space-y-4" role="list">
            {initialSteps.map((step) => {
              const isOpen = openIds.includes(step.id);
              return (
                <div
                  key={step.id}
                  className="border border-gray-800 rounded-lg bg-black/25 backdrop-blur-sm"
                  role="listitem"
                >
                  <button
                    type="button"
                    onClick={() => toggle(step.id)}
                    className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg"
                    aria-expanded={isOpen}
                    aria-controls={`step-panel-${step.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-7 h-7 text-sm font-semibold rounded-full bg-gradient-to-tr from-primary/70 to-accent/60 text-black">
                        {step.id}
                      </span>
                      <span className="font-semibold">{step.title}</span>
                    </div>
                    <span className="text-gray-500 text-xs">
                      {isOpen ? '▲' : '▼'}
                    </span>
                  </button>
                  {isOpen && (
                    <div
                      id={`step-panel-${step.id}`}
                      className="px-4 pb-5 pt-1 space-y-4"
                      role="region"
                      aria-label={`Step ${step.id} details`}
                    >
                      <p className="text-sm text-gray-300">{step.desc}</p>
                      <div className="relative group">
                        <pre className="overflow-x-auto text-xs md:text-sm leading-relaxed bg-black/40 border border-gray-700 p-3 rounded-md">
{step.code}
                        </pre>
                        <button
                          onClick={() => copy(step.code, step.id)}
                          type="button"
                          className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-gray-700/70 hover:bg-gray-600 text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                          aria-label="Copy step code snippet"
                        >
                          {copied === step.id ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      {step.id === 3 && (
                        <p className="text-xs text-gray-500">
                          Inside chat: use <code className="text-primary">/help</code>,{' '}
                          <code className="text-primary">/models</code>, and{' '}
                          <code className="text-primary">/agent</code> for advanced flows.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Side panel for highlights / reasons why free */}
        <aside
          className="md:w-80 flex-shrink-0 border border-gray-800 rounded-lg p-5 bg-black/30 backdrop-blur-sm space-y-4 h-fit"
          aria-label="Why Vibe is free"
        >
          <h3 className="font-semibold text-lg">Why free?</h3>
            <ul className="text-sm text-gray-300 space-y-2 list-disc list-inside">
              <li>No paywall. Uses community free OpenRouter models.</li>
              <li>Anonymous usage—bring your own key.</li>
              <li>Focus on developer velocity & defensive safety.</li>
              <li>Agentic tasks with explicit approval steps.</li>
              <li>Open-source roadmap & transparent changelog.</li>
            </ul>
            <div className="text-xs text-gray-400">
              Future optional donation tier may extend context limits and
              priority feature previews.
            </div>
        </aside>
      </div>
    </section>
  );
}