# User Guide

Welcome to VIBE CLI v12! This guide will help you get the most out of your AI development teammate.

## Getting Started

### Launching VIBE

Simply run:

```bash
vibe
```

This launches the interactive terminal UI (TUI). You'll see:

```
  ╔═══════════════════════════════════════════════════════════╗
  ║  VIBE CLI v12                                             ║
  ║  Your AI Development Teammate                             ║
  ╠═══════════════════════════════════════════════════════════╣
  ║                                                           ║
  ║  Project: my-awesome-project                              ║
  ║  Model: Claude Sonnet 4 (Balanced)                        ║
  ║  Memory: 12 decisions remembered                          ║
  ║                                                           ║
  ╠═══════════════════════════════════════════════════════════╣
  ║  What would you like to do?                              ║
  ║                                                           ║
  ║  > _                                                     ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
```

### Your First Conversation

Just type what you want in natural language. VIBE will understand and act.

## Example Workflows

### Building Features

```
vibe> "build authentication for the API"

🤖 Understanding: BUILD intent → Auth capability
📋 Planning: 5 steps identified

Steps:
1. Create auth middleware
2. Add JWT token generation
3. Implement login/logout endpoints
4. Add password hashing
5. Write auth tests

[A]pprove  [M]odify plan  [C]ancel
> a

✓ Created auth/middleware.ts
✓ Created auth/tokens.ts  
✓ Created auth/routes.ts
✓ Created auth/tests/
✓ All done!
```

### Fixing Issues

```
vibe> "fix the failing tests in auth module"

🔍 Analyzing: auth module test failures

Found: 3 failing tests

1. "should validate token" - Token expired check failed
2. "should reject invalid password" - Hash comparison timing
3. "should refresh token" - Refresh token rotation

Fixing...

✓ Fixed token expiry logic
✓ Fixed timing-safe comparison
✓ Added refresh token rotation

All tests passing! ✅
```

### Deploying

```
vibe> "deploy to gcp"

🚀 Understanding: DEPLOY intent → Infrastructure capability

Current state:
- Branch: feature/auth
- Changes: 12 files modified
- Tests: passing ✅

Options:
1. [D]eploy current branch to staging
2. [P]lan deployment only
3. [C]ancel

> 1

📦 Building container...
🚀 Deploying to GCP...
✓ Deployed to staging.myapp.io

View deployment: https://staging.myapp.io
```

### Using Memory

```
vibe> "remember that we use Supabase for auth"

💾 Storing decision:

"You decided to use Supabase for authentication. 
This means:
- Use @supabase/supabase-js SDK
- RLS policies for row-level security
- Supabase Auth UI components"

✓ Decision saved to .vibe/decisions.json

Future VIBE sessions will remember this!
```

### Undoing Changes

```
vibe> "undo that"

⏪ Undoing last action: "build authentication"

Restoring from checkpoint chk-1702345678-abcd

✓ Restored auth/middleware.ts
✓ Restored auth/tokens.ts
✓ Restored auth/routes.ts

Done! Changes rolled back.
```

## Natural Language Patterns

VIBE understands various ways to express the same intent:

| What You Type | VIBE Understands |
|---------------|------------------|
| `"build auth"` | BUILD intent |
| `"create a new component"` | BUILD intent |
| `"add login functionality"` | BUILD intent |
| `"fix the bug"` | FIX intent |
| `"debug the API"` | FIX intent |
| `"resolve the error"` | FIX intent |
| `"run tests"` | EXECUTE intent |
| `"build the project"` | EXECUTE intent |
| `"deploy to production"` | DEPLOY intent |
| `"ship the feature"` | DEPLOY intent |
| `"remember this"` | MEMORY intent |
| `"note that we decided"` | MEMORY intent |
| `"undo"` | DETERMINISM intent |
| `"rollback"` | DETERMINISM intent |

## Approval Flows

VIBE protects you from dangerous operations:

### Auto-Approved (Safe)

- Running tests
- Reading files
- Building projects
- Code reviews

### Prompt Approval

```
vibe> "delete all log files"

⚠️  This will delete 47 files across 3 directories.

Files to delete:
- logs/development.log (2.3 MB)
- logs/production.log (15.1 MB)
- ...

Options:
  [A]pprove  [R]eview files  [C]ancel

> r

Reviewing files...
[1] logs/development.log
[2] logs/production.log
...

All 47 files reviewed.
[A]pprove all  [S]elect individually  [C]ancel

> a

✓ Deleted 47 log files
```

### Blocked Operations

Some operations require explicit config approval:

```
vibe> "drop the production database"

🚫 BLOCKED: This operation is not allowed by default.

To enable, add to .vibe/config.json:
{
  "approval": {
    "allowDestructive": ["drop-database"]
  }
}
```

## Context Display

The TUI shows relevant context:

```
  ╔═══════════════════════════════════════════════════════════╗
  ║  VIBE CLI v12                                             ║
  ║  Your AI Development Teammate                             ║
  ╠═══════════════════════════════════════════════════════════╣
  ║                                                           ║
  ║  📁 Project: my-awesome-project (TypeScript)              ║
  ║  🌿 Branch: feature/auth (3 commits ahead)               ║
  ║  🤖 Model: Claude Sonnet 4 (Balanced)                     ║
  ║  🧠 Memory: 12 decisions | 5 rules | 3 patterns          ║
  ║  📊 Tests: 234 passing | 2 failing                        ║
  ║  🔧 Provider: Anthropic (primary), OpenAI (fallback)      ║
  ║                                                           ║
  ╠═══════════════════════════════════════════════════════════╣
  ║  What would you like to do?                              ║
  ║                                                           ║
  ║  > _                                                     ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Submit input |
| `↑/↓` | History navigation |
| `Ctrl+C` | Cancel / Exit |
| `Ctrl+L` | Clear screen |
| `Tab` | Autocomplete |

## Tips for Best Results

### 1. Be Specific

```
✅ "add user authentication with JWT tokens"
❌ "add auth"
```

### 2. Provide Context

```
✅ "fix the login bug - users can't log in on mobile"
❌ "fix the bug"
```

### 3. Use Project Memory

```
vibe> "remember that we use Airbnb linting rules"
vibe> "note that React 18 is required"
```

### 4. Review Plans Before Approving

```
vibe> "refactor the entire codebase"

📋 Plan (review before approving):

1. Add ESLint config (safe)
2. Update imports (safe)
3. Refactor components (review each)
4. Update tests (safe)

[A]pprove  [M]odify scope  [C]ancel
```

## Troubleshooting

### "I don't understand"

Try rephrasing with more context:

```
vibe> "do the thing"
🤔 I don't understand. Try:

- "build [feature]"
- "fix [issue]"  
- "deploy to [target]"
- "run [command]"
- "remember [decision]"
```

### Model Selection

If responses aren't satisfactory:

```
vibe> "use reasoning model for this complex logic"

✓ Switched to reasoning model (Claude Opus 4)

... complex task ...

vibe> "switch back to balanced model"

✓ Switched to balanced model (Claude Sonnet 4)
```

### Memory Not Working

Check `.vibe/` directory exists:

```bash
ls -la .vibe/
# Should show: decisions.json rules.json patterns.json
```

## Next Steps

- **[Examples](examples.md)**: Common workflows
- **[Approval Flows](approval.md)**: Understanding safety
- **[Memory System](memory.md)**: Using project memory
- **[Developer Guide](../developer/README.md)**: Extending VIBE
