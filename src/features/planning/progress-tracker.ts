/**
 * VIBE-CLI v0.0.2 - Progress Tracker
 * Track milestones and progress for task execution
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

/**
 * Milestone status
 */
export type MilestoneStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped';

/**
 * Milestone
 */
export interface Milestone {
  id: string;
  name: string;
  description: string;
  status: MilestoneStatus;
  tasks: string[];
  completedTasks: number;
  totalTasks: number;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  artifacts: string[];
  checkpoints: string[];
}

/**
 * Progress update
 */
export interface ProgressUpdate {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  milestoneId?: string;
  details?: Record<string, unknown>;
}

/**
 * Progress tracker
 */
export class ProgressTracker {
  private milestones: Map<string, Milestone> = new Map();
  private updates: ProgressUpdate[] = [];
  private currentMilestoneId?: string;
  private startTime?: Date;

  /**
   * Create a milestone
   */
  createMilestone(name: string, description: string, tasks: string[] = []): Milestone {
    const id = `milestone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const milestone: Milestone = {
      id,
      name,
      description,
      status: 'pending',
      tasks,
      completedTasks: 0,
      totalTasks: tasks.length,
      artifacts: [],
      checkpoints: [],
    };

    this.milestones.set(id, milestone);
    this.addUpdate(`Milestone "${name}" created`, 'info');

    return milestone;
  }

  /**
   * Start a milestone
   */
  startMilestone(milestoneId: string): boolean {
    const milestone = this.milestones.get(milestoneId);
    if (!milestone) return false;

    milestone.status = 'in-progress';
    milestone.startedAt = new Date();
    this.currentMilestoneId = milestoneId;

    this.addUpdate(`Started milestone "${milestone.name}"`, 'info', milestoneId);
    return true;
  }

  /**
   * Complete a milestone
   */
  completeMilestone(milestoneId: string): boolean {
    const milestone = this.milestones.get(milestoneId);
    if (!milestone) return false;

    milestone.status = 'completed';
    milestone.completedAt = new Date();
    milestone.duration = milestone.startedAt
      ? Date.now() - milestone.startedAt.getTime()
      : 0;

    if (this.currentMilestoneId === milestoneId) {
      this.currentMilestoneId = undefined;
    }

    this.addUpdate(`Completed milestone "${milestone.name}"`, 'success', milestoneId);
    return true;
  }

  /**
   * Fail a milestone
   */
  failMilestone(milestoneId: string, reason: string): boolean {
    const milestone = this.milestones.get(milestoneId);
    if (!milestone) return false;

    milestone.status = 'failed';
    this.addUpdate(`Milestone "${milestone.name}" failed: ${reason}`, 'error', milestoneId);

    return true;
  }

  /**
   * Add a task to a milestone
   */
  addTask(milestoneId: string, task: string): boolean {
    const milestone = this.milestones.get(milestoneId);
    if (!milestone) return false;

    milestone.tasks.push(task);
    milestone.totalTasks = milestone.tasks.length;

    return true;
  }

  /**
   * Complete a task in current milestone
   */
  completeTask(task: string): boolean {
    if (!this.currentMilestoneId) return false;

    const milestone = this.milestones.get(this.currentMilestoneId);
    if (!milestone) return false;

    if (!milestone.tasks.includes(task)) {
      milestone.tasks.push(task);
      milestone.totalTasks++;
    }

    milestone.completedTasks++;
    this.addUpdate(`Completed task: ${task}`, 'success', this.currentMilestoneId);

    // Auto-complete milestone if all tasks done
    if (milestone.completedTasks >= milestone.totalTasks) {
      this.completeMilestone(milestone.id);
    }

    return true;
  }

  /**
   * Add checkpoint
   */
  addCheckpoint(milestoneId: string, checkpoint: string): boolean {
    const milestone = this.milestones.get(milestoneId);
    if (!milestone) return false;

    milestone.checkpoints.push(checkpoint);
    this.addUpdate(`Checkpoint reached: ${checkpoint}`, 'info', milestoneId);

    return true;
  }

  /**
   * Add artifact
   */
  addArtifact(milestoneId: string, artifact: string): boolean {
    const milestone = this.milestones.get(milestoneId);
    if (!milestone) return false;

    milestone.artifacts.push(artifact);
    return true;
  }

  /**
   * Add progress update
   */
  addUpdate(
    message: string,
    type: ProgressUpdate['type'],
    milestoneId?: string
  ): void {
    const update: ProgressUpdate = {
      id: `update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      message,
      type,
      milestoneId,
    };

