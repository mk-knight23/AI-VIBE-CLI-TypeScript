/**
 * VIBE-CLI v0.0.1 - Multi-File Handler
 * Coherent multi-file editing with cross-file consistency
 */

import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';
import { CheckpointManager } from '../checkpoint-system/checkpoint-manager.js';

/**
 * Simple diff result interface
 */
interface DiffResult {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
  count: number;
}

/**
 * Diff function using simple algorithm
 */
function diffLines(oldText: string, newText: string): DiffResult[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const results: DiffResult[] = [];

  // Simple line-by-line comparison
  const maxLen = Math.max(oldLines.length, newLines.length);
  let i = 0;
  let j = 0;

  while (i < oldLines.length || j < newLines.length) {
    if (i >= oldLines.length) {
      // Only new lines remain
      results.push({ type: 'added', value: newLines[j], count: 1 });
      j++;
    } else if (j >= newLines.length) {
      // Only old lines remain
      results.push({ type: 'removed', value: oldLines[i], count: 1 });
      i++;
    } else if (oldLines[i] === newLines[j]) {
      results.push({ type: 'unchanged', value: oldLines[i], count: 1 });
      i++;
      j++;
    } else {
      // Different - try to match forward
      let foundMatch = false;
      for (let k = 1; k < 5 && i + k < oldLines.length; k++) {
        if (oldLines[i + k] === newLines[j]) {
          for (let m = 0; m < k; m++) {
            results.push({ type: 'removed', value: oldLines[i + m], count: 1 });
          }
          i += k;
          foundMatch = true;
          break;
        }
      }

      if (!foundMatch) {
        for (let k = 1; k < 5 && j + k < newLines.length; k++) {
          if (oldLines[i] === newLines[j + k]) {
            for (let m = 0; m < k; m++) {
              results.push({ type: 'added', value: newLines[j + m], count: 1 });
            }
            j += k;
            foundMatch = true;
            break;
          }
        }
      }

      if (!foundMatch) {
        results.push({ type: 'removed', value: oldLines[i], count: 1 });
        results.push({ type: 'added', value: newLines[j], count: 1 });
        i++;
        j++;
      }
    }
  }

  return results;
}

/**
 * Change type for compatibility
 */
type ChangeType = 'added' | 'removed' | 'unchanged';

/**
 * Edit mode
 */
export type EditMode = 'intelligent' | 'atomic' | 'sequential';

/**
 * File edit request
 */
export interface FileEditRequest {
  files: string[];
  description: string;
  mode?: EditMode;
  allowCreate?: boolean;
  allowDelete?: boolean;
}

/**
 * File change
 */
export interface FileChange {
  file: string;
  originalContent: string;
  newContent: string;
  changes: ContentChange[];
}

/**
 * Content change within a file
 */
export interface ContentChange {
  type: ChangeType;
  oldText: string;
  newText: string;
  lineStart: number;
  lineEnd: number;
}

/**
 * File relationship
 */
export interface FileRelationship {
  file: string;
  type: 'import' | 'export' | 'inheritance' | 'reference' | 'configuration';
  relatedFile: string;
  strength: 'strong' | 'medium' | 'weak';
}

/**
 * Validation result
 */
export interface CrossFileValidation {
  valid: boolean;
  issues: ValidationIssue[];
  warnings: ValidationWarning[];
}

/**
 * Validation issue
 */
export interface ValidationIssue {
  type: 'error' | 'warning';
  file: string;
  message: string;
  suggestion?: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  file: string;
  message: string;
  relatedFiles: string[];
}

/**
 * Apply changes options
 */
export interface ApplyChangesOptions {
  checkpoint?: boolean;
  dryRun?: boolean;
  autoApprove?: boolean;
  targetPath?: string;
}

/**
 * Apply changes result
 */
export interface ApplyChangesResult {
  success: boolean;
  filesChanged: number;
  filesCreated: number;
  filesDeleted: number;
  checkpointId?: string;
  duration: number;
  errors: ApplyError[];
  warnings: string[];
}

