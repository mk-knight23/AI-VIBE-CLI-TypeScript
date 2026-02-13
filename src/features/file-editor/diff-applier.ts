/**
 * VIBE-CLI v0.0.2 - Diff Applier
 * Diff preview and application for multi-file edits
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { MultiFileHandler, FileChange } from '../../core/file-editor/multi-file-handler.js';

/**
 * Local diff result interface
 */
interface LocalDiffResult {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
  count: number;
}

/**
 * Simple line-based diff function
 */
function localDiffLines(oldText: string, newText: string): LocalDiffResult[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const results: LocalDiffResult[] = [];

  let i = 0;
  let j = 0;

  while (i < oldLines.length || j < newLines.length) {
    if (i >= oldLines.length) {
      results.push({ type: 'added', value: newLines[j], count: 1 });
      j++;
    } else if (j >= newLines.length) {
      results.push({ type: 'removed', value: oldLines[i], count: 1 });
      i++;
    } else if (oldLines[i] === newLines[j]) {
      results.push({ type: 'unchanged', value: oldLines[i], count: 1 });
      i++;
      j++;
    } else {
      results.push({ type: 'removed', value: oldLines[i], count: 1 });
      results.push({ type: 'added', value: newLines[j], count: 1 });
      i++;
      j++;
    }
  }

  return results;
}

/**
 * Diff style options
 */
export type DiffStyle = 'unified' | 'side-by-side' | 'inline';

/**
 * Diff options
 */
export interface DiffOptions {
  style?: DiffStyle;
  color?: boolean;
  contextLines?: number;
  showStats?: boolean;
  fileHeader?: boolean;
}

/**
 * Diff segment for display
 */
export interface DiffSegment {
  type: 'header' | 'hunk' | 'stats';
  content: string;
  file?: string;
}

/**
 * Diff statistics
 */
export interface DiffStats {
  filesChanged: number;
  insertions: number;
  deletions: number;
  files: DiffFileStats[];
}

/**
 * Per-file diff statistics
 */
export interface DiffFileStats {
  file: string;
  insertions: number;
  deletions: number;
  changes: number;
}

/**
 * Diff preview result
 */
export interface DiffPreviewResult {
  success: boolean;
  stats: DiffStats;
  segments: DiffSegment[];
  hasErrors: boolean;
}

/**
 * Apply diff options
 */
export interface ApplyDiffOptions {
  autoApprove?: boolean;
  checkpoint?: boolean;
  dryRun?: boolean;
  targetPath?: string;
}

/**
 * Diff Applier with preview capabilities
 */
export class DiffApplier {
  private readonly multiFileHandler: MultiFileHandler;
  private readonly defaultContextLines = 3;

  constructor(multiFileHandler?: MultiFileHandler) {
    this.multiFileHandler = multiFileHandler || new MultiFileHandler();
  }

  /**
   * Generate a diff preview for changes
   */
  generatePreview(changes: FileChange[], options: DiffOptions = {}): DiffPreviewResult {
    const {
      style = 'unified',
      color = true,
      contextLines = this.defaultContextLines,
      showStats = true,
      fileHeader = true,
    } = options;

    const segments: DiffSegment[] = [];
    let totalInsertions = 0;
    let totalDeletions = 0;
    const fileStats: DiffFileStats[] = [];

    for (const change of changes) {
      const stats = this.computeFileDiffStats(change);
      totalInsertions += stats.insertions;
      totalDeletions += stats.deletions;
      fileStats.push(stats);

      // File header
      if (fileHeader) {
        segments.push({
          type: 'header',
          content: this.formatFileHeader(change.file, stats, style),
          file: change.file,
        });
      }

      // Diff hunk
      const hunks = this.computeDiffHunks(change.originalContent, change.newContent, contextLines);
      for (const hunk of hunks) {
        segments.push({
          type: 'hunk',
          content: this.formatHunk(hunk, style, color),
          file: change.file,
        });
      }
    }

    // Statistics footer
    if (showStats) {
      segments.push({
        type: 'stats',
        content: this.formatStats({
          filesChanged: changes.length,
          insertions: totalInsertions,
          deletions: totalDeletions,
          files: fileStats,
        }),
      });
    }

    return {
      success: true,
      stats: {
        filesChanged: changes.length,
        insertions: totalInsertions,
        deletions: totalDeletions,
        files: fileStats,
      },
      segments,
      hasErrors: false,
    };
  }