    this.updates.push(update);
  }

  /**
   * Get overall progress
   */
  getProgress(): {
    totalMilestones: number;
    completedMilestones: number;
    totalTasks: number;
    completedTasks: number;
    overallPercentage: number;
    duration: number;
  } {
    let totalMilestones = 0;
    let completedMilestones = 0;
    let totalTasks = 0;
    let completedTasks = 0;

    for (const milestone of this.milestones.values()) {
      totalMilestones++;
      if (milestone.status === 'completed') completedMilestones++;
      totalTasks += milestone.totalTasks;
      completedTasks += milestone.completedTasks;
    }

    const duration = this.startTime
      ? Date.now() - this.startTime.getTime()
      : 0;

    return {
      totalMilestones,
      completedMilestones,
      totalTasks,
      completedTasks,
      overallPercentage: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      duration,
    };
  }

  /**
   * Start tracking session
   */
  startSession(): void {
    this.startTime = new Date();
    this.addUpdate('Progress tracking session started', 'info');
  }

  /**
   * End tracking session
   */
  endSession(): void {
    const duration = this.startTime
      ? Date.now() - this.startTime.getTime()
      : 0;

    this.addUpdate(`Session ended. Duration: ${this.formatDuration(duration)}`, 'info');
    this.startTime = undefined;
  }

  /**
   * Get all milestones
   */
  getMilestones(): Milestone[] {
    return Array.from(this.milestones.values());
  }

  /**
   * Get updates
   */
  getUpdates(): ProgressUpdate[] {
    return [...this.updates];
  }

  /**
   * Format progress display
   */
  formatProgress(): string {
    const progress = this.getProgress();
    const lines: string[] = [];

    lines.push(chalk.bold('\n📍 Progress Tracker\n'));
    lines.push(chalk.gray('='.repeat(50)));
    lines.push('');

    // Overall progress bar
    lines.push(chalk.bold('Overall Progress:'));
    lines.push(this.formatProgressBar(progress.overallPercentage));
    lines.push(`${progress.completedTasks}/${progress.totalTasks} tasks completed`);
    lines.push(`${progress.completedMilestones}/${progress.totalMilestones} milestones completed`);
    lines.push(`Duration: ${this.formatDuration(progress.duration)}`);
    lines.push('');

    // Milestones
    lines.push(chalk.bold('Milestones:'));
    lines.push(chalk.gray('-'.repeat(40)));

    for (const milestone of this.milestones.values()) {
      const statusIcon = this.getStatusIcon(milestone.status);
      const milestoneProgress = milestone.totalTasks > 0
        ? (milestone.completedTasks / milestone.totalTasks) * 100
        : 0;

      lines.push(`${statusIcon} ${milestone.name}`);
      lines.push(chalk.gray(`   ${this.formatProgressBar(milestoneProgress)} ${milestone.completedTasks}/${milestone.totalTasks}`));

      if (milestone.duration) {
        lines.push(chalk.gray(`   Duration: ${this.formatDuration(milestone.duration)}`));
      }
    }

    lines.push('');

    // Recent updates
    if (this.updates.length > 0) {
      lines.push(chalk.bold('Recent Activity:'));
      lines.push(chalk.gray('-'.repeat(40)));

      const recentUpdates = this.updates.slice(-5).reverse();
      for (const update of recentUpdates) {
        const time = update.timestamp.toLocaleTimeString();
        const typeIcon = this.getUpdateTypeIcon(update.type);
        lines.push(`${typeIcon} [${time}] ${update.message}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Format progress bar
   */
  private formatProgressBar(percentage: number): string {
    const filled = Math.round(percentage / 5);
    const empty = 20 - filled;
    const color = percentage >= 80 ? 'green' : percentage >= 50 ? 'yellow' : 'red';
    return chalk[color](`[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percentage.toFixed(1)}%`);
  }

  /**
   * Get status icon
   */
  private getStatusIcon(status: MilestoneStatus): string {
    switch (status) {
      case 'completed':
        return '✅';
      case 'in-progress':
        return '🔄';
      case 'failed':
        return '❌';
      case 'skipped':
        return '⏭️';
      default:
        return '⏳';
    }
  }

  /**
   * Get update type icon
   */
  private getUpdateTypeIcon(type: ProgressUpdate['type']): string {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  }

  /**
   * Format duration
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Reset tracker
   */
  reset(): void {
    this.milestones.clear();
    this.updates = [];
    this.currentMilestoneId = undefined;
    this.startTime = undefined;
  }
}

/**
 * Singleton instance
 */
export const progressTracker = new ProgressTracker();
