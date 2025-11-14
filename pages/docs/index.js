import { useMemo, useState, useEffect, useRef } from 'react';

/**
 * Docs index with enhanced fuzzy search (Fuse.js) & relevance ranking.
 * - Lazy loads Fuse only when user types (>=2 chars) to reduce initial bundle.
 * - Combines tags + content excerpt for search weighting.
 * - Provides keyboard navigation for result list (ArrowUp/ArrowDown + Enter).
 * - Future: integrate dynamic MDX parsing for auto index generation.
 */
const RAW_LINKS = [
  {
    title: 'Getting started',
    href: '/docs/getting-started',
    tags: ['install', 'quickstart', 'npm', 'curl'],
    excerpt: 'Install via npm or curl bootstrap. Set OPENROUTER_API_KEY and launch vibe.'
  },
  {
    title: 'CLI commands',
    href: '/docs/cli-commands',
    tags: ['commands', 'reference', 'slash'],
    excerpt: 'Slash command interface: /search /open /refactor /agent etc.'
  },
  {
    title: 'IDE plugins',
    href: '/docs/ide-plugins',
    tags: ['vs code', 'jetbrains', 'integration'],
    excerpt: 'Terminal-first, planned VS Code and JetBrains extensions layering on CLI.'
  },
  {
    title: 'Configuration',
    href: '/docs/configuration',
    tags: ['env', 'defaults', 'models'],
    excerpt: 'OPENROUTER_API_KEY, model defaults, output formatting, overrides.'
  },
  {
    title: 'OpenRouter',
    href: '/docs/openrouter',
    tags: ['models', 'free', 'providers'],
    excerpt: 'Multi-provider free/open model routing, environment setup.'
  },
  {
    title: 'Security & permissions',
    href: '/docs/security-and-permissions',
    tags: ['security', 'defensive', 'permissions'],
    excerpt: 'Defensive-only assistance, bounded agents, explicit edit approvals.'
  },
];

export default function Docs() {
  const [q, setQ] = useState('');
  const [fuseLoaded, setFuseLoaded] = useState(false);
  const [results, setResults] = useState(RAW_LINKS);
  const fuseRef = useRef(null);
  const listRef = useRef(null);
  const activeIndexRef = useRef(-1);

  // Lazy init Fuse only when query length threshold met
  useEffect(() => {
    if (q.trim().length >= 2 && !fuseRef.current) {
      (async () => {
        try {
          const { default: Fuse } = await import('fuse.js');
          fuseRef.current = new Fuse(RAW_LINKS, {
            keys: [
              { name: 'title', weight: 0.45 },
              { name: 'tags', weight: 0.2 },
              { name: 'excerpt', weight: 0.35 },
            ],
            threshold: 0.4,
            includeScore: true,
            minMatchCharLength: 2,
          });
          setFuseLoaded(true);
        } catch {
          // if Fuse fails, fallback silent
        }
      })();
    }
  }, [q]);

  // Perform search
  useEffect(() => {
    const query = q.trim();
    if (!query) {
      setResults(RAW_LINKS);
      activeIndexRef.current = -1;
      return;
    }
    if (fuseRef.current && query.length >= 2) {
      const r = fuseRef.current.search(query).map(x => x.item);
      setResults(r);
      activeIndexRef.current = -1;
    } else {
      // simple substring fallback prior to Fuse load
      const s = query.toLowerCase();
      setResults(
        RAW_LINKS.filter(l =>
          l.title.toLowerCase().includes(s) ||
          l.excerpt.toLowerCase().includes(s) ||
          (l.tags || []).some(t => String(t).toLowerCase().includes(s))
        )
      );
    }
  }, [q]);

  // Keyboard navigation for results
  function onKeyDown(e) {
    if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) return;
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndexRef.current =
        (activeIndexRef.current + 1) % results.length;
      focusActive();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndexRef.current =
        (activeIndexRef.current - 1 + results.length) % results.length;
      focusActive();
    } else if (e.key === 'Enter') {
      const idx = activeIndexRef.current;
      if (idx >= 0 && idx < results.length) {
        window.location.href = results[idx].href;
      }
    }
  }

  function focusActive() {
    if (!listRef.current) return;
    const nodes = listRef.current.querySelectorAll('[data-result]');
    const idx = activeIndexRef.current;
    nodes.forEach((n, i) => {
      if (i === idx) {
        n.classList.add('ring-2', 'ring-primary');
        n.setAttribute('aria-current', 'true');
        n.scrollIntoView({ block: 'nearest' });
      } else {
        n.classList.remove('ring-2', 'ring-primary');
        n.removeAttribute('aria-current');
      }
    });
  }

  const countLabel = q.trim()
    ? `Results: ${results.length}${fuseLoaded ? '' : ' (basic search)'}`
    : 'Type to search topics';

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <div className="grid md:grid-cols-[260px_1fr] gap-8">
        {/* Sidebar */}
        <aside
          className="border border-gray-800 rounded-lg p-4 bg-black/20 h-fit"
          aria-label="Docs navigation"
        >
          <h1 className="text-xl font-bold">Docs</h1>
          <div className="mt-4">
            <label htmlFor="docs-search" className="text-xs text-gray-400">
              Search docs
            </label>
            <input
              id="docs-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search topics…"
              className="mt-2 w-full px-3 py-2 rounded-md border border-gray-700 bg-black/40 focus:border-primary focus:outline-none text-sm"
              aria-label="Search documentation"
              aria-describedby="docs-search-status"
            />
            <div
              id="docs-search-status"
              className="mt-1 text-[10px] text-gray-500"
              aria-live="polite"
            >
              {countLabel}
            </div>
          </div>
          <nav
            className="mt-6 space-y-2 text-sm"
            aria-label="Primary doc sections"
          >
            {RAW_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="block px-2 py-1 rounded hover:bg-gray-800"
              >
                {l.title}
              </a>
            ))}
          </nav>
        </aside>

        {/* Content area */}
        <section aria-label="Docs index content">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Browse topics</h2>
            {q && (
              <span className="text-xs text-gray-500">
                Filtered: {results.length}
              </span>
            )}
          </div>
          <ul
            ref={listRef}
            className="mt-4 grid md:grid-cols-2 gap-3"
            role="list"
          >
            {results.map((l) => (
              <li
                key={l.href}
                data-result
                className="p-4 rounded-lg border border-gray-800 bg-black/25 focus:outline-none transition-shadow"
                tabIndex={0}
              >
                <a
                  href={l.href}
                  className="font-medium hover:underline"
                  aria-label={`Open ${l.title} documentation`}
                >
                  {l.title}
                </a>
                <div className="mt-2 text-[10px] text-gray-500">
                  {l.tags.join(' • ')}
                </div>
                <p className="mt-2 text-[11px] text-gray-400 line-clamp-4">
                  {l.excerpt}
                </p>
              </li>
            ))}
            {!results.length && (
              <li className="p-4 rounded-lg border border-gray-800 bg-black/25 text-xs text-gray-500 italic">
                No matches. Try broader terms.
              </li>
            )}
          </ul>
          <p className="mt-6 text-[10px] text-gray-500">
            Fuzzy matching powered by Fuse.js (loaded lazily). Weighting favors
            titles and excerpt contexts. Future iteration: per-heading index +
            semantic embeddings for concept clustering.
          </p>
        </section>
      </div>
    </main>
  );
}
