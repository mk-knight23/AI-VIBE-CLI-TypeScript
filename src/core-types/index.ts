/**
 * VIBE CLI v0.0.2 - Main Types Index
 * 
 * Central export point for all type definitions.
 * Version: 0.0.1
 */

// ============================================================================
// Version
// ============================================================================

/** VIBE CLI version */
export const VIBE_VERSION = '0.0.1';

/** VIBE CLI version type */
export type VibeVersion = typeof VIBE_VERSION;

// ============================================================================
// Intent Types
// ============================================================================

export enum IntentType {
  ASK = 'ask',
  CODE = 'code',
  DEBUG = 'debug',
  REFACTOR = 'refactor',
  TEST = 'test',
  API = 'api',
  UI = 'ui',
  DEPLOY = 'deploy',
  MEMORY = 'memory',
  PLAN = 'plan',
  AGENT = 'agent',
  GIT = 'git',
  UNKNOWN = 'unknown'
}

export type IntentCategory =
  | 'question'
  | 'code_generation'
  | 'code_assistant'
  | 'refactor'
  | 'debug'
  | 'testing'
  | 'security'
  | 'api'
  | 'ui'
  | 'deploy'
  | 'infra'
  | 'memory'
  | 'planning'
  | 'agent'
  | 'git'
  | 'analysis'
  | 'completion'
  | 'unknown';

export interface IntentPattern {
  category: IntentCategory;
  keywords: string[];
  phrases: RegExp[];
  confidence: number;
}

export interface IntentContext {
  files?: string[];
  target?: string;
  language?: string;
  framework?: string;
  stepAction?: string;
  stepFiles?: string[];
}

export interface VibeIntent {
  id: string;
  type: IntentType;
  category: IntentCategory;
  query: string;
  confidence: number;
  context: IntentContext;
  shouldRemember: boolean;
  shouldApprove: boolean;
  risk: 'low' | 'medium' | 'high' | 'critical';
}

export interface ClarificationOption {
  label: string;
  category: IntentCategory;
  description: string;
}

export interface IntentClassificationResult {
  intent: VibeIntent;
  needsClarification: boolean;
  suggestedOptions?: ClarificationOption[];
}

// ============================================================================
// Agent Types (re-exported from agent.types)
// ============================================================================

export type AgentPhase = 
  | 'plan'
  | 'propose'
  | 'approve'
  | 'execute'
  | 'verify'
  | 'explain'
  | 'debug'
  | 'refactor'
  | 'learn'
  | 'context';

export type AgentStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AgentTask {
  id: string;
  task: string;
  context: Record<string, unknown>;
  approvalMode: 'auto' | 'prompt' | 'never';
  maxSteps?: number;
  checkpoint?: boolean;
  priority?: number;
  tags?: string[];
  parentId?: string;
  timeout?: number;
}

export interface AgentTaskResult {
  taskId: string;
  success: boolean;
  output: string;
  error?: string;
  steps: AgentStep[];
  filesChanged?: string[];
  artifacts?: Record<string, unknown>;
  duration: number;
}

export interface AgentStep {
  id: string;
  phase: AgentPhase;
  action: string;
  result: string;
  approved?: boolean;
  timestamp: Date;
  duration: number;
  error?: string;
  tool?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: unknown;
}

export interface ExecutionPlan {
  id: string;
  taskId: string;
  steps: PlanStep[];
  tools: string[];
  estimatedRisk: RiskLevel;
  estimatedDuration: number;
  totalSteps: number;
  parallelizable: boolean;
  dependencies?: StepDependency[];
  preview?: PlanPreview;
}

export interface Plan {
  id: string;
  intent: VibeIntent;
  steps: PlanStep[];
  risks: string[];
  totalRisk: 'low' | 'medium' | 'high';
  estimatedDuration: number;
  createdAt: Date;
}

export interface PlanStep {
  stepNumber: number;
  description: string;
  tool: string;
  args: Record<string, unknown>;
  reason: string;
  riskLevel: RiskLevel;
  expectedOutput?: string;
  validation?: StepValidation;
  fallback?: PlanStep;
}

