/**
 * VIBE-CLI v0.0.2 - Progress Display
 * Real-time execution status with progress bars and milestone tracking
 */

import chalk from 'chalk';
import * as readline from 'readline';

/**
 * Progress bar configuration
 */
export interface ProgressBarConfig {
  total: number;
  width?: number;
  showPercentage?: boolean;
  showCount?: boolean;
  fillChar?: string;
  emptyChar?: string;
  prefix?: string;
  suffix?: string;
}

/**
 * Spinner configuration
 */
export interface SpinnerConfig {
  message: string;
  spinnerChars?: string[];
  interval?: number;
}

/**
 * Milestone definition
 */
export interface Milestone {
  name: string;
  description?: string;
  completedAt?: Date;
  required?: boolean;
}

/**
 * Progress update event
 */
export interface ProgressUpdate {
  type: 'start' | 'progress' | 'success' | 'error' | 'warning' | 'info';
  message: string;
  details?: string;
  timestamp: Date;
  duration?: number;
}

/**
 * Progress display options
 */
export interface ProgressDisplayOptions {
  theme?: 'dark' | 'light' | 'minimal';
  showTimestamps?: boolean;
  showDuration?: boolean;
  compactMode?: boolean;
}

/**
 * Progress Display with real-time updates
 */
export class ProgressDisplay {
  private currentProgress: number = 0;
  private totalProgress: number = 0;
  private startTime: number = 0;
  private spinnerInterval?: NodeJS.Timeout;
  private spinnerIndex: number = 0;
  private message: string = '';
  private status: 'idle' | 'running' | 'success' | 'error' = 'idle';
  private milestones: Milestone[] = [];
  private completedMilestones: Milestone[] = [];
  private updates: ProgressUpdate[] = [];
  private output: NodeJS.WriteStream = process.stdout;
  private theme: 'dark' | 'light' | 'minimal' = 'dark';
  private spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

  constructor(options: ProgressDisplayOptions = {}) {
    this.theme = options.theme || 'dark';
  }

  /**
   * Start a progress bar
   */
  startProgress(total: number, message: string = 'Processing'): void {
    this.currentProgress = 0;
    this.totalProgress = total;
    this.startTime = Date.now();
    this.message = message;
    this.status = 'running';

    this.renderProgressBar();
  }

  /**
   * Update progress
   */
  updateProgress(current: number, message?: string): void {
    this.currentProgress = current;
    if (message) {
      this.message = message;
    }
    this.renderProgressBar();
  }

  /**
   * Increment progress by amount
   */
  incrementProgress(amount: number = 1, message?: string): void {
    this.updateProgress(this.currentProgress + amount, message);
  }

  /**
   * Complete progress bar
   */
  completeProgress(message: string = 'Complete'): void {
    this.currentProgress = this.totalProgress;
    this.status = 'success';
    this.renderProgressBar();
    this.clearLine();
    console.log(chalk.green(`\n${this.getCheckmark()} ${message}`));
    this.status = 'idle';
  }

  /**
   * Render progress bar
   */
  private renderProgressBar(): void {
    if (this.status !== 'running') return;

    const width = process.stdout.columns ? Math.min(process.stdout.columns - 40, 50) : 50;
    const percentage = Math.round((this.currentProgress / this.totalProgress) * 100);
    const filledWidth = Math.round((percentage / 100) * width);
    const emptyWidth = width - filledWidth;

    const filledChar = '█';
    const emptyChar = '░';

    const filled = filledChar.repeat(filledWidth);
    const empty = emptyChar.repeat(emptyWidth);

    const elapsed = this.formatDuration(Date.now() - this.startTime);
    const eta = this.estimateTimeRemaining();

    let line = `\r${this.getSpinner()} `;

    if (this.theme === 'minimal') {
      line += `${this.message} [${filled}${empty}] ${percentage}%`;
    } else {
      line += chalk.cyan(`${this.message}`) + '\n';
      line += ` [${chalk.green(filled)}${chalk.gray(empty)}] ${percentage}%\n`;
      line += chalk.gray(`  ${this.currentProgress}/${this.totalProgress} `);
      line += chalk.gray(`· ${elapsed}`);
      if (eta) {
        line += chalk.gray(` · ETA: ${eta}`);
      }
    }

    this.clearLine();
    process.stdout.write(line);
  }

