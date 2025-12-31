# VIBE CLI v10.x - Compatibility Contract

**Effective:** v10.0.0 → v10.1.0 and beyond  
**Policy:** ZERO breaking changes, FOREVER backward compatibility

---

## Compatibility Guarantee

This document defines the immutable contract for VIBE CLI v10.x releases. Any violation of this contract constitutes a breaking change and requires a major version bump (v11.0.0).

### Core Principle
> All existing commands, flags, configuration keys, and behaviors MUST continue to work exactly as they did in v10.0.0, even if new features are added.

---

## Commands (Must Remain Unchanged)

### Entry Points
```
vibe                          ✅ MUST work (interactive mode)
vibe --version, -v            ✅ MUST output version
vibe --help, -h               ✅ MUST show help
```

### Headless Mode
```
vibe -p "prompt"              ✅ MUST work (ask mode)
vibe ask "prompt"             ✅ MUST work (alias)
vibe cmd <name>               ✅ MUST work (custom commands)
vibe batch <file>             ✅ MUST work (batch mode)
```

### Provider Commands
```
vibe connect <provider>       ✅ MUST work
vibe providers                ✅ MUST work
vibe models                   ✅ MUST work
vibe models --local           ✅ MUST work
vibe models --cheap           ✅ MUST work
vibe models --fast            ✅ MUST work
vibe models --free            ✅ MUST work
```

### Agent Commands
```
vibe agents                   ✅ MUST work
vibe plan <goal>              ✅ MUST work
vibe research <topic>         ✅ MUST work
vibe analyze <topic>          ✅ MUST work
vibe build <task>             ✅ MUST work
vibe review <topic>           ✅ MUST work
vibe audit                    ✅ MUST work
```

### Session Commands
```
vibe sessions                 ✅ MUST work
vibe sessions new             ✅ MUST work
vibe sessions list            ✅ MUST work
vibe sessions share           ✅ MUST work
```

### Configuration Commands
```
vibe config get <key>         ✅ MUST work
vibe config set <key> <val>   ✅ MUST work
vibe doctor                   ✅ MUST work
vibe privacy                  ✅ MUST work
vibe lsp                      ✅ MUST work
```

### Workflow Commands
```
vibe workflow                 ✅ MUST work
vibe memory                   ✅ MUST work
vibe output                   ✅ MUST work
vibe rules                    ✅ MUST work
vibe pipeline                 ✅ MUST work
vibe steering                 ✅ MUST work
vibe hooks                    ✅ MUST work
```

---

## Flags (Must Remain Unchanged)

### Global Flags
```
--help, -h                    ✅ MUST show help
--version, -v                 ✅ MUST show version
--verbose, -V                 ✅ MUST enable verbose output
--quiet, -q                   ✅ MUST suppress output
--config <path>               ✅ MUST load config from path
```

### Headless Mode Flags
```
--prompt, -p <text>           ✅ MUST accept prompt
--model, -m <model>           ✅ MUST select model
--provider <name>             ✅ MUST select provider
--json                        ✅ MUST output JSON
--auto-approve                ✅ MUST work (deprecated, use --allow-tools)
```

### New Flags (v10.1.0+)
```
--allow-tools                 ✅ NEW (safe default: tools OFF)
--dangerously-skip-permissions ✅ NEW (YOLO mode)
--dangerously-allow-write     ✅ NEW (YOLO mode)
--dangerously-allow-shell     ✅ NEW (YOLO mode)
```

**Backward Compatibility Note:** `--auto-approve` still works but is deprecated. It maps to `--allow-tools` internally.

---

## Configuration Keys (Must Preserve Forever)

### Top-Level Keys
```
$schema                       ✅ MUST be preserved
provider                      ✅ MUST be preserved
model                         ✅ MUST be preserved
routing                       ✅ MUST be preserved
apiKey                        ✅ MUST be preserved (legacy)
temperature                   ✅ MUST be preserved (legacy)
maxTokens                     ✅ MUST be preserved (legacy)
outputFormat                  ✅ MUST be preserved (legacy)
sessionDir                    ✅ MUST be preserved (legacy)
verbose                       ✅ MUST be preserved (legacy)
```

