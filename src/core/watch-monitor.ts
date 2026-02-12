/**
 * VIBE CLI - Watch Monitor
 * File watching with debouncing and change handling
 */

import chokidar, { FSWatcher } from 'chokidar';
import { createLogger } from '../utils/pino-logger.js';
import { errors } from '../utils/errors.js';
import { WatchConfig, WatchSession, ChangeEvent, DEFAULT_WATCH_CONFIG } from '../types/watch.js';

const logger = createLogger('watch-monitor');

/**
 * Watch Monitor class
 */
export class WatchMonitor {
  private watcher?: FSWatcher;
  private session?: WatchSession;
  private debounceTimer?: NodeJS.Timeout;
  private pendingChanges: ChangeEvent[] = [];
  private changeCallback?: (events: ChangeEvent[]) => void | Promise<void>;

  /**
   * Start watching
   */
  async startWatching(
    config: Partial<WatchConfig> = {},
    onChange: (events: ChangeEvent[]) => void | Promise<void>
  ): Promise<WatchSession> {
    const fullConfig: WatchConfig = { ...DEFAULT_WATCH_CONFIG, ...config };

    logger.debug({ config: fullConfig }, 'Starting watch');

    // Create session
    this.session = {
      id: `watch-${Date.now()}`,
      config: fullConfig,
      startTime: new Date(),
      changeCount: 0,
    };

    this.changeCallback = onChange;

    // Create watcher
    this.watcher = chokidar.watch(fullConfig.patterns, {
      ignored: fullConfig.ignore,
      ignoreInitial: true,
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 100,
      },
    });

    // Set up event handlers
    this.watcher.on('add', (path, stats) => this.handleChange('add', path, stats));
    this.watcher.on('change', (path, stats) => this.handleChange('change', path, stats));
    this.watcher.on('unlink', (path) => this.handleChange('unlink', path));
    this.watcher.on('error', (error) => {
      logger.error({ error }, 'Watch error');
    });

    // Wait for ready
    await new Promise<void>((resolve) => {
      this.watcher?.on('ready', () => {
        logger.debug('Watch ready');
        resolve();
      });
    });

    return this.session;
  }

  /**
   * Handle file change
   */
  private handleChange(
    event: ChangeEvent['event'],
    path: string,
    stats?: { size: number; mtime: Date }
  ): void {
    if (!this.session) return;

    logger.debug({ event, path }, 'File changed');

    this.session.changeCount++;

    this.pendingChanges.push({
      path,
      event,
      stats: stats
        ? {
            size: stats.size,
            mtime: stats.mtime,
          }
        : undefined,
    });

    // Debounce
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.flushChanges();
    }, this.session.config.debounceMs);
  }

  /**
   * Flush pending changes
   */
  private async flushChanges(): Promise<void> {
    if (this.pendingChanges.length === 0 || !this.changeCallback) {
      return;
    }

    const changes = [...this.pendingChanges];
    this.pendingChanges = [];

    logger.debug({ changeCount: changes.length }, 'Flushing changes');

    if (this.session) {
      this.session.lastRun = new Date();
    }

    try {
      await this.changeCallback(changes);
    } catch (error) {
      logger.error({ error }, 'Change handler failed');
    }
  }

  /**
   * Stop watching
   */
  async stopWatching(): Promise<void> {
    logger.debug('Stopping watch');

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }

    if (this.watcher) {
      await this.watcher.close();
      this.watcher = undefined;
    }

    this.session = undefined;
    this.changeCallback = undefined;
    this.pendingChanges = [];
  }

  /**
   * Check if watching
   */
  isWatching(): boolean {
    return !!this.watcher;
  }

  /**
   * Get session info
   */
  getSession(): WatchSession | undefined {
    return this.session;
  }
}