export interface StepDependency {
  stepNumber: number;
  dependsOn: number[];
  type: 'data' | 'resource' | 'state';
}

export interface StepValidation {
  type: 'file_exists' | 'output_match' | 'command_success' | 'custom';
  params: Record<string, unknown>;
  errorMessage: string;
}

export interface PlanPreview {
  filesCreated: string[];
  filesModified: string[];
  filesDeleted: string[];
  commands: string[];
  estimatedTokens: number;
  estimatedCost: number;
}

export interface PlanningOptions {
  maxSteps?: number;
  includeRisks?: boolean;
  includeDependencies?: boolean;
}

export interface PlanningResult {
  plan: Plan;
  reasoning: string;
  suggestedModels: string[];
}

export interface AgentConfig {
  name: string;
  description: string;
  phases: AgentPhase[];
  maxSteps: number;
  timeout: number;
  enabled: boolean;
  model?: string;
  systemPrompt?: string;
  tools: string[];
  settings?: Record<string, unknown>;
}

export interface AgentRegistry {
  agents: Map<string, AgentConfig>;
  defaults: Partial<Record<AgentPhase, string>>;
  pipeline: string[];
}

export interface AgentSession {
  id: string;
  status: AgentStatus;
  task?: AgentTask;
  plan?: ExecutionPlan;
  currentStep: number;
  executedSteps: AgentStep[];
  startTime: Date;
  lastActivity: Date;
  duration: number;
  checkpointId?: string;
  errorCount: number;
  retryCount: number;
}

export interface AgentMetrics {
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  avgExecutionTime: number;
  successRate: number;
  avgStepsPerTask: number;
  commonErrors: Map<string, number>;
  toolUsage: Map<string, number>;
  phaseDurations: Map<AgentPhase, number>;
}

export interface AgentEvent {
  type: 'step_start' | 'step_complete' | 'step_error' | 
        'approval_required' | 'approval_received' | 'approval_denied' |
        'checkpoint_created' | 'checkpoint_restored' |
        'task_start' | 'task_complete' | 'task_error' |
        'plan_generated' | 'plan_approved' | 'plan_rejected';
  sessionId: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
  outputType?: string;
}

export interface ToolResult {
  success: boolean;
  output: string;
  filesChanged?: string[];
  error?: string;
  duration: number;
}

export interface ContextSnapshot {
  id: string;
  files: FileContext[];
  gitState?: AgentGitContext;
  envVars?: Record<string, string>;
  projectStructure?: ProjectStructure;
  timestamp: Date;
}

export interface FileContext {
  path: string;
  content: string;
  language: string;
  size: number;
  relevance: number;
}

export interface AgentGitContext {
  branch: string;
  recentCommits: string[];
  stagedChanges?: string;
  unstagedChanges?: string;
}

export interface ProjectStructure {
  root: string;
  keyFiles: string[];
  directories: string[];
  configFiles: string[];
}

// ============================================================================
// Context & MCP Types (from context.types.ts)
// ============================================================================

export const MCP_VERSION = '2024-11-05';

export type MCPMethod = 
  | 'initialize'
  | 'initialized'
  | 'ping'
  | 'pong'
  | 'notifications/initialized'
  | 'notifications/tool_called'
  | 'notifications/tool_results'
  | 'notifications/resource_updated'
  | 'notifications/resource_list_changed'
  | 'notifications/prompt_list_changed'
  | 'notifications/message'
  | 'tools/list'
  | 'tools/list_changed'
  | 'tools/call'
  | 'resources/list'
  | 'resources/list_changed'
  | 'resources/read'
  | 'resources/subscribe'
  | 'resources/unsubscribe'
  | 'prompts/list'
  | 'prompts/list_changed'
  | 'prompts/get'
  | 'complete';

export interface MCPMessage {
  jsonrpc: '2.0';
  id: string | number;
  method: MCPMethod;
  params?: Record<string, unknown>;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}

export interface MCPServerInfo {
  name: string;
  version: string;
  description?: string;
  capabilities: MCPServerCapabilities;
}

