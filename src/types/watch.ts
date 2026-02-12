/**
 * VIBE CLI - Watch Mode Types
 */

export type WatchAction = 'test' | 'fix' | 'custom';

export interface WatchConfig {
  patterns: string[];
  ignore: string[];
  debounceMs: number;
  action: WatchAction;
  customCommand?: string;
  autoApprove: boolean;
  notify: boolean;
}

export interface WatchSession {
  id: string;
  config: WatchConfig;
  startTime: Date;
  changeCount: number;
  lastRun?: Date;
}

export interface ChangeEvent {
  path: string;
  event: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  stats?: {
    size: number;
    mtime: Date;
  };
}

export const DEFAULT_WATCH_CONFIG: WatchConfig = {
  patterns: ['src/**/*.{ts,tsx,js,jsx}'],
  ignore: [
    'node_modules/**',
    'dist/**',
    'build/**',
    'coverage/**',
    '.git/**',
    '**/*.test.ts',
    '**/*.spec.ts',
  ],
  debounceMs: 300,
  action: 'test',
  autoApprove: false,
  notify: true,
};
