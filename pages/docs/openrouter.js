import CodeBlock from '../../components/CodeBlock';

export default function OpenRouter() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">OpenRouter Integration</h1>
      <p className="mt-4 text-sm text-gray-300">
        Vibe relies on OpenRouter for multi-provider access to free / open models.
        Your API key is never transmitted to third parties—only used in server-side calls.
      </p>
      <h2 id="default-model" className="mt-8 text-xl font-semibold">Default Model</h2>
      <div className="mt-3">
        <CodeBlock
          language="bash"
          title="Model Default"
          code={`# Current default (can change over time)
vibe model list
vibe model use z-ai/glm-4.5-air:free`}
        />
      </div>
      <h2 id="environment-setup" className="mt-8 text-xl font-semibold">Environment Setup</h2>
      <div className="mt-3">
        <CodeBlock
          language="bash"
          title="Environment"
          code={`export OPENROUTER_API_KEY="sk-or-..."`}
        />
      </div>
      <p className="mt-3 text-xs text-gray-400">
        Only free models are surfaced by default. Upgrade path: still BYO key, optionally
        extend index to paid models (future feature gate).
      </p>
    </main>
  );
}