export interface MCPServerCapabilities {
  tools?: { listChanged?: boolean };
  resources?: { listChanged?: boolean; subscribe?: boolean };
  prompts?: { listChanged?: boolean };
  complete?: boolean;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  async?: boolean;
  category?: string;
  examples?: MCPToolExample[];
}

export interface MCPToolExample {
  description?: string;
  input: Record<string, unknown>;
}

export interface MCPToolResult {
  name: string;
  success: boolean;
  content: MCPToolResultContent[];
  error?: string;
  isPartial?: boolean;
}

export interface MCPToolResultContent {
  type: 'text' | 'image' | 'audio' | 'resource' | 'embedded_resource';
  text?: string;
  mimeType?: string;
  data?: string;
  resourceUri?: string;
  embeddedResource?: { type: 'text' | 'image' | 'audio'; resource: MCPToolResultContent };
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  size?: number;
}

export interface ContextProvider {
  name: string;
  version: string;
  capabilities: ContextProviderCapabilities;
  initialize(): Promise<void>;
  getContext(request: ContextRequest): Promise<ContextResult>;
  getResources(): ContextResource[];
  subscribe?(callback: ContextChangeCallback): void;
  unsubscribe?(): void;
}

export interface ContextProviderCapabilities {
  filesystem?: boolean;
  git?: boolean;
  terminal?: boolean;
  diagnostics?: boolean;
  memory?: boolean;
  api?: boolean;
  realtime?: boolean;
}

export interface ContextRequest {
  type: string;
  query?: string;
  resources?: string[];
  exclude?: string[];
  maxTokens?: number;
  prioritizeRecent?: boolean;
  paths?: string[];
}

export interface ContextResult {
  data: unknown;
  resources: ContextResource[];
  tokenCount: number;
  relevanceScores?: Map<string, number>;
}

export interface ContextResource {
  type: 'file' | 'git' | 'terminal' | 'diagnostic' | 'memory' | 'api';
  uri: string;
  name: string;
  content?: string;
  mimeType?: string;
  relevance: number;
  metadata?: Record<string, unknown>;
}

export type ContextChangeCallback = (change: ContextChange) => void;

export interface ContextChange {
  type: 'created' | 'updated' | 'deleted';
  resourceType: string;
  uri: string;
  timestamp: Date;
}

export interface FileSystemContext {
  cwd: string;
  projectRoot: string;
  files: FileInfo[];
  directories: DirectoryInfo[];
  configFiles: ConfigFileInfo[];
}

export interface FileInfo {
  path: string;
  relativePath: string;
  name: string;
  extension: string;
  size: number;
  content?: string;
  language: string;
  modifiedAt: Date;
  isBinary: boolean;
}

export interface DirectoryInfo {
  path: string;
  relativePath: string;
  name: string;
  subdirectories: string[];
  fileCount: number;
}

export interface ConfigFileInfo {
  path: string;
  type: 'package.json' | 'tsconfig.json' | 'eslintrc' | 'prettierrc' | 'vite.config' | 'next.config' | 'tailwind.config' | 'other';
  content: Record<string, unknown>;
}

export interface GitContext {
  root: string;
  currentBranch: string;
  branches: BranchInfo[];
  recentCommits: CommitInfo[];
  stagedChanges: FileChange[];
  unstagedChanges: FileChange[];
  untrackedFiles: string[];
  remoteBranches: string[];
  tags: string[];
  lastFetch?: Date;
}

export interface BranchInfo {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
  lastCommit: string;
  ahead?: number;
  behind?: number;
}

export interface CommitInfo {
  hash: string;
  message: string;
  fullMessage: string;
  authorName: string;
  authorEmail: string;
  timestamp: Date;
  filesChanged: number;
  additions: number;
  deletions: number;
}

export interface FileChange {
  path: string;
  type: 'added' | 'modified' | 'deleted' | 'renamed';
  status: 'staged' | 'unstaged';
  diff?: string;
  similarity?: number;
}

export interface DiagnosticsContext {
  files: FileDiagnostics[];
  summary: DiagnosticsSummary;
}

