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

Install (Recommended: Prebuilt binaries)
- macOS/Linux quick install (auto-detects latest version):
  - curl -fsSL https://raw.githubusercontent.com/mk-knight23/vibe-cli/main/install.sh | bash
- Pin to a version:
  - VERSION=v1.0.3 curl -fsSL https://raw.githubusercontent.com/mk-knight23/vibe-cli/main/install.sh | bash
- Windows: download the latest Release asset `vibe-win-x64.exe`, add to PATH as `vibe`

Install (Alternative: GitHub via npm)
- Global (from GitHub): npm i -g github:mk-knight23/vibe-cli#v1.0.3
- One-off run: npx github:mk-knight23/vibe-cli#v1.0.3



Usage

V2 quick start
- Set OpenRouter key: vibe config set openrouter.apiKey sk-or-...
- Default model (auto): z-ai/glm-4.5-air:free
- Try: vibe chat "Hello from GLM-4.5-Air!"
- Switch: vibe model use tng/deepseek-r1t2-chimera:free

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

V2 Commands
- vibe plan "add login"
- vibe fix
- vibe test
- vibe run --yolo
- vibe agent start
- vibe model list / use <model>
- vibe theme set light
- vibe cost
- vibe resume
- vibe view ui.png
- vibe plugin install git
- vibe config set openrouter.apiKey sk-or-...

Notes
- Default model: `z-ai/glm-4.5-air:free`
- Only free models are selectable; rate-limit rotation among top free models is automatic
- Disable banner: set `VIBE_NO_BANNER=1`
- The CLI never exposes your API key; it reads from environment or prompts you

Troubleshooting
- Ensure Node.js v18+
- ENOTDIR during global install: remove stale global folder/file, then reinstall
  - npm uninstall -g vibe-cli
  - rm -f $(npm root -g)/vibe-cli
  - npm i -g github:mk-knight23/vibe-cli#v1.0.3
- If ESM/CJS import errors, update Node and reinstall
- If editor prompts fail, configure $EDITOR or use single-line input

Development
- Link for local testing: `npm link` then run `vibe`
- Pack to preview publish contents: `npm pack`

License
MIT

Repository
https://github.com/mk-knight23/vibe-cli
# vibe-cli
