/**
 * VIBE-CLI v12 - Tool Execution Engine
 * Safe, sandboxed execution with approval gates and rollback support
 */

import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { VibeApprovalManager } from '../approvals';
import type { IApprovalSystem, ApprovalDetails, ApprovalType, ApprovalRisk, MultiEditResult, EditOperation, EditResult } from '../types';

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode?: number;
  duration: number;
  filesChanged?: string[];
}

export interface ToolConfig {
  name: string;
  command: string;
  args?: string[];
  workingDir?: string;
  env?: Record<string, string>;
  timeout?: number;
  requiresApproval?: boolean;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  allowedInSandbox?: boolean;
}

export interface ExecutionContext {
  sessionId: string;
  checkpointId?: string;
  approved: boolean;
  dryRun: boolean;
  sandbox: boolean;
  workingDir?: string;
}

export class VibeToolExecutor {
  private approvalSystem: IApprovalSystem;
  private checkpointSystem: VibeCheckpointSystem;
  private history: ToolResult[] = [];
  
  constructor(approvalSystem?: IApprovalSystem) {
    this.approvalSystem = approvalSystem || new VibeApprovalManager();
    this.checkpointSystem = new VibeCheckpointSystem();
  }

  /**
   * Execute a shell command directly
   */
  async executeShell(command: string): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      const output = child_process.execSync(command, {
        encoding: 'utf-8',
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024,
      });
      
      return {
        success: true,
        output,
        duration: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        success: false,
        output: error.stdout?.toString() || '',
        error: error.message,
        exitCode: error.status,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute a tool with safety checks
   */
  async execute(
    config: ToolConfig,
    context: ExecutionContext
  ): Promise<ToolResult> {
    const startTime = Date.now();
    
    // Create checkpoint for rollback
    const checkpointId = await this.checkpointSystem.create(
      context.sessionId,
      `Before: ${config.name}`
    );
    
    try {
      // Check approval requirement
      if (config.requiresApproval && !context.approved) {
        const approved = await this.requestApproval(config, context);
        if (!approved) {
          return {
            success: false,
            output: '',
            error: 'Execution cancelled by user',
            duration: Date.now() - startTime,
          };
        }
      }
      
      // Dry run mode
      if (context.dryRun) {
        return {
          success: true,
          output: this.formatDryRun(config, context),
          duration: Date.now() - startTime,
        };
      }
      
      // Sandbox mode
      if (context.sandbox && !config.allowedInSandbox) {
        return {
          success: false,
          output: '',
          error: 'This tool is not allowed in sandbox mode',
          duration: Date.now() - startTime,
        };
      }
      
      // Execute the command
      const result = await this.runCommand(config, context);
      
      // Store in history
      this.history.push(result);
      
      return result;
      
    } catch (error) {
      // Rollback on error
      await this.checkpointSystem.restore(checkpointId);
      
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Run a shell command
   */
  private async runCommand(
    config: ToolConfig,
    context: ExecutionContext
  ): Promise<ToolResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const options: child_process.ExecSyncOptions = {
        cwd: context.workingDir || config.workingDir || process.cwd(),
        timeout: config.timeout || 60000,
        maxBuffer: 10 * 1024 * 1024, // 10MB
      };
      
      if (config.env) {
        options.env = { ...process.env, ...config.env };
      }
      
      try {
        const fullCommand = [config.command, ...(config.args || [])].join(' ');
        const output = child_process.execSync(fullCommand, options);
        
        resolve({
          success: true,
          output: output.toString(),
          duration: Date.now() - startTime,
        });
      } catch (error: any) {
        resolve({
          success: false,
          output: error.stdout?.toString() || '',
          error: error.message,
          exitCode: error.status,
          duration: Date.now() - startTime,
        });
      }
    });
  }

  /**
   * Request approval for execution
   */
  private async requestApproval(
    config: ToolConfig,
    _context: ExecutionContext
  ): Promise<boolean> {
    const riskType: ApprovalType = config.riskLevel === 'high' ? 'deploy' : 'shell';
    const risk: ApprovalRisk = config.riskLevel as ApprovalRisk || 'medium';
    
    const details: ApprovalDetails = {
      id: `approval-${Date.now()}`,
      type: riskType,
      risk,
      description: `Execute: ${config.name}`,
      operations: [`${config.command} ${config.args?.join(' ') || ''}`],
      status: 'pending',
      requestedAt: new Date(),
    };
    
    return await this.approvalSystem.requestApproval(details);
  }

