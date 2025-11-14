export default function IDEPlugins() {
  const planned = [
    { name: 'VS Code sidebar', status: 'Planned', note: 'Integrate quick agent triggers & diff previews.' },
    { name: 'JetBrains plugin', status: 'Planned', note: 'Share core slash commands; code context indexing.' },
    { name: 'Plain terminal (bash/zsh/fish)', status: 'Available', note: 'Primary interface; scriptable.' },
  ];
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">IDE Plugins</h1>
      <p className="mt-4 text-sm text-gray-300">
        Vibe focuses first on a terminal‑centric workflow. GUI / IDE integrations will layer atop the same
        agentic primitives exposed in the CLI.
      </p>
      <ul className="mt-6 space-y-3">
        {planned.map(p => (
          <li key={p.name} className="p-3 rounded-md border border-gray-800 bg-black/30">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{p.name}</span>
              <span className={`text-[10px] uppercase tracking-wide ${
                p.status === 'Available' ? 'text-primary' : 'text-gray-500'
              }`}>{p.status}</span>
            </div>
            <p className="mt-1 text-xs text-gray-400">{p.note}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
