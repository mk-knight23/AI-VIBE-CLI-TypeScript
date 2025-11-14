import CodeBlock from '../../components/CodeBlock';

export default function GettingStarted() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Getting Started</h1>
      <p className="mt-4 text-gray-300 text-sm">
        Install the Vibe CLI, configure your OpenRouter key, and launch the interactive
        terminal assistant. All steps complete in under two minutes.
      </p>

      <section id="install" className="mt-8">
        <h2 className="text-xl font-semibold">1. Install</h2>
        <p className="mt-2 text-sm text-gray-300">
          Choose either npm global install (GitHub source) or the one-line curl bootstrap.
        </p>
        <div className="mt-3">
          <CodeBlock
            language="bash"
            title="Install"
            code={`npm i -g github:mk-knight23/vibe-cli
# OR
curl -fsSL https://raw.githubusercontent.com/mk-knight23/vibe-cli/main/install.sh | bash`}
          />
        </div>
      </section>

      <section id="api-key" className="mt-8">
        <h2 className="text-xl font-semibold">2. Set OpenRouter API Key</h2>
        <p className="mt-2 text-sm text-gray-300">
          Export your key (never commit it). Vibe routes only to free/open models by default.
        </p>
        <div className="mt-3">
          <CodeBlock
            language="bash"
            title="Environment"
            code={`export OPENROUTER_API_KEY="sk-or-..."`}
          />
        </div>
      </section>

      <section id="launch" className="mt-8">
        <h2 className="text-xl font-semibold">3. Launch Chat</h2>
        <p className="mt-2 text-sm text-gray-300">
          Start the interactive assistant. Use <code className="text-primary">/help</code> for available slash commands.
        </p>
        <div className="mt-3">
          <CodeBlock language="bash" title="Run" code={`vibe`} />
        </div>
      </section>

      <section id="models" className="mt-8">
        <h2 className="text-xl font-semibold">4. List & Select Free Models</h2>
        <p className="mt-2 text-sm text-gray-300">
          Rotate among free models to maintain resilience if one provider is slow.
        </p>
        <div className="mt-3">
          <CodeBlock
            language="bash"
            title="Models"
            code={`vibe model list
vibe model use z-ai/glm-4.5-air:free`}
          />
        </div>
      </section>

      <section id="agents" className="mt-8">
        <h2 className="text-xl font-semibold">5. Try a Bounded Agent Task</h2>
        <p className="mt-2 text-sm text-gray-300">
          Agents plan multi-step refactors or improvements with explicit confirmations.
        </p>
        <div className="mt-3">
          <CodeBlock
            language="bash"
            title="Agent Task"
            code={`vibe agent "refactor logging for clarity" --max-steps 5`}
          />
        </div>
      </section>
    </main>
  );
}