### Provider Configuration Keys
```
provider.openai.apiKey        ✅ MUST be preserved
provider.openai.model         ✅ MUST be preserved
provider.anthropic.apiKey     ✅ MUST be preserved
provider.anthropic.model      ✅ MUST be preserved
provider.google.apiKey        ✅ MUST be preserved
provider.google.model         ✅ MUST be preserved
provider.[custom].baseURL     ✅ MUST be preserved
provider.[custom].apiKey      ✅ MUST be preserved
provider.[custom].models      ✅ MUST be preserved
```

### Routing Configuration Keys
```
routing.code                  ✅ MUST be preserved
routing.chat                  ✅ MUST be preserved
routing.cheap                 ✅ MUST be preserved
routing.reasoning             ✅ MUST be preserved
```

### New Configuration Keys (v10.1.0+)
```
featureFlags.*                ✅ NEW (optional, feature gates)
permissions.*                 ✅ NEW (optional, permission rules)
checkpoints.*                 ✅ NEW (optional, checkpoint config)
projectRules.*                ✅ NEW (optional, project rules)
projectMemory.*               ✅ NEW (optional, memory config)
```

**Migration Strategy:** Old keys are read and automatically migrated to new structure with deprecation warnings.

---

## Environment Variables (Must Preserve Forever)

```
OPENAI_API_KEY                ✅ MUST be supported
ANTHROPIC_API_KEY             ✅ MUST be supported
GOOGLE_API_KEY                ✅ MUST be supported
VIBE_CONFIG                   ✅ MUST be supported
VIBE_SESSION_DIR              ✅ MUST be supported
VIBE_PRIVACY_LOCAL_ONLY       ✅ MUST be supported
```

---

## Output Formats (Must Remain Unchanged)

### Default Output (Interactive)
```
✅ MUST display banner with version
✅ MUST show project context (languages, steering, agents)
✅ MUST display status line with model/session/tools
✅ MUST show help hint (/help commands • ctrl+t tangent • @workspace context)
```

### Headless Output (vibe -p)
```
✅ MUST output response text by default
✅ MUST support --json for structured output
✅ MUST support --quiet for minimal output
✅ MUST support --verbose for detailed output
```

### JSON Output Format
```json
{
  "success": boolean,
  "response": string,
  "tokens": { "input": number, "output": number },
  "model": string,
  "provider": string,
  "toolCalls": array,
  "duration": number
}
```

---

## Tools (Must Remain Unchanged)

### Filesystem Tools (10)
```
list_directory                ✅ MUST work
read_file                     ✅ MUST work
write_file                    ✅ MUST work
glob                          ✅ MUST work
search_file_content           ✅ MUST work
replace                       ✅ MUST work
create_directory              ✅ MUST work
delete_file                   ✅ MUST work
move_file                     ✅ MUST work
copy_file                     ✅ MUST work
append_to_file                ✅ MUST work
get_file_info                 ✅ MUST work
list_files_rg                 ✅ MUST work
```

### Shell Tools (1)
```
run_shell_command             ✅ MUST work
```

### Git Tools (4)
```
git_status                    ✅ MUST work
git_diff                      ✅ MUST work
git_log                       ✅ MUST work
git_blame                     ✅ MUST work
```

### Web Tools (2)
```
web_fetch                     ✅ MUST work
google_web_search             ✅ MUST work
```

### Memory Tools (2)
```
save_memory                   ✅ MUST work
write_todos                   ✅ MUST work
```

### Project Tools (5)
```
check_dependency              ✅ MUST work
get_project_info              ✅ MUST work
run_tests                     ✅ MUST work
run_lint                      ✅ MUST work
run_typecheck                 ✅ MUST work
```

