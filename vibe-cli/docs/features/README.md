# Features Reference

Complete mapping of VIBE CLI v12 features to the 8 primitives.

## Feature Map

| Feature | Primitive | Description |
|---------|-----------|-------------|
| Natural Language Input | TUI | Interactive terminal interface |
| Intent Classification | PLANNING | Classify user intent |
| Plan Generation | PLANNING | Create execution plans |
| Multi-File Editing | MULTI-EDIT | Atomic file operations |
| Command Execution | EXECUTION | Run shell commands |
| Approval Gates | APPROVAL | Safety checkpoints |
| Memory Persistence | MEMORY | Store decisions |
| State Orchestration | ORCHESTRATION | Workflow management |
| Checkpoints | DETERMINISM | Rollback support |
| LLM Routing | COMPLETION | Provider selection |
| Context Collection | MCP | Gather project context |

## Feature Details

### BUILD Intent

Create new features, modules, or files.

| Capability | Primitive | Example |
|------------|-----------|---------|
| Create files | MULTI-EDIT | `"build auth module"` |
| Scaffold project | MULTI-EDIT | `"create new React app"` |
| Add dependencies | EXECUTION | `"add axios"` |
| Generate boilerplate | MULTI-EDIT | `"create component template"` |

**Workflow:**
1. Intent Router → BUILD
2. PlannerAgent → Create implementation plan
3. MultiEditPrimitive → Create files atomically
4. VibeApprovalManager → Review changes
5. VibeCheckpointSystem → Create checkpoint

### FIX Intent

Debug, repair, or resolve issues.

| Capability | Primitive | Example |
|------------|-----------|---------|
| Find bugs | COMPLETION | `"fix the login bug"` |
| Edit files | MULTI-EDIT | `"rename variable everywhere"` |
| Run tests | EXECUTION | `"run tests"` |
| Auto-fix | MULTI-EDIT | `"eslint --fix"` |

**Workflow:**
1. Intent Router → FIX
2. TestsContextProvider → Get failing tests
3. MultiEditPrimitive → Find and fix issues
4. TestsContextProvider → Verify fixes

### REFACTOR Intent

Restructure code without behavior change.

| Capability | Primitive | Example |
|------------|-----------|---------|
| Rename | MULTI-EDIT | `"rename UserService to AccountService"` |
| Extract | MULTI-EDIT | `"extract validation to hook"` |
| Move | MULTI-EDIT | `"move auth to separate module"` |
| Inline | MULTI-EDIT | `"inline this function"` |

### DEPLOY Intent

Ship code to environments.

| Capability | Primitive | Example |
|------------|-----------|---------|
| Build | EXECUTION | `"build for production"` |
| Deploy | EXECUTION | `"deploy to gcp"` |
| Rollback | DETERMINISM | `"rollback deployment"` |
| Health check | EXECUTION | `"verify deployment"` |

### EXECUTE Intent

Run commands or scripts.

| Capability | Primitive | Example |
|------------|-----------|---------|
| Shell commands | EXECUTION | `"run npm test"` |
| Scripts | EXECUTION | `"execute migration script"` |
| Build commands | EXECUTION | `"compile the project"` |

### REVIEW Intent

Analyze code or provide feedback.

| Capability | Primitive | Example |
|------------|-----------|---------|
| Code review | COMPLETION | `"review this PR"` |
| Security scan | COMPLETION | `"scan for vulnerabilities"` |
| Performance analysis | COMPLETION | `"analyze performance"` |

### RESEARCH Intent

Investigate or explore.

| Capability | Primitive | Example |
|------------|-----------|---------|
| API research | OPENAPI MCP | `"find API endpoints for auth"` |
| Package research | EXECUTION | `"search for React alternatives"` |
| Code exploration | FILESYSTEM MCP | `"show me the project structure"` |

### MEMORY Intent

Store or recall information.

| Capability | Primitive | Example |
|------------|-----------|---------|
| Store decision | MEMORY | `"remember we use Supabase"` |
| Recall decision | MEMORY | `"what did we decide about auth?"` |
| Store rule | MEMORY | `"note that we use Airbnb linting"` |
| Recall rule | MEMORY | `"what are our coding rules?"` |

### UNDO Intent

