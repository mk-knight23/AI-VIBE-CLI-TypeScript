# Architecture Documentation

System design, state machine, and data flow diagrams for VIBE CLI v12.

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            VIBE CLI v12                                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │                     TERMINAL UI (TUI)                             │    │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │    │
│  │   │ Status Bar  │  │ Input Box   │  │ Context Display         │  │    │
│  │   │ Project     │  │ Natural     │  │ Model, Memory, Branch   │  │    │
│  │   │ Model       │  │ Language    │  │                         │  │    │
│  │   └─────────────┘  └─────────────┘  └─────────────────────────┘  │    │
│  └─────────────────────────────┬────────────────────────────────────┘    │
│                                │                                          │
│                    User Input (Natural Language)                         │
│                                │                                          │
│                                ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │                      INTENT ROUTER                                │    │
│  │   ┌──────────────────────────────────────────────────────────┐   │    │
│  │   │  Classify → Map → Clarify (if <60%) → Route             │   │    │
│  │   └──────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────┬────────────────────────────────────┘    │
│                                │                                          │
│                    Intent + Context Request                              │
│                                │                                          │
│                                ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │                   MCP CONTEXT AGGREGATOR                          │    │
│  │                                                                  │    │
│  │   FileSystem  Git  OpenAPI  Tests  Memory  Infra                 │    │
│  │      MCP        MCP    MCP     MCP     MCP    MCP                │    │
│  │                                                                  │    │
│  └─────────────────────────────┬────────────────────────────────────┘    │
│                                │                                          │
│                    Structured Context                                    │
│                                │                                          │
│                                ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │                      ORCHESTRATOR                                 │    │
│  │   ┌──────────────────────────────────────────────────────────┐   │    │
│  │   │ State Machine: IDLE → PLANNING → APPROVAL → EXECUTION    │   │    │
│  │   └──────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────┬────────────────────────────────────┘    │
│                                │                                          │
│                    Orchestrated Operations                               │
│                                │                                          │
│          ┌─────────────────────┼─────────────────────┐                   │
│          ▼                     ▼                     ▼                   │
│  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐              │
│  │ PLANNING      │   │ EXECUTION     │   │ MEMORY        │              │
│  │ PRIMITIVE     │   │ PRIMITIVE     │   │ PRIMITIVE     │              │
│  └───────┬───────┘   └───────┬───────┘   └───────┬───────┘              │
│          │                   │                   │                       │
│          ▼                   ▼                   ▼                       │
│  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐              │
│  │ PlannerAgent  │   │ MultiEdit     │   │ Checkpoint    │              │
│  │ ExecutorAgent │   │ ToolExecutor  │   │ System        │              │
│  │ ReviewerAgent │   │ ShellExecutor │   │ Decisions     │              │
│  └───────┬───────┘   └───────────────┘   └───────────────┘              │
│          │                                                         │
│          └─────────────────────┬─────────────────────────────────┘
│                                │
│                                ▼
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │                    LLM PROVIDER ROUTER                           │    │
│  │                                                                  │    │
│  │   OpenAI  Anthropic  Google  xAI  Local (Ollama)                 │    │
│  │      │        │         │       │        │                        │    │
│  │      └────────┴─────────┴───────┴────────┘                        │    │
│  │                      │                                            │    │
│  │              Model Selection (fast/balanced/reasoning/max)        │    │
│  │                      │                                            │    │
│  └──────────────────────┼────────────────────────────────────────────┘    │
│                         │                                              │
│                         ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │                       APPROVAL MANAGER                            │    │
│  │                                                                  │    │
│  │   Auto-approve  Prompt user  Block (requires config)             │    │
│  │                                                                  │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## State Machine

```
                    ┌─────────────────────────────────────┐
                    │               IDLE                  │
                    │  Waiting for user input             │
                    └──────────────────┬──────────────────┘
                                       │
                              User types input
                                       │
                                       ▼
                    ┌─────────────────────────────────────┐
                    │           CLASSIFY                  │
                    │  Intent Router analyzes input       │
                    └──────────────────┬──────────────────┘
                                       │
                               Intent classified
                                       │
                    ┌──────────────────┴──────────────────┐
                    │                                     │
                    ▼                                     ▼
          ┌─────────────────┐                 ┌─────────────────┐
          │  CLARIFY        │                 │    ROUTE        │
          │  Confidence <   │                 │  Route to agent │
          │  60%            │                 └────────┬────────┘
          └────────┬────────┘                            │
                   │                                     │
            User clarifies                              │
                   │                                     ▼
                   │                    ┌─────────────────────────────────┐
                   │                    │            PLANNING             │
                   │                    │  Agent creates execution plan   │
                   │                    └───────────────┬─────────────────┘
                   │                                    │
                   │                            Plan created
                   │                                    │
                   │                    ┌───────────────┴───────────────┐
                   │                    │                               │
                   │                    ▼                               ▼
                   │          ┌─────────────────┐           ┌─────────────────┐
                   │          │    APPROVE      │           │    MODIFY       │
                   │          │  User reviews   │           │  User refines   │
                   │          │  plan           │           │  plan           │
                   │          └────────┬────────┘           └────────┬────────┘
                   │                   │                               │
                   │            Plan approved                   Plan modified
                   │                   │                               │
                   └───────────────────┴───────────────────────────────┘
                                              │
                                              ▼
                              ┌─────────────────────────────────┐
                              │           EXECUTION             │
                              │  Execute plan steps             │
                              │  - Multi-edit files             │
                              │  - Run commands                 │
                              │  - Create checkpoints           │
                              └───────────────┬─────────────────┘
                                              │
                                        All steps complete
                                              │
                                              ▼
                              ┌─────────────────────────────────┐
                              │            MEMORY               │
                              │  - Store decisions              │
                              │  - Update rules                 │
                              │  - Create checkpoint            │
                              └───────────────┬─────────────────┘
                                              │
                                              ▼
                              ┌─────────────────────────────────┐
                              │             DONE                │
                              │  Return results to user         │
                              └──────────────────┬──────────────┘
                                                 │
                                          User enters new input
                                                 │
                                                 └────────► IDLE
```

