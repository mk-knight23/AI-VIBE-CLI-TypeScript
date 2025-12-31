# Changelog

All notable changes to VIBE CLI will be documented in this file.

## [10.1.0] - 2025-12-30

### 🚀 Feature Release - Claude/Kiro-Level Capabilities

This release adds advanced pipelines, batch processing, enhanced permissions, and new slash commands.

### Added

- **Safe Defaults for Headless Mode**
  - `--allow-tools` flag required to enable tool execution in `vibe ask`
  - `--dangerously-skip-permissions` (or `--yolo`) for bypassing all permission checks
  - Read-only tools auto-approved, write tools require explicit flag
  - Loud warnings when YOLO mode is enabled

- **New Slash Commands**
  - `/session [new|list|switch|delete]` - Manage sessions from interactive mode
  - `/diff [show|apply|revert]` - View and manage file changes
  - `/bug` - Generate bug report template with environment info
  - `/context [show|clear]` - View active steering, rules, and MCP servers
  - `/mode [ask|debug|architect|orchestrator]` - Switch agent modes

- **Batch Mode** - Process multiple prompts from file
  - `vibe batch prompts.txt --parallel --output results`
  - Supports JSON, JSONL, and plain text input
  - Parallel processing with configurable concurrency

- **Pipelines** - Specialized multi-agent workflows
  - `vibe pipeline research` - Multi-source research with synthesis
  - `vibe pipeline analyze` - Data comparison, extraction, matrices
  - `vibe pipeline report` - Structured document generation
  - `vibe pipeline automate` - DevOps, CI/CD, infrastructure tasks

- **Project Rules** - AI behavior rules in `.vibe/rules/*.md`
  - Scope-based rules (code, docs, tests, shell, always)
  - Priority ordering
  - Project and user-level rules

- **Project Memory** - Long-term knowledge persistence
  - Facts, decisions, patterns, preferences
  - Semantic search across memory
  - Auto-learning from conversations

- **Workflow Enhancements**
  - Approval checkpoints with custom messages
  - Parallel step execution
  - Step-level timeout overrides

- **SSE MCP Transport** - HTTP/SSE support for MCP servers
  - Streaming tool execution
  - Progress events

- **Export System** - Multi-format export
  - JSON, Markdown, HTML, CSV, Table formats
  - Session export with metadata

- **Enhanced Permissions**
  - Path-based permissions
  - Sensitive path detection (.env, .ssh, credentials)
  - Batch permission checks

- **Checkpoint System** (NEW)
  - Track file changes before they happen
  - Create named checkpoints with `/diff checkpoint <name>`
  - List checkpoints with `/diff list`
  - Revert to any checkpoint with `/diff revert <id>`
  - Auto-checkpoint after N changes (configurable)

- **Enhanced Audit System** (NEW)
  - `/audit stats` - View session statistics by tool and risk level
  - `/audit recent [n]` - View recent audit entries
  - `/audit export [json|csv]` - Export audit log
  - Singleton audit logger with filtering by tool/risk
  - Session-level statistics tracking

- **Batch Approval System** (NEW)
  - `/approve list` - View pending tool approvals
  - `/approve all` - Approve all pending operations
  - `/approve <n>` - Approve specific operation
  - `/approve deny <n|all>` - Deny operations
  - `--session` flag to grant/deny for entire session

- **Provider Fallback & Rate Limiting** (NEW)
  - Automatic fallback to healthy providers on failure
  - Per-provider rate limit tracking (respects 429 errors)
  - Provider health monitoring with `getProviderHealth()`
  - `noFallback` option to disable automatic fallback
  - `requiredCapabilities` option for capability-based routing
  - Rate-limited providers moved to end of fallback chain

- **Mode System** (NEW)
  - `/mode ask` - Answer questions, no tools unless requested
  - `/mode debug` - Heavy diagnostics, test runner, logs
  - `/mode architect` - Planning/spec-first with constraints
  - `/mode orchestrator` - Multi-step execution with approvals
  - `/mode auto` - Automatic mode detection based on input
  - Per-mode tool restrictions and preferences
  - Mode-specific system prompts
  - `detectMode()` for automatic mode selection

- **Enhanced Steering System** (NEW)
  - Directory-based steering: `.vibe/steering/*.md`
  - Kiro compatibility: `.kiro/steering/` support
  - Global steering: `~/.vibe/steering/`
  - Priority ordering via filename prefixes (01-rules.md, 02-context.md)
  - Merged steering from global + workspace
  - Hooks support: onFileWrite, onSessionStart, etc.
  - `/context steering` - View detailed steering info
  - `getSteeringForPrompt()` - Format steering for system prompt

