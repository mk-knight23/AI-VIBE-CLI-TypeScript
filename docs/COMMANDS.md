# AI-VIBE-CLI - Commands Guide
## CLI Commands Reference

---

## Table of Contents

1. [Core Commands](#core-commands)
2. [Chat Commands](#chat-commands)
3. [Edit Commands](#edit-commands)
4. [Utility Commands](#utility-commands)
5. [Configuration](#configuration)

---

## Core Commands

### Global Options

```bash
vibe [options] <command>

Options:
  -v, --verbose          Verbose output
      --dry-run          Simulate without making changes
  -c, --config <path>    Config file path
  -h, --help             Show help
      --version          Show version
```

### Help

```bash
# Show general help
vibe --help

# Show command-specific help
vibe chat --help
vibe edit --help
```

---

## Chat Commands

### Interactive Chat

```bash
# Start interactive chat session
vibe chat

# Send one-off message
vibe chat "explain this code"

# With context
vibe chat "review this" --context ./src

# Specific model
vibe chat -m claude-3-opus
vibe chat --model gpt-4

# With files
vibe chat "optimize this" --files src/utils.ts,src/helpers.ts
```

### Session Management

```bash
# List sessions
vibe chat --list-sessions

# Resume session
vibe chat --resume <session-id>

# Delete session
vibe chat --delete-session <session-id>

# Export session
vibe chat --export --output chat-history.md
```

---

## Edit Commands

### File Editing

```bash
# Edit single file
vibe edit src/app.ts --instruction "add error handling"

# Edit multiple files
vibe edit "src/**/*.ts" --instruction "convert to async/await"

# Review changes before applying
vibe edit src/app.ts --instruction "refactor" --review

# Preview diff
vibe edit src/app.ts --instruction "update" --diff
```

### Code Generation

```bash
# Generate new file
vibe generate component Button --output src/components/Button.tsx

# Generate tests
vibe generate tests --for src/utils.ts

# Generate documentation
vibe generate docs --for src/

# From template
vibe generate --template nextjs-page --name dashboard
```

---

## Utility Commands

### Project Operations

```bash
# Initialize project
vibe init

# Analyze codebase
vibe analyze

# Find code
vibe find "authentication middleware"

# Explain file
vibe explain src/auth.ts

# Review changes
vibe review
vibe review --since yesterday
vibe review --files src/auth.ts
```

### Git Integration

```bash
# Generate commit message
vibe git-commit

# Review PR
vibe pr-review <pr-number>

# Summarize changes
vibe git-summary

# Fix merge conflict
vibe resolve-conflict
```

### Development

```bash
# Run with AI assistance
vibe run "npm test"

# Debug error
vibe debug "error message"

# Fix lint errors
vibe fix-lint

# Update dependencies
vibe update-deps
```

---

## Configuration

### Config Commands

```bash
# Show current config
vibe config show

# Set value
vibe config set model claude-3-opus
vibe config set apiKey <key>

# Get value
vibe config get model

# Reset to defaults
vibe config reset

# Edit config file
vibe config edit
```

### Environment Variables

```bash
# Vibe CLI respects these environment variables:

VIBE_API_KEY          # Default API key
VIBE_MODEL            # Default model
VIBE_CONFIG_PATH      # Config file location
VIBE_LOG_LEVEL        # Logging level
VIBE_NO_COLOR         # Disable colored output
VIBE_PAGER            # Pager program
```

---

## Command Aliases

```bash
# Quick aliases
v         -> vibe
vchat     -> vibe chat
vedit     -> vibe edit
vg        -> vibe generate
vx        -> vibe explain
```

---

*Commands Guide v2.0 - AI-VIBE-CLI*
