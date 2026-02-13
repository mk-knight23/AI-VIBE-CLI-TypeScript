/**
 * VIBE-CLI v0.0.2 - Task Planner
 * Auto-decompose complex tasks into step-by-step plans
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

/**
 * Task step status
 */
export type StepStatus = 'pending' | 'in-progress' | 'completed' | 'blocked' | 'failed';

/**
 * Task step
 */
export interface TaskStep {
  id: string;
  description: string;
  status: StepStatus;
  subtasks: TaskStep[];
  dependencies: string[];
  estimatedDuration: number; // in minutes
  actualDuration?: number;
  result?: string;
  error?: string;
  artifacts: string[];
  checkpoints: string[];
}

/**
 * Task plan
 */
export interface TaskPlan {
  id: string;
  goal: string;
  steps: TaskStep[];
  status: 'planning' | 'ready' | 'executing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  totalEstimatedDuration: number;
  progress: number;
  dependencies: StepDependency[];
  metadata: Record<string, unknown>;
}

/**
 * Dependency between steps
 */
export interface StepDependency {
  from: string;
  to: string;
  type: 'required' | 'optional' | 'blocks';
}

/**
 * Task complexity
 */
export type TaskComplexity = 'simple' | 'moderate' | 'complex' | 'very-complex';

/**
 * Task Planner
 */
export class TaskPlanner {
  private plans: Map<string, TaskPlan> = new Map();

  /**
   * Create a task plan from a natural language description
   */
  async createPlan(goal: string, context?: Record<string, unknown>): Promise<TaskPlan> {
    const planId = `plan-${Date.now()}`;

    // Analyze task complexity
    const complexity = this.analyzeComplexity(goal);

    // Decompose into steps
    const steps = this.decomposeTask(goal, complexity);

    // Identify dependencies
    const dependencies = this.identifyDependencies(steps);

    // Estimate duration
    const totalEstimatedDuration = steps.reduce((sum, step) => sum + step.estimatedDuration, 0);

    const plan: TaskPlan = {
      id: planId,
      goal,
      steps,
      status: 'ready',
      createdAt: new Date(),
      totalEstimatedDuration,
      progress: 0,
      dependencies,
      metadata: {
        complexity,
        context,
      },
    };

    this.plans.set(planId, plan);
    return plan;
  }

  /**
   * Analyze task complexity
   */
  private analyzeComplexity(goal: string): TaskComplexity {
    const goalLower = goal.toLowerCase();

    // Complexity indicators
    const complexIndicators = [
      'refactor', 'redesign', 'architecture', 'migration', 'full-stack',
      'multiple', 'several', 'various', 'comprehensive', 'complete overhaul',
    ];

    const simpleIndicators = [
      'fix', 'add', 'update', 'change', 'create', 'write', 'delete',
      'simple', 'basic', 'one', 'single',
    ];

    let complexScore = 0;
    let simpleScore = 0;

    for (const indicator of complexIndicators) {
      if (goalLower.includes(indicator)) complexScore++;
    }

    for (const indicator of simpleIndicators) {
      if (goalLower.includes(indicator)) simpleScore++;
    }

    // Check for multiple files or components
    const multiPatterns = [
      /[0-9]+\s+(?:files|modules|components)/i,
      /(?:and|or|,)\s+(?:then|after)/i,
      /end-to-end/i,
      /authentication.*authorization/i,
    ];

    for (const pattern of multiPatterns) {
      if (pattern.test(goalLower)) complexScore++;
    }

    if (complexScore >= 3) return 'very-complex';
    if (complexScore >= 2) return 'complex';
    if (simpleScore >= 2) return 'simple';
    return 'moderate';
  }

  /**
   * Decompose task into steps
   */
  private decomposeTask(goal: string, complexity: TaskComplexity): TaskStep[] {
    const steps: TaskStep[] = [];
    const goalLower = goal.toLowerCase();

    // Common step templates
    const templates = this.getStepTemplates();

    // Generate initial steps
    if (goalLower.includes('create') || goalLower.includes('build') || goalLower.includes('implement')) {
      steps.push(...this.generateCreateSteps(goal, complexity));
    } else if (goalLower.includes('fix') || goalLower.includes('debug') || goalLower.includes('repair')) {
      steps.push(...this.generateFixSteps(goal, complexity));
    } else if (goalLower.includes('refactor') || goalLower.includes('improve') || goalLower.includes('optimize')) {
      steps.push(...this.generateRefactorSteps(goal, complexity));
    } else if (goalLower.includes('test') || goalLower.includes('spec')) {
      steps.push(...this.generateTestSteps(goal, complexity));
    } else {
      // Generic decomposition
      steps.push(...this.generateGenericSteps(goal, complexity));
    }

    // Add standard final steps based on complexity
    if (complexity !== 'simple') {
      steps.push(this.createStep('Review and verify changes', 10, ['validate']));
      steps.push(this.createStep('Update documentation', 15, []));
    }

    return steps;
  }