  /**
   * Start a spinner
   */
  startSpinner(message: string): void {
    this.message = message;
    this.status = 'running';

    const interval = this.spinnerInterval = setInterval(() => {
      this.renderSpinner();
    }, 80);
  }

  /**
   * Render spinner
   */
  private renderSpinner(): void {
    const spinner = this.spinnerChars[this.spinnerIndex];
    this.spinnerIndex = (this.spinnerIndex + 1) % this.spinnerChars.length;

    const elapsed = this.formatDuration(Date.now() - this.startTime);
    const line = `\r${chalk.cyan(spinner)} ${this.message} ${chalk.gray(`· ${elapsed}`)}`;

    this.clearLine();
    process.stdout.write(line);
  }

  /**
   * Stop spinner with result
   */
  stopSpinner(result: 'success' | 'error' | 'warning' = 'success'): void {
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = undefined;
    }

    const icon = result === 'success' ? this.getCheckmark() :
                 result === 'error' ? this.getXmark() : this.getWarning();

    this.clearLine();
    console.log(`${icon} ${this.message}`);
  }

  /**
   * Add a milestone
   */
  addMilestone(name: string, description?: string): void {
    this.milestones.push({ name, description });
  }

  /**
   * Mark milestone as complete
   */
  completeMilestone(name: string): void {
    const milestone = this.milestones.find((m) => m.name === name);
    if (milestone) {
      milestone.completedAt = new Date();
      this.completedMilestones.push(milestone);
      this.logUpdate('success', `Milestone: ${name}`);
    }
  }

  /**
   * Show milestones progress
   */
  showMilestones(): void {
    console.log(chalk.cyan('\n📍 Milestones\n'));

    for (const milestone of this.milestones) {
      const isComplete = milestone.completedAt !== undefined;
      const icon = isComplete ? this.getCheckmark() : this.getSpinner();
      const color = isComplete ? chalk.green : chalk.gray;

      console.log(`${icon} ${color(milestone.name)}`);
      if (milestone.description) {
        console.log(chalk.gray(`   ${milestone.description}`));
      }
    }

    const progress = Math.round(
      (this.completedMilestones.length / this.milestones.length) * 100
    );
    console.log(chalk.gray(`\nProgress: ${progress}%\n`));
  }

  /**
   * Log an update
   */
  logUpdate(
    type: 'start' | 'progress' | 'success' | 'error' | 'warning' | 'info',
    message: string,
    details?: string
  ): void {
    const update: ProgressUpdate = {
      type,
      message,
      details,
      timestamp: new Date(),
      duration: this.startTime ? Date.now() - this.startTime : undefined,
    };

    this.updates.push(update);

    const icon = this.getStatusIcon(type);
    const color = this.getStatusColor(type);
    const timestamp = this.formatTimestamp(update.timestamp);

    let line = `${icon} ${color(message)}`;
    if (details) {
      line += chalk.gray(`\n   ${details}`);
    }

    console.log(line);
  }

  /**
   * Show a status message
   */
  showStatus(
    type: 'success' | 'error' | 'warning' | 'info',
    message: string
  ): void {
    const icon = this.getStatusIcon(type);
    const color = this.getStatusColor(type);

    console.log(`${icon} ${color(message)}`);
  }

  /**
   * Show a success message
   */
  success(message: string): void {
    console.log(chalk.green(`\n${this.getCheckmark()} ${message}`));
  }

  /**
   * Show an error message
   */
  error(message: string): void {
    console.log(chalk.red(`\n${this.getXmark()} ${message}`));
  }

  /**
   * Show a warning message
   */
  warning(message: string): void {
    console.log(chalk.yellow(`\n${this.getWarning()} ${message}`));
  }

  /**
   * Show an info message
   */
  info(message: string): void {
    console.log(chalk.blue(`\n${this.getInfo()} ${message}`));
  }

  /**
   * Show a step in a process
   */
  showStep(current: number, total: number, stepName: string): void {
    const progress = Math.round((current / total) * 100);
    const line = `\n${chalk.cyan(`📍 Step ${current}/${total}`)}: ${stepName}`;
    const progressBar = this.createMiniProgressBar(progress);

    console.log(`${line} ${progressBar}`);
  }

  /**
   * Show estimated time
   */
  showEstimatedTime(minutes: number, message: string = 'Estimated time'): void {
    let formattedTime: string;

    if (minutes < 1) {
      formattedTime = `${Math.round(minutes * 60)} seconds`;
    } else if (minutes < 60) {
      formattedTime = `${Math.round(minutes)} minutes`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      formattedTime = `${hours}h ${mins}m`;
    }

    console.log(chalk.gray(`\n⏱️  ${message}: ${formattedTime}`));
  }

  /**
   * Create a multi-step progress display
   */
  createMultiStep(
    steps: { name: string; estimatedDuration?: number }[]
  ): MultiStepTracker {
    return new MultiStepTracker(this, steps);
  }

  /**
   * Clear the current line
   */
  private clearLine(): void {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
  }

  /**
   * Get spinner character
   */
  private getSpinner(): string {
    return this.spinnerChars[this.spinnerIndex % this.spinnerChars.length];
  }

  /**
   * Get checkmark
   */
  private getCheckmark(): string {
    return '✓';
  }

  /**
   * Get X mark
   */
  private getXmark(): string {
    return '✗';
  }

  /**
   * Get warning symbol
   */
  private getWarning(): string {
    return '⚠';
  }

  /**
   * Get info symbol
   */
  private getInfo(): string {
    return 'ℹ';
  }

  /**
   * Get status icon
   */
  private getStatusIcon(type: ProgressUpdate['type']): string {
    switch (type) {
      case 'start':
        return '🔄';
      case 'progress':
        return '📊';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '•';
    }
  }

  /**
   * Get status color
   */
  private getStatusColor(type: ProgressUpdate['type']): typeof chalk {
    switch (type) {
      case 'success':
        return chalk.green;
      case 'error':
        return chalk.red;
      case 'warning':
        return chalk.yellow;
      case 'info':
        return chalk.blue;
      default:
        return chalk.cyan;
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
   * Estimate time remaining
   */
  private estimateTimeRemaining(): string | null {
    if (this.currentProgress === 0 || this.totalProgress === 0) {
      return null;
    }

    const elapsed = Date.now() - this.startTime;
    const rate = this.currentProgress / elapsed;
    const remaining = (this.totalProgress - this.currentProgress) / rate;

    return this.formatDuration(remaining);
  }

  /**
   * Format timestamp
   */
  private formatTimestamp(date: Date): string {
    return date.toLocaleTimeString();
  }

  /**
   * Create mini progress bar
   */
  private createMiniProgressBar(percentage: number): string {
    const width = 20;
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;

    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percentage}%`;
  }

  /**
   * Get all updates
   */
  getUpdates(): ProgressUpdate[] {
    return [...this.updates];
  }

  /**
   * Clear all updates
   */
  clearUpdates(): void {
    this.updates = [];
  }

  /**
   * Reset display state
   */
  reset(): void {
    this.currentProgress = 0;
    this.totalProgress = 0;
    this.startTime = 0;
    this.status = 'idle';
    this.milestones = [];
    this.completedMilestones = [];
    this.updates = [];

    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = undefined;
    }
  }
}

/**
 * Multi-step tracker for complex operations
 */
export class MultiStepTracker {
  private display: ProgressDisplay;
  private steps: { name: string; estimatedDuration?: number }[];
  private currentStep: number = 0;

  constructor(
    display: ProgressDisplay,
    steps: { name: string; estimatedDuration?: number }[]
  ) {
    this.display = display;
    this.steps = steps;
  }

  /**
   * Start the next step
   */
  async nextStep(): Promise<void> {
    if (this.currentStep > 0) {
      this.display.success(`${this.steps[this.currentStep - 1].name}`);
    }

    if (this.currentStep >= this.steps.length) {
      this.display.success('All steps completed');
      return;
    }

    const step = this.steps[this.currentStep];
    this.currentStep++;

    this.display.showStep(
      this.currentStep,
      this.steps.length,
      step.name
    );

    if (step.estimatedDuration) {
      this.display.showEstimatedTime(step.estimatedDuration);
    }
  }

  /**
   * Get current step index
   */
  getCurrentStep(): number {
    return this.currentStep;
  }

  /**
   * Get total steps
   */
  getTotalSteps(): number {
    return this.steps.length;
  }

  /**
   * Check if complete
   */
  isComplete(): boolean {
    return this.currentStep >= this.steps.length;
  }
}

/**
 * Singleton instance
 */
export const progressDisplay = new ProgressDisplay();
