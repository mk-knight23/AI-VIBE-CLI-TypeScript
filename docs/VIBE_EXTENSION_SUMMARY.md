# Vibe VS Code Extension v5.0 - Multi-Agent AI Assistant

## Overview

**Vibe VS Code Extension v5.0.1** is a comprehensive multi-agent AI assistant that provides full CLI parity within VS Code. It offers intelligent coding assistance, autonomous agent execution, real-time streaming responses, and sophisticated tool orchestration with approval workflows.

### Key Highlights
- 🤖 **Multi-Agent Orchestration**: Autonomous task execution with intelligent decomposition
- 🔄 **State Machine Architecture**: Robust state management with 12 distinct states
- ⚡ **Real-time Streaming**: Token-by-token response streaming with progress indicators
- 🛠️ **Unified Tool System**: 8+ integrated tools with approval workflows and rollback
- 🔗 **Multi-Provider Support**: 4 AI providers with automatic fallback
- 💾 **Semantic Memory**: Persistent conversation history and context management
- 🔐 **Security First**: Approval requirements for dangerous operations

## Architecture Components

### 1. State Machine System
**12-State State Machine** for robust operation control:
- `IDLE` → `READY` → `ANALYZING` → `STREAMING` → `PROPOSING_ACTIONS` → `AWAITING_APPROVAL` → `RUNNING_TOOL` → `VERIFYING` → `COMPLETED`
- Error handling with `ERROR` and `CANCELLED` states
- Hard state guards prevent invalid operations
- State transition validation and logging

### 2. Agent Orchestrator
- **Task Decomposition**: LLM-powered breaking down of complex tasks
- **Sequential Execution**: Step-by-step agent operation with progress tracking
- **Approval Workflows**: User approval required for dangerous operations
- **Rollback System**: Automatic rollback on tool execution failures
- **Verification**: Built-in result verification and validation

### 3. Unified Tool System
**8 Core Tools** with risk-based approval:
- **File Operations**: `createFile`, `createFolder` (High Risk - Requires Approval)
- **Shell Commands**: `runShellCommand` (High Risk - Requires Approval)
- **Analysis Tools**: `analyzeProject`, `searchCodebase` (Safe)
- **Code Tools**: `formatCode` (Safe)
- **Testing**: `runTests` (Medium Risk - Requires Approval)

### 4. Provider Management System
**4 AI Providers** with automatic fallback:
- **OpenRouter**: 40+ models, community-driven (Primary)
- **MegaLLM**: 12 models, high performance
- **AgentRouter**: 7 models, Claude access
- **Routeway**: 6 models, specialized

**Features**:
- Automatic provider fallback on failures
- Rate limiting and health monitoring
- Streaming and non-streaming support
- Token usage tracking

### 5. Chat System
- **Real-time Streaming**: Token-by-token response rendering
- **Session Management**: Persistent chat history with memory
- **Mode-Aware Responses**: Context-aware AI responses based on execution mode
- **Tool Integration**: Inline tool calls with approval buttons
- **Message Queue**: Asynchronous message handling

## Execution Modes

### 1. **Ask Mode** 🤔
- **Purpose**: Read-only Q&A and analysis
- **Tools**: Search, analyze (safe operations only)
- **UI Features**: Chat, readonly, search
- **Side Effects**: None allowed

### 2. **Code Mode** 🔧
- **Purpose**: Full coding with file operations
- **Tools**: File ops, search, analyze, git, shell, format
- **UI Features**: Chat, diff preview, file tree, editor
- **Side Effects**: File write/create/delete, terminal

### 3. **Debug Mode** 🐛
- **Purpose**: Error analysis and debugging
- **Tools**: Analyze, search, run_tests, shell
- **UI Features**: Chat, breakpoints, console, tests
- **Side Effects**: Terminal access

### 4. **Architect Mode** 🏗️
- **Purpose**: System design and planning
- **Tools**: Analyze, search, generate
- **UI Features**: Chat, diagrams, planning, readonly
- **Side Effects**: None allowed

### 5. **Agent Mode** 🤖
- **Purpose**: Autonomous multi-step execution
- **Tools**: All tools available
- **UI Features**: Chat, progress, approval, multi-step
- **Side Effects**: All operations allowed with approval

### 6. **Shell Mode** 💻
- **Purpose**: Terminal and file operations only
- **Tools**: Shell, file operations
- **UI Features**: Terminal, file tree, commands
- **Side Effects**: Terminal, file operations

## Commands and Functionality

### Core Commands (9 Consolidated)
1. **`vibe.ask`** - Open agent-first chat panel
2. **`vibe.code`** - Code actions (explain, refactor, test, optimize, document, review)
3. **`vibe.debug`** - Debug analysis (errors, logic, performance, tests)
4. **`vibe.architect`** - System design (architecture, planning, structure, API, database, security)
5. **`vibe.agent`** - Autonomous agent execution with task decomposition
6. **`vibe.runTool`** - Direct tool execution with 8 available tools
7. **`vibe.showMemory`** - Display session memory and settings
8. **`vibe.clearMemory`** - Clear all memory and history
9. **`vibe.settings`** - Open extension settings

