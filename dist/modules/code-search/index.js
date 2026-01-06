"use strict";
/**
 * VIBE-CLI v12 - Code Search Module
 * Search and analyze code across the codebase
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
exports.CodeSearchModule = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const base_module_1 = require("../base.module");
const router_1 = require("../../providers/router");
class CodeSearchModule extends base_module_1.BaseModule {
    provider;
    constructor() {
        super({
            name: 'code_search',
            version: '1.0.0',
            description: 'Search and analyze code across the codebase',
        });
        this.provider = new router_1.VibeProviderRouter();
    }
    async execute(params) {
        const action = params.action || params.type || 'search';
        try {
            switch (action) {
                case 'search':
                    return this.search(params);
                case 'find':
                    return this.findFiles(params);
                case 'grep':
                    return this.grep(params);
                case 'analyze':
                    return this.analyzeStructure(params);
                default:
                    return this.failure(`Unknown action: ${action}`);
            }
        }
        catch (error) {
            return this.failure(error instanceof Error ? error.message : 'Unknown error');
        }
    }
    async search(params) {
        const { query, directory = '.', extensions = ['ts', 'js', 'tsx', 'jsx'] } = params;
        if (!query) {
            return this.failure('Missing required parameter: query');
        }
        this.logInfo(`Searching for "${query}"...`);
        const results = this.performSearch(query, directory, extensions);
        return this.success({
            query,
            directory,
            results,
            count: results.length,
        });
    }
    performSearch(query, directory, extensions) {
        const results = [];
        const searchDir = path.resolve(directory);
        if (!fs.existsSync(searchDir)) {
            return results;
        }
        this.walkDir(searchDir, (filePath) => {
            const ext = path.extname(filePath).slice(1);
            if (extensions.includes(ext)) {
                try {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    if (content.toLowerCase().includes(query.toLowerCase())) {
                        const lines = content.split('\n');
                        const matchingLines = lines
                            .map((line, i) => ({ line: i + 1, content: line.trim() }))
                            .filter(l => l.content.toLowerCase().includes(query.toLowerCase()));
                        if (matchingLines.length > 0) {
                            results.push({
                                file: path.relative(process.cwd(), filePath),
                                matches: matchingLines,
                            });
                        }
                    }
                }
                catch {
                    // Skip unreadable files
                }
            }
        });
        return results;
    }
    walkDir(dir, callback) {
        if (!fs.existsSync(dir))
            return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                this.walkDir(fullPath, callback);
            }
            else if (entry.isFile()) {
                callback(fullPath);
            }
        }
    }
    async findFiles(params) {
        const { pattern = '**/*', directory = '.' } = params;
        this.logInfo(`Finding files matching "${pattern}"...`);
        const results = this.findFilesByPattern(pattern, directory);
        return this.success({
            pattern,
            directory,
            files: results,
            count: results.length,
        });
    }
    findFilesByPattern(pattern, directory) {
        const results = [];
        const searchDir = path.resolve(directory);
        this.walkDir(searchDir, (filePath) => {
            const fileName = path.basename(filePath);
            if (this.matchPattern(pattern, fileName)) {
                results.push(path.relative(process.cwd(), filePath));
            }
        });
        return results;
    }
    matchPattern(pattern, fileName) {
        const regexPattern = pattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
        return new RegExp(regexPattern, 'i').test(fileName);
    }
    async grep(params) {
        const { pattern, filePattern = '*', context = 2 } = params;
        if (!pattern) {
            return this.failure('Missing required parameter: pattern');
        }
        this.logInfo(`Grepping for "${pattern}"...`);
        const results = this.performGrep(pattern, filePattern, context);
        return this.success({
            pattern,
            filePattern,
            results,
            count: results.length,
        });
    }
    performGrep(pattern, filePattern, context) {
        const results = [];
        this.walkDir(process.cwd(), (filePath) => {
            const fileName = path.basename(filePath);
            if (!this.matchPattern(filePattern, fileName))
                return;
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const lines = content.split('\n');
                lines.forEach((line, i) => {
                    if (line.toLowerCase().includes(pattern.toLowerCase())) {
                        const contextLines = [];
                        for (let j = Math.max(0, i - context); j <= Math.min(lines.length - 1, i + context); j++) {
                            contextLines.push({ line: j + 1, content: lines[j] });
                        }
                        results.push({
                            file: path.relative(process.cwd(), filePath),
                            match: { line: i + 1, content: line.trim() },
                            context: contextLines,
                        });
                    }
                });
            }
            catch {
                // Skip unreadable files
            }
        });
        return results;
    }
    async analyzeStructure(params) {
        const { directory = '.' } = params;
        this.logInfo('Analyzing project structure...');
        const structure = this.analyzeDirStructure(directory);
        return this.success({
            directory,
            structure,
            summary: {
                totalFiles: structure.files.length,
                totalDirs: structure.directories.length,
                languages: this.detectLanguages(structure.files),
            },
        });
    }
    analyzeDirStructure(directory) {
        const files = [];
        const directories = [];
        this.walkDir(path.resolve(directory), (filePath) => {
            const relative = path.relative(process.cwd(), filePath);
            if (fs.statSync(filePath).isFile()) {
                files.push(relative);
            }
            else {
                directories.push(relative);
            }
        });
        return { files, directories };
    }
    detectLanguages(files) {
        const languages = {};
        const extMap = {
            '.ts': 'TypeScript',
            '.js': 'JavaScript',
            '.tsx': 'TypeScript React',
            '.jsx': 'JavaScript React',
            '.py': 'Python',
            '.go': 'Go',
            '.rs': 'Rust',
            '.java': 'Java',
        };
        for (const file of files) {
            const ext = path.extname(file);
            const lang = extMap[ext] || 'Other';
            languages[lang] = (languages[lang] || 0) + 1;
        }
        return languages;
    }
}
exports.CodeSearchModule = CodeSearchModule;
//# sourceMappingURL=index.js.map