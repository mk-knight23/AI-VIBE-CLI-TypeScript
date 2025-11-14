import CodeBlock from '../../components/CodeBlock';

export default function CLICommands() {
  const cmds = [
    '/help','/models','/model','/system','/clear','/save [name]','/search <q>','/docs <page>','/run <cmd>','/open <glob>','/files','/write <path>','/edit <path>','/append <path>','/move <src> <dst>','/delete <path|glob>','/multiline','/exit',
    '/generate <prompt>','/complete <file>','/refactor <pattern>','/debug <error|file>','/test <file>','/review <file|git>','/git <commit|status|pr|review>','/agent <task>'
  ];
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">CLI Commands</h1>
      <p className="mt-4 text-sm text-gray-300">
        Vibe adopts a Claude Code–style slash command interface. Commands inject context,
        manage files, or trigger defensive code tooling.
      </p>
      <ul className="mt-6 grid sm:grid-cols-2 gap-2">
        {cmds.map(c => (
          <li key={c} className="text-xs">
            <code className="px-2 py-1 rounded bg-black/40 border border-gray-700">{c}</code>
          </li>
        ))}
      </ul>
      <h2 id="examples" className="mt-8 text-xl font-semibold">Examples</h2>
      <div className="mt-3">
        <CodeBlock
          language="bash"
          title="Sample Slash Commands"
          code={`/search async iterator mdn
/open src/**/*.js
/refactor src/**/*.js
/generate "function to diff two sorted arrays"`}
        />
      </div>
    </main>
  );
}
