# Vibe CLI by mk-knight23

CLI to chat with OpenRouter free models with Claude Code–style productivity features.
Hello
Features
- Uses OpenRouter free models only
- Concise, defensive-security assistant
- Commands work with or without leading slash
- Web search (DuckDuckGo Instant Answer) and OpenRouter docs snippets
- Run shell commands and inject output
- Read, write, edit, append, move, and delete files
- Inject file contents via glob with size caps
- Save transcripts to `transcripts/`

Install (Option A: GitHub, no npm account)
- Global (from GitHub): `npm i -g github:mk-knight23/vibe-cli`
- One-off run: `npx github:mk-knight23/vibe-cli`

Install (Option B: Prebuilt binaries via Releases)
- macOS/Linux quick install:
  - `curl -fsSL https://raw.githubusercontent.com/mk-knight23/vibe-cli/main/install.sh | bash`
- Windows: download the latest Release asset `vibe-win-x64.exe` and run it



Usage

Smoke test
- Ensure OPENROUTER_API_KEY is set, then: `npm run smoke`
- Prints a short assistant reply snippet

- Set your API key (recommended):
  - macOS/Linux: `export OPENROUTER_API_KEY="sk-or-..."`
  - Windows PowerShell: `setx OPENROUTER_API_KEY "sk-or-..."` (restart terminal)
- Run:
  - If installed globally: `vibe`
  - From source: `npm start`
- Type `help` inside the chat for a full command list

Commands (examples)
- help
- models / model
- system
- clear
- save chat1
- search quick-start
- docs api-reference
- run node -v
- open pages/**/*.js
- files
- write README2.md
- edit README.md
- append README.md
- move README2.md docs/README2.md
- delete docs/README2.md
- multiline
- exit

Notes
- Default model: `z-ai/glm-4.5-air:free`
- Only free models are selectable; if none are available the CLI will fallback to the default ID
- The CLI never exposes your API key; it reads from environment or prompts you

Troubleshooting
- Ensure Node.js v14+ (v18+ recommended)
- If you see ESM/CJS import errors, update Node and reinstall dependencies
- If the editor prompts for `/system` or `/multiline` fail, configure `$EDITOR` or use single-line input

Development
- Link for local testing: `npm link` then run `vibe`
- Pack to preview publish contents: `npm pack`

License
MIT

Repository
https://github.com/mk-knight23/vibe-cli
# vibe-cli
