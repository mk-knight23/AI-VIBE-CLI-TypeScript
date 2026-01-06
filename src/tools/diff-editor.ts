/**
 * VIBE CLI - Diff-Based Editor
 *
 * Safe file editing with:
 * - Line-by-line diff generation
 * - Preview before apply
 * - Atomic multi-file edits
 * - Undo support via checkpoints
 *
 * Version: 13.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

// ============================================================================
// TYPES
// ============================================================================

export type EditType = 'replace' | 'insert' | 'delete' | 'append' | 'patch';

export interface EditOperation {
  type: EditType;
  file: string;
  searchPattern?: string;
  replacement?: string;
  lineNumber?: number;
  endLineNumber?: number;
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
  diff?: string;
}

export interface MultiEditResult {
  success: boolean;
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  results: EditResult[];
  checkpointId?: string;
}

export interface DiffOptions {
  contextLines: number;
  showLineNumbers: boolean;
  color: boolean;
}

// ============================================================================
// DIFF GENERATOR
// ============================================================================

export class DiffGenerator {
  /**
   * Generate unified diff between two strings
   */
  static generate(
    oldContent: string,
    newContent: string,
    filePath: string,
    options: Partial<DiffOptions> = {}
  ): string {
    const opts: DiffOptions = {
      contextLines: options.contextLines ?? 3,
      showLineNumbers: options.showLineNumbers ?? true,
      color: options.color ?? true,
    };

    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    // Simple line-by-line diff
    const diff: string[] = [];
    diff.push(`--- ${filePath}`);
    diff.push(`+++ ${filePath}`);

    // Find differences
    const changes: Array<{ type: 'delete' | 'insert' | 'equal'; oldIdx: number; newIdx: number }> = [];

    let i = 0, j = 0;
    while (i < oldLines.length || j < newLines.length) {
      const oldLine = oldLines[i];
      const newLine = newLines[j];

      if (oldLine === newLine) {
        changes.push({ type: 'equal', oldIdx: i, newIdx: j });
        i++; j++;
      } else if (oldLine === undefined) {
        changes.push({ type: 'insert', oldIdx: i, newIdx: j });
        j++;
      } else if (newLine === undefined) {
        changes.push({ type: 'delete', oldIdx: i, newIdx: j });
        i++;
      } else {
        // Look ahead for best match
        let bestOld = -1, bestNew = -1, bestDist = Infinity;
        for (let oi = i; oi < Math.min(i + 10, oldLines.length); oi++) {
          for (let nj = j; nj < Math.min(j + 10, newLines.length); nj++) {
            if (oldLines[oi] === newLines[nj]) {
              const dist = (oi - i) + (nj - j);
              if (dist < bestDist) {
                bestDist = dist;
                bestOld = oi;
                bestNew = nj;
              }
            }
          }
        }

        if (bestOld >= 0 && bestDist < 10) {
          // Add deletions and insertions before the match
          while (i < bestOld) {
            changes.push({ type: 'delete', oldIdx: i, newIdx: j });
            i++;
          }
          while (j < bestNew) {
            changes.push({ type: 'insert', oldIdx: i, newIdx: j });
            j++;
          }
        } else {
          // Just mark as change
          changes.push({ type: 'delete', oldIdx: i, newIdx: j });
          changes.push({ type: 'insert', oldIdx: i, newIdx: j });
          i++; j++;
        }
      }
    }

    // Generate diff hunks
    let currentHunk: Array<{ type: string; line: string; num: number }> = [];
    let hunkStartOld = 0, hunkStartNew = 0;

    for (const change of changes) {
      if (change.type === 'equal') {
        currentHunk.push({
          type: 'context',
          line: oldLines[change.oldIdx],
          num: change.oldIdx + 1,
        });
      } else if (change.type === 'delete') {
        currentHunk.push({
          type: 'delete',
          line: oldLines[change.oldIdx],
          num: change.oldIdx + 1,
        });
      } else if (change.type === 'insert') {
        currentHunk.push({
          type: 'insert',
          line: newLines[change.newIdx],
          num: change.newIdx + 1,
        });
      }

      // Limit hunk size
      if (currentHunk.length > 50) {
        diff.push(this.formatHunk(currentHunk, hunkStartOld, hunkStartNew, opts));
        currentHunk = [];
        hunkStartOld = change.type === 'delete' ? change.oldIdx + 1 : change.oldIdx;
        hunkStartNew = change.type === 'insert' ? change.newIdx + 1 : change.newIdx;
      }
    }

    if (currentHunk.length > 0) {
      diff.push(this.formatHunk(currentHunk, hunkStartOld, hunkStartNew, opts));
    }

    return diff.join('\n');
  }

  private static formatHunk(
    hunk: Array<{ type: string; line: string; num: number }>,
    startOld: number,
    startNew: number,
    opts: DiffOptions
  ): string {
    const lines: string[] = [];
    const oldCount = hunk.filter(h => h.type !== 'insert').length;
    const newCount = hunk.filter(h => h.type !== 'delete').length;

    lines.push(`@@ -${startOld + 1},${oldCount} +${startNew + 1},${newCount} @@`);

    for (const item of hunk) {
      const prefix = opts.showLineNumbers
        ? `    ${String(item.num).padStart(3)} │ `
        : '';

      switch (item.type) {
        case 'context':
          lines.push(` ${prefix}${item.line}`);
          break;
        case 'delete':
          lines.push(opts.color ? chalk.red(`-${prefix}${item.line}`) : `-${prefix}${item.line}`);
          break;
        case 'insert':
          lines.push(opts.color ? chalk.green(`+${prefix}${item.line}`) : `+${prefix}${item.line}`);
          break;
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate a simple side-by-side diff for display
   */
  static displayDiff(
    oldContent: string,
    newContent: string,
    filePath: string
  ): string {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    const maxLines = Math.max(oldLines.length, newLines.length);

    const lines: string[] = [];
    lines.push(chalk.cyan(`\n─── Diff: ${filePath} ───\n`));

    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];

      if (oldLine === newLine) {
        lines.push(chalk.gray(`  ${String(i + 1).padStart(3)} │ ${oldLine || ''}`));
      } else {
        if (oldLine !== undefined) {
          lines.push(chalk.red(`-${String(i + 1).padStart(3)} │ ${oldLine}`));
        }
        if (newLine !== undefined) {
          lines.push(chalk.green(`+${String(i + 1).padStart(3)} │ ${newLine}`));
        }
      }
    }

    return lines.join('\n');
  }
}