  /**
   * Apply diff to files
   */
  async applyDiff(
    changes: FileChange[],
    options: ApplyDiffOptions = {}
  ): Promise<{
    success: boolean;
    filesApplied: number;
    errors: string[];
    preview?: DiffPreviewResult;
  }> {
    const { autoApprove = false, dryRun = false } = options;

    // Generate preview first
    const preview = this.generatePreview(changes);

    // Show preview
    this.printPreview(preview);

    if (dryRun) {
      return {
        success: true,
        filesApplied: 0,
        errors: [],
        preview,
      };
    }

    if (!autoApprove) {
      const confirmed = await this.confirmApply();
      if (!confirmed) {
        return {
          success: false,
          filesApplied: 0,
          errors: ['User cancelled'],
          preview,
        };
      }
    }

    // Apply changes atomically
    const result = await this.multiFileHandler.applyChangesAtomically(changes, {
      checkpoint: options.checkpoint,
      dryRun,
      targetPath: options.targetPath,
    });

    return {
      success: result.success,
      filesApplied: result.filesChanged + result.filesCreated,
      errors: result.errors.map((e) => `${e.file}: ${e.message}`),
      preview,
    };
  }

  /**
   * Print diff preview to console
   */
  printPreview(preview: DiffPreviewResult, output?: NodeJS.WriteStream): void {
    const out = output || process.stdout;

    for (const segment of preview.segments) {
      if (segment.type === 'header') {
        out.write(chalk.cyan(segment.content) + '\n');
      } else if (segment.type === 'hunk') {
        out.write(segment.content + '\n');
      } else if (segment.type === 'stats') {
        out.write(chalk.gray(segment.content) + '\n');
      }
    }
  }

  /**
   * Compute diff hunks between two contents
   */
  private computeDiffHunks(
    oldContent: string,
    newContent: string,
    contextLines: number
  ): DiffHunk[] {
    const diffResult = localDiffLines(oldContent, newContent);
    const hunks: DiffHunk[] = [];

    let currentHunk: DiffHunk | null = null;
    let lineNumber = 1;
    let oldLineNumber = 1;
    let newLineNumber = 1;

    for (const part of diffResult) {
      if (part.type === "added") {
        if (!currentHunk) {
          currentHunk = this.startHunk(oldLineNumber, newLineNumber, contextLines);
          hunks.push(currentHunk);
        }
        currentHunk.changes.push({
          type: 'added',
          content: part.value,
          oldLine: -1,
          newLine: newLineNumber,
        });
        newLineNumber += part.count || 1;
      } else if (part.type === "removed") {
        if (!currentHunk) {
          currentHunk = this.startHunk(oldLineNumber, newLineNumber, contextLines);
          hunks.push(currentHunk);
        }
        currentHunk.changes.push({
          type: 'removed',
          content: part.value,
          oldLine: oldLineNumber,
          newLine: -1,
        });
        oldLineNumber += part.count || 1;
      } else {
        // Unchanged
        if (currentHunk) {
          currentHunk.changes.push({
            type: 'unchanged',
            content: part.value,
            oldLine: oldLineNumber,
            newLine: newLineNumber,
          });

          // End hunk if we've seen enough context
          if (currentHunk.changes.filter((c) => c.type === 'unchanged').length >= contextLines * 2) {
            currentHunk = null;
          }
        }
        oldLineNumber += part.count || 1;
        newLineNumber += part.count || 1;
      }
    }

    return hunks;
  }

  /**
   * Start a new diff hunk
   */
  private startHunk(
    oldStart: number,
    newStart: number,
    contextLines: number
  ): DiffHunk {
    return {
      oldStart,
      newStart,
      contextLines,
      changes: [],
    };
  }

  /**
   * Compute file diff statistics
   */
  private computeFileDiffStats(change: FileChange): DiffFileStats {
    const diffResult = localDiffLines(change.originalContent, change.newContent);
    let insertions = 0;
    let deletions = 0;

    for (const part of diffResult) {
      if (part.type === "added") {
        insertions += part.count || 1;
      } else if (part.type === "removed") {
        deletions += part.count || 1;
      }
    }

    return {
      file: change.file,
      insertions,
      deletions,
      changes: insertions + deletions,
    };
  }