- **Unified MCP Manager** (NEW)
  - Single interface for stdio and SSE transports
  - `mcpManager.connect()` - Auto-detect transport type
  - `mcpManager.connectAll()` - Connect all configured servers
  - `mcpManager.streamToolCall()` - Streaming tool execution (SSE)
  - Server templates: filesystem, git, fetch, memory
  - Config management: addServer, removeServer
  - Transport-aware tool listing

- **Enhanced Custom Commands** (NEW)
  - `/cmd list` - List all custom commands with categories
  - `/cmd new <name>` - Create new command (--user for global)
  - `/cmd delete <name>` - Delete a command
  - `/cmd show <name>` - Show command details and usage
  - `/cmd <name> [args...]` - Run a custom command
  - Command aliases support
  - Category grouping
  - Caching with 5s TTL for performance
  - Both `$ARG` and `${ARG}` syntax for prompt expansion

- **Unified Diff Output** (NEW)
  - `/diff show <file>` - Show unified diff for specific file
  - `/diff full` - Show full unified diff for all pending changes
  - Color-coded diff output (green=added, red=removed)
  - `getUnifiedDiff()` and `getFullDiff()` functions

- **Compatibility Contract Tests** (NEW)
  - 15 contract tests ensuring v10.x backward compatibility
  - Tests for commands, tools, permissions, storage, MCP, checkpoints
  - Tests for modes, steering, custom commands, security

### Changed

- `--auto-approve` flag deprecated in favor of `--allow-tools` (backward compatible)
- Tools are now OFF by default in headless mode (safe default)
  - Permission listing

### Changed

- Lazy loader extended with new modules
- README updated with comprehensive documentation

### Performance

- CLI cold start: ~113ms (target: <500ms) ✅
- Build size: 3.4MB (target: <5MB) ✅
- Test coverage: 782 tests passing ✅

## [10.0.0] - 2025-12-30

### 🚀 Major Release - Production Hardened

This is a major release with significant new features and improved reliability.

### Added

- **Safe Agent System** - Plan→Propose→Wait→Execute→Verify→Report workflow
  - All write operations require explicit approval
  - Automatic rollback on failure or cancellation
  - Full audit logging of agent actions
  
- **Provider Registry** - 20+ built-in providers with config-driven extensibility
  - OpenAI, Anthropic, Google, DeepSeek, Groq, Together, Fireworks, Mistral, xAI, Perplexity
  - Local providers: Ollama, LM Studio
  - Enterprise: Azure OpenAI, AWS Bedrock (stub), Google Vertex (stub)
  
- **MCP Integration** - Model Context Protocol server support
  - `/mcp init` - Create default MCP config
  - `/mcp connect` - Connect to MCP servers
  - `/mcp tools` - List available tools
  
- **Observability** - Full metrics, tracing, and health monitoring
  - `/status` command for system health
  - Structured logging with execution IDs
  - Agent trace recording
  - Failure classification
  
- **New Commands**
  - `/status` - System status and metrics
  - `/auto` - Autonomous mode (renamed from duplicate `/agent`)

### Changed

- **BREAKING**: `/tools` alias changed from `t` to `tl`
- **BREAKING**: `/analyze` alias changed from `scan` to `az`
- **Security**: Command substitution (`$()` and backticks) now requires approval
- Approval-required patterns checked before allow list for better security

### Fixed

- Duplicate `/agent` command in registry (now `/agent` and `/auto`)
- Alias conflicts between commands
- Command substitution bypass in security validation

### Security

- 543 tests (up from 410)
- Command substitution detection
- Enhanced shell injection prevention
- Audit logging for all agent actions

### Migration from v9

Most users will not need to change anything. If you use these shortcuts:

| Old | New | Alternative |
|-----|-----|-------------|
| `/t` (for tools) | `/tl` | `/tools` |
| `/scan` (for analyze) | `/az` | `/analyze` |

## [9.1.0] - 2025-12-29

### Added
- Production-grade system prompt
- 8-phase state machine for ecosystem upgrades
- Security documentation

### Fixed
- Performance optimizations
- Memory management improvements

## [9.0.0] - 2025-12-15

### Added
- Multi-agent orchestration
- Extended thinking support
- Web search integration
- Plan mode with Mermaid diagrams
- Semantic memory search
- Team collaboration features
