import { useState, useRef } from 'react';

/**
 * CodeBlock
 * Props:
 *  - code (string): raw code to render
 *  - language (string): Prism language key (e.g. 'bash', 'javascript')
 *  - title (string, optional): small header above block
 *
 * Features:
 *  - Copy button with success / error feedback
 *  - Accessible live region announcing copy status
 *  - Uses Prism.js (already loaded globally in _app.js) for syntax highlighting
 *  - Deferred highlighting relies on global Prism.highlightAll() in _app.js route change hook
 */
export default function CodeBlock({ code, language = 'bash', title }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const liveRef = useRef(null);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setError(false);
      announce('Copied code to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setError(true);
      announce('Copy failed');
      setTimeout(() => setError(false), 2500);
    }
  }

  function announce(msg) {
    if (liveRef.current) {
      liveRef.current.textContent = msg;
    }
  }

  return (
    <div className="group border border-gray-700 rounded-md bg-black/40 overflow-hidden text-xs relative">
      {title && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 bg-black/30">
          <span className="font-medium text-gray-200">{title}</span>
          <span className="text-[10px] uppercase tracking-wide text-gray-500">{language}</span>
        </div>
      )}

      <div className="absolute right-3 top-2 flex items-center gap-2">
        <button
          type="button"
            onClick={onCopy}
            className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-[11px] text-gray-200 border border-gray-600"
            aria-label="Copy code to clipboard"
          >
            {copied ? '✓ Copied' : error ? 'Error' : 'Copy'}
          </button>
        </div>

      <pre className="m-0 p-3 overflow-x-auto">
        <code className={`language-${language}`}>{code}</code>
      </pre>

      {/* Live region for assistive tech */}
      <div
        ref={liveRef}
        aria-live="polite"
        className="sr-only"
      />
    </div>
  );
}