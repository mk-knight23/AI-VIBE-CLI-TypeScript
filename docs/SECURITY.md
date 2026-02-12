# VIBE CLI Security Policy

## Threat Model

### 1. Arbitrary Code Execution
- **Risk**: A malicious prompt or compromise of an LLM provider could lead to the generation of commands that delete system files or exfiltrate credentials.
- **Mitigation**: 
    - **Step Approval**: Every destructive action requires user approval via the `ApprovalPrimitive`.
    - **Workspace Confinement**: Operations are sandboxed to the current working directory unless explicitly configured otherwise.
    - **Guardrails**: Command filtering to block high-risk shell injections and system-level mutations.

### 2. Credential Theft
- **Risk**: Exposure of API keys via logs, environment variables, or CLI tool outputs.
- **Mitigation**:
    - **Sanitized Logging**: The `pino-logger` automatically masks keys and tokens.
    - **Secure Storage**: Credentials are stored in the system keychain via `keytar` where available.
    - **No-Export Policy**: Primitives are forbidden from exporting raw keys to tool outputs.

### 3. Supply Chain Security
- **Risk**: Compromised MCP servers or plugins.
- **Mitigation**:
    - **Manifest Validation**: All plugins require a signed or validated manifest.
    - **Scope Isolation**: MCP tools are restricted to a specific capability set.

## Security Guardrails Implementation

### Workspace Confinement
The CLI implements a `ConfinementMiddleware` that checks all file paths before execution.
1. **Forbidden Paths**: `/etc`, `/var`, `/usr/bin`, `~/.ssh`.
2. **Allowed Paths**: The current workspace root and its subdirectories.

### Output Sanitization
All tool results pass through a Zod-validated contract (Phase 1) that enforces schema compliance and prevents leaky data structures.
