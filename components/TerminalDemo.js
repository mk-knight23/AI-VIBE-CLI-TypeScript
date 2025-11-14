import { useEffect, useRef, useState } from 'react';

/**
 * TerminalDemo
 * Lightweight xterm.js powered demo showing sample Vibe CLI interactions.
 *
 * Implementation notes:
 * - Dynamically imports xterm + addon fit to avoid SSR issues in Next.js.
 * - Simulates a short scripted session (user prompt -> tool output).
 * - Future: wire to live WASM sandbox or a read-only recorded session log.
 * - Accessible: role="region" + aria-label; output mirrored for screen readers.
 */
export default function TerminalDemo() {
  const termRef = useRef(null);
  const containerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [scriptDone, setScriptDone] = useState(false);
  const [logMirror, setLogMirror] = useState([]); // For screen reader accessible log
  const scriptRef = useRef([
    { t: 600, line: 'vibe agent "refactor logging for clarity" --max-steps 4' },
    { t: 1400, line: '→ Planning steps…' },
    { t: 2200, line: '1. Analyze logging calls' },
    { t: 2600, line: '2. Suggest grouping + severity mapping' },
    { t: 3000, line: '3. Provide diff patch (dry-run)' },
    { t: 3600, line: '4. Display confirmation prompt' },
    { t: 4400, line: '✓ Plan ready. Use --auto to execute with approvals.' },
    { t: 5200, line: 'vibe model list' },
    { t: 6000, line: 'Default: z-ai/glm-4.5-air:free' },
    { t: 6400, line: '* 1. z-ai/glm-4.5-air:free (128K ctx)' },
    { t: 7000, line: '   2. kwaipilot/kat-coder-pro-v1:free' },
    { t: 7600, line: '   3. google/gemini-2.0-flash-exp:free' },
    { t: 8200, line: 'vibe git status --insights' },
    { t: 9000, line: 'Branch: main | Modified: 2 | Staged: 0 | Untracked: 0' },
    { t: 9400, line: 'AI Insights: Consider committing refactor patch.' },
    { t: 10100, line: 'Session complete (demo).' }
  ]);

  useEffect(() => {
    let term;
    let fitAddon;
    let disposed = false;

    async function init() {
      try {
        const { Terminal } = await import('xterm');
        const { FitAddon } = await import('xterm-addon-fit');
        // Minimal CSS injection if not already loaded (user must add xterm.css ideally)
        if (!document.querySelector('link[data-xterm]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
            link.dataset.xterm = 'true';
          link.href = 'https://cdn.jsdelivr.net/npm/xterm/css/xterm.css';
          document.head.appendChild(link);
        }
        term = new Terminal({
          convertEol: true,
          cursorBlink: true,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace',
          fontSize: 13,
          theme: {
            background: '#0b1220',
            foreground: '#e5e7eb',
            cursor: '#60a5fa',
            selection: 'rgba(96,165,250,0.35)'
          }
        });
        fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(containerRef.current);
        fitAddon.fit();
        term.writeln('\x1b[36mVibe CLI Demo\x1b[0m (read-only)');
        term.writeln('Type /help inside real CLI for full command list.\n');
        setReady(true);

        // Script playback
        const script = scriptRef.current;
        script.forEach(step => {
          setTimeout(() => {
            if (disposed) return;
            term.writeln(step.line);
            setLogMirror(prev => [...prev, step.line]);
            if (step === script[script.length - 1]) {
              setScriptDone(true);
            }
          }, step.t);
        });

        // Handle resize
        const onResize = () => {
          try { fitAddon.fit(); } catch {}
        };
        window.addEventListener('resize', onResize);

        return () => {
          disposed = true;
          window.removeEventListener('resize', onResize);
          term?.dispose();
        };
      } catch (e) {
        // Fail silently; show fallback
        setReady(false);
      }
    }

    init();
  }, []);

  return (
    <div
      className="rounded-lg border border-gray-800 bg-black/40 p-4 relative"
      role="region"
      aria-label="Terminal demo playback"
    >
      <div
        ref={containerRef}
        className="h-64 overflow-hidden rounded-md ring-1 ring-black/40"
        aria-hidden="true"
      />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
          Loading terminal demo…
        </div>
      )}
      {scriptDone && (
        <div className="absolute bottom-2 right-3 text-[10px] text-gray-500">
          Demo finished
        </div>
      )}
      {/* Screen reader mirror */}
      <div className="sr-only" aria-live="polite">
        {logMirror.join('\n')}
      </div>
    </div>
  );
}