# Installation

Choose the fastest method for your platform. All approaches are local & privacy-first.

## Quick Install (macOS / Linux)

```bash
# Auto-detect latest version
curl -fsSL https://raw.githubusercontent.com/mk-knight23/vibe/main/vibe-cli/install.sh | bash

# Install specific version
VERSION=v2.1.8 curl -fsSL https://raw.githubusercontent.com/mk-knight23/vibe/main/vibe-cli/install.sh | bash
```

## Windows Install

Download the release asset: `vibe-win-x64.exe`

Add directory to PATH as 'vibe', then run:

```bash
vibe help
```

**Via package managers:**

```bash
choco install vibe-ai-cli    # Chocolatey
scoop install vibe-ai-cli    # Scoop
```

## Install via npm

```bash
# Global install
npm install -g vibe-ai-cli

# One-off run
npx vibe-ai-cli
```

## Install via Homebrew (macOS/Linux)

```bash
# Add the tap and install
brew tap mk-knight23/tap
brew install vibe-ai-cli
```

## Requirements

- Node.js >= 18.0.0
- TypeScript 5.x
- npm workspaces (for monorepo development)

## Post-Installation

1. Set up your AI provider API key:
   ```bash
   export OPENAI_API_KEY="your-key-here"
   # or
   export ANTHROPIC_API_KEY="your-key-here"
   ```

2. Verify installation:
   ```bash
   vibe --version
   vibe help
   ```

3. Configure providers (optional):
   ```bash
   vibe config set provider openrouter
   ```

## Provider Setup

Vibe CLI supports multiple AI providers. See [Features](/docs/features.md#provider-support) for the full list.

### Local Providers

For offline or local usage:

```bash
# Ollama
vibe config set provider ollama
vibe config set model llama3.1

# Start Ollama first
ollama serve
```
