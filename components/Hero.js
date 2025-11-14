import { useState } from 'react';

export default function Hero() {
  const [copied, setCopied] = useState(false);

  async function copyInstall() {
    const cmd = 'npm i -g github:mk-knight23/vibe-cli';
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (e) {
      // noop
    }
  }

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-20 right-0 w-[700px] h-[700px] bg-primary/20 blur-3xl rounded-full" />
        <div className="absolute top-40 -left-40 w-[600px] h-[600px] bg-accent/20 blur-3xl rounded-full" />
      </div>
      <div className="max-w-6xl mx-auto px-4 py-20 md:py-28 text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
          Vibe: Your Free AI Coding CLI — Agentic Workflows in Terminal
        </h1>
        <p className="mt-6 text-lg md:text-xl text-gray-300">
          Terminal-first assistant for developers. Anonymous by design, routes to free/open models via OpenRouter. Integrates with your editor and Git.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <a href="#quickstart" className="px-5 py-2.5 rounded-md bg-primary text-black font-semibold">Quick Start</a>
          <a href="/chat" className="px-5 py-2.5 rounded-md border border-gray-700 hover:border-gray-500">Live Demo</a>
          <a href="/docs" className="px-5 py-2.5 rounded-md border border-gray-700 hover:border-gray-500">View Docs</a>
        </div>

        {/* Install snippet + copy */}
        <div className="mt-8 mx-auto max-w-xl text-left">
          <div className="relative">
            <pre className="overflow-x-auto text-sm leading-relaxed bg-black/40 border border-gray-700 p-3 rounded-md">
npm i -g github:mk-knight23/vibe-cli
            </pre>
            <button
              onClick={copyInstall}
              type="button"
              className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-gray-700/70 hover:bg-gray-600 text-gray-200"
              aria-label="Copy install command"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Or use curl: <code className="text-primary">curl -fsSL https://raw.githubusercontent.com/mk-knight23/vibe-cli/main/install.sh | bash</code>
          </p>
        </div>

        <div className="mt-6 text-sm text-gray-400">
          Built for developers • OpenRouter compatible • Git/GitHub ready • Defensive-only
        </div>
      </div>
    </section>
  );
}
