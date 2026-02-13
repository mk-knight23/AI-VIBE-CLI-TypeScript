/**
 * VIBE-CLI v0.0.2 - Git Conflict Resolver
 * Detect and resolve merge conflicts with AI-suggested resolutions
 */

import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { simpleGit, SimpleGit } from 'simple-git';
import chalk from 'chalk';

/**
 * Conflict marker type
 */
export type ConflictMarkerType = 'ours' | 'theirs' | 'both' | 'unknown';

/**
 * Conflict region
 */
export interface ConflictRegion {
  file: string;
  startLine: number;
  endLine: number;
  ours: string[];
  theirs: string[];
  commonAncestor?: string[];
  markerType: ConflictMarkerType;
}

/**
 * Detected conflict
 */
export interface DetectedConflict {
  file: string;
  regions: ConflictRegion[];
  isResolved: boolean;
}

/**
 * Conflict resolution suggestion
 */
export interface ConflictResolutionSuggestion {
  file: string;
  region: ConflictRegion;
  resolution: 'ours' | 'theirs' | 'both' | 'manual';
  confidence: number;
  reasoning: string;
  preview: string;
}

/**
 * Conflict resolver options
 */
export interface ConflictResolverOptions {
  autoResolve?: boolean;
  strategy?: 'ours' | 'theirs' | 'nearest';
  showDiff?: boolean;
}

/**
 * Conflict resolver result
 */
export interface ConflictResolverResult {
  success: boolean;
  conflictsResolved: number;
  conflictsRemaining: number;
  suggestions: ConflictResolutionSuggestion[];
  errors: string[];
}

/**
 * Git Conflict Resolver
 */
export class ConflictResolver {
  private git: SimpleGit;
  private readonly cwd: string;

  constructor(cwd?: string) {
    this.cwd = cwd || process.cwd();
    this.git = simpleGit(this.cwd);
  }

  /**
   * Detect merge conflicts
   */
  async detectConflicts(): Promise<DetectedConflict[]> {
    const status = await this.git.status();
    const conflicts: DetectedConflict[] = [];

    // Check for conflict markers in files
    const conflictFiles = status.conflicted.filter(
      (f) => !f.startsWith(' ') && !f.startsWith('?')
    );

    for (const file of conflictFiles) {
      const content = fs.readFileSync(path.join(this.cwd, file), 'utf-8');
      const regions = this.parseConflictMarkers(content);

      conflicts.push({
        file,
        regions,
        isResolved: regions.length === 0,
      });
    }

    return conflicts;
  }

  /**
   * Check if there are any conflicts
   */
  async hasConflicts(): Promise<boolean> {
    const status = await this.git.status();
    return status.conflicted.length > 0;
  }

  /**
   * Parse conflict markers in file content
   */
  private parseConflictMarkers(content: string): ConflictRegion[] {
    const regions: ConflictRegion[] = [];
    const lines = content.split('\n');

    let currentRegion: ConflictRegion | null = null;
    let state: 'normal' | 'ours' | 'theirs' | 'ancestor' = 'normal';
    let lineNumber = 0;

    for (const line of lines) {
      lineNumber++;

      if (line.startsWith('<<<<<<<')) {
        currentRegion = {
          file: '',
          startLine: lineNumber,
          endLine: lineNumber,
          ours: [],
          theirs: [],
          markerType: 'unknown',
        };
        state = 'ours';
      } else if (line.startsWith('|||||||')) {
        state = 'ancestor';
      } else if (line.startsWith('=======')) {
        state = 'theirs';
      } else if (line.startsWith('>>>>>>>')) {
        if (currentRegion) {
          currentRegion.endLine = lineNumber;
          currentRegion.markerType = this.inferMarkerType(currentRegion);
          regions.push(currentRegion);
        }
        currentRegion = null;
        state = 'normal';
      } else {
        if (currentRegion) {
          switch (state) {
            case 'ours':
              currentRegion.ours.push(line);
              break;
            case 'theirs':
              currentRegion.theirs.push(line);
              break;
            case 'ancestor':
              if (!currentRegion.commonAncestor) {
                currentRegion.commonAncestor = [];
              }
              currentRegion.commonAncestor.push(line);
              break;
          }
        }
      }
    }

    return regions;
  }

  /**
   * Infer conflict marker type based on context
   */
  private inferMarkerType(region: ConflictRegion): ConflictMarkerType {
    // Simple heuristic: more lines in ours = ours, etc.
    if (region.ours.length > region.theirs.length * 1.5) {
      return 'ours';
    }
    if (region.theirs.length > region.ours.length * 1.5) {
      return 'theirs';
    }
    return 'both';
  }

  /**
   * Generate resolution suggestions
   */
  async suggestResolutions(
    conflicts: DetectedConflict[]
  ): Promise<ConflictResolutionSuggestion[]> {
    const suggestions: ConflictResolutionSuggestion[] = [];

    for (const conflict of conflicts) {
      for (const region of conflict.regions) {
        const suggestion = this.generateSuggestion(conflict.file, region);
        suggestions.push(suggestion);
      }
    }

    // Sort by confidence (highest first)
    suggestions.sort((a, b) => b.confidence - a.confidence);

    return suggestions;
  }