### Activity Bar Integration
- **Sidebar Panel**: Dedicated Vibe panel in activity bar
- **Chat Interface**: Webview-based chat with mode switching
- **Real-time Updates**: Live progress and status updates

### Keyboard Shortcuts
- **`Ctrl+Shift+V` (Cmd+Shift+V)**: Quick ask
- **`Ctrl+Shift+A` (Cmd+Shift+A)**: Agent mode

## Configuration Options

### Provider Settings
```json
{
  "vibe.openrouterApiKey": "API key for OpenRouter",
  "vibe.megallmApiKey": "API key for MegaLLM", 
  "vibe.agentrouterApiKey": "API key for AgentRouter",
  "vibe.routewayApiKey": "API key for Routeway",
  "vibe.provider": "openrouter|megallm|agentrouter|routeway",
  "vibe.defaultModel": "x-ai/grok-4.1-fast:free"
}
```

### Agent Behavior
```json
{
  "vibe.executionMode": "ask|code|debug|architect",
  "vibe.autoApproveUnsafeOps": false,
  "vibe.maxContextFiles": 20,
  "vibe.streamingEnabled": true,
  "vibe.enableMemorySystem": true,
  "vibe.enableDiffPreview": true,
  "vibe.enableProviderFallback": true
}
```

## Security Features

### Approval System
- **High-Risk Tools**: File creation, shell commands require explicit approval
- **Approval Buttons**: Inline approval/rejection in chat interface
- **Rollback Capability**: Automatic rollback on failed operations
- **State Guards**: Hard state validation prevents invalid operations

### Risk Levels
- **Safe**: `formatCode`, `analyzeProject`, `searchCodebase`
- **Medium**: `createFile`, `createFolder`, `runTests` (require approval)
- **High**: `runShellCommand` (requires approval)

## Technical Features

### State Management
- **Persistent Settings**: VS Code workspace storage
- **Session Memory**: Global state persistence across restarts
- **Mode Persistence**: Remembers last used execution mode
- **Settings Validation**: Comprehensive validation with error handling

### Performance Optimizations
- **Async Initialization**: Non-blocking extension activation
- **Rate Limiting**: Provider-specific rate limits
- **Streaming Support**: Real-time token streaming
- **Resource Management**: Proper cleanup and disposal

### Error Handling
- **Graceful Degradation**: Fallback mechanisms for all failures
- **User Feedback**: Clear error messages and suggestions
- **Recovery Mechanisms**: Automatic retry and fallback logic
- **Comprehensive Logging**: Detailed console logging for debugging

## Integration Points

### VS Code APIs
- **Webview API**: Custom chat interface
- **File System API**: Safe file operations
- **Terminal API**: Shell command execution
- **Configuration API**: Settings management
- **Secret Storage**: Secure API key storage

### External Services
- **OpenRouter API**: Primary AI provider
- **Multiple LLM Providers**: Fallback and redundancy
- **Git Integration**: Repository status and operations
- **Test Frameworks**: Auto-detection and execution

## File Structure

```
vibe-code/
├── package.json              # Extension manifest with 9 commands
├── src/
│   └── extension.ts          # 10,000+ lines of core functionality
├── media/
│   ├── vibe-icon.png         # Extension icons
│   └── vibe-icon.svg
└── README.md                 # Extension documentation
```

## Version Information

- **Version**: 5.0.1
- **CLI Parity**: 100%
- **Compatible CLI**: 9.x
- **Compatible Web**: 2.x
- **VS Code Requirement**: ^1.107.0

## Key Benefits

1. **Full CLI Parity**: All CLI features available in VS Code
2. **Intelligent Agent**: Autonomous task execution with LLM decomposition
3. **Real-time Experience**: Streaming responses and live updates
4. **Security Focused**: Approval workflows and rollback capabilities
5. **Provider Redundancy**: Multiple AI providers with automatic fallback
6. **State Management**: Robust state machine prevents errors
7. **Memory Persistence**: Session history and settings preservation
8. **Mode Specialization**: Context-aware assistance based on task type

## Getting Started

1. **Install Extension**: Install from VS Code marketplace
2. **Configure API Keys**: Set up provider API keys in settings
3. **Open Workspace**: Ensure a workspace folder is open
4. **Try Commands**: Use `Ctrl+Shift+V` for quick ask or activity bar icon
5. **Agent Mode**: Use agent mode for complex multi-step tasks
6. **Tool Approval**: Review and approve tool executions as needed

---

**Vibe v5.0** represents a significant evolution in AI-powered development tools, combining the power of multiple AI models with intelligent agent orchestration, robust state management, and a security-first approach to automated code assistance.
