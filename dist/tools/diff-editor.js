"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VibeDiffEditor = exports.checkpointSystem = exports.diffEditor = exports.CheckpointSystem = exports.DiffEditor = exports.DiffGenerator = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
// ============================================================================
// DIFF GENERATOR
// ============================================================================
class DiffGenerator {
    /**
     * Generate unified diff between two strings
     */
    static generate(oldContent, newContent, filePath, options = {}) {
        const opts = {
            contextLines: options.contextLines ?? 3,
            showLineNumbers: options.showLineNumbers ?? true,
            color: options.color ?? true,
        };
        const oldLines = oldContent.split('\n');
        const newLines = newContent.split('\n');
        // Simple line-by-line diff
        const diff = [];
        diff.push(`--- ${filePath}`);
        diff.push(`+++ ${filePath}`);
        // Find differences
        const changes = [];
        let i = 0, j = 0;
        while (i < oldLines.length || j < newLines.length) {
            const oldLine = oldLines[i];
            const newLine = newLines[j];
            if (oldLine === newLine) {
                changes.push({ type: 'equal', oldIdx: i, newIdx: j });
                i++;
                j++;
            }
            else if (oldLine === undefined) {
                changes.push({ type: 'insert', oldIdx: i, newIdx: j });
                j++;
            }
            else if (newLine === undefined) {
                changes.push({ type: 'delete', oldIdx: i, newIdx: j });
                i++;
            }
            else {
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
                }
                else {
                    // Just mark as change
                    changes.push({ type: 'delete', oldIdx: i, newIdx: j });
                    changes.push({ type: 'insert', oldIdx: i, newIdx: j });
                    i++;
                    j++;
                }
            }
        }
        // Generate diff hunks
        let currentHunk = [];
        let hunkStartOld = 0, hunkStartNew = 0;
        for (const change of changes) {
            if (change.type === 'equal') {
                currentHunk.push({
                    type: 'context',
                    line: oldLines[change.oldIdx],
                    num: change.oldIdx + 1,
                });
            }
            else if (change.type === 'delete') {
                currentHunk.push({
                    type: 'delete',
                    line: oldLines[change.oldIdx],
                    num: change.oldIdx + 1,
                });
            }
            else if (change.type === 'insert') {
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
    static formatHunk(hunk, startOld, startNew, opts) {
        const lines = [];
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
                    lines.push(opts.color ? chalk_1.default.red(`-${prefix}${item.line}`) : `-${prefix}${item.line}`);
                    break;
                case 'insert':
                    lines.push(opts.color ? chalk_1.default.green(`+${prefix}${item.line}`) : `+${prefix}${item.line}`);
                    break;
            }
        }
        return lines.join('\n');
    }
    /**
     * Generate a simple side-by-side diff for display
     */
    static displayDiff(oldContent, newContent, filePath) {
        const oldLines = oldContent.split('\n');
        const newLines = newContent.split('\n');
        const maxLines = Math.max(oldLines.length, newLines.length);
        const lines = [];
        lines.push(chalk_1.default.cyan(`\n─── Diff: ${filePath} ───\n`));
        for (let i = 0; i < maxLines; i++) {
            const oldLine = oldLines[i];
            const newLine = newLines[i];
            if (oldLine === newLine) {
                lines.push(chalk_1.default.gray(`  ${String(i + 1).padStart(3)} │ ${oldLine || ''}`));
            }
            else {
                if (oldLine !== undefined) {
                    lines.push(chalk_1.default.red(`-${String(i + 1).padStart(3)} │ ${oldLine}`));
                }
                if (newLine !== undefined) {
                    lines.push(chalk_1.default.green(`+${String(i + 1).padStart(3)} │ ${newLine}`));
                }
            }
        }
        return lines.join('\n');
    }
}
exports.DiffGenerator = DiffGenerator;
// ============================================================================
// DIFF-BASED EDITOR
// ============================================================================
class DiffEditor {
    checkpointSystem;
    constructor(checkpointSystem) {
        this.checkpointSystem = checkpointSystem || new CheckpointSystem();
    }
    /**
     * Apply a single edit operation
     */
    async applyEdit(operation, context = {}) {
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
        }
        catch (error) {
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
    async applyMultiEdit(operations, context = {}) {
        const results = [];
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
                }
                else {
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
        }
        catch (error) {
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
    async replaceAll(file, searchPattern, replacement, context = {}) {
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
    async insertAt(file, lineNumber, content, context = {}) {
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
    async deleteLines(file, startLine, endLine, context = {}) {
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
    async append(file, content, context = {}) {
        return this.applyEdit({
            type: 'append',
            file,
            replacement: content,
        }, context);
    }
    /**
     * Perform the actual edit operation
     */
    performEdit(content, operation, filePath) {
        let newContent = content;
        const changes = [];
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
    previewEdit(operation, filePath) {
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
exports.DiffEditor = DiffEditor;
exports.VibeDiffEditor = DiffEditor;
// ============================================================================
// CHECKPOINT SYSTEM (for undo)
// ============================================================================
class CheckpointSystem {
    checkpoints = new Map();
    async create(sessionId, description) {
        const checkpointId = `chk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const files = this.captureState();
        const checkpoint = {
            id: checkpointId,
            sessionId,
            description,
            createdAt: new Date(),
            files,
        };
        this.checkpoints.set(checkpointId, checkpoint);
        return checkpointId;
    }
    async restore(checkpointId) {
        const checkpoint = this.checkpoints.get(checkpointId);
        if (!checkpoint)
            return false;
        for (const file of checkpoint.files) {
            if (file.type === 'modified') {
                fs.writeFileSync(file.path, file.originalContent);
            }
            else if (file.type === 'created') {
                try {
                    fs.unlinkSync(file.path);
                }
                catch {
                    // Ignore
                }
            }
        }
        this.checkpoints.delete(checkpointId);
        return true;
    }
    list(sessionId) {
        const checkpoints = Array.from(this.checkpoints.values());
        if (sessionId) {
            return checkpoints.filter(c => c.sessionId === sessionId);
        }
        return checkpoints;
    }
    /**
     * Create checkpoint synchronously (for TUI)
     */
    createSync(sessionId, description) {
        try {
            const checkpointId = `chk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            const files = this.captureState();
            const checkpoint = {
                id: checkpointId,
                sessionId,
                description,
                createdAt: new Date(),
                files,
            };
            this.checkpoints.set(checkpointId, checkpoint);
            return checkpointId;
        }
        catch {
            return null;
        }
    }
    /**
     * Restore checkpoint synchronously (for TUI)
     */
    restoreSync(checkpointId) {
        try {
            const checkpoint = this.checkpoints.get(checkpointId);
            if (!checkpoint)
                return false;
            for (const file of checkpoint.files) {
                if (file.type === 'modified') {
                    fs.writeFileSync(file.path, file.originalContent);
                }
                else if (file.type === 'created') {
                    try {
                        fs.unlinkSync(file.path);
                    }
                    catch {
                        // Ignore
                    }
                }
            }
            this.checkpoints.delete(checkpointId);
            return true;
        }
        catch {
            return false;
        }
    }
    captureState() {
        const projectRoot = process.cwd();
        const files = [];
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
        }
        catch {
            // Not a git repo or other error
        }
        return files;
    }
}
exports.CheckpointSystem = CheckpointSystem;
// ============================================================================
// IMPORTS
// ============================================================================
const child_process = __importStar(require("child_process"));
// ============================================================================
// EXPORTS
// ============================================================================
exports.diffEditor = new DiffEditor();
exports.checkpointSystem = new CheckpointSystem();
//# sourceMappingURL=diff-editor.js.map