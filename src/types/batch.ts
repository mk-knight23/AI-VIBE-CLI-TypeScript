/**
 * VIBE CLI - Batch Processing Types
 */

export type BatchTaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface BatchTask {
  id: string;
  path: string;
  status: BatchTaskStatus;
  result?: unknown;
  error?: string;
  durationMs?: number;
  retries: number;
}

export interface BatchConfig {
  concurrency: number;
  retryAttempts: number;
  retryDelayMs: number;
  timeoutMs: number;
  continueOnError: boolean;
  dryRun: boolean;
}

export interface BatchResult {
  tasks: BatchTask[];
  completed: number;
  failed: number;
  cancelled: number;
  durationMs: number;
  errors: string[];
}

export interface BatchOperation<T = unknown> {
  name: string;
  execute: (path: string, task: BatchTask) => Promise<T>;
  validate?: (path: string) => Promise<boolean>;
}

export const DEFAULT_BATCH_CONFIG: BatchConfig = {
  concurrency: 5,
  retryAttempts: 2,
  retryDelayMs: 1000,
  timeoutMs: 60000,
  continueOnError: true,
  dryRun: false,
};
