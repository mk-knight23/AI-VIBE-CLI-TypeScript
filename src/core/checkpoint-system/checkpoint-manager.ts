/**
 * VIBE-CLI v0.0.1 - Checkpoint Manager
 * Enhanced checkpoint and rollback system with named checkpoints, diff support, and history tracking
 */

import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';
import { stateSerializer, SerializationFormat } from './state-serializer.js';

/**
 * Checkpoint priority levels
 */
export type CheckpointPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Checkpoint status
 */
export type CheckpointStatus = 'active' | 'restored' | 'obsolete';

/**
 * Checkpoint interface
 */
export interface Checkpoint {
  id: string;
  name: string;
  description: string;
  sessionId: string;
  createdAt: Date;
  priority: CheckpointPriority;
  status: CheckpointStatus;
  fileCount: number;
  totalSize: number;
  compressedSize: number;
  storagePath: string;
  metadata: CheckpointMetadata;
}

/**
 * Checkpoint metadata
 */
export interface CheckpointMetadata {
  branch?: string;
  commitHash?: string;
  workingDirectory?: string;
  tags?: string[];
  customData?: Record<string, unknown>;
}

/**
 * Checkpoint info for listing
 */
export interface CheckpointInfo {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  createdAtFormatted: string;
  priority: CheckpointPriority;
  status: CheckpointStatus;
  fileCount: number;
  sizeFormatted: string;
}

/**
 * Diff result between two checkpoints
 */
export interface CheckpointDiff {
  checkpoint1: CheckpointInfo;
  checkpoint2: CheckpointInfo;
  filesAdded: string[];
  filesRemoved: string[];
  filesModified: string[];
  totalChanges: number;
  changes: FileChange[];
}

/**
 * File change in diff
 */
export interface FileChange {
  file: string;
  type: 'added' | 'removed' | 'modified';
  oldContent?: string;
  newContent?: string;
  lineCount?: number;
}

/**
 * Create checkpoint options
 */
export interface CreateCheckpointOptions {
  name: string;
  description?: string;
  priority?: CheckpointPriority;
  tags?: string[];
  branch?: string;
  commitHash?: string;
  customData?: Record<string, unknown>;
}

/**
 * Rollback options
 */
export interface RollbackOptions {
  force?: boolean;
  dryRun?: boolean;
  targetPath?: string;
}

/**
 * Rollback result
 */
export interface RollbackResult {
  success: boolean;
  checkpointId: string;
  filesRestored: number;
  filesCreated: number;
  filesDeleted: number;
  duration: number;
  error?: string;
}

/**
 * List checkpoints options
 */
export interface ListCheckpointsOptions {
  sessionId?: string;
  status?: CheckpointStatus;
  tags?: string[];
  limit?: number;
  json?: boolean;
}

/**
 * Enhanced Checkpoint Manager
 */
export class CheckpointManager {
  private readonly storageDir: string;
  private readonly checkpoints: Map<string, Checkpoint> = new Map();
  private readonly sessionCheckpoints: Map<string, string[]> = new Map();

  constructor() {
    this.storageDir = path.join(process.cwd(), '.vibe', 'checkpoints');
    this.ensureStorageDir();
    this.loadCheckpoints();
  }

  /**
   * Ensure storage directory exists
   */
  private ensureStorageDir(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }

