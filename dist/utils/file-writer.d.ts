/**
 * VIBE-CLI v12 - File Writer Utility
 * Reliable file writing with verification and error handling
 */
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
export declare function writeFileSync(filePath: string, content: string, options?: WriteOptions): WriteResult;
/**
 * Write multiple files with verification
 * @param files - Array of { filename, content } objects
 * @param baseDir - Base directory for relative paths
 * @returns Array of WriteResult objects
 */
export declare function writeFilesSync(files: Array<{
    filename: string;
    content: string;
}>, baseDir?: string): WriteResult[];
/**
 * Verify that files exist on disk
 * @param filePaths - Array of file paths to verify
 * @returns Object with exists/nonExists arrays
 */
export declare function verifyFilesExist(filePaths: string[]): {
    exists: string[];
    missing: string[];
};
/**
 * Create a directory if it doesn't exist
 * @param dirPath - Directory path to create
 * @returns true if directory exists/was created, false on error
 */
export declare function ensureDirectorySync(dirPath: string): boolean;
//# sourceMappingURL=file-writer.d.ts.map