/**
 * Apply error
 */
export interface ApplyError {
  file: string;
  message: string;
  phase: 'read' | 'validate' | 'write' | 'rollback';
}

/**
 * Multi-file edit result
 */
export interface MultiFileEditResult {
  success: boolean;
  request: FileEditRequest;
  changes: FileChange[];
  validation: CrossFileValidation;
  applyResult?: ApplyChangesResult;
  dependencyGraph: DependencyGraph;
}

/**
 * Dependency graph for files
 */
export interface DependencyGraph {
  nodes: string[];
  edges: FileRelationship[];
  stronglyConnectedComponents: string[][];
  hasCycles: boolean;
}

/**
 * Multi-File Handler for coherent multi-file editing
 */
export class MultiFileHandler {
  private checkpointManager: CheckpointManager | undefined;
  private dependencyCache: Map<string, DependencyGraph> = new Map();

  constructor(checkpointManager?: CheckpointManager) {
    this.checkpointManager = checkpointManager;
  }

  /**
   * Analyze file relationships in a set of files
   */
  async analyzeFileRelationships(
    filePaths: string[]
  ): Promise<FileRelationship[]> {
    const relationships: FileRelationship[] = [];

    for (const filePath of filePaths) {
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(process.cwd(), filePath);

      if (!fs.existsSync(absolutePath)) {
        continue;
      }

      try {
        const content = fs.readFileSync(absolutePath, 'utf-8');
        const fileRelationships = this.extractRelationships(filePath, content);
        relationships.push(...fileRelationships);
      } catch {
        // Skip files we can't read
      }
    }

    return relationships;
  }

  /**
   * Build dependency graph for files
   */
  async buildDependencyGraph(filePaths: string[]): Promise<DependencyGraph> {
    const cacheKey = filePaths.sort().join(',');
    if (this.dependencyCache.has(cacheKey)) {
      return this.dependencyCache.get(cacheKey)!;
    }

    const relationships = await this.analyzeFileRelationships(filePaths);
    const nodes = new Set<string>(filePaths);

    // Build adjacency list
    const adjacency = new Map<string, Set<string>>();
    for (const node of nodes) {
      adjacency.set(node, new Set());
    }

    for (const rel of relationships) {
      if (nodes.has(rel.file) && nodes.has(rel.relatedFile)) {
        adjacency.get(rel.file)!.add(rel.relatedFile);
      }
    }

    // Find strongly connected components (cycles)
    const scc = this.findStronglyConnectedComponents(adjacency);
    const hasCycles = scc.some((component) => component.length > 1);

    const graph: DependencyGraph = {
      nodes: Array.from(nodes),
      edges: relationships,
      stronglyConnectedComponents: scc,
      hasCycles,
    };

    this.dependencyCache.set(cacheKey, graph);
    return graph;
  }

  /**
   * Generate coherent changes across multiple files
   */
  async generateCoherentChanges(
    request: FileEditRequest
  ): Promise<MultiFileEditResult> {
    const startTime = Date.now();
    const changes: FileChange[] = [];
    const errors: ApplyError[] = [];

    // Read all files
    for (const file of request.files) {
      const absolutePath = path.isAbsolute(file)
        ? file
        : path.join(process.cwd(), file);

      if (!fs.existsSync(absolutePath)) {
        if (request.allowCreate) {
          changes.push({
            file,
            originalContent: '',
            newContent: '',
            changes: [
              {
                type: 'added',
                oldText: '',
                newText: '',
                lineStart: 0,
                lineEnd: 0,
              },
            ],
          });
        }
        continue;
      }

      try {
        const originalContent = fs.readFileSync(absolutePath, 'utf-8');
        const newContent = await this.applyEditToContent(
          originalContent,
          request.description
        );

        const contentChanges = this.computeChanges(originalContent, newContent);

        changes.push({
          file,
          originalContent,
          newContent,
          changes: contentChanges,
        });
      } catch (error) {
        errors.push({
          file,
          message: error instanceof Error ? error.message : 'Unknown error',
          phase: 'read',
        });
      }
    }

    // Build dependency graph
    const dependencyGraph = await this.buildDependencyGraph(request.files);

    // Validate cross-file consistency
    const validation = await this.validateCrossFileConsistency(changes, dependencyGraph);

    return {
      success: errors.length === 0 && validation.valid,
      request,
      changes,
      validation,
      dependencyGraph,
    };
  }