    // Create subdirectories for organization
    const metadataDir = path.join(this.storageDir, 'metadata');
    if (!fs.existsSync(metadataDir)) {
      fs.mkdirSync(metadataDir, { recursive: true });
    }
  }

  /**
   * Load existing checkpoints from disk
   */
  private loadCheckpoints(): void {
    try {
      const entries = fs.readdirSync(this.storageDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const checkpointId = entry.name;
          const metadataPath = path.join(this.storageDir, checkpointId, 'metadata.json');

          if (fs.existsSync(metadataPath)) {
            try {
              const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
              const checkpoint: Checkpoint = {
                ...metadata,
                storagePath: path.join(this.storageDir, checkpointId),
              };
              this.checkpoints.set(checkpointId, checkpoint);

              // Track by session
              const sessionId = checkpoint.sessionId;
              if (!this.sessionCheckpoints.has(sessionId)) {
                this.sessionCheckpoints.set(sessionId, []);
              }
              this.sessionCheckpoints.get(sessionId)!.push(checkpointId);
            } catch {
              // Skip corrupted checkpoints
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load checkpoints:', error);
    }
  }

  /**
   * Create a new checkpoint
   */
  async createCheckpoint(
    sessionId: string,
    options: CreateCheckpointOptions
  ): Promise<Checkpoint> {
    const {
      name,
      description = '',
      priority = 'normal',
      tags = [],
      branch,
      commitHash,
      customData,
    } = options;

    const checkpointId = `chk-${Date.now()}-${uuidv4().slice(0, 8)}`;

    // Get all modified files
    const modifiedFiles = this.getModifiedFiles();
    const fileContents = await this.readFiles(modifiedFiles);

    // Serialize state
    const serializeResult = await stateSerializer.serialize(fileContents, {
      format: 'json-gzip',
      includeMetadata: true,
    });

    if (!serializeResult.success || !serializeResult.data) {
      throw new Error(`Failed to serialize checkpoint: ${serializeResult.error}`);
    }

    // Create checkpoint directory
    const checkpointDir = path.join(this.storageDir, checkpointId);
    fs.mkdirSync(checkpointDir, { recursive: true });

    // Save compressed data
    const dataPath = path.join(checkpointDir, 'state.json.gz');
    fs.writeFileSync(dataPath, serializeResult.data);

    // Create metadata
    const checkpoint: Checkpoint = {
      id: checkpointId,
      name,
      description,
      sessionId,
      createdAt: new Date(),
      priority,
      status: 'active',
      fileCount: serializeResult.metadata?.fileCount ?? 0,
      totalSize: serializeResult.metadata?.totalSize ?? 0,
      compressedSize: serializeResult.metadata?.compressedSize ?? 0,
      storagePath: checkpointDir,
      metadata: {
        workingDirectory: process.cwd(),
        branch: branch ?? this.getCurrentBranch(),
        commitHash: commitHash ?? this.getCurrentCommit(),
        tags,
        customData,
      },
    };

    // Save metadata
    const metadataPath = path.join(checkpointDir, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(checkpoint, null, 2));

    // Track in memory
    this.checkpoints.set(checkpointId, checkpoint);

    if (!this.sessionCheckpoints.has(sessionId)) {
      this.sessionCheckpoints.set(sessionId, []);
    }
    this.sessionCheckpoints.get(sessionId)!.push(checkpointId);

    return checkpoint;
  }

  /**
   * Rollback to a specific checkpoint
   */
  async rollback(
    checkpointId: string,
    options: RollbackOptions = {}
  ): Promise<RollbackResult> {
    const { dryRun = false, force = false, targetPath } = options;
    const startTime = Date.now();

    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) {
      return {
        success: false,
        checkpointId,
        filesRestored: 0,
        filesCreated: 0,
        filesDeleted: 0,
        duration: Date.now() - startTime,
        error: `Checkpoint not found: ${checkpointId}`,
      };
    }

    if (checkpoint.status === 'restored' && !force) {
      return {
        success: false,
        checkpointId,
        filesRestored: 0,
        filesCreated: 0,
        filesDeleted: 0,
        duration: Date.now() - startTime,
        error: 'Checkpoint already restored. Use --force to restore again.',
      };
    }

    // Load state from disk
    const dataPath = path.join(checkpoint.storagePath, 'state.json.gz');
    if (!fs.existsSync(dataPath)) {
      return {
        success: false,
        checkpointId,
        filesRestored: 0,
        filesCreated: 0,
        filesDeleted: 0,
        duration: Date.now() - startTime,
        error: 'Checkpoint data file not found',
      };
    }

    const deserializeResult = await stateSerializer.deserializeFromFile(dataPath, 'json-gzip');
    if (!deserializeResult.success || !deserializeResult.data) {
      return {
        success: false,
        checkpointId,
        filesRestored: 0,
        filesCreated: 0,
        filesDeleted: 0,
        duration: Date.now() - startTime,
        error: `Failed to deserialize checkpoint: ${deserializeResult.error}`,
      };
    }

    if (dryRun) {
      return {
        success: true,
        checkpointId,
        filesRestored: deserializeResult.data.size,
        filesCreated: 0,
        filesDeleted: 0,
        duration: Date.now() - startTime,
      };
    }

    // Apply changes
    let filesRestored = 0;
    let filesCreated = 0;
    let filesDeleted = 0;

    for (const [filePath, content] of deserializeResult.data) {
      const absolutePath = targetPath
        ? path.join(targetPath, filePath)
        : path.join(process.cwd(), filePath);

      const dir = path.dirname(absolutePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(absolutePath)) {
        fs.writeFileSync(absolutePath, content);
        filesRestored++;
      } else {
        fs.writeFileSync(absolutePath, content);
        filesCreated++;
      }
    }

    // Update checkpoint status
    checkpoint.status = 'restored';
    const metadataPath = path.join(checkpoint.storagePath, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(checkpoint, null, 2));

    return {
      success: true,
      checkpointId,
      filesRestored,
      filesCreated,
      filesDeleted,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Get diff between two checkpoints
   */
  async getCheckpointDiff(
    checkpointId1: string,
    checkpointId2: string
  ): Promise<CheckpointDiff | null> {
    const cp1 = this.checkpoints.get(checkpointId1);
    const cp2 = this.checkpoints.get(checkpointId2);

    if (!cp1 || !cp2) {
      return null;
    }

    // Load both states
    const dataPath1 = path.join(cp1.storagePath, 'state.json.gz');
    const dataPath2 = path.join(cp2.storagePath, 'state.json.gz');

    if (!fs.existsSync(dataPath1) || !fs.existsSync(dataPath2)) {
      return null;
    }

    const result1 = await stateSerializer.deserializeFromFile(dataPath1, 'json-gzip');
    const result2 = await stateSerializer.deserializeFromFile(dataPath2, 'json-gzip');

    if (!result1.success || !result1.data || !result2.success || !result2.data) {
      return null;
    }

    const files1 = new Set(result1.data.keys());
    const files2 = new Set(result2.data.keys());

    // Find differences
    const filesAdded: string[] = [];
    const filesRemoved: string[] = [];
    const filesModified: string[] = [];
    const changes: FileChange[] = [];

    for (const file of files2) {
      if (!files1.has(file)) {
        filesAdded.push(file);
        changes.push({ file, type: 'added', newContent: result2.data!.get(file) });
      }
    }

    for (const file of files1) {
      if (!files2.has(file)) {
        filesRemoved.push(file);
        changes.push({ file, type: 'removed', oldContent: result1.data!.get(file) });
      }
    }

    for (const file of files1) {
      if (files2.has(file)) {
        const content1 = result1.data!.get(file);
        const content2 = result2.data!.get(file);

        if (content1 !== content2) {
          filesModified.push(file);
          changes.push({
            file,
            type: 'modified',
            oldContent: content1,
            newContent: content2,
            lineCount: this.countLines(content2 || ''),
          });
        }
      }
    }

    return {
      checkpoint1: this.toCheckpointInfo(cp1),
      checkpoint2: this.toCheckpointInfo(cp2),
      filesAdded,
      filesRemoved,
      filesModified,
      totalChanges: changes.length,
      changes,
    };
  }

  /**
   * List checkpoints
   */
  listCheckpoints(options: ListCheckpointsOptions = {}): CheckpointInfo[] {
    const { sessionId, status, limit, json = false } = options;
    let checkpoints = Array.from(this.checkpoints.values());

    // Filter by session
    if (sessionId) {
      checkpoints = checkpoints.filter((cp) => cp.sessionId === sessionId);
    }

    // Filter by status
    if (status) {
      checkpoints = checkpoints.filter((cp) => cp.status === status);
    }

    // Sort by creation date (newest first)
    checkpoints.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Limit results
    if (limit && limit > 0) {
      checkpoints = checkpoints.slice(0, limit);
    }

    return checkpoints.map((cp) => this.toCheckpointInfo(cp));
  }

  /**
   * Get a specific checkpoint
   */
  getCheckpoint(checkpointId: string): Checkpoint | undefined {
    return this.checkpoints.get(checkpointId);
  }

  /**
   * Delete a checkpoint
   */
  deleteCheckpoint(checkpointId: string): boolean {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) {
      return false;
    }

    // Remove from disk
    try {
      fs.rmSync(checkpoint.storagePath, { recursive: true, force: true });
    } catch {
      return false;
    }

    // Remove from memory
    this.checkpoints.delete(checkpointId);

    const sessionCps = this.sessionCheckpoints.get(checkpoint.sessionId);
    if (sessionCps) {
      const index = sessionCps.indexOf(checkpointId);
      if (index > -1) {
        sessionCps.splice(index, 1);
      }
    }

    return true;
  }

  /**
   * Format checkpoint size for display
   */
  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60 * 1000) {
      return 'Just now';
    }
    if (diff < 60 * 60 * 1000) {
      const mins = Math.floor(diff / (60 * 1000));
      return `${mins}m ago`;
    }
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours}h ago`;
    }

    return date.toLocaleString();
  }

  /**
   * Get modified files from git
   */
  private getModifiedFiles(): string[] {
    const gitDir = path.join(process.cwd(), '.git');

    if (!fs.existsSync(gitDir)) {
      return this.getAllFilesInDirectory();
    }

    try {
      const output = child_process.execSync('git ls-files -m', {
        cwd: process.cwd(),
        encoding: 'utf-8',
      });
      const modifiedFiles = output.trim().split('\n').filter(Boolean);
      
      if (modifiedFiles.length === 0) {
        return this.getAllTrackedFiles();
      }
      
      return modifiedFiles;
    } catch {
      return this.getAllTrackedFiles();
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
      return this.getAllFilesInDirectory();
    }
  }

  /**
   * Get all files in directory (fallback when no git repo)
   */
  private getAllFilesInDirectory(): string[] {
    const files: string[] = [];
    const excludedDirs = ['.git', 'node_modules', '.vibe', 'dist', 'build', '.next', '.nuxt', 'target', '__pycache__'];
    const excludedExtensions = ['.log', '.lock', '.gz', '.zip', '.tar', '.node_modules'];

    const scanDir = (dir: string, basePath = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (excludedDirs.includes(entry.name) || entry.name.startsWith('.')) {
            continue;
          }
          scanDir(path.join(dir, entry.name), path.join(basePath, entry.name));
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (excludedExtensions.includes(ext) || entry.name.startsWith('.')) {
            continue;
          }
          files.push(path.join(basePath, entry.name));
        }
      }
    };

    try {
      scanDir(process.cwd());
    } catch {
      return [];
    }

    return files;
  }

  /**
   * Read multiple files
   */
  private async readFiles(filePaths: string[]): Promise<Map<string, string>> {
    const fileContents = new Map<string, string>();

    for (const file of filePaths) {
      const filePath = path.join(process.cwd(), file);

      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          fileContents.set(file, content);
        } catch {
          // Skip files we can't read
        }
      }
    }

    return fileContents;
  }

  /**
   * Get current git branch
   */
  private getCurrentBranch(): string {
    try {
      return child_process.execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: process.cwd(),
        encoding: 'utf-8',
      }).trim();
    } catch {
      return 'unknown';
    }
  }

  /**
   * Get current commit hash
   */
  private getCurrentCommit(): string {
    try {
      return child_process.execSync('git rev-parse HEAD', {
        cwd: process.cwd(),
        encoding: 'utf-8',
      }).trim().slice(0, 7);
    } catch {
      return 'unknown';
    }
  }

  /**
   * Count lines in content
   */
  private countLines(content: string): number {
    return content.split('\n').length;
  }

  /**
   * Convert checkpoint to info for display
   */
  private toCheckpointInfo(checkpoint: Checkpoint): CheckpointInfo {
    // Ensure createdAt is a Date object (it may be a string after JSON deserialization)
    const createdAt = checkpoint.createdAt instanceof Date
      ? checkpoint.createdAt
      : new Date(checkpoint.createdAt);

    return {
      id: checkpoint.id,
      name: checkpoint.name,
      description: checkpoint.description,
      createdAt,
      createdAtFormatted: this.formatTimestamp(createdAt),
      priority: checkpoint.priority,
      status: checkpoint.status,
      fileCount: checkpoint.fileCount,
      sizeFormatted: this.formatSize(checkpoint.compressedSize),
    };
  }

  /**
   * Get checkpoint statistics
   */
  getStats(): {
    total: number;
    active: number;
    restored: number;
    obsolete: number;
    totalSize: number;
    averageSize: number;
  } {
    let active = 0;
    let restored = 0;
    let obsolete = 0;
    let totalSize = 0;

    for (const cp of this.checkpoints.values()) {
      totalSize += cp.compressedSize;
      switch (cp.status) {
        case 'active':
          active++;
          break;
        case 'restored':
          restored++;
          break;
        case 'obsolete':
          obsolete++;
          break;
      }
    }

    const total = this.checkpoints.size;
    return {
      total,
      active,
      restored,
      obsolete,
      totalSize,
      averageSize: total > 0 ? totalSize / total : 0,
    };
  }

  /**
   * Create a named checkpoint (helper for CLI)
   */
  async createNamedCheckpoint(name: string, description: string = ''): Promise<Checkpoint> {
    const sessionId = `session-${Date.now()}`;
    return this.createCheckpoint(sessionId, {
      name,
      description,
      branch: this.getCurrentBranch(),
      commitHash: this.getCurrentCommit(),
    });
  }

  /**
   * Restore to a named checkpoint (helper for CLI)
   */
  async restoreNamedCheckpoint(name: string): Promise<boolean> {
    const checkpoint = this.findCheckpointByName(name);
    if (!checkpoint) {
      return false;
    }
    const result = await this.rollback(checkpoint.id);
    return result.success;
  }

  /**
   * Get checkpoint by name (helper for CLI)
   */
  findCheckpointByName(name: string): CheckpointInfo | undefined {
    return this.listCheckpoints().find(cp => cp.name === name);
  }

  /**
   * Get diff since checkpoint (helper for CLI)
   */
  async getDiffSinceCheckpoint(name: string): Promise<string> {
    const checkpoint = this.findCheckpointByName(name);
    if (!checkpoint) {
      return 'Checkpoint not found';
    }
    const checkpoints = this.listCheckpoints();
    if (checkpoints.length < 2) {
      return 'Only one checkpoint available - cannot compare';
    }
    // Get the second most recent checkpoint to compare with
    const otherCheckpoint = checkpoints[1];
    const diff = await this.getCheckpointDiff(checkpoint.id, otherCheckpoint.id);
    if (!diff) {
      return 'Unable to compute diff';
    }
    if (diff.totalChanges === 0) {
      return 'No changes since checkpoint';
    }
    return `Files changed: ${diff.totalChanges}\n` +
           `Added: ${diff.filesAdded.length}\n` +
           `Removed: ${diff.filesRemoved.length}\n` +
           `Modified: ${diff.filesModified.length}`;
  }

  /**
   * Delete checkpoint by name (helper for CLI)
   */
  deleteCheckpointByName(name: string): boolean {
    const checkpoint = this.findCheckpointByName(name);
    if (!checkpoint) {
      return false;
    }
    return this.deleteCheckpoint(checkpoint.id);
  }
}

/**
 * Singleton instance
 */
export const checkpointManager = new CheckpointManager();