export interface FileDiagnostics {
  path: string;
  diagnostics: Diagnostic[];
  lintErrors: LintError[];
  typeErrors: TypeError[];
}

export interface Diagnostic {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'information' | 'hint';
  source: string;
  range: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  related?: Array<{ message: string; location: { path: string; range: { start: { line: number; column: number }; end: { line: number; column: number } } } }>;
  fix?: { title: string; edit: { changes: Array<{ range: { start: { line: number; column: number }; end: { line: number; column: number } }; newText: string }> } };
}

export interface LintError {
  ruleId: string;
  message: string;
  severity: 'error' | 'warning';
  line: number;
  column: number;
  fix?: { description: string; fixedCode: string };
}

export interface TypeError {
  code: string;
  message: string;
  file: string;
  start: { line: number; column: number };
  end: { line: number; column: number };
}

export interface DiagnosticsSummary {
  errors: number;
  warnings: number;
  hints: number;
  filesWithErrors: number;
  filesWithWarnings: number;
  mostCommonError?: string;
  bySeverity: { error: number; warning: number; information: number; hint: number };
}

export interface JSONSchema {
  type?: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, JSONSchema>;
  required?: string[];
  description?: string;
  default?: unknown;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  items?: JSONSchema;
  additionalProperties?: boolean;
}

// ============================================================================
// Core Types
// ============================================================================

export interface VibeSession {
  id: string;
  projectRoot: string;
  createdAt: Date;
  lastActivity: Date;
  cwd?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface LegacyVibeConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  providers: string[];
}

export interface SessionOptions {
  projectRoot?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface VibeConfig {
  version: string;
  models: ModelConfig;
  agentSettings: AgentSettingsConfig;
  ui: UIConfig;
  telemetry: TelemetryConfig;
  security: SecurityConfig;
  plugins: PluginConfig;
  policies: PolicyConfig;
}

export interface ModelConfig {
  default: string;
  fallback: string[];
  costOptimization: boolean;
  taskRouting: Record<string, string>;
  apiKeys?: Record<string, string>;
  localModels?: LocalModelConfig;
}

export interface LocalModelConfig {
  endpoint: string;
  models: string[];
  defaultModel: string;
  preferLocal: boolean;
}

export interface AgentSettingsConfig {
  enabled: string[];
  maxSteps: number;
  checkpointOnStart: boolean;
  autoApproveLowRisk: boolean;
  settings?: Record<string, Record<string, unknown>>;
}

export interface UIConfig {
  theme: 'dark' | 'light' | 'solarized' | 'nord' | 'high-contrast';
  verbosity: 'silent' | 'normal' | 'verbose' | 'debug';
  emojiEnabled: boolean;
  compactMode: boolean;
  showTimestamps: boolean;
  animations: { spinners: boolean; progressBars: boolean };
}

export interface TelemetryConfig {
  enabled: boolean;
  anonymize: boolean;
  retentionDays: number;
  features?: { commandUsage: boolean; performance: boolean; errors: boolean; featureUsage: boolean };
}

export interface SecurityConfig {
  requireApprovalForHighRisk: boolean;
  blockedPatterns: string[];
  maxFileSize: number;
  dangerousCommands: string[];
  sandbox: { enabled: boolean; allowedOperations: string[]; deniedOperations: string[] };
}

export interface PluginConfig {
  enabled: string[];
  autoUpdate: boolean;
  pluginDir: string;
}

export interface PolicyConfig {
  enabled: boolean;
  rules: PolicyRule[];
  defaultAction: 'allow' | 'block' | 'prompt';
}

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  type: 'file_pattern' | 'command' | 'api_call' | 'model' | 'custom';
  pattern: string;
  action: 'allow' | 'block' | 'prompt';
  priority: number;
  enabled: boolean;
}

// ============================================================================
// Checkpoint Types
// ============================================================================

export interface Checkpoint {
  id: string;
  name: string;
  description: string;
  sessionId: string;
  timestamp: Date;
  files: CheckpointFile[];
  gitState?: GitCheckpointState;
  size: number;
  metadata?: Record<string, unknown>;
}