### Analysis Tools (6)
```
analyze_code_quality          ✅ MUST work
smart_refactor                ✅ MUST work
generate_tests                ✅ MUST work
optimize_bundle               ✅ MUST work
security_scan                 ✅ MUST work
performance_benchmark         ✅ MUST work
generate_documentation        ✅ MUST work
migrate_code                  ✅ MUST work
```

### LSP Tools (1)
```
get_diagnostics               ✅ MUST work
```

---

## Providers (Must Remain Unchanged)

### Supported Providers (20+)
```
openai                        ✅ MUST work
anthropic                     ✅ MUST work
google                        ✅ MUST work
openrouter                    ✅ MUST work
groq                          ✅ MUST work
deepseek                      ✅ MUST work
together                      ✅ MUST work
fireworks                     ✅ MUST work
mistral                       ✅ MUST work
xai                           ✅ MUST work
perplexity                    ✅ MUST work
azure                         ✅ MUST work
bedrock                       ✅ MUST work
vertex                        ✅ MUST work
ollama                        ✅ MUST work
lm-studio                     ✅ MUST work
vllm                          ✅ MUST work
agentrouter                   ✅ MUST work
megallm                       ✅ MUST work
routeway                      ✅ MUST work
```

**Removal Policy:** Providers can NEVER be removed. If a provider becomes obsolete, it must be marked as deprecated but continue to function.

---

## Storage & Database (Must Remain Unchanged)

### Database Location
```
.vibe/store.db                ✅ MUST be at this location
```

### Database Schema
```sql
CREATE TABLE sessions (...)   ✅ MUST exist
CREATE TABLE messages (...)   ✅ MUST exist
CREATE TABLE summaries (...) ✅ MUST exist
CREATE TABLE permissions (...) ✅ MUST exist
```

**Schema Evolution:** New tables can be added, but existing tables and columns MUST NOT be removed or renamed.

### Session Storage
```
✅ MUST support createSession()
✅ MUST support getSession()
✅ MUST support listSessions()
✅ MUST support deleteSession()
✅ MUST preserve session metadata (name, created_at, model, provider)
```

---

## Permissions System (Must Remain Unchanged)

### Permission Levels
```
'ask'           ✅ MUST work (prompt user)
'allow_once'    ✅ MUST work (allow once)
'allow_session' ✅ MUST work (allow for session)
'deny'          ✅ MUST work (block operation)
```

### Permission Functions
```
getPermission()               ✅ MUST work
setPermission()               ✅ MUST work
shouldPrompt()                ✅ MUST work
isDenied()                    ✅ MUST work
isAllowed()                   ✅ MUST work
```

### Default Rules
```
Read-only tools: 'allow_session'  ✅ MUST be default
Write tools: 'ask'                ✅ MUST be default
Shell commands: 'ask'             ✅ MUST be default
Sensitive paths: always 'ask'     ✅ MUST be enforced
```

---

## Slash Commands (Must Remain Unchanged)

### Core Commands
```
/help                         ✅ MUST work
/exit, /quit                  ✅ MUST work
/clear                        ✅ MUST work
```

### New Slash Commands (v10.1.0+)
```
/session [new|list|switch|delete|rename]  ✅ NEW
/diff [show|apply|revert]                 ✅ NEW
/mode [ask|debug|architect|orchestrator]  ✅ NEW
/context [show|clear|steering]            ✅ NEW
/cmd [list|new|delete|show]               ✅ NEW
/approve [list|all|<n>|deny]              ✅ NEW
/audit [stats|recent|export]              ✅ NEW
/bug                                      ✅ NEW
```

---

## Deprecation Policy

### Deprecated Features (Still Supported)
```
--auto-approve                → Use --allow-tools instead
/t (alias for tools)          → Use /tl or /tools instead
/scan (alias for analyze)     → Use /az or /analyze instead
```

### Deprecation Warnings
```
✅ MUST display warning when deprecated feature is used
✅ MUST continue to work (no breaking change)
✅ MUST suggest replacement in warning message
```