  /**
   * Format dry run output
   */
  private formatDryRun(config: ToolConfig, context: ExecutionContext): string {
    return `[DRY RUN] Would execute:
  Command: ${config.command}
  Args: ${config.args?.join(' ') || '(none)'}
  Working Dir: ${context.workingDir || process.cwd()}
  Risk: ${config.riskLevel || 'unknown'}`;
  }

  /**
   * Get execution history
   */
  getHistory(): ToolResult[] {
    return [...this.history];
  }

  /**
   * Clear execution history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Multi-edit: Perform multiple file edits atomically
   */
  async multiEdit(operations: EditOperation[], context: ExecutionContext): Promise<MultiEditResult> {
    const startTime = Date.now();
    const results: EditResult[] = [];
    let successfulFiles = 0;
    let failedFiles = 0;

    // Create checkpoint before multi-edit
    const checkpointId = await this.checkpointSystem.create(
      context.sessionId,
      `Before multi-edit (${operations.length} operations)`
    );

    try {
      for (const op of operations) {
        const result = await this.applyEdit(op, context);
        results.push(result);
        if (result.success) {
          successfulFiles++;
        } else {
          failedFiles++;
        }
      }

      return {
        success: failedFiles === 0,
        totalFiles: operations.length,
        successfulFiles,
        failedFiles,
        results,
        checkpointId,
      };
    } catch (error) {
      // Rollback on error
      await this.checkpointSystem.restore(checkpointId);
      return {
        success: false,
        totalFiles: operations.length,
        successfulFiles: 0,
        failedFiles: operations.length,
        results,
        checkpointId,
      };
    }
  }

  /**
   * Apply a single edit operation
   */
  private async applyEdit(op: EditOperation, _context: ExecutionContext): Promise<EditResult> {
    const filePath = path.isAbsolute(op.file) ? op.file : path.join(process.cwd(), op.file);

    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        file: op.file,
        changes: [],
        error: 'File not found',
      };
    }

    try {
      let content = fs.readFileSync(filePath, 'utf-8');
      const changes: EditResult['changes'] = [];

      switch (op.type) {
        case 'replace':
          if (op.searchPattern && op.replacement !== undefined) {
            const beforeLen = content.length;
            content = content.split(op.searchPattern).join(op.replacement);
            if (content.length !== beforeLen) {
              changes.push({ type: 'replace', content: op.replacement });
            }
          }
          break;

        case 'insert':
          if (op.lineNumber && op.replacement !== undefined) {
            const lines = content.split('\n');
            lines.splice(op.lineNumber, 0, op.replacement);
            content = lines.join('\n');
            changes.push({ type: 'insert', lineStart: op.lineNumber, content: op.replacement });
          }
          break;

        case 'append':
          if (op.replacement !== undefined) {
            content += '\n' + op.replacement;
            changes.push({ type: 'append', content: op.replacement });
          }
          break;

        case 'delete':
          if (op.searchPattern) {
            const beforeLen = content.length;
            content = content.split(op.searchPattern).join('');
            if (content.length !== beforeLen) {
              changes.push({ type: 'delete', content: op.searchPattern });
            }
          }
          break;
      }

      fs.writeFileSync(filePath, content);

      return {
        success: true,
        file: op.file,
        changes,
      };
    } catch (error) {
      return {
        success: false,
        file: op.file,
        changes: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Read a file
   */
  readFile(filePath: string): string | null {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    try {
      return fs.readFileSync(absolutePath, 'utf-8');
    } catch {
      return null;
    }
  }

  /**
   * Write a file with diff preview
   */
  async writeFile(
    filePath: string,
    content: string,
    context: ExecutionContext,
    showDiff: boolean = true
  ): Promise<{ success: boolean; checkpointId?: string }> {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    const dir = path.dirname(absolutePath);

    // Create directory if needed
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Show diff if file exists
    if (showDiff && fs.existsSync(absolutePath)) {
      const existingContent = fs.readFileSync(absolutePath, 'utf-8');
      this.showDiff(existingContent, content, filePath);
    }

    // Create checkpoint
    const checkpointId = await this.checkpointSystem.create(
      context.sessionId,
      `Before writing ${filePath}`
    );

    try {
      fs.writeFileSync(absolutePath, content);
      return { success: true, checkpointId };
    } catch (error) {
      await this.checkpointSystem.restore(checkpointId);
      return { success: false };
    }
  }

  /**
   * Show a diff between two strings
   */
  private showDiff(oldContent: string, newContent: string, filePath: string): void {
    console.log(chalk.cyan(`\n─── Diff: ${filePath} ───\n`));

    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    const maxLines = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];

      if (oldLine === newLine) {
        // Unchanged
        console.log(chalk.gray(`  ${String(i + 1).padStart(3)} │ ${oldLine || ''}`));
      } else {
        if (oldLine !== undefined) {
          console.log(chalk.red(`-${String(i + 1).padStart(3)} │ ${oldLine}`));
        }
        if (newLine !== undefined) {
          console.log(chalk.green(`+${String(i + 1).padStart(3)} │ ${newLine}`));
        }
      }
    }
    console.log('');
  }
}