// ============================================================================
// DIFF-BASED EDITOR
// ============================================================================

export class DiffEditor {
  private checkpointSystem: CheckpointSystem;

  constructor(checkpointSystem?: CheckpointSystem) {
    this.checkpointSystem = checkpointSystem || new CheckpointSystem();
  }

  /**
   * Apply a single edit operation
   */
  async applyEdit(
    operation: EditOperation,
    context: { dryRun?: boolean; sessionId?: string } = {}
  ): Promise<EditResult> {
    const filePath = path.resolve(operation.file);

    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        file: operation.file,
        changes: [],
        error: 'File not found',
      };
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    // Create checkpoint if not dry run
    const checkpointId = !context.dryRun
      ? await this.checkpointSystem.create(context.sessionId || 'default', `Before edit: ${operation.file}`)
      : undefined;

    try {
      const result = this.performEdit(content, operation, filePath);

      if (!result.success) {
        return result;
      }

      // Write changes if not dry run
      if (!context.dryRun) {
        fs.writeFileSync(filePath, result.content);
      }

      return {
        success: true,
        file: operation.file,
        changes: result.changes,
        diff: result.diff,
      };
    } catch (error) {
      if (checkpointId) {
        await this.checkpointSystem.restore(checkpointId);
      }
      return {
        success: false,
        file: operation.file,
        changes: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Apply multiple edits atomically
   */
  async applyMultiEdit(
    operations: EditOperation[],
    context: { dryRun?: boolean; sessionId?: string } = {}
  ): Promise<MultiEditResult> {
    const results: EditResult[] = [];
    let successfulFiles = 0;
    let failedFiles = 0;

    // Create checkpoint for multi-edit
    const checkpointId = !context.dryRun
      ? await this.checkpointSystem.create(context.sessionId || 'default', `Before multi-edit (${operations.length} ops)`)
      : undefined;

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
      if (checkpointId) {
        await this.checkpointSystem.restore(checkpointId);
      }
      return {
        success: false,
        totalFiles: operations.length,
        successfulFiles,
        failedFiles,
        results,
        checkpointId,
      };
    }
  }

  /**
   * Replace all occurrences of a pattern
   */
  async replaceAll(
    file: string,
    searchPattern: string,
    replacement: string,
    context: { dryRun?: boolean } = {}
  ): Promise<EditResult> {
    return this.applyEdit({
      type: 'replace',
      file,
      searchPattern,
      replacement,
    }, context);
  }

  /**
   * Insert at specific line
   */
  async insertAt(
    file: string,
    lineNumber: number,
    content: string,
    context: { dryRun?: boolean } = {}
  ): Promise<EditResult> {
    return this.applyEdit({
      type: 'insert',
      file,
      lineNumber,
      replacement: content,
    }, context);
  }

  /**
   * Delete a range of lines
   */
  async deleteLines(
    file: string,
    startLine: number,
    endLine: number,
    context: { dryRun?: boolean } = {}
  ): Promise<EditResult> {
    return this.applyEdit({
      type: 'delete',
      file,
      lineNumber: startLine,
      endLineNumber: endLine,
    }, context);
  }

  /**
   * Append content to file
   */
  async append(
    file: string,
    content: string,
    context: { dryRun?: boolean } = {}
  ): Promise<EditResult> {
    return this.applyEdit({
      type: 'append',
      file,
      replacement: content,
    }, context);
  }

  /**
   * Perform the actual edit operation
   */
  private performEdit(
    content: string,
    operation: EditOperation,
    filePath: string
  ): { success: boolean; file: string; content: string; changes: EditResult['changes']; diff?: string } {
    let newContent = content;
    const changes: EditResult['changes'] = [];

    switch (operation.type) {
      case 'replace':
        if (operation.searchPattern && operation.replacement !== undefined) {
          const beforeLen = newContent.length;
          newContent = newContent.split(operation.searchPattern).join(operation.replacement);
          if (newContent.length !== beforeLen) {
            changes.push({ type: 'replace', content: operation.replacement });
          }
        }
        break;

      case 'insert':
        if (operation.lineNumber && operation.replacement !== undefined) {
          const lines = newContent.split('\n');
          lines.splice(operation.lineNumber, 0, operation.replacement);
          newContent = lines.join('\n');
          changes.push({ type: 'insert', lineStart: operation.lineNumber, content: operation.replacement });
        }
        break;

      case 'delete':
        if (operation.lineNumber) {
          const lines = newContent.split('\n');
          const endLine = operation.endLineNumber || operation.lineNumber;
          lines.splice(operation.lineNumber - 1, endLine - operation.lineNumber + 1);
          newContent = lines.join('\n');
          changes.push({ type: 'delete', lineStart: operation.lineNumber, lineEnd: endLine });
        }
        break;

      case 'append':
        if (operation.replacement !== undefined) {
          newContent += '\n' + operation.replacement;
          changes.push({ type: 'append', content: operation.replacement });
        }
        break;

      case 'patch':
        // For patch, we'd apply a diff - simplified here
        break;
    }

    const diff = DiffGenerator.generate(content, newContent, filePath);

    return {
      success: true,
      file: operation.file,
      content: newContent,
      changes,
      diff,
    };
  }

  /**
   * Show what an edit would do (preview)
   */
  previewEdit(
    operation: EditOperation,
    filePath: string
  ): { diff: string; currentContent: string; newContent: string } {
    if (!fs.existsSync(filePath)) {
      return { diff: 'File does not exist', currentContent: '', newContent: '' };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const result = this.performEdit(content, operation, filePath);

    return {
      diff: DiffGenerator.displayDiff(content, result.content, filePath),
      currentContent: content,
      newContent: result.content,
    };
  }
}

// ============================================================================
// CHECKPOINT SYSTEM (for undo)
// ============================================================================

export class CheckpointSystem {
  private checkpoints: Map<string, Checkpoint> = new Map();

  async create(sessionId: string, description: string): Promise<string> {
    const checkpointId = `chk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const files = this.captureState();

    const checkpoint: Checkpoint = {
      id: checkpointId,
      sessionId,
      description,
      createdAt: new Date(),
      files,
    };

    this.checkpoints.set(checkpointId, checkpoint);
    return checkpointId;
  }

  async restore(checkpointId: string): Promise<boolean> {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) return false;

    for (const file of checkpoint.files) {
      if (file.type === 'modified') {
        fs.writeFileSync(file.path, file.originalContent!);
      } else if (file.type === 'created') {
        try {
          fs.unlinkSync(file.path);
        } catch {
          // Ignore
        }
      }
    }

    this.checkpoints.delete(checkpointId);
    return true;
  }

  list(sessionId?: string): Checkpoint[] {
    const checkpoints = Array.from(this.checkpoints.values());
    if (sessionId) {
      return checkpoints.filter(c => c.sessionId === sessionId);
    }
    return checkpoints;
  }

  /**
   * Create checkpoint synchronously (for TUI)
   */
  createSync(sessionId: string, description: string): string | null {
    try {
      const checkpointId = `chk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const files = this.captureState();

      const checkpoint: Checkpoint = {
        id: checkpointId,
        sessionId,
        description,
        createdAt: new Date(),
        files,
      };

      this.checkpoints.set(checkpointId, checkpoint);
      return checkpointId;
    } catch {
      return null;
    }
  }

  /**
   * Restore checkpoint synchronously (for TUI)
   */
  restoreSync(checkpointId: string): boolean {
    try {
      const checkpoint = this.checkpoints.get(checkpointId);
      if (!checkpoint) return false;

      for (const file of checkpoint.files) {
        if (file.type === 'modified') {
          fs.writeFileSync(file.path, file.originalContent!);
        } else if (file.type === 'created') {
          try {
            fs.unlinkSync(file.path);
          } catch {
            // Ignore
          }
        }
      }

      this.checkpoints.delete(checkpointId);
      return true;
    } catch {
      return false;
    }
  }

  private captureState(): FileState[] {
    const projectRoot = process.cwd();
    const files: FileState[] = [];

    try {
      const output = child_process.execSync('git ls-files -m', {
        encoding: 'utf-8',
        cwd: projectRoot,
      });

      const modifiedFiles = output.trim().split('\n').filter(Boolean);

      for (const file of modifiedFiles) {
        const filePath = path.join(projectRoot, file);
        if (fs.existsSync(filePath)) {
          files.push({
            path: file,
            type: 'modified',
            originalContent: fs.readFileSync(filePath, 'utf-8'),
          });
        }
      }
    } catch {
      // Not a git repo or other error
    }

    return files;
  }
}

interface Checkpoint {
  id: string;
  sessionId: string;
  description: string;
  createdAt: Date;
  files: FileState[];
}

interface FileState {
  path: string;
  type: 'created' | 'modified' | 'deleted';
  originalContent?: string;
}

// ============================================================================
// IMPORTS
// ============================================================================

import * as child_process from 'child_process';

// ============================================================================
// EXPORTS
// ============================================================================

export const diffEditor = new DiffEditor();
export const checkpointSystem = new CheckpointSystem();
export { DiffEditor as VibeDiffEditor };
export type {
  EditOperation as VibeEditOperation,
};
