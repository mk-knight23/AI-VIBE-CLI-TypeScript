# AI-VIBE-CLI - Workflows

## Development Workflows

### Workflow 1: Feature Development

**Trigger**: Starting a new feature

**Steps**:
1. Generate feature scaffold
   ```bash
   vibe generate feature user-authentication
   ```

2. Implement core logic
   ```bash
   vibe "create a login function that validates email and password"
   ```

3. Add validation
   ```bash
   vibe "add Zod validation to the login form"
   ```

4. Write tests
   ```bash
   vibe test src/auth/login.ts
   ```

5. Review changes
   ```bash
   vibe review --staged
   ```

6. Commit
   ```bash
   vibe commit
   ```

**Time**: 15-30 minutes
**Success Criteria**: Feature complete with tests

---

### Workflow 2: Code Review

**Trigger**: Before committing code

**Steps**:
1. Review staged changes
   ```bash
   vibe review --staged
   ```

2. Check for security issues
   ```bash
   vibe review --staged --security
   ```

3. Fix any issues
   ```bash
   vibe fix --staged
   ```

4. Generate commit message
   ```bash
   vibe commit --dry-run
   ```

5. Commit if satisfied
   ```bash
   vibe commit
   ```

**Time**: 5-10 minutes
**Success Criteria**: Clean review, no critical issues

---

### Workflow 3: Refactoring

**Trigger**: Improving existing code

**Steps**:
1. Analyze current code
   ```bash
   vibe analyze src/legacy-module.ts
   ```

2. Preview refactoring
   ```bash
   vibe refactor src/legacy-module.ts --to async-await --preview
   ```

3. Apply refactoring
   ```bash
   vibe refactor src/legacy-module.ts --to async-await
   ```

4. Generate missing tests
   ```bash
   vibe test src/legacy-module.ts
   ```

5. Review final result
   ```bash
   vibe review --staged
   ```

**Time**: 20-40 minutes
**Success Criteria**: Code refactored with passing tests

---

### Workflow 4: Documentation

**Trigger**: Adding documentation

**Steps**:
1. Generate JSDoc comments
   ```bash
   vibe doc src/utils/helpers.ts
   ```

2. Create README section
   ```bash
   vibe "write a section explaining the authentication flow" > AUTH.md
   ```

3. Generate API docs
   ```bash
   vibe doc --api src/routes/
   ```

4. Review documentation
   ```bash
   vibe review --staged
   ```

5. Commit
   ```bash
   vibe commit --type docs
   ```

**Time**: 10-20 minutes
**Success Criteria**: Documentation complete and accurate

---

## Git Workflows

### Workflow 5: Commit Generation

**Trigger**: Ready to commit changes

**Steps**:
1. Stage your changes
   ```bash
   git add .
   ```

2. Preview commit message
   ```bash
   vibe commit --dry-run
   ```

3. Commit with AI-generated message
   ```bash
   vibe commit
   ```

4. Alternative: Specify type
   ```bash
   vibe commit --type feat
   ```

**Output Example**:
```
feat(auth): add JWT token validation

- Implement token verification middleware
- Add refresh token rotation
- Handle token expiration gracefully
- Add unit tests for auth flows

Closes #123
```

---

### Workflow 6: Pull Request Creation

**Trigger**: Ready to merge feature branch

**Steps**:
1. Push branch
   ```bash
   git push -u origin feature-branch
   ```

2. Generate PR description
   ```bash
   vibe pr
   ```

3. Review generated description
   ```bash
   vibe pr --dry-run
   ```

4. Create PR
   ```bash
   vibe pr --create
   ```

**Output Example**:
```markdown
## Summary
Implements user authentication with JWT tokens

## Changes
- Add login/logout endpoints
- Implement token validation middleware
- Add password hashing with bcrypt
- Create auth hooks for React components

## Testing
- Unit tests for auth service (95% coverage)
- Integration tests for API endpoints
- E2E tests for login flow

## Screenshots
[Attached]

Closes #123
```

---

### Workflow 7: Batch Refactoring

**Trigger**: Updating multiple files

**Steps**:
1. Create script
   ```bash
   cat > refactor.sh << 'EOF'
   #!/bin/bash
   for file in src/**/*.ts; do
     vibe refactor "$file" --to typescript --preview
   done
   EOF
   ```

