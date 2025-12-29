# Changelog

All notable changes to VIBE CLI will be documented in this file.

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