/**
 * VIBE-CLI v12 - Checkpoint System
 * Version control for file system operations
 */
export class VibeCheckpointSystem {
  private checkpoints: Map<string, Checkpoint> = new Map();
  private storageDir: string;
  
  constructor() {
    this.storageDir = path.join(process.cwd(), '.vibe', 'checkpoints');
    this.ensureStorageDir();
  }
  
  private ensureStorageDir(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  /**
   * Create a checkpoint
   */
  async create(sessionId: string, description: string): Promise<string> {
    const checkpointId = `chk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    
    // Get all modified files in current state
    const files = this.getModifiedFiles();
    
    const checkpoint: Checkpoint = {
      id: checkpointId,
      sessionId,
      description,
      createdAt: new Date(),
      files,
      diffs: await this.captureDiffs(files),
    };
    
    // Save to disk
    const checkpointPath = path.join(this.storageDir, `${checkpointId}.json`);
    fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
    
    this.checkpoints.set(checkpointId, checkpoint);
    
    return checkpointId;
  }

  /**
   * Restore to a checkpoint
   */
  async restore(checkpointId: string): Promise<boolean> {
    const checkpointPath = path.join(this.storageDir, `${checkpointId}.json`);
    
    if (!fs.existsSync(checkpointPath)) {
      return false;
    }
    
    const checkpoint: Checkpoint = JSON.parse(
      fs.readFileSync(checkpointPath, 'utf-8')
    );
    
    // Apply reverse diffs
    for (const diff of checkpoint.diffs.reverse()) {
      if (diff.type === 'modified' && diff.originalContent) {
        fs.writeFileSync(diff.path, diff.originalContent);
      } else if (diff.type === 'created') {
        fs.rmSync(diff.path, { force: true });
      }
    }
    
    this.checkpoints.delete(checkpointId);
    
    return true;
  }

  /**
   * Get list of checkpoints for a session
   */
  list(sessionId: string): CheckpointInfo[] {
    const checkpoints: CheckpointInfo[] = [];
    
    for (const [id, cp] of this.checkpoints) {
      if (cp.sessionId === sessionId) {
        checkpoints.push({
          id: cp.id,
          description: cp.description,
          createdAt: cp.createdAt,
          fileCount: cp.files.length,
        });
      }
    }
    
    return checkpoints.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Get files that have been modified
   */
  private getModifiedFiles(): string[] {
    const gitDir = path.join(process.cwd(), '.git');
    
    if (!fs.existsSync(gitDir)) {
      // Non-git repo - return all tracked files
      return this.getAllTrackedFiles();
    }
    
    try {
      const output = child_process.execSync('git ls-files -m', {
        cwd: process.cwd(),
        encoding: 'utf-8',
      });
      return output.trim().split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }

  /**
   * Get all tracked files
   */
  private getAllTrackedFiles(): string[] {
    try {
      const output = child_process.execSync('git ls-files', {
        cwd: process.cwd(),
        encoding: 'utf-8',
      });
      return output.trim().split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }

  /**
   * Capture current file contents for checkpoint
   * Returns the originalContent needed for restore
   */
  private async captureDiffs(files: string[]): Promise<FileDiff[]> {
    const diffs: FileDiff[] = [];

    for (const file of files) {
      const filePath = path.join(process.cwd(), file);

      if (!fs.existsSync(filePath)) {
        continue;
      }

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        diffs.push({
          path: file,
          type: 'modified',
          originalContent: content, // Store as originalContent for restore
        });
      } catch {
        // Skip files we can't read
      }
    }

    return diffs;
  }
}

interface Checkpoint {
  id: string;
  sessionId: string;
  description: string;
  createdAt: Date;
  files: string[];
  diffs: FileDiff[];
}

interface CheckpointInfo {
  id: string;
  description: string;
  createdAt: Date;
  fileCount: number;
}

interface FileDiff {
  path: string;
  type: 'created' | 'modified' | 'deleted';
  originalContent?: string;
  currentContent?: string;
}