export interface CheckpointFile {
  path: string;
  hash: string;
  size: number;
  deleted?: boolean;
}

export interface GitCheckpointState {
  branch: string;
  commitHash: string;
  stagedFiles: string[];
  stash?: string;
}

export interface CheckpointOptions {
  includeGit: boolean;
  includeUntracked: boolean;
  maxSize: number;
  compressionLevel: number;
}

// ============================================================================
// Edit Operation Types
// ============================================================================

export interface EditOperation {
  path: string;
  type: 'create' | 'modify' | 'delete' | 'rename' | 'replace' | 'insert' | 'append';
  oldPath?: string;
  content?: string;
  diff?: { original: string; modified: string; changes: DiffChange[] };
  file?: string;
  searchPattern?: string;
  replacement?: string;
  lineNumber?: number;
}

export interface DiffChange {
  type: 'add' | 'remove' | 'unchanged';
  lineNumber: number;
  originalLine?: string;
  newLine?: string;
}

export interface EditResult {
  success: boolean;
  path?: string;
  file?: string;
  filesChanged?: string[];
  filesCreated?: string[];
  filesDeleted?: string[];
  filesRenamed?: string[];
  changes: {
    type: string;
    lineStart?: number;
    lineEnd?: number;
    content?: string;
    originalLine?: string;
    newLine?: string;
  }[];
  errors?: EditError[];
  error?: string;
  preview?: EditPreview;
}

export interface MultiEditResult {
  success: boolean;
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  results: EditResult[];
  checkpointId?: string;
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  exitCode: number;
  error?: string;
}

export interface EditError {
  path: string;
  message: string;
  code: string;
}

export interface EditPreview {
  totalChanges: number;
  filesAffected: string[];
  estimatedTokens: number;
  summary: string;
}

// ============================================================================
// Search Types
// ============================================================================

export interface SearchResult {
  path: string;
  score: number;
  content: string;
  location: { startLine: number; endLine: number; startColumn: number; endColumn: number };
  matchedTerms: string[];
}

export interface SearchOptions {
  type: 'text' | 'regex' | 'semantic' | 'file_pattern';
  caseSensitive: boolean;
  wholeWord: boolean;
  maxResults: number;
  includePattern?: string;
  excludePattern?: string;
}

// ============================================================================
// Provider Types
// ============================================================================

export interface ModelInfo {
  id: string;
  name: string;
  provider?: string;
  tier: 'fast' | 'balanced' | 'reasoning' | 'max' | 'haiku' | 'sonnet' | 'opus';
  contextWindow: number;
  maxOutput: number;
  capabilities: ('completion' | 'reasoning' | 'vision' | 'function-calling' | string)[];
  freeTier?: boolean;
  costPer1kTokens?: number;
  speed?: 'fast' | 'medium' | 'slow';
}

export interface ProviderInfo {
  id: string;
  name: string;
  baseUrl: string;
  apiKeyEnv: string;
  models: ModelInfo[];
  defaultModel: string;
  requiresApiKey: boolean;
  configured?: boolean;
  hasFreeTier?: boolean;
  capabilities?: {
    streaming: boolean;
    systemPrompts: boolean;
    functionCalling: boolean;
    vision: boolean;
    maxContextWindow: number;
  };
}

export interface ProviderResponse {
  provider: string;
  model: string;
  content: string;
  reasoning?: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost?: number;
  };
  meta?: {
    responseTime: number;
    cacheHit: boolean;
  };
  latencyMs?: number;
}

export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKeyEnv: string;
  defaultModel: string;
  requiresApiKey: boolean;
  model?: string;
  apiKey?: string;
  freeTier?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface IProviderRouter {
  chat(messages: Array<{ role: string; content: string }>): Promise<ProviderResponse>;
  complete(prompt: string): Promise<ProviderResponse>;
  selectModel(task: string): string;
}