  /**
   * Get step templates
   */
  private getStepTemplates(): Record<string, string[]> {
    return {
      create: [
        'Analyze requirements and design',
        'Set up project structure',
        'Create core components',
        'Implement business logic',
        'Add error handling',
        'Write unit tests',
        'Integration testing',
      ],
      fix: [
        'Reproduce the issue',
        'Identify root cause',
        'Implement fix',
        'Add regression tests',
        'Verify fix works',
      ],
      refactor: [
        'Analyze current implementation',
        'Plan refactoring approach',
        'Make incremental changes',
        'Run tests after each change',
        'Verify functionality',
      ],
      test: [
        'Review test requirements',
        'Write test cases',
        'Implement test coverage',
        'Run and verify tests',
      ],
    };
  }

  /**
   * Generate steps for create task
   */
  private generateCreateSteps(goal: string, complexity: TaskComplexity): TaskStep[] {
    const steps: TaskStep[] = [];

    steps.push(this.createStep('Analyze requirements and design solution', 15, []));
    steps.push(this.createStep('Set up project structure and dependencies', 10, []));

    if (complexity === 'very-complex' || complexity === 'complex') {
      steps.push(this.createStep('Create data models and interfaces', 20, []));
      steps.push(this.createStep('Implement core services and utilities', 45, []));
      steps.push(this.createStep('Build user interface components', 45, []));
      steps.push(this.createStep('Add API endpoints and routes', 30, []));
    } else {
      steps.push(this.createStep('Implement core functionality', 30, []));
      steps.push(this.createStep('Add user interface', 20, []));
    }

    steps.push(this.createStep('Add error handling and validation', 15, []));
    steps.push(this.createStep('Write unit tests', 20, []));

    return steps;
  }

  /**
   * Generate steps for fix task
   */
  private generateFixSteps(goal: string, complexity: TaskComplexity): TaskStep[] {
    const steps: TaskStep[] = [];

    steps.push(this.createStep('Reproduce the issue', 10, []));
    steps.push(this.createStep('Analyze and identify root cause', 20, []));

    if (complexity === 'very-complex') {
      steps.push(this.createStep('Research potential solutions', 15, []));
    }

    steps.push(this.createStep('Implement the fix', 30, []));
    steps.push(this.createStep('Add or update tests', 15, []));
    steps.push(this.createStep('Verify fix resolves the issue', 10, []));

    return steps;
  }

  /**
   * Generate steps for refactor task
   */
  private generateRefactorSteps(goal: string, complexity: TaskComplexity): TaskStep[] {
    const steps: TaskStep[] = [];

    steps.push(this.createStep('Analyze current implementation', 15, []));
    steps.push(this.createStep('Plan refactoring approach', 10, []));

    if (complexity === 'very-complex') {
      steps.push(this.createStep('Create backup checkpoint', 5, []));
    }

    steps.push(this.createStep('Implement incremental changes', 45, []));

    steps.push(this.createStep('Run tests after each change', 15, []));
    steps.push(this.createStep('Verify functionality is preserved', 15, []));

    return steps;
  }

  /**
   * Generate steps for test task
   */
  private generateTestSteps(goal: string, complexity: TaskComplexity): TaskStep[] {
    const steps: TaskStep[] = [];

    steps.push(this.createStep('Review requirements and edge cases', 15, []));

    if (complexity === 'very-complex' || complexity === 'complex') {
      steps.push(this.createStep('Design test architecture', 10, []));
    }

    steps.push(this.createStep('Write test cases', 45, []));
    steps.push(this.createStep('Implement test coverage', 30, []));
    steps.push(this.createStep('Run and verify all tests pass', 15, []));

    return steps;
  }

  /**
   * Generate generic steps
   */
  private generateGenericSteps(goal: string, complexity: TaskComplexity): TaskStep[] {
    const steps: TaskStep[] = [];

    steps.push(this.createStep('Analyze the task requirements', 10, []));
    steps.push(this.createStep('Plan the implementation approach', 15, []));

    if (complexity !== 'simple') {
      steps.push(this.createStep('Implement the solution', 45, []));
      steps.push(this.createStep('Add error handling', 10, []));
    } else {
      steps.push(this.createStep('Implement the change', 15, []));
    }

    steps.push(this.createStep('Test the implementation', 15, []));

    return steps;
  }