  /**
   * Generate a single resolution suggestion
   */
  private generateSuggestion(
    file: string,
    region: ConflictRegion
  ): ConflictResolutionSuggestion {
    const oursSize = region.ours.length;
    const theirsSize = region.theirs.length;

    let resolution: 'ours' | 'theirs' | 'both' | 'manual';
    let confidence = 0;
    let reasoning = '';

    // Analyze conflict
    if (oursSize === 0 && theirsSize > 0) {
      resolution = 'theirs';
      confidence = 0.95;
      reasoning = 'Ours is empty, theirs has content - likely a clean addition';
    } else if (theirsSize === 0 && oursSize > 0) {
      resolution = 'ours';
      confidence = 0.95;
      reasoning = 'Theirs is empty, ours has content - likely a deletion';
    } else if (oursSize === theirsSize) {
      // Check for identical content
      const oursContent = region.ours.join('\n');
      const theirsContent = region.theirs.join('\n');

      if (oursContent === theirsContent) {
        resolution = 'both';
        confidence = 0.9;
        reasoning = 'Both versions are identical - can use either';
      } else {
        resolution = 'manual';
        confidence = 0.3;
        reasoning = 'Equal size but different content - manual review needed';
      }
    } else {
      // Size difference suggests one is more substantial
      if (oursSize > theirsSize) {
        resolution = 'ours';
        confidence = 0.6;
        reasoning = 'Ours has more content - likely more complete implementation';
      } else {
        resolution = 'theirs';
        confidence = 0.6;
        reasoning = 'Theirs has more content - likely more complete implementation';
      }
    }

    // Generate preview
    const preview = this.generatePreview(region, resolution);

    return {
      file,
      region,
      resolution,
      confidence,
      reasoning,
      preview,
    };
  }

  /**
   * Generate preview of resolved content
   */
  private generatePreview(
    region: ConflictRegion,
    resolution: 'ours' | 'theirs' | 'both' | 'manual'
  ): string {
    let content = '';

    switch (resolution) {
      case 'ours':
        content = region.ours.join('\n');
        break;
      case 'theirs':
        content = region.theirs.join('\n');
        break;
      case 'both':
        // Merge both, preferring ours
        content = [...region.ours, ...region.theirs].join('\n');
        break;
      default:
        content = '<<<<<<< OURS\n' +
          region.ours.join('\n') +
          '\n=======\n' +
          region.theirs.join('\n') +
          '\n>>>>>>> THEIRS';
    }

    return content;
  }

  /**
   * Apply a resolution suggestion
   */
  async applySuggestion(
    suggestion: ConflictResolutionSuggestion
  ): Promise<boolean> {
    try {
      const filePath = path.join(this.cwd, suggestion.file);
      let content = fs.readFileSync(filePath, 'utf-8');

      // Replace conflict region with resolved content
      const resolvedContent = this.replaceConflictRegion(
        content,
        suggestion.region,
        suggestion.preview
      );

      fs.writeFileSync(filePath, resolvedContent);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Replace conflict region in content
   */
  private replaceConflictRegion(
    content: string,
    region: ConflictRegion,
    resolvedContent: string
  ): string {
    const lines = content.split('\n');
    const newLines = [
      ...lines.slice(0, region.startLine - 1),
      ...resolvedContent.split('\n'),
      ...lines.slice(region.endLine),
    ];

    return newLines.join('\n');
  }

  /**
   * Resolve all conflicts automatically
   */
  async resolveAll(
    options: ConflictResolverOptions = {}
  ): Promise<ConflictResolverResult> {
    const { strategy = 'nearest' } = options;

    const conflicts = await this.detectConflicts();
    const suggestions = await this.suggestResolutions(conflicts);
    const errors: string[] = [];
    let resolved = 0;

    for (const suggestion of suggestions) {
      // Only auto-resolve high confidence suggestions
      if (suggestion.confidence >= 0.8 || strategy !== 'nearest') {
        const applied = await this.applySuggestion(suggestion);
        if (applied) {
          resolved++;
        } else {
          errors.push(`Failed to apply resolution to ${suggestion.file}`);
        }
      }
    }

    // Re-check remaining conflicts
    const remaining = await this.detectConflicts();

    return {
      success: errors.length === 0 && remaining.length === 0,
      conflictsResolved: resolved,
      conflictsRemaining: remaining.reduce((sum, c) => sum + c.regions.length, 0),
      suggestions,
      errors,
    };
  }

  /**
   * Get conflict summary
   */
  async getConflictSummary(): Promise<{
    totalConflicts: number;
    files: string[];
    hasConflicts: boolean;
  }> {
    const conflicts = await this.detectConflicts();
    const totalRegions = conflicts.reduce((sum, c) => sum + c.regions.length, 0);

    return {
      totalConflicts: totalRegions,
      files: conflicts.map((c) => c.file),
      hasConflicts: totalRegions > 0,
    };
  }

  /**
   * Abort current merge
   */
  async abortMerge(): Promise<boolean> {
    try {
      await this.git.merge(['--abort']);
      return true;
    } catch {
      // Fallback to reset
      try {
        await this.git.reset(['--hard', 'HEAD']);
        return true;
      } catch {
        return false;
      }
    }
  }
}

/**
 * Singleton instance
 */
export const conflictResolver = new ConflictResolver();
