# Plugin Security Guide

## Overview

VIBE CLI plugins run in a security-restricted environment. All plugins must declare their required permissions and be signed before they can be loaded.

## Permission System

Plugins must declare all required permissions in their `vibe.json` manifest:

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "permissions": {
    "filesystem": {
      "read": ["*.txt", "data/**/*.json"],
      "write": ["output/*.txt"]
    },
    "network": {
      "allowed": ["api.example.com"]
    },
    "commands": {
      "allowed": ["npm", "git"],
      "blocked": ["rm", "sudo"]
    },
    "system": {
      "env": false,
      "subprocess": true
    },
    "vibe": {
      "config": "read",
      "commands": true,
      "database": false
    }
  }
}
```

## Permission Types

### Filesystem

Controls which files the plugin can access:

```typescript
{
  "filesystem": {
    "read": ["*.txt", "data/**"],     // Allowed read paths (relative)
    "write": ["output/**"]              // Allowed write paths
  }
}
```

**Rules:**
- All paths must be relative (no absolute paths)
- Path traversal with `..` is rejected
- Write permissions require read permissions
- Glob patterns are supported
- Paths are resolved relative to plugin directory

### Network

Controls network access:

```typescript
{
  "network": {
    "allowed": ["api.example.com", "*.github.com"]  // Allow only these domains
    // OR
    "blocked": ["malicious.com"]                   // Block specific domains
  }
}
```

**Rules:**
- Cannot specify both `allowed` and `blocked`
- Use `allowed` for whitelist mode
- Use `blocked` for blacklist mode (not recommended)

### Commands

Controls which commands can be executed:

```typescript
{
  "commands": {
    "allowed": ["npm", "git", "node"],    // Whitelisted commands
    "blocked": ["rm", "sudo", "chmod"]   // Blacklisted commands
  }
}
```

**Rules:**
- Dangerous commands (`rm`, `dd`, `sudo`, etc.) are always blocked
- Must explicitly block dangerous commands if using whitelist

### System

Controls system-level access:

```typescript
{
  "system": {
    "env": false,           // Access to environment variables
    "subprocess": true       // Spawn child processes
  }
}
```

**Rules:**
- `env: false` = no access to process.env
- `subprocess: false` = cannot spawn child processes

### VIBE API

Controls access to VIBE internals:

```typescript
{
  "vibe": {
    "config": "read",      // "read" | "write" | "none"
    "commands": true,        // Can register new commands
    "database": false        // Can access VIBE database
  }
}
```

## Signing Plugins

All plugins must be signed before distribution:

```bash
# 1. Create signature
vibe plugin sign ./my-plugin

# 2. Signature includes:
#    - SHA256 hash of manifest
#    - Timestamp
#    - Signer identity
#    - Algorithm identifier
```

### Signature Format

The `signature.json` file is created in the plugin directory:

```json
{
  "algorithm": "sha256",
  "signature": "abc123...",
  "timestamp": 1234567890,
  "signer": "plugin-author@example.com"
}
```

### Development Mode

For local development, you can disable signature checking:

```bash
export VIBE_ALLOW_UNSIGNED_PLUGINS=true
vibe install ./my-plugin
```

**⚠️ WARNING:** Never use this in production!

## Security Best Practices

1. **Principle of Least Privilege**
   - Only request permissions you actually need
   - Use specific paths instead of wildcards
   - Avoid write permissions when possible

2. **Path Validation**
   - Never trust user input for file paths
   - Always resolve and validate paths
   - Check permissions before every operation

3. **Network Security**
   - Use HTTPS only
   - Validate all network responses
   - Implement timeouts for requests

4. **Code Signing**
   - Protect your private signing keys
   - Never share signature.json files
   - Revoke signatures for compromised plugins

## Security Violations

If a plugin violates security policies:

```typescript
// Permission denied
Error: Permission denied: Cannot read /etc/passwd

// Signature verification failed
Error: Signature verification failed: Plugin signature not found

// Invalid permissions
Error: Invalid permissions: Path permissions must be relative
```

The plugin will be rejected and will not load.

## Future Enhancements

Planned security improvements:

- [ ] Integration with isolated-vm for true process isolation
- [ ] Resource quotas (CPU, memory, network)
- [ ] AppArmor/seccomp profiles on Linux
- [ ] WebAssembly (WASM) sandbox for plugins
- [ ] Plugin reputation and trust scores

## Reporting Security Issues

If you find a security vulnerability in the plugin system:

1. DO NOT open a public issue
2. Email: security@vibe-cli.dev
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Impact assessment
   - Suggested fix

We will respond within 48 hours.
