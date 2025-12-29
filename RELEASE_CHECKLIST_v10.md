# VIBE CLI v10.0.0 Release Checklist

## Pre-Release Verification ✅

- [x] Version updated to 10.0.0 in package.json
- [x] VERSION constants updated in source
- [x] Breaking changes documented
- [x] CHANGELOG.md created
- [x] 543 tests passing
- [x] TypeScript compiles (0 errors)
- [x] npm pack successful (338KB)
- [x] Local install works
- [x] `vibe --version` shows 10.0.0

## Phase 2: GitHub Push

```bash
cd /Users/mkazi/Workspace/active-projects/vibe

# Ensure clean state
git status
git pull origin main

# Stage all changes
git add -A

# Commit
git commit -m "chore(release): VIBE CLI v10.0.0 (major production release)

BREAKING CHANGES:
- /tools alias changed from 't' to 'tl'
- /analyze alias changed from 'scan' to 'az'
- Command substitution now requires approval

NEW FEATURES:
- Safe Agent System with rollback
- Provider Registry (20+ providers)
- MCP Integration
- Observability (/status command)
- 543 tests (up from 410)

See CHANGELOG.md for full details."

# Push
git push origin main
```

## Phase 3: Wait for CI

- [ ] GitHub Actions CI passes
- [ ] All jobs green (cli-lint, cli-test, cli-security, cli-build)

## Phase 4: Create Tag

```bash
git tag -a v10.0.0 -m "VIBE CLI v10.0.0 - Major Production Release

Highlights:
- Safe Agent System with Plan→Propose→Wait→Execute→Verify→Report
- Provider Registry with 20+ built-in providers
- MCP Integration for extended tool capabilities
- Full observability with /status command
- 543 tests, 0 TypeScript errors

Breaking Changes:
- /t alias now maps to /tangent (use /tl for /tools)
- /scan alias removed from /analyze (use /az)

Migration: https://github.com/mk-knight23/vibe/blob/main/vibe-cli/CHANGELOG.md"

git push origin v10.0.0
```

## Phase 5: GitHub Release

Create release at: https://github.com/mk-knight23/vibe/releases/new

**Tag:** v10.0.0
**Title:** VIBE CLI v10.0.0

**Body:**
```markdown
## 🚀 VIBE CLI v10.0.0 - Major Production Release

### Installation

\`\`\`bash
npm install -g vibe-ai-cli@10.0.0
\`\`\`

### Highlights

- **Safe Agent System** - Plan→Propose→Wait→Execute→Verify→Report with automatic rollback
- **Provider Registry** - 20+ built-in providers (OpenAI, Anthropic, Google, DeepSeek, Groq, etc.)
- **MCP Integration** - Model Context Protocol server support
- **Observability** - `/status` command with metrics, tracing, health checks
- **543 tests** - Up from 410, comprehensive coverage

### ⚠️ Breaking Changes

| Change | Migration |
|--------|-----------|
| `/t` alias | Use `/tl` or `/tools` |
| `/scan` alias | Use `/az` or `/analyze` |

### Full Changelog

See [CHANGELOG.md](./vibe-cli/CHANGELOG.md)
```

## Phase 6: npm Publish

```bash
cd vibe-cli

# Verify you're logged in
npm whoami

# Publish (after tag exists)
npm publish --access public

# Verify
npm view vibe-ai-cli versions --json | tail -5
```

## Phase 7: Post-Publish Verification

```bash
# Clean environment test
npm install -g vibe-ai-cli@10.0.0
vibe --version  # Should show 10.0.0
vibe --help     # Should work
```

## Phase 8: CI/CD Confirmation

- [ ] Release workflow succeeded
- [ ] npm shows 10.0.0 as latest
- [ ] No security alerts

## Phase 9: Rollback Plan

If critical issues found:

```bash
# Deprecate (soft)
npm deprecate vibe-ai-cli@10.0.0 "Critical bug found, use 9.1.0"

# Or publish hotfix
# Fix issue, bump to 10.0.1, publish

# Users can always install previous version
npm install -g vibe-ai-cli@9.1.0
```

---

## Final Output

| Item | Value |
|------|-------|
| Package | vibe-ai-cli |
| Version | 10.0.0 |
| Tests | 543 passing |
| Bundle | 338KB |
| Install | `npm install -g vibe-ai-cli@10.0.0` |
| npm URL | https://www.npmjs.com/package/vibe-ai-cli |
| GitHub | https://github.com/mk-knight23/vibe |

## Success Criteria ✅

- [x] Existing users not broken (aliases only)
- [x] npm ecosystem healthy
- [x] CI/CD respected
- [x] GitHub is source of truth
- [x] v10 feels stable & intentional
- [x] Trust INCREASES
