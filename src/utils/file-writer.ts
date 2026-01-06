/**
 * VIBE-CLI v12 - File Writer Utility
 * Reliable file writing with verification and error handling
 */

import * as fs from 'fs';
import * as path from 'path';

export interface WriteOptions {
  /** Create parent directories if they don't exist */
  recursive?: boolean;
  /** Overwrite existing files */
  overwrite?: boolean;
  /** File encoding (default: utf-8) */
  encoding?: BufferEncoding;
}

export interface WriteResult {
  /** Absolute path to the file */
  path: string;
  /** Whether the file was created or modified */
  type: 'created' | 'modified';
  /** Whether the write was successful */
  success: boolean;
  /** Error message if write failed */
  error?: string;
}

/**
 * Write content to a file with verification
 * @param filePath - Target file path (relative or absolute)
 * @param content - File content to write
 * @param options - Write options
 * @returns WriteResult with success status and verification
 */
export function writeFileSync(
  filePath: string,
  content: string,
  options: WriteOptions = {}
): WriteResult {
  const {
    recursive = true,
    overwrite = true,
    encoding = 'utf-8',
  } = options;

  try {
    // Resolve to absolute path using process.cwd()
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);

    const dir = path.dirname(absolutePath);

    // Create parent directories if needed
    if (recursive && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Check if file exists
    const exists = fs.existsSync(absolutePath);

    if (exists && !overwrite) {
      return {
        path: absolutePath,
        type: 'modified',
        success: false,
        error: 'File already exists and overwrite is disabled',
      };
    }

    // Write the file
    fs.writeFileSync(absolutePath, content, { encoding });

    // HARD VERIFICATION: Check file was actually written
    if (!fs.existsSync(absolutePath)) {
      return {
        path: absolutePath,
        type: exists ? 'modified' : 'created',
        success: false,
        error: `File verification failed: ${absolutePath}`,
      };
    }

    // Verify content matches
    const writtenContent = fs.readFileSync(absolutePath, { encoding });
    if (writtenContent !== content) {
      return {
        path: absolutePath,
        type: exists ? 'modified' : 'created',
        success: false,
        error: 'File content verification failed: content mismatch',
      };
    }

    return {
      path: absolutePath,
      type: exists ? 'modified' : 'created',
      success: true,
    };
  } catch (error) {
    return {
      path: filePath,
      type: 'created',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown write error',
    };
  }
}

/**
 * Write multiple files with verification
 * @param files - Array of { filename, content } objects
 * @param baseDir - Base directory for relative paths
 * @returns Array of WriteResult objects
 */
export function writeFilesSync(
  files: Array<{ filename: string; content: string }>,
  baseDir?: string
): WriteResult[] {
  const results: WriteResult[] = [];

  for (const file of files) {
    const filePath = baseDir
      ? path.join(baseDir, file.filename)
      : file.filename;

    const result = writeFileSync(filePath, file.content);
    results.push(result);
  }

  return results;
}

/**
 * Verify that files exist on disk
 * @param filePaths - Array of file paths to verify
 * @returns Object with exists/nonExists arrays
 */
export function verifyFilesExist(filePaths: string[]): {
  exists: string[];
  missing: string[];
} {
  const exists: string[] = [];
  const missing: string[] = [];

  for (const filePath of filePaths) {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);

    if (fs.existsSync(absolutePath)) {
      exists.push(absolutePath);
    } else {
      missing.push(absolutePath);
    }
  }

  return { exists, missing };
}

/**
 * Create a directory if it doesn't exist
 * @param dirPath - Directory path to create
 * @returns true if directory exists/was created, false on error
 */
export function ensureDirectorySync(dirPath: string): boolean {
  try {
    const absolutePath = path.isAbsolute(dirPath)
      ? dirPath
      : path.join(process.cwd(), dirPath);

    if (!fs.existsSync(absolutePath)) {
      fs.mkdirSync(absolutePath, { recursive: true });
    }

    return fs.existsSync(absolutePath);
  } catch {
    return false;
  }
}