## Data Flow

### User Input → Execution

```
1. User Input
   "build auth for the API"
   
2. TUI
   └─> IntentRouter.classify(input)

3. IntentRouter
   └─> Returns: { type: BUILD, confidence: 0.85 }
   
4. TUI (confidence >= 0.6)
   └─> Route to BUILD agent

5. BUILD Agent
   └─> PlannerAgent.createPlan(intent, context)
   
6. PlannerAgent
   └─> MCPContextAggregator.collectAll()
       └─> Returns: FileSystemContext, GitContext, TestsContext
   └─> GeneratePlan:
       - Create auth/middleware.ts
       - Create auth/routes.ts
       - Create auth/tests/
   └─> Returns: ExecutionPlan

7. TUI
   └─> Display plan to user
   └─> Wait for approval

8. User
   └─> [A]pprove

9. VibeApprovalManager
   └─> Log approval decision
   
10. BUILD Agent
    └─> MultiEditPrimitive.editAll(operations, sessionId)
    
11. MultiEditPrimitive
    └─> VibeCheckpointSystem.create(sessionId, "Before build auth")
    └─> Create files atomically
    └─> Returns: MultiEditResult

12. BUILD Agent
    └─> Return success to TUI

13. TUI
    └─> Display success message
    └─> Update context display
```

### Checkpoint → Rollback

```
1. User Input
   "undo that"
   
2. TUI
   └─> IntentRouter.classify(input)
   
3. IntentRouter
   └─> Returns: { type: UNDO, confidence: 0.95 }

4. UNDO Agent
   └─> Get last checkpoint
   └─> VibeCheckpointSystem.restore(checkpointId)

5. VibeCheckpointSystem
   └─> Restore files from checkpoint
   └─> Returns: RestoreResult

6. UNDO Agent
   └─> Log undo action to memory
   
7. TUI
   └─> Display rollback confirmation
```

## Primitives Data Flow

```
                    ┌──────────────────────────────────────────────┐
                    │         EXTERNAL INTERFACE                   │
                    │  User Input → TUI → Intent Router            │
                    └─────────────────────┬────────────────────────┘
                                          │
                                          ▼
                    ┌──────────────────────────────────────────────┐
                    │           PRIMITIVES LAYER                   │
                    │                                              │
│ ┌────────────────┴────────────────┴────────────────────────────┐ │
│ │                                                              │ │
│ │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │ │
│ │  │COMPLETION│  │ PLANNING │  │MULTI-EDIT│  │ EXECUTION│    │ │
│ │  │          │  │          │  │          │  │          │    │ │
│ │  │ - single │  │ - create │  │ - editAll│  │ - run    │    │ │
│ │  │ - stream │  │ - validate│ │ - find   │  │ - stream │    │ │
│ │  │ - route  │  │ - refine │  │ - diff   │  │ - kill   │    │ │
│ │  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │ │
│ │                                                              │ │
│ │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │ │
│ │  │APPROVAL  │  │  MEMORY  │  │ORCHESTRAT│  │DETERMINISM│    │ │
│ │  │          │  │          │  │   ION    │  │          │    │ │
│ │  │ - request│  │ - remember│ │ - start  │  │ - checkpoint│  │ │
│ │  │ - policy │  │ - recall │  │ - step   │  │ - restore │    │ │
│ │  │ - auto   │  │ - search │  │ - cancel │  │ - history │    │ │
│ │  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │ │
│ │                                                              │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────────────────────────────────┐
                    │            MCP CONTEXT LAYER                 │
│ ┌────────────────┴────────────────┴────────────────────────────┐ │
│ │  FileSystem  Git  OpenAPI  Tests  Memory  Infra              │ │
│ │     MCP        MCP    MCP     MCP     MCP    MCP             │ │
│ └────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| TUI | User interaction, input/output |
| IntentRouter | Classify and route intents |
| Orchestrator | Manage state machine |
| PlannerAgent | Generate execution plans |
| ExecutorAgent | Execute plan steps |
| ReviewerAgent | Review and validate |
| MultiEditPrimitive | Atomic file operations |
| ShellExecutor | Run commands |
| ApprovalManager | Gate dangerous ops |
| MemoryManager | Persist decisions |
| CheckpointSystem | Support rollback |
| ContextAggregator | Collect MCP context |
| ProviderRouter | Route LLM calls |

## Security Model

```
┌─────────────────────────────────────────────────────────────────┐
│                     SECURITY LAYERS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: Input Validation                                       │
│  - Sanitize user input                                          │
│  - Validate intent classification                               │
│                                                                  │
│  Layer 2: Approval Gates                                        │
│  - All destructive ops require approval                         │
│  - Dangerous patterns blocked by default                        │
│                                                                  │
│  Layer 3: Checkpoint System                                     │
│  - Create before destructive ops                                │
│  - Enable rollback                                              │
│                                                                  │
│  Layer 4: Sandboxing                                            │
│  - Limit filesystem access                                      │
│  - Constrain command execution                                  │
│                                                                  │
│  Layer 5: Audit Logging                                         │
│  - Log all operations                                           │
│  - Track approval decisions                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```
