/**
 * VIBE CLI v12 - Core Types
 * 
 * All types are defined here to avoid circular imports.
 */

// ============================================================================
// INTENT TYPES
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
// PROVIDER TYPES
// ============================================================================

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface IProviderRouter {
  chat(messages: Array<{ role: string; content: string }>): Promise<ProviderResponse>;
  complete(prompt: string): Promise<ProviderResponse>;
  selectModel(task: string): string;
}

export interface ProviderResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider?: string;
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

export interface VibeProviderRouter {
  providers: Map<string, ProviderConfig>;
  defaultProvider: string;
  currentProvider: string;
  initializeProviders(): void;
  selectModel(task: string): string;
  route(request: { prompt: string; task: string }): Promise<ProviderResponse>;
}

// ============================================================================
// PLANNING TYPES
// ============================================================================

export interface PlanStep {
  id: string;
  description: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  estimatedTokens: number;
  dependencies?: string[];
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

// ============================================================================
// AGENT TYPES
// ============================================================================

export interface AgentResult {
  success: boolean;
  output?: string;
  error?: string;
  checkpointId?: string;
}

export interface ExecutionPlan {
  id: string;
  intent: VibeIntent;
  steps: PlanStep[];
  estimatedRisk: 'low' | 'medium' | 'high';
}

// ============================================================================
// TOOL TYPES
// ============================================================================

export interface EditOperation {
  type: 'replace' | 'insert' | 'delete' | 'append';
  file: string;
  searchPattern?: string;
  replacement?: string;
  lineNumber?: number;
}

export interface EditResult {
  success: boolean;
  file: string;
  changes: {
    type: string;
    lineStart?: number;
    lineEnd?: number;
    content?: string;
  }[];
  error?: string;
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

// ============================================================================
// APPROVAL TYPES
// ============================================================================

export interface ApprovalRequest {
  id: string;
  type: string;
  description: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  operations: string[];
  timestamp: Date;
  status?: 'pending' | 'approved' | 'denied';
  expiresAt?: Date;
}

export interface ApprovalDecision {
  approved: boolean;
  reason?: string;
  timestamp: Date;
}

// ============================================================================
// MEMORY TYPES
// ============================================================================

export interface MemoryEntry {
  id: string;
  type: 'decision' | 'rule' | 'pattern' | 'context';
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMemory {
  decisions: MemoryEntry[];
  rules: MemoryEntry[];
  patterns: MemoryEntry[];
}

// ============================================================================
// CHECKPOINT TYPES
// ============================================================================

export interface Checkpoint {
  id: string;
  sessionId: string;
  description: string;
  files: Map<string, string>;
  timestamp: Date;
}

export interface CheckpointResult {
  success: boolean;
  checkpointId: string;
}

// ============================================================================
// MCP TYPES
// ============================================================================

export interface MCPContext {
  filesystem: FileSystemContext | null;
  git: GitContext | null;
  openapi: OpenAPIContext | null;
  tests: TestsContext | null;
  memory: MemoryContext | null;
  infra: InfraContext | null;
}

export interface FileSystemContext {
  type: 'filesystem';
  root: string;
  structure: FileNode[];
  excludePatterns: string[];
}

export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  children?: FileNode[];
}

export interface GitContext {
  type: 'git';
  currentBranch: string;
  recentCommits: GitCommit[];
  status: GitStatus;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export interface GitStatus {
  staged: string[];
  modified: string[];
  untracked: string[];
}

export interface OpenAPIContext {
  type: 'openapi';
  baseUrl: string;
  endpoints: APIEndpoint[];
}

export interface APIEndpoint {
  path: string;
  method: string;
  summary?: string;
}

export interface TestsContext {
  type: 'tests';
  framework: string;
  files: TestFile[];
}

export interface TestFile {
  path: string;
  testCount: number;
  status: 'passing' | 'failing' | 'pending';
}

export interface MemoryContext {
  type: 'memory';
  decisions: number;
  rules: number;
  patterns: number;
}

export interface InfraContext {
  type: 'infra';
  providers: InfraProvider[];
}

export interface InfraProvider {
  name: string;
  type: string;
  status: string;
}

// ============================================================================
// CONTEXT TYPES
// ============================================================================

export interface VibeContext {
  session: {
    id: string;
    projectRoot: string;
    createdAt: Date;
    lastActivity: Date;
  };
  project: {
    name: string;
    language: string;
    framework?: string;
  };
  memory: MemoryEntry[];
  mcp: MCPContext;
}

export interface ContextEntry {
  id: string;
  type: string;
  content: string;
  source: string;
  timestamp: Date;
}

export interface ProjectContext {
  root: string;
  language: string;
  framework?: string;
  files: number;
  tests: number;
}

export interface FileContext {
  path: string;
  content: string;
  language: string;
  size: number;
}

// ============================================================================
// APPROVAL TYPES
// ============================================================================

export type ApprovalType = 'confirm' | 'deny' | 'modify' | 'delete' | 'deploy' | 'shell' | 'shell-exec' | 'file-write' | 'git-mutation' | 'network';

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

export interface VibeApprovalSystem {
  request(details: ApprovalDetails): Promise<boolean>;
  isApproved(id: string): boolean;
}

// ============================================================================
// MEMORY TYPES
// ============================================================================

export type MemoryType = 'decision' | 'rule' | 'pattern' | 'context' | 'action';

export interface VibeMemoryEntry {
  id: string;
  type: MemoryType;
  content: string;
  tags: string[];
  confidence?: number;
  source?: 'user' | 'session' | 'inference' | 'git';
  createdAt: Date;
  updatedAt?: Date;
  lastAccessed?: Date;
  accessCount?: number;
}

export interface MemoryQuery {
  type?: MemoryType;
  source?: 'user' | 'session' | 'inference' | 'git';
  keys?: string[];
  tags?: string[];
  limit?: number;
}

export interface VibeMemory {
  remember(entry: VibeMemoryEntry): void;
  recall(query: MemoryQuery): VibeMemoryEntry[];
  forget(id: string): void;
}

// ============================================================================
// AGENT TYPES
// ============================================================================

export type AgentRole = 'planner' | 'executor' | 'reviewer' | 'tester' | 'rollback';

export interface VibeAgentSystem {
  run(role: AgentRole, task: string): Promise<AgentResult>;
}

// ============================================================================
// CORE TYPES
// ============================================================================

export interface VibeConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  providers: string[];
}

export interface VibeSession {
  id: string;
  projectRoot: string;
  createdAt: Date;
  lastActivity: Date;
}