### Removal Timeline
- **v10.x:** Deprecated features work with warnings
- **v11.0:** Deprecated features can be removed (major version bump)

---

## Testing Requirements

### Regression Tests (Must Pass)
```
✅ All existing commands must pass tests
✅ All existing flags must pass tests
✅ All existing config keys must pass tests
✅ All existing tools must pass tests
✅ All existing providers must pass tests
✅ All existing permissions must pass tests
```

### Compatibility Test File
```
tests/compatibility-contract.test.ts
- 15+ tests covering all compatibility requirements
- Must pass before any release
```

### Test Execution
```bash
npm run test:compatibility    → Run compatibility tests only
npm test                      → Run all tests (includes compatibility)
```

---

## Breaking Changes (Prohibited)

### Absolute Prohibitions
```
❌ CANNOT remove existing commands
❌ CANNOT remove existing flags
❌ CANNOT remove existing config keys
❌ CANNOT remove existing tools
❌ CANNOT remove existing providers
❌ CANNOT change command behavior
❌ CANNOT change flag behavior
❌ CANNOT change output format (without --format flag)
❌ CANNOT change database schema (remove/rename columns)
❌ CANNOT change permission defaults
```

### What CAN Change
```
✅ CAN add new commands
✅ CAN add new flags
✅ CAN add new config keys
✅ CAN add new tools
✅ CAN add new providers
✅ CAN add new output formats (with explicit flag)
✅ CAN add new database tables
✅ CAN add new permission rules
✅ CAN improve performance
✅ CAN fix bugs
✅ CAN add features behind feature flags
```

---

## Migration Strategy

### Config Key Migration
```typescript
// Old key → New key mapping
const migrations = {
  'apiKey': 'provider.openai.apiKey',
  'temperature': 'provider.openai.temperature',
  'maxTokens': 'provider.openai.maxTokens'
};

// On load:
if (config.apiKey) {
  console.warn('⚠️  Deprecated: apiKey → provider.openai.apiKey');
  config.provider.openai.apiKey = config.apiKey;
  delete config.apiKey;
}
```

### Flag Migration
```typescript
// Old flag → New flag mapping
if (args.includes('--auto-approve')) {
  console.warn('⚠️  Deprecated: --auto-approve → --allow-tools');
  args = args.replace('--auto-approve', '--allow-tools');
}
```

### Command Alias Migration
```typescript
// Old alias → New command mapping
const aliases = {
  '/t': '/tl',      // tools
  '/scan': '/az'    // analyze
};

// On command parse:
if (command in aliases) {
  console.warn(`⚠️  Deprecated: ${command} → ${aliases[command]}`);
  command = aliases[command];
}
```

---

## Release Checklist

Before releasing any v10.x version:

- [ ] All compatibility tests pass
- [ ] No breaking changes to commands
- [ ] No breaking changes to flags
- [ ] No breaking changes to config keys
- [ ] No breaking changes to tools
- [ ] No breaking changes to providers
- [ ] No breaking changes to output format
- [ ] No breaking changes to database schema
- [ ] Deprecation warnings added for any deprecated features
- [ ] Migration code added for config changes
- [ ] CHANGELOG.md updated with migration notes
- [ ] README.md updated with new features
- [ ] Version bumped in package.json
- [ ] Git tag created (v10.x.x)
- [ ] NPM package published

---

## Violation Reporting

If a breaking change is discovered:

1. **Immediately** revert the change
2. **Document** the breaking change in CHANGELOG.md
3. **Plan** a major version bump (v11.0.0)
4. **Notify** users of the breaking change
5. **Provide** migration guide in documentation

---

## Signature

**Contract Effective Date:** 2025-12-30  
**Maintained By:** VIBE Team  
**Last Updated:** 2025-12-30  
**Status:** ACTIVE

This contract is binding for all v10.x releases and supersedes any previous compatibility policies.