Rollback changes.

| Capability | Primitive | Example |
|------------|-----------|---------|
| Restore checkpoint | DETERMINISM | `"undo last change"` |
| Revert commit | DETERMINISM | `"undo the last commit"` |
| Restore file | DETERMINISM | `"restore this file"` |

## Primitive Capabilities

### COMPLETION Primitive

| Capability | Description |
|------------|-------------|
| singleComplete | Single LLM call |
| streamComplete | Streaming LLM call |
| routeToProvider | Select best LLM |
| fallback | Retry with fallback |
| tokenCount | Count tokens |

### PLANNING Primitive

| Capability | Description |
|------------|-------------|
| createPlan | Generate execution plan |
| validatePlan | Check plan safety |
| refinePlan | Improve plan |
| executePlan | Run plan steps |

### MULTI-EDIT Primitive

| Capability | Description |
|------------|-------------|
| editAll | Atomic multi-file edit |
| findInFiles | Search across files |
| replaceInFiles | Replace pattern globally |
| applyDiff | Apply unified diff |
| previewEdit | Preview changes |

### EXECUTION Primitive

| Capability | Description |
|------------|-------------|
| run | Execute command |
| runAsync | Execute without waiting |
| stream | Stream output |
| terminate | Kill running process |

### APPROVAL Primitive

| Capability | Description |
|------------|-------------|
| request | Request approval |
| checkPolicy | Check approval policy |
| autoApprove | Auto-approve safe ops |
| getHistory | Get approval history |

### MEMORY Primitive

| Capability | Description |
|------------|-------------|
| remember | Store decision |
| recall | Retrieve decision |
| forget | Remove memory |
| search | Find memories |
| export | Export memory |

### ORCHESTRATION Primitive

| Capability | Description |
|------------|-------------|
| startWorkflow | Begin workflow |
| nextStep | Advance state |
| handleError | Recover from error |
| complete | Finish workflow |
| cancel | Abort workflow |

### DETERMINISM Primitive

| Capability | Description |
|------------|-------------|
| checkpoint | Create checkpoint |
| restore | Restore checkpoint |
| diff | Show changes |
| history | List checkpoints |

## MCP Context Types

| Context | Provider | Contents |
|---------|----------|----------|
| Filesystem | FileSystemContextProvider | Project structure, file tree |
| Git | GitContextProvider | Commits, status, diffs |
| OpenAPI | OpenAPIContextProvider | Endpoints, schemas |
| Tests | TestsContextProvider | Test files, coverage |
| Memory | MemoryContextProvider | Decisions, rules, patterns |
| Infra | InfraContextProvider | Config files, providers |

## Intent Mapping Matrix

| User Input | Intent | Capabilities |
|------------|--------|--------------|
| `"build X"` | BUILD | plan, multi-edit, approve |
| `"create X"` | BUILD | plan, multi-edit, approve |
| `"add X"` | BUILD | plan, multi-edit, approve |
| `"fix X"` | FIX | diagnose, multi-edit, test |
| `"debug X"` | FIX | diagnose, multi-edit |
| `"resolve X"` | FIX | diagnose, multi-edit |
| `"refactor X"` | REFACTOR | plan, multi-edit, test |
| `"rename X"` | REFACTOR | multi-edit, test |
| `"extract X"` | REFACTOR | multi-edit |
| `"deploy X"` | DEPLOY | plan, execute, approve |
| `"ship X"` | DEPLOY | plan, execute, approve |
| `"run X"` | EXECUTE | execute |
| `"execute X"` | EXECUTE | execute |
| `"test X"` | EXECUTE | execute, test |
| `"review X"` | REVIEW | complete, memory |
| `"analyze X"` | REVIEW | complete, mcp |
| `"check X"` | REVIEW | complete, mcp |
| `"research X"` | RESEARCH | mcp, complete |
| `"find X"` | RESEARCH | mcp |
| `"explore X"` | RESEARCH | mcp |
| `"remember X"` | MEMORY | memory |
| `"note X"` | MEMORY | memory |
| `"store X"` | MEMORY | memory |
| `"undo X"` | UNDO | determinism, memory |
| `"rollback X"` | UNDO | determinism |
| `"restore X"` | UNDO | determinism |