2. Preview all changes
   ```bash
   chmod +x refactor.sh
   ./refactor.sh
   ```

3. Apply changes
   ```bash
   for file in src/**/*.ts; do
     vibe refactor "$file" --to typescript
   done
   ```

4. Run tests
   ```bash
   npm test
   ```

5. Review and commit
   ```bash
   vibe review --staged
   vibe commit
   ```

**Time**: 30-60 minutes depending on codebase size

---

## Automation Workflows

### Workflow 8: Pre-commit Hooks

**Setup**:
```bash
# Install husky
npx husky install

# Create pre-commit hook
cat > .husky/pre-commit << 'EOF'
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run Vibe review
vibe review --staged --security

# Run tests
npm test
EOF
```

**Flow**:
1. Developer attempts to commit
2. Pre-commit hook runs `vibe review`
3. If issues found, commit is blocked
4. Developer fixes issues
5. Commit proceeds

---

### Workflow 9: CI/CD Integration

**GitHub Actions Example**:
```yaml
name: Vibe Review

on:
  pull_request:
    branches: [main]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Vibe CLI
        run: npm install -g @vibe/cli

      - name: Configure Vibe
        run: |
          vibe config set apiKeys.anthropic ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Review PR
        run: |
          vibe review --base main --head ${{ github.head_ref }}

      - name: Comment Results
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: 'AI review completed'
            })
```

---

### Workflow 10: Watch Mode Development

**Trigger**: Continuous development

**Setup**:
```bash
# Watch for file changes
vibe watch src/ --command "review --staged"

# Or use with specific files
vibe watch "src/**/*.ts" --on-change "review"
```

**Flow**:
1. Developer saves file
2. Vibe automatically reviews changes
3. Results displayed in terminal
4. Developer fixes issues in real-time

---

## Collaboration Workflows

### Workflow 11: Team Onboarding

**Trigger**: New team member joins

**Steps**:
1. Install CLI
   ```bash
   curl -fsSL https://install.vibe.dev | bash
   ```

2. Configure with team settings
   ```bash
   cp team-vibe-config.json ~/.vibe/config.json
   vibe config set apiKeys.anthropic <key>
   ```

3. Learn commands
   ```bash
   vibe --help
   vibe tutorial
   ```

4. Practice workflow
   ```bash
   cd test-project
   vibe generate component Test
   vibe review --staged
   vibe commit
   ```

---

### Workflow 12: Code Standards Enforcement

**Setup**:
```bash
# Create team standards config
cat > .viberc << 'EOF'
{
  "standards": {
    "maxFunctionLength": 50,
    "preferAsyncAwait": true,
    "requireJSDoc": true,
    "testCoverage": 80
  },
  "reviewRules": {
    "security": true,
    "performance": true,
    "accessibility": true
  }
}
EOF
```

**Flow**:
1. Developer makes changes
2. `vibe review` checks against standards
3. Non-compliant code flagged
4. Developer fixes or overrides with reason

---

## Data Flow Diagrams

### Command Execution Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  User    │───▶│  Parser  │───▶│  Router  │───▶│ Executor │
│ Command  │    │          │    │          │    │          │
└──────────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
                     │               │               │
                     ▼               ▼               ▼
              ┌──────────┐    ┌──────────┐    ┌──────────┐
              │   NLP    │    │   LLM    │    │   File   │
              │ Analysis │    │   API    │    │   Ops    │
              └──────────┘    └──────────┘    └──────────┘
```

### Git Workflow Integration

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│   git    │───▶│  Vibe    │───▶│   LLM    │───▶│  Commit  │
│  stage   │    │  review  │    │ analysis │    │  message │
└──────────┘    └──────────┘    └──────────┘    └────┬─────┘
                                                     │
                                                     ▼
                                              ┌──────────┐
                                              │  git     │
                                              │  commit  │
                                              └──────────┘
```

---

## Workflow Metrics

| Workflow | Target Time | Success Rate |
|----------|-------------|--------------|
| Feature Development | 15-30 min | > 90% |
| Code Review | 5-10 min | > 95% |
| Refactoring | 20-40 min | > 85% |
| Commit Generation | < 1 min | > 99% |
| PR Creation | < 2 min | > 95% |

---

*Workflows v2.0 - AI-VIBE-CLI*
