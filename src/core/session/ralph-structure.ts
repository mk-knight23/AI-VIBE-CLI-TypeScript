/**
 * Ralph Folder Structure
 *
 * Manages .ralph/ directory structure compatible with Ralph-Claude-Code format.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Task, TaskPriority, TaskStatus } from './session-types.js';

export interface RalphStructurePaths {
  root: string;
  prompt: string;
  fixPlan: string;
  agent: string;
  sessions: string;
}

export interface FixPlanSection {
  priority: TaskPriority;
  tasks: Task[];
}

export class RalphStructure {
  private paths: RalphStructurePaths;

  constructor(projectRoot: string = '.') {
    this.paths = this.buildPaths(projectRoot);
  }

  /**
   * Initialize .ralph/ directory structure
   */
  async initialize(): Promise<void> {
    await this.ensureDirectories();
    await this.createInitialFiles();
  }

  /**
   * Write PROMPT.md file
   */
  async writePrompt(task: string, description?: string): Promise<void> {
    const content = this.buildPromptContent(task, description);
    await fs.writeFile(this.paths.prompt, content, 'utf-8');
  }

  /**
   * Read PROMPT.md file
   */
  async readPrompt(): Promise<string> {
    try {
      return await fs.readFile(this.paths.prompt, 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return '';
      }
      throw error;
    }
  }

  /**
   * Write fix_plan.md file
   */
  async writeFixPlan(sections: FixPlanSection[]): Promise<void> {
    const content = this.buildFixPlanContent(sections);
    await fs.writeFile(this.paths.fixPlan, content, 'utf-8');
  }

  /**
   * Read and parse fix_plan.md file
   */
  async readFixPlan(): Promise<FixPlanSection[]> {
    try {
      const content = await fs.readFile(this.paths.fixPlan, 'utf-8');
      return this.parseFixPlanContent(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Update task status in fix_plan.md
   */
  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    const sections = await this.readFixPlan();

    for (const section of sections) {
      const task = section.tasks.find(t => t.id === taskId);
      if (task) {
        task.status = status;
        if (status === TaskStatus.COMPLETED) {
          task.completedAt = new Date();
        }
        break;
      }
    }

    await this.writeFixPlan(sections);
  }

  /**
   * Write AGENT.md file
   */
  async writeAgent(config: any): Promise<void> {
    const content = this.buildAgentContent(config);
    await fs.writeFile(this.paths.agent, content, 'utf-8');
  }

  /**
   * Read AGENT.md file
   */
  async readAgent(): Promise<any> {
    try {
      const content = await fs.readFile(this.paths.agent, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {};
      }
      throw error;
    }
  }

  /**
   * Check if .ralph/ structure exists
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.paths.root);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get structure paths
   */
  getPaths(): RalphStructurePaths {
    return { ...this.paths };
  }

  /**
   * Build paths for .ralph/ structure
   */
  private buildPaths(projectRoot: string): RalphStructurePaths {
    const root = path.join(projectRoot, '.ralph');

    return {
      root,
      prompt: path.join(root, 'PROMPT.md'),
      fixPlan: path.join(root, 'fix_plan.md'),
      agent: path.join(root, 'AGENT.md'),
      sessions: path.join(root, 'sessions'),
    };
  }

  /**
   * Ensure all directories exist
   */
  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.paths.root, { recursive: true });
    await fs.mkdir(this.paths.sessions, { recursive: true });
  }

  /**
   * Create initial files
   */
  private async createInitialFiles(): Promise<void> {
    const promptExists = await this.fileExists(this.paths.prompt);
    if (!promptExists) {
      await this.writePrompt('Your task description here', 'Add more details about the task...');
    }

    const fixPlanExists = await this.fileExists(this.paths.fixPlan);
    if (!fixPlanExists) {
      await this.writeFixPlan([]);
    }

    const agentExists = await this.fileExists(this.paths.agent);
    if (!agentExists) {
      await this.writeAgent({
        model: 'claude-sonnet-4.5',
        temperature: 0.7,
        maxTokens: 8192,
      });
    }
  }

  /**
   * Build PROMPT.md content
   */
  private buildPromptContent(task: string, description?: string): string {
    const lines: string[] = [];

    lines.push('# Task');
    lines.push(task);

    if (description) {
      lines.push('\n# Description');
      lines.push(description);
    }

    lines.push('\n# Notes');
    lines.push('Last updated: ' + new Date().toISOString());

    return lines.join('\n');
  }

  /**
   * Build fix_plan.md content
   */
  private buildFixPlanContent(sections: FixPlanSection[]): string {
    const lines: string[] = [];

    lines.push('# Fix Plan');
    lines.push('\nThis document tracks tasks and their priorities.');
    lines.push('\n---');

    const priorityOrder = [TaskPriority.P0, TaskPriority.P1, TaskPriority.P2, TaskPriority.P3];

    for (const priority of priorityOrder) {
      const section = sections.find(s => s.priority === priority);
      if (!section || section.tasks.length === 0) continue;

      lines.push(`\n## ${priority} - ${this.getPriorityLabel(priority)}`);

      for (const task of section.tasks) {
        const checkbox = this.statusToCheckbox(task.status);
        lines.push(`\n${checkbox} [${task.id}] ${task.title}`);

        if (task.description) {
          lines.push(`  - ${task.description}`);
        }

        if (task.assignee) {
          lines.push(`  - Assigned to: ${task.assignee}`);
        }

        if (task.estimatedHours) {
          lines.push(`  - Estimated: ${task.estimatedHours}h`);
        }

        if (task.dependencies.length > 0) {
          lines.push(`  - Depends on: ${task.dependencies.join(', ')}`);
        }
      }
    }

    lines.push('\n---');
    lines.push('\nLast updated: ' + new Date().toISOString());

    return lines.join('\n');
  }

  /**
   * Parse fix_plan.md content
   */
  private parseFixPlanContent(content: string): FixPlanSection[] {
    const sections: FixPlanSection[] = [];
    const lines = content.split('\n');

    let currentPriority: TaskPriority | null = null;
    let currentTask: Task | null = null;

    for (const line of lines) {
      // Check for priority header
      const priorityMatch = line.match(/^## (P[0-3]) - /);
      if (priorityMatch) {
        currentPriority = priorityMatch[1] as TaskPriority;
        sections.push({ priority: currentPriority, tasks: [] });
        continue;
      }

      // Check for task
      const taskMatch = line.match(/^\[[ x-]\] \[([^\]]+)\] (.+)/);
      if (taskMatch && currentPriority) {
        const taskId = taskMatch[1];
        const taskTitle = taskMatch[2];
        const status = this.checkboxToStatus(line[1]);

        currentTask = {
          id: taskId,
          title: taskTitle,
          description: '',
          priority: currentPriority,
          status,
          dependencies: [],
        };

        const currentSection = sections[sections.length - 1];
        currentSection.tasks.push(currentTask);
        continue;
      }

      // Check for task details
      if (line.startsWith('  - ') && currentTask) {
        const detail = line.substring(4);

        if (detail.startsWith('Assigned to: ')) {
          currentTask.assignee = detail.substring(13);
        } else if (detail.startsWith('Estimated: ')) {
          const match = detail.match(/(\d+)h/);
          if (match) {
            currentTask.estimatedHours = parseInt(match[1], 10);
          }
        } else if (detail.startsWith('Depends on: ')) {
          const deps = detail.substring(12).split(',').map(d => d.trim());
          currentTask.dependencies = deps;
        } else {
          currentTask.description = detail;
        }
      }
    }

    return sections;
  }

  /**
   * Build AGENT.md content
   */
  private buildAgentContent(config: any): string {
    return '# Agent Configuration\n\n```json\n' + JSON.stringify(config, null, 2) + '\n```\n';
  }

  /**
   * Convert status to checkbox
   */
  private statusToCheckbox(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.COMPLETED:
        return '[x]';
      case TaskStatus.IN_PROGRESS:
        return '[~]';
      case TaskStatus.BLOCKED:
        return '[!]';
      default:
        return '[ ]';
    }
  }

  /**
   * Convert checkbox to status
   */
  private checkboxToStatus(char: string): TaskStatus {
    switch (char) {
      case 'x':
        return TaskStatus.COMPLETED;
      case '~':
        return TaskStatus.IN_PROGRESS;
      case '!':
        return TaskStatus.BLOCKED;
      default:
        return TaskStatus.TODO;
    }
  }

  /**
   * Get priority label
   */
  private getPriorityLabel(priority: TaskPriority): string {
    switch (priority) {
      case TaskPriority.P0:
        return 'Critical Path';
      case TaskPriority.P1:
        return 'High Priority';
      case TaskPriority.P2:
        return 'Medium Priority';
      case TaskPriority.P3:
        return 'Low Priority';
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