export interface IVibeProviderRouter {
  providers: Map<string, ProviderConfig>;
  defaultProvider: string;
  currentProvider: string;
  initializeProviders(): void;
  selectModel(task: string): string;
  route(request: { prompt: string; task: string }): Promise<ProviderResponse>;
}

export interface ProviderError {
  code: string;
  message: string;
  provider: string;
  retryable: boolean;
  suggestedFallback?: string;
}

// ============================================================================
// Command Execution Types
// ============================================================================

export interface CommandExecution {
  command: string;
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  sandbox?: boolean;
}

export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

// ============================================================================
// Security Types
// ============================================================================

export interface SecurityIssue {
  id: string;
  type: SecurityIssueType;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  filePath: string;
  location?: { startLine: number; endLine: number; startColumn?: number; endColumn?: number };
  fix?: { description: string; code: string };
  references?: string[];
}

export type SecurityIssueType = 
  | 'sql_injection' | 'xss' | 'csrf' | 'hardcoded_secret' | 'insecure_dependency'
  | 'weak_crypto' | 'path_traversal' | 'command_injection' | 'unsafe_deserialization'
  | 'type_confusion' | 'other';

// ============================================================================
// Approval Types
// ============================================================================

export type ApprovalRisk = 'low' | 'medium' | 'high' | 'critical';

export interface ApprovalDetails {
  id: string;
  type: ApprovalType;
  risk: ApprovalRisk;
  description: string;
  operations: string[];
  status: 'pending' | 'approved' | 'denied';
  requestedAt: Date;
  expiresAt?: Date;
}

export interface IApprovalSystem {
  requestApproval(details: ApprovalDetails): Promise<boolean>;
  checkApproval(id: string): ApprovalDetails | undefined;
  listPending(): ApprovalDetails[];
}

export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  description: string;
  operations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  preview?: unknown;
  requestedAt: Date;
  respondedAt?: Date;
  response?: ApprovalResponse;
}

export type ApprovalType = 
  | 'file_write' | 'file_delete' | 'command_execute' | 'api_call'
  | 'model_change' | 'plugin_install' | 'config_change';

export interface ApprovalResponse {
  approved: boolean;
  respondedBy?: string;
  reason?: string;
}

// ============================================================================
// Memory Types
// ============================================================================

export interface VibeMemory {
  id: string;
  type: VibeMemoryType;
  content: string;
  metadata?: Record<string, unknown>;
  importance: number;
  createdAt: Date;
  accessedAt: Date;
  accessCount: number;
}

export type VibeMemoryType = 
  | 'project_context' | 'code_pattern' | 'user_preference' | 'team_knowledge'
  | 'error_solution' | 'api_documentation' | 'custom';

/**
 * Memory entry for the memory system
 */
export interface VibeMemoryEntry {
  id: string;
  type: MemoryType;
  content: string;
  tags: string[];
  confidence?: number;
  source?: 'user' | 'session' | 'inference' | 'git';
  createdAt: Date;
  lastAccessed?: Date;
  accessCount: number;
}

export type MemoryType =
  | 'project_context'
  | 'code_pattern'
  | 'user_preference'
  | 'team_knowledge'
  | 'error_solution'
  | 'api_documentation'
  | 'action'
  | 'context'
  | 'custom';

export interface MemoryQuery {
  type?: MemoryType;
  source?: 'user' | 'session' | 'inference' | 'git';
  keys?: string[];
  tags?: string[];
  limit?: number;
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P] };
export type DeepRequired<T> = { [P in keyof T]: T[P] extends object ? DeepRequired<T[P]> : T[P] };
export type OmitStrict<T, K extends keyof T> = { [P in keyof T as P extends K ? never : P]: T[P] };
export type PickRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

// ============================================================================
// Error Types
// ============================================================================

export interface VibeError extends Error {
  code: string;
  category: VibeErrorCategory;
  recoverable: boolean;
  suggestedFix?: string;
  documentation?: string;
}

export type VibeErrorCategory = 
  | 'configuration' | 'authentication' | 'authorization' | 'validation' | 'execution'
  | 'filesystem' | 'git' | 'network' | 'model' | 'plugin' | 'system';
