/**
 * Session Types
 *
 * Core types for session management and context persistence.
 */

export interface Session {
  id: string;
  projectId: string;
  startTime: Date;
  endTime?: Date;
  iterations: Iteration[];
  context: SessionContext;
  status: SessionStatus;
  metadata: SessionMetadata;
}

export interface Iteration {
  number: number;
  timestamp: Date;
  response: string;
  actionItems: string[];
  completion: number; // 0.0 to 1.0
  durationMs: number;
  errors: string[];
}

export interface SessionContext {
  task: string;
  objectives: string[];
  completed: string[];
  inProgress: string[];
  blocked: string[];
  summary?: string;
  tokenCount: number;
}

export interface SessionMetadata {
  author?: string;
  description?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
  estimatedHours?: number;
}

export enum SessionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface SessionStoreConfig {
  dataDir: string;
  maxSessions: number;
  compressAfter: number; // iterations
}

export interface ContextBuilderConfig {
  maxHistoryLength: number;
  summarizeAfter: number;
  includeTests: boolean;
  includeErrors: boolean;
  maxTokens: number;
  tokensPerChar: number; // Approximate tokenization
}

export interface RalphStructure {
  promptPath: string;
  fixPlanPath: string;
  agentPath: string;
  sessionsDir: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dependencies: string[];
  assignee?: string;
  estimatedHours?: number;
  completedAt?: Date;
}

export enum TaskPriority {
  P0 = 'P0', // Critical
  P1 = 'P1', // High
  P2 = 'P2', // Medium
  P3 = 'P3', // Low
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  BLOCKED = 'blocked',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}