  /**
   * Create a single step
   */
  private createStep(description: string, duration: number, dependencies: string[]): TaskStep {
    const stepId = `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: stepId,
      description,
      status: 'pending',
      subtasks: [],
      dependencies,
      estimatedDuration: duration,
      artifacts: [],
      checkpoints: [],
    };
  }

  /**
   * Identify dependencies between steps
   */
  private identifyDependencies(steps: TaskStep[]): StepDependency[] {
    const dependencies: StepDependency[] = [];

    // Create a mapping of keywords to step indices
    const keywordMap = new Map<string, number[]>();

    const keywords = ['design', 'structure', 'components', 'interface', 'logic', 'error', 'test', 'documentation'];
    for (let i = 0; i < steps.length; i++) {
      const stepLower = steps[i].description.toLowerCase();
      for (const keyword of keywords) {
        if (stepLower.includes(keyword)) {
          if (!keywordMap.has(keyword)) {
            keywordMap.set(keyword, []);
          }
          keywordMap.get(keyword)!.push(i);
        }
      }
    }

    // Add sequential dependencies
    for (let i = 1; i < steps.length; i++) {
      dependencies.push({
        from: steps[i - 1].id,
        to: steps[i].id,
        type: 'required',
      });
    }

    return dependencies;
  }

  /**
   * Get a plan by ID
   */
  getPlan(planId: string): TaskPlan | undefined {
    return this.plans.get(planId);
  }

  /**
   * Update step status
   */
  updateStepStatus(planId: string, stepId: string, status: StepStatus, result?: string): boolean {
    const plan = this.plans.get(planId);
    if (!plan) return false;

    const step = plan.steps.find((s) => s.id === stepId);
    if (!step) return false;

    step.status = status;
    if (result) step.result = result;

    // Update progress
    const completedSteps = plan.steps.filter((s) => s.status === 'completed').length;
    plan.progress = (completedSteps / plan.steps.length) * 100;

    // Check if all steps are complete
    if (plan.steps.every((s) => s.status === 'completed')) {
      plan.status = 'completed';
      plan.completedAt = new Date();
    }

    return true;
  }

  /**
   * Format plan for display
   */
  formatPlan(plan: TaskPlan): string {
    const lines: string[] = [];

    const statusColor = this.getStatusColor(plan.status);

    lines.push(chalk.bold('\n📋 Task Plan\n'));
    lines.push(chalk.gray('='.repeat(50)));
    lines.push('');
    lines.push(chalk.bold(`Goal: ${plan.goal}`));
    lines.push(`Status: ${statusColor(plan.status)}`);
    lines.push(`Progress: ${this.formatProgress(plan.progress)}`);
    lines.push(`Estimated Duration: ${plan.totalEstimatedDuration} minutes`);
    lines.push('');

    lines.push(chalk.bold('Steps:'));
    lines.push(chalk.gray('-'.repeat(40)));

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      const statusIcon = this.getStepStatusIcon(step.status);
      const duration = `${step.estimatedDuration}m`;

      lines.push(`${statusIcon} Step ${i + 1}: ${step.description}`);
      lines.push(chalk.gray(`   Duration: ${duration} | Status: ${step.status}`));

      if (step.result) {
        lines.push(chalk.green(`   Result: ${step.result}`));
      }

      if (step.error) {
        lines.push(chalk.red(`   Error: ${step.error}`));
      }

      if (step.dependencies.length > 0) {
        lines.push(chalk.gray(`   Depends on: ${step.dependencies.join(', ')}`));
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Get status color
   */
  private getStatusColor(status: TaskPlan['status']): (text: string) => string {
    switch (status) {
      case 'completed':
        return chalk.green;
      case 'executing':
        return chalk.cyan;
      case 'failed':
        return chalk.red;
      default:
        return chalk.yellow;
    }
  }

  /**
   * Get step status icon
   */
  private getStepStatusIcon(status: StepStatus): string {
    switch (status) {
      case 'completed':
        return '✅';
      case 'in-progress':
        return '🔄';
      case 'blocked':
        return '🚫';
      case 'failed':
        return '❌';
      default:
        return '⏳';
    }
  }

  /**
   * Format progress bar
   */
  private formatProgress(progress: number): string {
    const filled = Math.round(progress / 5);
    const empty = 20 - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${progress.toFixed(0)}%`;
  }

  /**
   * Export plan to JSON
   */
  exportToJSON(planId: string): string {
    const plan = this.plans.get(planId);
    if (!plan) return '{}';
    return JSON.stringify(plan, null, 2);
  }
}

/**
 * Singleton instance
 */
export const taskPlanner = new TaskPlanner();
