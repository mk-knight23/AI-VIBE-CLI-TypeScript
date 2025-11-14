import CodeBlock from '../../components/CodeBlock';

export default function Configuration() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Configuration</h1>
      <p className="mt-4 text-sm text-gray-300">
        Minimal setup: provide an OpenRouter API key and optionally set model defaults / output
        formatting preferences. All configuration is environment or CLI flag driven—no global
        mutable state is persisted remotely.
      </p>

      <section id="env" className="mt-8">
        <h2 className="text-xl font-semibold">Environment Variables</h2>
        <p className="mt-2 text-sm text-gray-300">
          Only one required variable for normal operation:
        </p>
        <ul className="mt-3 list-disc list-inside text-sm text-gray-300">
          <li>
            <code className="text-primary">OPENROUTER_API_KEY</code> — used to route requests
            through OpenRouter across free/open models.
          </li>
        </ul>
        <div className="mt-4">
          <CodeBlock language="bash" title="Environment" code={`export OPENROUTER_API_KEY="sk-or-..."`} />
        </div>
      </section>

      <section id="models" className="mt-8">
        <h2 className="text-xl font-semibold">Model Defaults</h2>
        <p className="mt-2 text-sm text-gray-300">
          Set a preferred free model to stabilize latency. You can switch any time:
        </p>
        <div className="mt-4">
          <CodeBlock
            language="bash"
            title="Models"
            code={`vibe model list
vibe model use z-ai/glm-4.5-air:free`}
          />
        </div>
      </section>

      <section id="format" className="mt-8">
        <h2 className="text-xl font-semibold">Output Formatting</h2>
        <p className="mt-2 text-sm text-gray-300">
          Planned flags (future roadmap) will allow customizing diff style, code fence usage, and
          colorization. Current version uses unified diff for edits and plain text for summaries.
        </p>
        <div className="mt-4">
          <CodeBlock
            language="bash"
            title="Future"
            code={`# Example (future)
vibe generate "utility to flatten nested arrays" --format markdown`}
          />
        </div>
      </section>

      <section id="override" className="mt-8">
        <h2 className="text-xl font-semibold">Temporary Overrides</h2>
        <p className="mt-2 text-sm text-gray-300">
          Pass inline flags for one-off tasks without changing global defaults:
        </p>
        <div className="mt-4">
          <CodeBlock
            language="bash"
            title="Overrides"
            code={`vibe agent "generate integration tests" --max-steps 4 --model z-ai/glm-4.5-air:free`}
          />
        </div>
      </section>
    </main>
  );
}