  /**
   * Validate cross-file consistency
   */
  async validateCrossFileConsistency(
    changes: FileChange[],
    dependencyGraph: DependencyGraph
  ): Promise<CrossFileValidation> {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for import/export mismatches
    for (const change of changes) {
      const validation = this.validateFileConsistency(change);
      issues.push(...validation.issues);
      warnings.push(...validation.warnings);
    }

    // Check for circular dependencies if changes are applied
    if (dependencyGraph.hasCycles) {
      issues.push({
        type: 'warning',
        file: dependencyGraph.stronglyConnectedComponents
          .filter((c) => c.length > 1)
          .map((c) => c.join(', '))
          .join('; '),
        message: 'Files have circular dependencies',
        suggestion:
          'Changes will be applied atomically to maintain consistency',
      });
    }

    // Check for broken references
    for (const change of changes) {
      const refs = this.findFileReferences(change.newContent);
      for (const ref of refs) {
        const referencedFile = this.resolveFileReference(ref, change.file);
        const fileExists = this.fileExistsInChanges(referencedFile, changes);

        if (!fileExists && !this.fileExistsOnDisk(referencedFile)) {
          issues.push({
            type: 'error',
            file: change.file,
            message: `References non-existent file: ${ref}`,
            suggestion: `Create ${referencedFile} or update reference`,
          });
        }
      }
    }

    return {
      valid: issues.filter((i) => i.type === 'error').length === 0,
      issues,
      warnings,
    };
  }

  /**
   * Apply changes atomically
   */
  async applyChangesAtomically(
    changes: FileChange[],
    options: ApplyChangesOptions = {}
  ): Promise<ApplyChangesResult> {
    const startTime = Date.now();
    const errors: ApplyError[] = [];
    const warnings: string[] = [];
    let checkpointId: string | undefined;

    let filesChanged = 0;
    let filesCreated = 0;
    let filesDeleted = 0;

    try {
      // Create checkpoint if requested
      if (options.checkpoint && this.checkpointManager) {
        try {
          const checkpoint = await this.checkpointManager.createCheckpoint(
            `multi-edit-${Date.now()}`,
            {
              name: `Before multi-file edit`,
              description: `Editing ${changes.length} files`,
            }
          );
          checkpointId = checkpoint.id;
        } catch (error) {
          warnings.push(`Failed to create checkpoint: ${error}`);
        }
      }

      if (options.dryRun) {
        return {
          success: true,
          filesChanged: changes.filter((c) => c.originalContent !== c.newContent).length,
          filesCreated: changes.filter((c) => !c.originalContent).length,
          filesDeleted: 0,
          checkpointId,
          duration: Date.now() - startTime,
          errors: [],
          warnings,
        };
      }

      // Sort files by dependency order (files with more dependencies first)
      const sortedChanges = this.sortByDependencyOrder(changes);

      // Apply changes
      for (const change of sortedChanges) {
        try {
          const result = await this.applyFileChange(change, options);
          if (result.created) filesCreated++;
          else if (result.modified) filesChanged++;
          else if (result.deleted) filesDeleted++;
        } catch (error) {
          errors.push({
            file: change.file,
            message: error instanceof Error ? error.message : 'Unknown error',
            phase: 'write',
          });
        }
      }

      // Rollback on error if checkpoint exists
      if (errors.length > 0 && checkpointId && this.checkpointManager) {
        await this.checkpointManager.rollback(checkpointId);
        return {
          success: false,
          filesChanged: 0,
          filesCreated: 0,
          filesDeleted: 0,
          checkpointId,
          duration: Date.now() - startTime,
          errors,
          warnings: [...warnings, 'Rolled back due to errors'],
        };
      }
    } catch (error) {
      errors.push({
        file: '*',
        message: error instanceof Error ? error.message : 'Unknown error',
        phase: 'write',
      });
    }

    return {
      success: errors.length === 0,
      filesChanged,
      filesCreated,
      filesDeleted,
      checkpointId,
      duration: Date.now() - startTime,
      errors,
      warnings,
    };
  }

