import CodeBlock from '../../components/CodeBlock';

export default function SecurityPerms() {
  const items = [
    { k: 'Defensive-only assistance', d: 'Hard refusal filters for abusive / exploit crafting patterns.' },
    { k: 'Explicit edit approvals', d: 'No silent writes—multi-file edits require user confirmation.' },
    { k: 'Local privacy', d: 'No remote session logging of code. Sessions stored locally only.' },
    { k: 'Bounded agent tasks', d: '--max-steps flag prevents runaway autonomous loops.' },
    { k: 'No secret exfiltration', d: 'Refuses prompts attempting to enumerate / leak env secrets.' },
  ];
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Security & Permissions</h1>
      <p className="mt-4 text-sm text-gray-300">
        Vibe enforces defensive development principles. It is intentionally constrained to avoid
        misuse while enabling remediation, analysis, and secure refactoring.
      </p>
      <ul className="mt-6 space-y-3">
        {items.map(i => (
          <li key={i.k} className="p-3 rounded-md border border-gray-800 bg-black/30">
            <h3 className="text-sm font-semibold">{i.k}</h3>
            <p className="mt-1 text-xs text-gray-400">{i.d}</p>
          </li>
        ))}
      </ul>
      <h2 id="permission-flow" className="mt-10 text-xl font-semibold">Permission Flow</h2>
      <div className="mt-3">
        <CodeBlock
          language="bash"
          title="Multi-edit Flow"
          code={`# Example multi-edit invocation (dry run first)
vibe edit "src/**/*.js" "convert callbacks to async/await" --dry-run

# Approval prompt appears; confirm to write changes.`}
        />
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Future enhancements: diff risk scoring, dependency impact analysis, and policy mode
        for larger teams (opt-in).
      </p>
    </main>
  );
}