  /**
   * Format file header
   */
  private formatFileHeader(file: string, stats: DiffFileStats, style: DiffStyle): string {
    if (style === 'side-by-side') {
      return `=== ${file} ===`;
    }

    const status = stats.insertions > 0 || stats.deletions > 0 ? 'modified' : 'unchanged';
    const statusIcon = stats.insertions > 0 ? 'A' : stats.deletions > 0 ? 'M' : '';

    return `diff --git a/${file} b/${file}\n${statusIcon} ${file}`;
  }

  /**
   * Format diff hunk
   */
  private formatHunk(hunk: DiffHunk, style: DiffStyle, color: boolean): string {
    if (style === 'side-by-side') {
      return this.formatSideBySide(hunk, color);
    }

    const lines: string[] = [];

    // Hunk header
    const header = `@@ -${hunk.oldStart},${hunk.oldStart + hunk.changes.filter((c) => c.type !== 'added').length - 1} +${hunk.newStart},${hunk.newStart + hunk.changes.filter((c) => c.type !== 'removed').length - 1} @@`;
    lines.push(color ? chalk.gray(header) : header);

    // Changes
    for (const change of hunk.changes) {
      const prefix = this.getChangePrefix(change.type);
      const coloredPrefix = color ? this.getColoredPrefix(change.type) : prefix;

      const content = change.content
        .split('\n')
        .map((line, i) => {
          if (i === 0 && change.type !== 'unchanged') {
            return `${coloredPrefix}${line}`;
          }
          return `${coloredPrefix}${line}`;
        })
        .join('\n');

      lines.push(content);
    }

    return lines.join('\n');
  }

  /**
   * Format side-by-side diff
   */
  private formatSideBySide(hunk: DiffHunk, color: boolean): string {
    const lines: string[] = [];

    for (const change of hunk.changes) {
      const left = change.type === 'removed' ? change.content : '';
      const right = change.type === 'added' ? change.content : change.content;
      const sep = ' | ';

      if (color) {
        const leftColor = change.type === 'removed' ? chalk.red : chalk.gray;
        const rightColor = change.type === 'added' ? chalk.green : chalk.gray;
        lines.push(`${leftColor(left)}${sep}${rightColor(right)}`);
      } else {
        lines.push(`${left}${sep}${right}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Format overall statistics
   */
  private formatStats(stats: DiffStats): string {
    const insertionColor = stats.insertions > 0 ? chalk.green : chalk.gray;
    const deletionColor = stats.deletions > 0 ? chalk.red : chalk.gray;

    return `\n${stats.filesChanged} file(s) changed, ${insertionColor(`${stats.insertions} insertions`)}(+), ${deletionColor(`${stats.deletions} deletions`)}(-)`;
  }

  /**
   * Get change prefix for diff
   */
  private getChangePrefix(type: 'added' | 'removed' | 'unchanged'): string {
    switch (type) {
      case 'added':
        return '+';
      case 'removed':
        return '-';
      default:
        return ' ';
    }
  }

  /**
   * Get colored change prefix
   */
  private getColoredPrefix(type: 'added' | 'removed' | 'unchanged'): string {
    switch (type) {
      case 'added':
        return chalk.green('+');
      case 'removed':
        return chalk.red('-');
      default:
        return chalk.gray(' ');
    }
  }

  /**
   * Confirm diff application with user
   */
  private async confirmApply(): Promise<boolean> {
    return new Promise((resolve) => {
      const rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question('\nApply these changes? (y/n) ', (answer: string) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y');
      });
    });
  }

  /**
   * Compare two files and generate diff
   */
  compareFiles(file1: string, file2: string, options: DiffOptions = {}): DiffPreviewResult {
    const content1 = fs.readFileSync(file1, 'utf-8');
    const content2 = fs.readFileSync(file2, 'utf-8');

    const changes: FileChange[] = [
      {
        file: file1,
        originalContent: content1,
        newContent: content2,
        changes: [],
      },
    ];

    return this.generatePreview(changes, options);
  }
}

/**
 * Diff hunk interface
 */
interface DiffHunk {
  oldStart: number;
  newStart: number;
  contextLines: number;
  changes: {
    type: 'added' | 'removed' | 'unchanged';
    content: string;
    oldLine: number;
    newLine: number;
  }[];
}

/**
 * Singleton instance
 */
export const diffApplier = new DiffApplier();
