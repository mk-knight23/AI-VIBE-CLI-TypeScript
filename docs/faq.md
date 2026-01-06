# Frequently Asked Questions

## Getting Started

### What is Vibe CLI?

Vibe CLI is a terminal-based AI coding assistant that helps you build faster with AI assistance. It supports multiple providers, dozens of models, and is completely free to use.

### How do I install Vibe CLI?

You can install Vibe CLI via curl script (macOS/Linux), npm, Homebrew, or download the Windows executable. See our [Installation](/docs/installation.md) page for detailed instructions.

### Do I need an account to use Vibe CLI?

No, Vibe CLI works completely locally without requiring any account registration. Just install and start using it immediately.

## Security & Privacy

### Is my code safe with Vibe CLI?

Yes, your code is completely safe. Vibe CLI processes everything locally and only sends prompts to AI providers when you explicitly request assistance. Your code never leaves your machine unless you choose to share it.

### What data does Vibe CLI collect?

Vibe CLI collects no personal data or telemetry. All processing happens locally on your machine, ensuring complete privacy.

### Can I use Vibe CLI offline?

Vibe CLI requires internet connection only when making AI requests. All file operations, code analysis, and local features work completely offline.

## Usage & Features

### Which programming languages are supported?

Vibe CLI supports all major programming languages including JavaScript, TypeScript, Python, Go, Rust, Java, C++, and many more. The AI models are trained on diverse codebases.

### How does the defensive workflow work?

The defensive workflow ensures safe code modifications by creating backups, validating changes, and providing rollback options. It prevents accidental overwrites and maintains code integrity.

### Can I customize Vibe CLI's behavior?

Yes, Vibe CLI offers extensive customization through configuration files, environment variables, and command-line flags. You can customize AI providers, models, and workflow preferences.

## Technical

### What models does Vibe CLI use?

Vibe CLI supports 40+ models across multiple providers including OpenRouter (GPT-4, Claude, Gemini), MegaLLM (Llama, DeepSeek), AgentRouter (Claude variants), and Routeway (specialized models).

### How do I update Vibe CLI?

Run `vibe update` to check for and install the latest version. You can also reinstall using your original installation method (npm, brew, etc.).

### Is Vibe CLI open source?

Yes, Vibe CLI is open source under the MIT license. You can find the source code, contribute, and report issues on our [GitHub repository](https://github.com/mk-knight23/VIBE-CLI).

## Pricing & Future

### Is Vibe CLI really free?

Yes, Vibe CLI is completely free and will remain free forever. We believe in making AI-powered development accessible to everyone.

### What are the future plans for Vibe CLI?

We're continuously adding new features, models, and providers. Upcoming features include enhanced memory systems, better code analysis, and expanded language support.

## Troubleshooting

### Installation Issues

If the install script fails:
1. Ensure you have curl installed: `which curl`
2. Check your internet connection
3. Try downloading the script first: `curl -fsSL -o install.sh <url>`, then run: `bash install.sh`

### Provider Configuration

If AI requests fail:
1. Verify your API key is set correctly
2. Check provider status (may be experiencing outages)
3. Try a different provider or model

### Performance Issues

If Vibe feels slow:
1. Use local providers (Ollama) for faster responses
2. Check your network connection
3. Reduce response verbosity in settings

## Still have questions?

- [GitHub Discussions](https://github.com/mk-knight23/VIBE-CLI/discussions) - Community support
- [GitHub Issues](https://github.com/mk-knight23/VIBE-CLI/issues) - Report bugs