  /**
   * Extract relationships from file content
   */
  private extractRelationships(
    filePath: string,
    content: string
  ): FileRelationship[] {
    const relationships: FileRelationship[] = [];

    // TypeScript/JavaScript imports
    const importRegex = /import\s+(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      relationships.push({
        file: filePath,
        type: 'import',
        relatedFile: match[1],
        strength: 'strong',
      });
    }

    // Require statements
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      relationships.push({
        file: filePath,
        type: 'import',
        relatedFile: match[1],
        strength: 'medium',
      });
    }

    // Export statements
    const exportRegex = /export\s+(?:\{[^}]*\}|\w+)\s+(?:from\s+['"]([^'"]+)['"])?/g;
    while ((match = exportRegex.exec(content)) !== null) {
      if (match[1]) {
        relationships.push({
          file: filePath,
          type: 'export',
          relatedFile: match[1],
          strength: 'strong',
        });
      }
    }

    return relationships;
  }

  /**
   * Find strongly connected components using Tarjan's algorithm
   */
  private findStronglyConnectedComponents(
    adjacency: Map<string, Set<string>>
  ): string[][] {
    const nodes = Array.from(adjacency.keys());
    const indexMap = new Map<string, number>();
    const lowlink = new Map<string, number>();
    const onStack = new Set<string>();
    const stack: string[] = [];
    const components: string[][] = [];
    let index = 0;

    const strongConnect = (node: string): void => {
      indexMap.set(node, index);
      lowlink.set(node, index);
      stack.push(node);
      onStack.add(node);
      index++;

      for (const neighbor of adjacency.get(node) || []) {
        if (!indexMap.has(neighbor)) {
          strongConnect(neighbor);
          lowlink.set(
            node,
            Math.min(lowlink.get(node)!, lowlink.get(neighbor)!)
          );
        } else if (onStack.has(neighbor)) {
          lowlink.set(
            node,
            Math.min(lowlink.get(node)!, indexMap.get(neighbor)!)
          );
        }
      }

      if (lowlink.get(node)! === indexMap.get(node)!) {
        const component: string[] = [];
        let n: string | undefined;
        do {
          n = stack.pop();
          onStack.delete(n!);
          component.push(n!);
        } while (n !== node);
        components.push(component);
      }
    };

    for (const node of nodes) {
      if (!indexMap.has(node)) {
        strongConnect(node);
      }
    }

    return components;
  }

  /**
   * Compute changes between two content strings
   */
  private computeChanges(
    original: string,
    updated: string
  ): ContentChange[] {
    const diffResult = diffLines(original, updated);
    const changes: ContentChange[] = [];
    let lineStart = 1;

    for (const part of diffResult) {
      const lineEnd = lineStart + part.count - 1;

      if (part.type === "added") {
        changes.push({
          type: 'added',
          oldText: '',
          newText: part.value,
          lineStart: lineStart - 1,
          lineEnd: lineStart - 1,
        });
      } else if (part.type === "removed") {
        changes.push({
          type: 'removed',
          oldText: part.value,
          newText: '',
          lineStart,
          lineEnd,
        });
      } else {
        lineStart += part.count;
      }
    }

    return changes;
  }

  /**
   * Apply edit description to content
   * In a real implementation, this would use an AI model
   */
  private async applyEditToContent(
    content: string,
    description: string
  ): Promise<string> {
    // Placeholder: in real implementation, use AI to generate edits
    // For now, return original content
    return content;
  }

  /**
   * Validate file consistency
   */
  private validateFileConsistency(change: FileChange): {
    issues: ValidationIssue[];
    warnings: ValidationWarning[];
  } {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for syntax issues (basic)
    if (change.newContent) {
      // Check for unbalanced braces
      const openBraces = (change.newContent.match(/\{/g) || []).length;
      const closeBraces = (change.newContent.match(/\}/g) || []).length;
      if (openBraces !== closeBraces) {
        issues.push({
          type: 'error',
          file: change.file,
          message: 'Unbalanced curly braces',
          suggestion: 'Check for missing opening or closing braces',
        });
      }

      // Check for unbalanced parentheses
      const openParens = (change.newContent.match(/\(/g) || []).length;
      const closeParens = (change.newContent.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        issues.push({
          type: 'error',
          file: change.file,
          message: 'Unbalanced parentheses',
          suggestion: 'Check for missing opening or closing parentheses',
        });
      }
    }

    return { issues, warnings };
  }

  /**
   * Find file references in content
   */
  private findFileReferences(content: string): string[] {
    const references: string[] = [];

    // Import/require references
    const importRegex = /['"]([^'"]+\.[a-zA-Z0-9]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      if (!match[1].startsWith('http')) {
        references.push(match[1]);
      }
    }

    return [...new Set(references)];
  }

  /**
   * Resolve file reference to absolute path
   */
  private resolveFileReference(ref: string, fromFile: string): string {
    const fromDir = path.dirname(fromFile);
    return path.resolve(fromDir, ref);
  }

  /**
   * Check if file exists in changes
   */
  private fileExistsInChanges(
    file: string,
    changes: FileChange[]
  ): boolean {
    return changes.some((c) => c.file === file);
  }

  /**
   * Check if file exists on disk
   */
  private fileExistsOnDisk(file: string): boolean {
    return fs.existsSync(path.isAbsolute(file) ? file : path.join(process.cwd(), file));
  }

  /**
   * Apply a single file change
   */
  private async applyFileChange(
    change: FileChange,
    options: ApplyChangesOptions
  ): Promise<{ created: boolean; modified: boolean; deleted: boolean }> {
    const absolutePath = options.targetPath
      ? path.join(options.targetPath, change.file)
      : path.join(process.cwd(), change.file);

    const dir = path.dirname(absolutePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!change.originalContent && change.newContent) {
      // File creation
      fs.writeFileSync(absolutePath, change.newContent);
      return { created: true, modified: false, deleted: false };
    } else if (change.originalContent && !change.newContent) {
      // File deletion
      fs.rmSync(absolutePath, { force: true });
      return { created: false, modified: false, deleted: true };
    } else {
      // File modification
      fs.writeFileSync(absolutePath, change.newContent);
      return { created: false, modified: true, deleted: false };
    }
  }

  /**
   * Sort changes by dependency order (files with more dependencies first)
   */
  private sortByDependencyOrder(changes: FileChange[]): FileChange[] {
    return [...changes].sort((a, b) => {
      const aDeps = this.countDependencies(a.file, changes);
      const bDeps = this.countDependencies(b.file, changes);
      return bDeps - aDeps;
    });
  }

  /**
   * Count how many other files depend on this file
   */
  private countDependencies(file: string, changes: FileChange[]): number {
    let count = 0;

    for (const change of changes) {
      if (change.file === file) continue;

      const refs = this.findFileReferences(change.newContent || change.originalContent);
      for (const ref of refs) {
        const resolved = this.resolveFileReference(ref, change.file);
        if (resolved === file || path.basename(resolved) === path.basename(file)) {
          count++;
          break;
        }
      }
    }

    return count;
  }

  /**
   * Clear dependency cache
   */
  clearCache(): void {
    this.dependencyCache.clear();
  }
}

/**
 * Singleton instance
 */
export const multiFileHandler = new MultiFileHandler();
