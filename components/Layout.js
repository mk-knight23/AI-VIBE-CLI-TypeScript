import { useState, useEffect, useRef } from 'react';

/**
 * Layout: Upgraded navigation with
 * - Features dropdown
 * - Global search modal (Fuse.js)
 * - Dark/light mode toggle (stores preference in localStorage)
 * Accessibility: modal focuses input, ESC closes, results announced via aria-live.
 */
export default function Layout({ children }) {
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [theme, setTheme] = useState('dark');
  const searchInputRef = useRef(null);
  const fuseRef = useRef(null);
  const indexModuleRef = useRef(null);
  const resultsContainerRef = useRef(null);
  const modalRef = useRef(null);

  // Initialize theme from system preference / local storage
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('vibe-theme') : null;
    if (stored) {
      setTheme(stored);
    } else {
      const prefersLight = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches;
      setTheme(prefersLight ? 'light' : 'dark');
    }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = theme;
      localStorage.setItem('vibe-theme', theme);
    }
  }, [theme]);

  // Dynamic import search index + Fuse only when modal first opened
  useEffect(() => {
    if (searchOpen && !fuseRef.current) {
      (async () => {
        try {
          const mod = await import('../data/searchIndex.js');
          indexModuleRef.current = mod;
          fuseRef.current = mod.buildFuse();
          if (searchQuery.trim()) {
            setSearchResults(mod.performSearch(fuseRef.current, searchQuery.trim()));
          }
        } catch (e) {
          // silently ignore import errors
        }
      })();
    }
  }, [searchOpen, searchQuery]);

  // Focus search input when modal opens
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Keyboard handling (ESC to close + focus trap when modal open)
  useEffect(() => {
    if (!searchOpen) return;
    function handleKey(e) {
      if (e.key === 'Escape') {
        setSearchOpen(false);
        return;
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [searchOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (!e.target.closest('[data-features-dropdown]')) {
        setFeaturesOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function toggleTheme() {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  }

  function onSearchChange(e) {
    const value = e.target.value;
    setSearchQuery(value);
    if (fuseRef.current && indexModuleRef.current) {
      setSearchResults(indexModuleRef.current.performSearch(fuseRef.current, value.trim()));
    }
  }

  return (
    <div className="min-h-screen bg-ink text-gray-200">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 px-3 py-2 rounded bg-primary text-black text-sm font-medium shadow">
        Skip to content
      </a>
      <header
        className="sticky top-0 z-30 backdrop-blur bg-ink/80 border-b border-gray-800"
        role="banner"
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <a href="/" className="font-bold tracking-tight text-lg" aria-label="Vibe home">
            Vibe CLI
          </a>
          <nav
            className="ml-auto flex items-center gap-5 text-sm text-gray-300"
            aria-label="Primary"
          >
            <div
              className="relative"
              data-features-dropdown
            >
              <button
                type="button"
                className="hover:text-white inline-flex items-center gap-1"
                aria-haspopup="true"
                aria-expanded={featuresOpen ? 'true' : 'false'}
                onClick={() => setFeaturesOpen(o => !o)}
              >
                Features
                <span className="text-gray-500 text-[10px]">{featuresOpen ? '▲' : '▼'}</span>
              </button>
              {featuresOpen && (
                <div
                  className="absolute left-0 mt-2 w-56 rounded-md border border-gray-700 bg-black/70 backdrop-blur shadow-lg p-2"
                  role="menu"
                  aria-label="Features submenu"
                >
                  <a
                    href="/features#core-cli"
                    className="block px-3 py-2 rounded hover:bg-gray-800"
                    role="menuitem"
                  >
                    Core CLI
                  </a>
                  <a
                    href="/features#agents"
                    className="block px-3 py-2 rounded hover:bg-gray-800"
                    role="menuitem"
                  >
                    Agents
                  </a>
                  <a
                    href="/features#integrations"
                    className="block px-3 py-2 rounded hover:bg-gray-800"
                    role="menuitem"
                  >
                    Integrations
                  </a>
                  <a
                    href="/docs/cli-commands"
                    className="block px-3 py-2 rounded hover:bg-gray-800"
                    role="menuitem"
                  >
                    CLI Commands
                  </a>
                </div>
              )}
            </div>
            <a href="/pricing" className="hover:text-white">
              Pricing
            </a>
            <a href="/docs" className="hover:text-white">
              Docs
            </a>
            <a href="/changelog" className="hover:text-white">
              Changelog
            </a>
            <button
              type="button"
              onClick={() => {
                setSearchOpen(true);
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="hover:text-white"
              aria-haspopup="dialog"
              aria-controls="global-search-modal"
              aria-label="Open global search"
            >
              🔍
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="hover:text-white"
              aria-label="Toggle color theme"
            >
              {theme === 'dark' ? '🌙' : '☀️'}
            </button>
          </nav>
          <a
            href="https://github.com/mk-knight23/vibe-cli"
            className="text-sm bg-white text-black px-3 py-1.5 rounded-md"
            aria-label="GitHub repository"
          >
            GitHub
          </a>
        </div>
      </header>

      {/* Global Search Modal */}
      {searchOpen && (
        <div
          id="global-search-modal"
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-label="Global search"
          className="fixed inset-0 z-40 flex items-start justify-center pt-32 px-4"
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSearchOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-xl rounded-lg border border-gray-700 bg-ink p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Search</h2>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search docs, features, quick start…"
              value={searchQuery}
              onChange={onSearchChange}
              className="mt-4 w-full px-3 py-2 rounded-md border border-gray-700 bg-black/40 focus:border-primary focus:outline-none"
              aria-label="Search query"
            />
            <div
              className="mt-2 text-xs text-gray-500 flex items-center justify-between"
              aria-live="polite"
            >
              <span>
                {searchQuery
                  ? `Results: ${searchResults.length}`
                  : 'Type at least 2 characters to search'}
              </span>
              <span>ESC to close</span>
            </div>

            <div
              ref={resultsContainerRef}
              className="mt-4 max-h-72 overflow-y-auto space-y-2"
              role="list"
            >
              {searchResults.map((r) => (
                <a
                  key={r.id}
                  href={r.href}
                  role="listitem"
                  onClick={() => setSearchOpen(false)}
                  className="block rounded-md border border-gray-700 bg-black/30 px-3 py-2 hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {r.title}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {r.section}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400 line-clamp-3">
                    {r.content}
                  </p>
                </a>
              ))}

              {searchQuery && searchResults.length === 0 && (
                <div className="text-xs text-gray-500 italic">
                  No matches. Try broader terms.
                </div>
              )}
            </div>
            <p className="mt-4 text-[10px] text-gray-500">
              Powered by Fuse.js — client-side fuzzy matching across curated index. (Prototype; future: weight recency & popularity.)
            </p>
          </div>
        </div>
      )}

      <main id="main">{children}</main>

      <footer className="border-t border-gray-800 mt-16" role="contentinfo">
        <div className="max-w-6xl mx-auto px-4 py-10 text-sm text-gray-400 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div>© {new Date().getFullYear()} CLI Vibe</div>
          <div className="flex gap-4">
            <a href="/privacy" className="hover:text-white">
              Privacy
            </a>
            <a href="/terms" className="hover:text-white">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
