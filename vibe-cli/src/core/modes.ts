/**
 * Mode System - Agent behavior presets
 * Implements Ask/Debug/Architect/Orchestrator modes
 */

export type AgentMode = 'ask' | 'debug' | 'architect' | 'orchestrator' | 'auto';

export interface ModeConfig {
  name: string;
  description: string;
  toolsEnabled: boolean;
  autoApprove: boolean;
  systemPromptAddition: string;
  preferredTools: string[];
  disabledTools: string[];
  maxSteps: number;
  requiresApproval: boolean;
}

export const MODE_CONFIGS: Record<AgentMode, ModeConfig> = {
  ask: {
    name: 'Ask',
    description: 'Answer questions without executing tools unless explicitly requested',
    toolsEnabled: false,
    autoApprove: false,
    systemPromptAddition: `You are in ASK mode. Focus on answering questions and providing information.
Do NOT execute tools or make changes unless the user explicitly asks you to.
Provide explanations, suggestions, and guidance instead of taking action.`,
    preferredTools: ['read_file', 'list_directory', 'search_file_content'],
    disabledTools: ['write_file', 'replace', 'run_shell_command', 'delete_file'],
    maxSteps: 1,
    requiresApproval: true
  },

  debug: {
    name: 'Debug',
    description: 'Heavy diagnostics, test runner, and log analysis',
    toolsEnabled: true,
    autoApprove: false,
    systemPromptAddition: `You are in DEBUG mode. Focus on diagnosing issues and finding root causes.
Use diagnostic tools liberally: read logs, run tests, check configurations.
Provide detailed analysis of errors and suggest fixes.
Prioritize: get_diagnostics, run_tests, read_file, search_file_content, git_diff.`,
    preferredTools: ['get_diagnostics', 'run_tests', 'run_lint', 'read_file', 'search_file_content', 'git_diff', 'git_log'],
    disabledTools: [],
    maxSteps: 10,
    requiresApproval: true
  },

  architect: {
    name: 'Architect',
    description: 'Planning and spec-first development with constraints',
    toolsEnabled: true,
    autoApprove: false,
    systemPromptAddition: `You are in ARCHITECT mode. Focus on planning and design before implementation.
1. First, analyze the current codebase structure
2. Create a detailed plan with clear steps
3. Identify potential issues and constraints
4. Only implement after the plan is approved
Do NOT write code until you have presented and confirmed the plan.`,
    preferredTools: ['list_directory', 'read_file', 'search_file_content', 'get_project_info', 'analyze_code_quality'],
    disabledTools: [],
    maxSteps: 20,
    requiresApproval: true
  },

  orchestrator: {
    name: 'Orchestrator',
    description: 'Multi-step execution with approval checkpoints',
    toolsEnabled: true,
    autoApprove: false,
    systemPromptAddition: `You are in ORCHESTRATOR mode. Execute complex multi-step tasks with checkpoints.
1. Break down the task into clear steps
2. Execute each step and report progress
3. Pause for approval at critical points (file writes, shell commands)
4. Provide rollback options if something goes wrong
Always explain what you're about to do before doing it.`,
    preferredTools: [],
    disabledTools: [],
    maxSteps: 50,
    requiresApproval: true
  },

  auto: {
    name: 'Auto',
    description: 'Automatic mode selection based on task',
    toolsEnabled: true,
    autoApprove: false,
    systemPromptAddition: '',
    preferredTools: [],
    disabledTools: [],
    maxSteps: 20,
    requiresApproval: true
  }
};

// Current mode state
let currentMode: AgentMode = 'auto';

/**
 * Get current mode
 */
export function getMode(): AgentMode {
  return currentMode;
}

/**
 * Set current mode
 */
export function setMode(mode: AgentMode): ModeConfig {
  if (!MODE_CONFIGS[mode]) {
    throw new Error(`Invalid mode: ${mode}. Valid modes: ${Object.keys(MODE_CONFIGS).join(', ')}`);
  }
  currentMode = mode;
  return MODE_CONFIGS[mode];
}

/**
 * Get current mode config
 */
export function getModeConfig(): ModeConfig {
  return MODE_CONFIGS[currentMode];
}

/**
 * Check if a tool is allowed in current mode
 */
export function isToolAllowed(toolName: string): boolean {
  const config = getModeConfig();
  
  if (!config.toolsEnabled) {
    return config.preferredTools.includes(toolName);
  }
  
  if (config.disabledTools.includes(toolName)) {
    return false;
  }
  
  return true;
}

/**
 * Check if tool is preferred in current mode
 */
export function isToolPreferred(toolName: string): boolean {
  const config = getModeConfig();
  return config.preferredTools.includes(toolName);
}

/**
 * Get system prompt addition for current mode
 */
export function getModeSystemPrompt(): string {
  return getModeConfig().systemPromptAddition;
}

/**
 * Auto-detect mode based on user input
 */
export function detectMode(input: string): AgentMode {
  const lower = input.toLowerCase();
  
  // Debug indicators
  if (/\b(debug|error|fix|bug|issue|broken|not working|fail|crash|exception|problem)\b/.test(lower)) {
    return 'debug';
  }
  
  // Architect indicators
  if (/\b(plan|design|architect|structure|refactor|reorganize|migrate)\b/.test(lower)) {
    return 'architect';
  }
  
  // Orchestrator indicators
  if (/\b(build|create|implement|setup|install|deploy|configure)\b/.test(lower)) {
    return 'orchestrator';
  }
  
  // Ask indicators (questions)
  if (/^(what|why|how|when|where|who|can you explain|tell me)\b/.test(lower) || lower.endsWith('?')) {
    return 'ask';
  }
  
  return 'auto';
}

/**
 * Get mode summary for display
 */
export function getModeSummary(): string {
  const config = getModeConfig();
  const tools = config.toolsEnabled ? 'enabled' : 'disabled';
  const approval = config.requiresApproval ? 'required' : 'auto';
  
  return `Mode: ${config.name} | Tools: ${tools} | Approval: ${approval} | Max steps: ${config.maxSteps}`;
}
