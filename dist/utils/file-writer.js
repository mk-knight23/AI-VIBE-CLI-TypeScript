"use strict";
/**
 * VIBE-CLI v12 - File Writer Utility
 * Reliable file writing with verification and error handling
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeFileSync = writeFileSync;
exports.writeFilesSync = writeFilesSync;
exports.verifyFilesExist = verifyFilesExist;
exports.ensureDirectorySync = ensureDirectorySync;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Write content to a file with verification
 * @param filePath - Target file path (relative or absolute)
 * @param content - File content to write
 * @param options - Write options
 * @returns WriteResult with success status and verification
 */
function writeFileSync(filePath, content, options = {}) {
    const { recursive = true, overwrite = true, encoding = 'utf-8', } = options;
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
    }
    catch (error) {
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
function writeFilesSync(files, baseDir) {
    const results = [];
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
function verifyFilesExist(filePaths) {
    const exists = [];
    const missing = [];
    for (const filePath of filePaths) {
        const absolutePath = path.isAbsolute(filePath)
            ? filePath
            : path.join(process.cwd(), filePath);
        if (fs.existsSync(absolutePath)) {
            exists.push(absolutePath);
        }
        else {
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
function ensureDirectorySync(dirPath) {
    try {
        const absolutePath = path.isAbsolute(dirPath)
            ? dirPath
            : path.join(process.cwd(), dirPath);
        if (!fs.existsSync(absolutePath)) {
            fs.mkdirSync(absolutePath, { recursive: true });
        }
        return fs.existsSync(absolutePath);
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=file-writer.js.map